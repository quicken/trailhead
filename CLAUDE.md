# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Trailhead is a micro-frontend orchestration framework — a lightweight shell that coordinates multiple independent SPAs in a shared layout. Published as NPM packages under `@herdingbits/`.

## Monorepo Layout

No root `package.json`. Each directory is independent with its own `npm install`.

```
packages/core          → @herdingbits/trailhead-core (TypeScript, tsc only)
packages/webawesome    → @herdingbits/trailhead-webawesome (TypeScript, tsc only)
packages/cloudscape    → @herdingbits/trailhead-cloudscape (TypeScript + React)
packages/types         → @herdingbits/trailhead-types (type-only, auto-generated from core build)
packages/create-trailhead → CLI scaffolding tool (npx @herdingbits/create-trailhead)
                            templates/{webawesome,cloudscape}-{shell,app}

examples/webawesome-site/  → Reference implementation: Web Awesome design system
examples/cloudscape-site/  → Reference implementation: CloudScape design system
  build.js               → `npm run deploy`: assembles shell + app dists into dist/
  shell/                 → Shell entry point (Vite, port 3001)
  apps/demo/             → React SPA (Vite, port 3000)
  apps/saas-demo/        → React SPA (Vite, port 3000)

tools/preview-server   → Builds both example sites and serves them (Express, port 8081)
tools/vite-i18n-plugin → Build-time i18n Vite plugin (@cfkit/vite-i18n-plugin; not wired into the examples)
```

The `examples/` directories are **reference implementations** showing how to use the packages, not the packages themselves. They consume the **published** `@herdingbits/*` packages from npm, not the local `packages/` source — publish first, then bump the examples.

## Build Commands

**Packages:**
```bash
cd packages/core && npm run build        # compile + regenerates packages/types
cd packages/webawesome && npm run build
cd packages/cloudscape && npm run build
```

**Examples:**
```bash
cd examples/webawesome-site/shell && npm run dev        # shell dev server, port 3001
cd examples/cloudscape-site/shell && npm start          # shell dev server, port 3001 (no `dev` script)
cd examples/webawesome-site/apps/demo && npm start      # SPA standalone, port 3000
cd examples/webawesome-site/apps/demo && npm run build  # → dist/app.js
```

Note `npm start` in the **Web Awesome shell** is build + `vite preview` on 3001, not the dev server.

**Production preview (both sites, real base paths):**
```bash
cd tools/preview-server && npm run build   # builds shells + apps, runs each site's deploy, copies to public/
cd tools/preview-server && npm start       # http://localhost:8081/sample/trailhead/{webawesome,cloudscape}
```

**Tests:**
```bash
cd packages/core && npx vitest run
cd packages/core && npx vitest run __tests__/http.test.ts
cd packages/webawesome && npm test
cd packages/cloudscape && npm test
```

Package tests live in `packages/<pkg>/__tests__/` (not under `src/`), using vitest with jsdom. Some example apps also have a `test` script.

## Key Contracts

**SPA contract:** SPAs assign `window.AppMount(root: HTMLElement, basePath: string)` — the shell calls this global after loading `<basePath>/app.js` (and `<basePath>/<src>.css`). The shell is accessed via `window.shell`. SPAs also mock `window.shell` for standalone dev and auto-mount to `#root` when running without the shell.

**Shell config:** `shell/public/shell.json` is read at runtime — no rebuild needed to add/remove SPAs. Shape is `{ apps, nav }`: `apps` is the SPA registry (`{ id, basePath, src }`), `nav` is the menu tree (`section`/`link` items). It may also carry `apiUrl` and `auth`, used when not passed to `Trailhead.create` (both must be same-origin paths).

**Shell instantiation:** `const shell = await Trailhead.create({ adapter, appBasePath, shellUrl, apiUrl, auth })`, then mount the adapter's `ShellApp`, which calls `shell.start()` once the layout is in the DOM. The constructor is private.
- Web Awesome: `ShellApp.mount(shell)` — see `examples/webawesome-site/shell/src/shell.ts`.
- CloudScape: `ShellApp` is a React component — `createRoot(...).render(<ShellApp shell={shell} />)`, see `examples/cloudscape-site/shell/src/index.tsx`.

**Auth strategy:** `auth: { strategy: "credentials" }` (default — in-place username/password re-auth via the adapter) or `{ strategy: "cognito" }` (redirect-based recovery behind the jwt-auth-gateway; `shell.http` auto-retries once on 401). Never auto-detected. The example shells pick it from `window.APP_CONFIG.authMode`.

**Adapter pattern:** `packages/core` is design-system agnostic. Adapters implement `DesignSystemAdapter` from `packages/core/src/adapters/types.ts`.

## Design Constraints

These shape what's in scope — don't suggest approaches that work around them:

- **Cross-SPA isolation is intentional.** No shared React context, shared state, or client-side routing between SPAs. Page reloads are the isolation mechanism.
- **Static hosting first.** No URL rewrite rules, no SSR. Every route has its own `index.html`. Deploys to S3/CDN, Netlify, or any file server.
- **Shell is infrastructure, not a framework.** SPAs choose their own stack. The shell contract (`window.shell`, `window.AppMount`) is the only coupling point.

## Non-Obvious Behaviours

- **Dev ports:** Shell runs on **3001**; SPAs run on **3000**. The Web Awesome SPAs' vite config proxies `/shell.json`, `/favicon.ico`, `/webawesome` and `/trailhead/shell` to 3001. The CloudScape SPAs have no proxy and run purely against their `window.shell` mock.
- **Full page reloads between SPAs:** Deliberate. Provides CSS/JS isolation. Each SPA route gets its own `index.html` copy of the shell (created by the site's `build.js` from `shell.json`'s `apps`).
- **Deploy renames app CSS:** `build.js` copies an app's `dist/*.css` to `<src>.css` in the route directory, because that's the name the shell requests.
- **Web Awesome assets are copied, not bundled:** the shell's `build` copies `@awesome.me/webawesome/dist-cdn` into `dist/webawesome/`.
- **i18n is build-time only:** `t("key")` calls are replaced at build time by `tools/vite-i18n-plugin`. No runtime i18n library.
- **SPA build output must be a single file:** Library mode ES build with `rollupOptions.output.codeSplitting: false` (Vite 8 / Rolldown; formerly `inlineDynamicImports: true`) → `dist/app.js`. React's `process.env.NODE_ENV` is `define`d to `"production"` so it doesn't leak into the browser bundle.
- **Expected build noise:** CloudScape apps warn about `'use client'` directives from `@cloudscape-design/components`, and the CloudScape shell trips Vite's 500 kB chunk warning. Neither is a bug.
