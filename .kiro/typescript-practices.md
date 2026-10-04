# TypeScript Best Practices for Trailhead

## Code Style & Patterns

### Minimal, Direct Code
- Write only essential code that directly solves the problem
- Avoid verbose implementations and unnecessary abstractions
- No boilerplate unless required for functionality

### TypeScript Conventions
- Use explicit type imports: `import type { ShellAPI } from '@herdingbits/trailhead-types'`
  (inside core: `import type { ShellAPI } from './types/shell-api.js'` — note the `.js` extension,
  required for Node ESM resolution even from `.ts` source)
- Define interfaces for public APIs and contracts
- Use type inference where obvious, explicit types for public interfaces
- Prefer `interface` over `type` for object shapes
- No `any` in public APIs; use type guards for runtime checks; strict mode on

### Module System
- ES modules exclusively (`"type": "module"` in every package.json)
- Relative imports within a package carry the `.js` extension (ESM), e.g. `./lib/http.js`
- `import.meta.env` for Vite environment variables
- Dynamic imports that load a runtime path carry `/* @vite-ignore */` (adapter asset loading,
  dev-mode app import)

### Public-API Documentation
- Public classes, functions, and exported constants with business meaning get a JSDoc block
- Document the **domain** (what/why), never the mechanics the signature already shows
- See the adapters and `core/src/lib/*` for the house style

### File Organization
```
package/
├── src/
│   ├── lib/           # Reusable services (http, requestManager, reauth, session-recovery)
│   ├── adapters/      # Adapter contract (core only)
│   ├── types/         # Type definitions / API contract
│   └── index.ts       # Public entry point (re-exports)
├── __tests__/         # vitest specs (NOT under src/)
└── package.json
```

### Example Structures

**Adapter package (Web Awesome — web components, tsc only):**
```
packages/webawesome/
├── src/
│   ├── adapter.ts     # WebAwesomeAdapter — feedback + auth + theme CSS loading
│   ├── shell-app.ts   # ShellApp.mount(shell) — static layout already in the DOM
│   └── index.ts
├── __tests__/
└── package.json
```

**Adapter package (CloudScape — React):**
```
packages/cloudscape/
├── src/
│   ├── adapter.tsx       # CloudScapeAdapter — bridges to React via window CustomEvents
│   ├── shell-app.tsx     # ShellApp React component — renders feedback UI, calls shell.start()
│   ├── shell-layout.tsx  # ShellLayout — AppLayout + SideNavigation chrome
│   └── index.ts
└── __tests__/
```

**SPA (example app):**
```
examples/webawesome-site/apps/demo/
├── src/
│   ├── index.tsx      # Entry — assigns window.AppMount(root, basePath); mocks shell for standalone
│   └── DemoApp.tsx
├── vite.config.ts
└── package.json
```

## Build Configuration

### Vite Setup
- `defineConfig` with mode-based env loading
- Base path from `VITE_APP_BASE_PATH` (empty = root)
- Enable CORS on the SPA dev server (micro-frontend cross-origin dev)
- `define` React's `process.env.NODE_ENV` to `"production"` so it doesn't leak into the browser bundle

### Library Build (SPAs)
Single-file ES output. On Vite 8 / Rolldown use `codeSplitting: false`
(`inlineDynamicImports: true` is the Vite ≤7 equivalent):

```javascript
build: {
  lib: {
    entry: 'src/index.tsx',
    formats: ['es'],
    fileName: () => 'app.js',
  },
  rollupOptions: {
    output: { codeSplitting: false },  // single app.js
  },
}
```

### Shell / Package Build
- `packages/*` compile with **tsc** (not Vite); `core`'s build also regenerates `packages/types`
- The example **shells** build with Vite; the Web Awesome shell additionally copies
  `@awesome.me/webawesome/dist-cdn` into `dist/webawesome/`

## Internationalization (i18n)

Build-time only — the `tools/vite-i18n-plugin` replaces `t("key")` at build time (zero runtime
overhead, one build per language). Not currently wired into the example sites.

## Testing

The published packages have real vitest suites — write and maintain tests alongside behavioural
changes (don't wait to be asked). Keep tests **hermetic**: no real network, no reliance on timeouts;
mock `ky` for HTTP paths (see `packages/core/__tests__/http*.test.ts`).

### Vitest Configuration
```javascript
test: {
  globals: true,
  environment: 'jsdom',
}
```

### Test Files
- Live in `packages/<pkg>/__tests__/` (not under `src/`)
- Name pattern `*.test.ts` / `*.test.tsx`
- Run: `npx vitest run` (core/webawesome) or `npm test` (webawesome/cloudscape)

## Dependencies

### Published Packages
- Examples and consumers use the **published** `@herdingbits/*` packages from npm, not local source —
  publish first, then bump the examples
- SPA dev dep: `npm install -D @herdingbits/trailhead-types`
- Shell deps: `npm install @herdingbits/trailhead-core @herdingbits/trailhead-webawesome`
  (or `-cloudscape`)

### External Libraries
- Web Awesome adapter: `@awesome.me/webawesome`; CloudScape adapter: `@cloudscape-design/components`
- SPAs bundle their own frameworks (React, Vue, …) — no externalisation, each SPA is self-contained
- `core` depends only on `ky` (HTTP)

## Environment Variables

- `.env.development` for dev-specific config
- `VITE_APP_BASE_PATH` — base URL path for deployment (empty = root)
- Runtime deployment config (`apiUrl`, `authMode`) comes via `window.APP_CONFIG`, injected into the
  deployed `index.html` — not a build-time Vite var

## Code Quality

### Error Handling
- try/catch around async I/O; log with context (`console.error('Failed to load:', error)`)
- `shell.http` returns a `Result<T>` and never throws — callers branch on `result.success`
- User-friendly fallbacks (visible shell error state on start-up failure, not a blank page)

### Async Patterns
- async/await consistently; return promises from async functions; handle rejections explicitly

### Type Safety
- No `any` in public APIs; type guards for runtime checks; leverage strict mode

## Performance

- Single-file SPA output (`codeSplitting: false`); tree-shaking on
- Shell loads once; SPAs load on demand via ES module import
- Design-system assets load once; the Web Awesome theme CSS is injected **non-blocking**
  (`preload`→`stylesheet`) by the adapter — never a render-blocking `<link>` in HTML

## Security

- Never commit secrets; placeholders in examples (`<api-key>`, `<token>`)
- Treat `shell.json` and all external data as untrusted: nav hrefs and app `basePath`/`src` are
  validated through the URL parser / safe-path regexes before use; adapter feedback text is escaped
  before any `innerHTML` interpolation
- `auth` endpoints from `shell.json` must be same-origin paths
