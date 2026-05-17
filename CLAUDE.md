# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Trailhead is a micro-frontend orchestration framework — a lightweight shell that coordinates multiple independent SPAs in a shared layout. Published as NPM packages under `@herdingbits/`.

## Monorepo Layout

No root `package.json`. Each directory is independent with its own `npm install`.

```
packages/core          → @herdingbits/trailhead-core (TypeScript, tsc only)
packages/shoelace      → @herdingbits/trailhead-shoelace (TypeScript, tsc only)
packages/cloudscape    → @herdingbits/trailhead-cloudscape (TypeScript + React)
packages/types         → @herdingbits/trailhead-types (type-only, auto-generated from core build)
packages/create-trailhead → CLI scaffolding tool (npx @herdingbits/create-trailhead)

examples/shoelace-site/  → Reference implementation: Shoelace design system
examples/cloudscape-site/ → Reference implementation: CloudScape design system
  shell/                 → Shell entry point (Vite, port 3001)
  apps/demo/             → React SPA (Vite, port 3000)
  apps/saas-demo/        → React SPA (Vite, port 3000)

tools/vite-i18n-plugin → Build-time i18n Vite plugin
tools/preview-server   → Production preview (Express, port 8081)
```

The `examples/` directories are **reference implementations** showing how to use the packages, not the packages themselves.

## Build Commands

**Packages:**
```bash
cd packages/core && npm run build        # compile + regenerates packages/types
cd packages/shoelace && npm run build
cd packages/cloudscape && npm run build
```

**Examples:**
```bash
cd examples/shoelace-site/shell && npm run dev        # shell, port 3001
cd examples/shoelace-site/apps/demo && npm start      # SPA standalone, port 3000
cd examples/shoelace-site/apps/demo && npm run build  # → dist/app.js
```

**Tests (core only):**
```bash
cd packages/core && npx vitest run
cd packages/core && npx vitest run src/__tests__/http.test.ts
```

Tests live in `packages/core/src/__tests__/`, using vitest with jsdom.

## Key Contracts

**SPA contract:** SPAs assign `window.AppMount(root: HTMLElement, basePath: string)` — the shell calls this global after loading `<app>/app.js`. The shell is accessed via `window.shell`. SPAs also mock `window.shell` for standalone dev and auto-mount to `#root` when running without the shell.

**Shell instantiation:** `new Trailhead({ adapter, appBasePath, shellUrl, apiUrl })` + `ShellApp.mount(shell)`. See `examples/*/shell/src/shell.ts`.

**Adapter pattern:** `packages/core` is design-system agnostic. Adapters implement `DesignSystemAdapter` from `packages/core/src/adapters/types.ts`.

## Design Constraints

These shape what's in scope — don't suggest approaches that work around them:

- **Cross-SPA isolation is intentional.** No shared React context, shared state, or client-side routing between SPAs. Page reloads are the isolation mechanism.
- **Static hosting first.** No URL rewrite rules, no SSR. Every route has its own `index.html`. Deploys to S3/CDN, Netlify, or any file server.
- **Shell is infrastructure, not a framework.** SPAs choose their own stack. The shell contract (`window.shell`, `window.AppMount`) is the only coupling point.

## Non-Obvious Behaviours

- **Dev ports:** Shell runs on **3001**; SPAs run on **3000**. The SPA's vite config proxies `/navigation.json`, design system assets, and shell assets to 3001.
- **Navigation is runtime config:** `shell/public/navigation.json` is read at runtime — no rebuild needed to add/remove SPAs.
- **Full page reloads between SPAs:** Deliberate. Provides CSS/JS isolation. Each SPA route gets its own `index.html` copy of the shell.
- **i18n is build-time only:** `t("key")` calls are replaced at build time by `tools/vite-i18n-plugin`. No runtime i18n library.
- **SPA build output must be a single file:** Library mode ES build with `inlineDynamicImports: true` → `dist/app.js`.
