# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Trailhead is a micro-frontend orchestration framework — a lightweight application shell (21 KB / 8 KB gzipped) that coordinates multiple independent SPAs in a shared layout. Published as NPM packages under `@herdingbits/`.

## Monorepo Layout

No root `package.json`. Each directory under `packages/`, `examples/`, and `tools/` is independent with its own `npm install`.

```
packages/core          → @herdingbits/trailhead-core (TypeScript, tsc only)
packages/shoelace      → @herdingbits/trailhead-shoelace (TypeScript, tsc only)
packages/cloudscape    → @herdingbits/trailhead-cloudscape (TypeScript + React)
packages/types         → @herdingbits/trailhead-types (auto-generated from core)
packages/create-trailhead → CLI scaffolding tool

examples/shoelace-site/shell   → Shoelace shell (Vite dev server, port 3000)
examples/shoelace-site/apps/*  → SPAs (Vite, ports 3001+)
examples/cloudscape-site/      → CloudScape equivalents

tools/vite-i18n-plugin → Build-time i18n Vite plugin
tools/preview-server   → Production preview (Express, port 8081)
```

## Build Commands

**Packages (tsc-based):**
```bash
cd packages/core && npm run build        # compile + auto-generate packages/types
cd packages/shoelace && npm run build    # compile + copy shell.css to dist
cd packages/cloudscape && npm run build
```

**Example shells and SPAs:**
```bash
cd examples/shoelace-site/shell && npm start   # dev server, port 3000
cd examples/shoelace-site/apps/demo && npm start  # standalone SPA dev, port 3001
cd examples/shoelace-site/apps/demo && npm run build  # build SPA → dist/app.js
```

**Production preview:**
```bash
cd tools/preview-server
npm run build:shoelace    # or build:cloudscape or build (both)
npm start                 # http://localhost:8081/sample/trailhead
```

**Tests (core only):**
```bash
cd packages/core && npm test             # vitest (watch mode)
cd packages/core && npx vitest run      # single run
cd packages/core && npx vitest run src/__tests__/http.test.ts  # single file
```

Tests live in `packages/core/src/__tests__/`, pattern `*.test.ts`, using vitest with jsdom environment.

## Architecture

### Shell API Contract

The shell exposes `window.shell` to all SPAs:

```typescript
interface ShellAPI {
  feedback: FeedbackAPI;     // toasts, dialogs, loading overlays
  http: HttpAPI;             // HTTP client with auto error handling
  navigation: NavigationAPI; // routing
}
```

Defined in `packages/core/src/types/shell-api.ts`, published via `packages/types/`.

### SPA Contract

Every SPA **must** export an `init(shell: ShellAPI)` function. The shell calls it after loading `<app>/app.js` via dynamic ES module import. SPAs also implement a mock shell for standalone dev mode:

```typescript
export function init(shell: ShellAPI) { /* mount your framework */ }

// Standalone dev
if (!window.shell) {
  window.shell = { /* mock */ };
  init(window.shell);
}
```

### Routing & Isolation

Navigation between SPAs uses **full page reloads** — deliberate, not a limitation. This provides CSS/JS isolation without shared routing complexity. Each route maps to `/<app>/index.html` (a copy of `shell.html`) + `/<app>/app.js`. Internal SPA routing (React Router, etc.) is fine within a single SPA.

Route configuration lives in `shell/public/navigation.json` — read at runtime, no rebuild needed to add/remove/reorder SPAs.

### Adapter Pattern

`packages/core` is design-system agnostic. Adapters implement `DesignSystemAdapter` (defined in `packages/core/src/adapters/types.ts`) to provide feedback UI using Shoelace web components or CloudScape React components. The shell is instantiated with an adapter:

```typescript
import { Trailhead } from '@herdingbits/trailhead-core';
import { createAdapter } from '@herdingbits/trailhead-shoelace';
new Trailhead(createAdapter()).start();
```

### SPA Build Output

SPAs must produce a **single `app.js` file** (no code splitting):

```javascript
build: {
  lib: { entry: "src/index.tsx", formats: ["es"], fileName: () => "app.js" },
  rollupOptions: { output: { inlineDynamicImports: true } },
}
```

### i18n

Build-time only via `tools/vite-i18n-plugin`. `t("key")` calls are replaced at build time. No runtime i18n library. One build output per language.

## TypeScript Conventions

- Strict mode, ES modules (`"type": "module"`)
- `import type` for type-only imports
- `interface` over `type` for object shapes
- No `any` in public APIs
- Type definitions auto-generated from `packages/core/src/types/public-api.ts` → `packages/types/`
