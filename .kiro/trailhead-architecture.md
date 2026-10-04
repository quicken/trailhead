# Trailhead Application Shell Architecture

## What is Trailhead?

Trailhead is a micro-frontend orchestration framework — a lightweight application shell that
coordinates multiple independent single-page applications (SPAs) within a shared layout (chrome).
It is the classic SaaS pattern: a persistent menu/chrome plus many independently-built, independently-
deployed modules. Built on browser-native ES modules. Each SPA can use any framework and deploys on
its own. Published as NPM packages under `@herdingbits/`.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                 Application Shell                     │
│  - Navigation management (from shell.json)            │
│  - HTTP client with feedback orchestration            │
│  - User feedback (toasts, dialogs, busy overlay)      │
│  - Session recovery (credentials or cognito/redirect) │
│  - Design-system integration (Web Awesome / CloudScape)│
│  - Routing & SPA loading                              │
└─────────────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌─────────┐   ┌─────────┐    ┌─────────┐
   │  SPA 1  │   │  SPA 2  │    │  SPA N  │
   │ (React) │   │  (Vue)  │    │(Vanilla)│
   └─────────┘   └─────────┘    └─────────┘
```

The shell is design-system agnostic (`packages/core`); a design-system **adapter** supplies the
actual UI components for feedback and auth. Two adapters ship: Web Awesome (web components) and
CloudScape (React).

## Monorepo Structure

No root `package.json` — each directory is independent with its own `npm install`.

```
trailhead/
├── packages/                       # Published NPM packages
│   ├── core/                       # @herdingbits/trailhead-core (tsc only)
│   │   ├── src/
│   │   │   ├── shell.ts            # Trailhead orchestrator (create/start, routing, SPA loading)
│   │   │   ├── lib/
│   │   │   │   ├── http.ts         # HTTP client (ky) with feedback + 401 auto-recovery
│   │   │   │   ├── requestManager.ts  # Busy/feedback request bookkeeping
│   │   │   │   ├── reauth.ts       # In-place credential re-auth (BroadcastChannel cross-tab)
│   │   │   │   └── session-recovery.ts # Redirect/refresh recovery (cognito strategy)
│   │   │   ├── adapters/
│   │   │   │   └── types.ts        # DesignSystemAdapter contract + NoopAuthAdapter
│   │   │   └── types/
│   │   │       └── shell-api.ts    # Shell API contract + manifest/nav types
│   │   └── __tests__/              # vitest + jsdom (NOT under src/)
│   │
│   ├── types/                      # @herdingbits/trailhead-types (type-only, generated from core build)
│   │   └── shell-api.d.ts          # + adapters/types.d.ts, public-api.d.ts
│   │
│   ├── webawesome/                 # @herdingbits/trailhead-webawesome (tsc only)
│   │   ├── src/
│   │   │   ├── adapter.ts          # WebAwesomeAdapter (feedback + auth via web components)
│   │   │   └── shell-app.ts        # ShellApp.mount(shell) — static layout already in the DOM
│   │   └── __tests__/
│   │
│   ├── cloudscape/                 # @herdingbits/trailhead-cloudscape (TypeScript + React)
│   │   ├── src/
│   │   │   ├── adapter.tsx         # CloudScapeAdapter (bridges to React via window events)
│   │   │   ├── shell-app.tsx       # ShellApp React component (renders feedback UI, calls start())
│   │   │   └── shell-layout.tsx    # ShellLayout — AppLayout + SideNavigation chrome
│   │   └── __tests__/
│   │
│   └── create-trailhead/           # @herdingbits/create-trailhead (CLI scaffolder)
│       └── templates/{webawesome,cloudscape}-{shell,app}
│
├── examples/                       # Reference implementations — consume the PUBLISHED packages
│   ├── webawesome-site/
│   │   ├── shell/                  # Vite; src/shell.ts entry; port 3001
│   │   │   └── public/shell.json   # { apps, nav } menu + SPA registry
│   │   ├── apps/{demo,saas-demo}/   # React SPAs; port 3000
│   │   └── build.js                # `npm run deploy`: assembles shell + app dists into dist/
│   │
│   └── cloudscape-site/
│       ├── shell/                  # Vite; src/index.tsx entry; port 3001
│       ├── apps/{demo,saas-demo}/
│       └── build.js
│
└── tools/
    ├── vite-i18n-plugin/           # Build-time i18n plugin (not wired into the examples)
    └── preview-server/             # Express, port 8081 — builds both sites, serves at /sample/trailhead
```

## Shell Lifecycle (the core contract)

Start-up is **two explicit steps**. The constructor is private — always go through `create()`.

```typescript
import { Trailhead } from '@herdingbits/trailhead-core';
import { WebAwesomeAdapter, ShellApp } from '@herdingbits/trailhead-webawesome';

// 1) create(): async — initialises the adapter, loads shell.json, wires shell.http + the auth
//    strategy, exposes window.shell. Resolves with a fully-loaded (but not-yet-rendered) shell.
const shell = await Trailhead.create({
  adapter: new WebAwesomeAdapter(),
  appBasePath: import.meta.env.VITE_APP_BASE_PATH || '',   // '' = served at root
  apiUrl: window.APP_CONFIG?.apiUrl || '',                 // optional; else shell.json
  auth: window.APP_CONFIG?.authMode === 'cognito'          // optional; else shell.json; else credentials
    ? { strategy: 'cognito' }
    : { strategy: 'credentials' },
});

// 2) start(): mounts to the page — renders nav, binds routing, loads the current app into
//    #shell-content. The adapter's ShellApp does this for you.
ShellApp.mount(shell);                                     // Web Awesome: layout is static HTML
// CloudScape: createRoot(el).render(<ShellApp shell={shell} />) — start() runs on mount effect
```

`create()` config wins; `shell.json` supplies deployment defaults; then built-in defaults.
`start()` is idempotent (repeat calls, e.g. React StrictMode double-effects, are no-ops).

## Shell API (`window.shell`)

```typescript
interface ShellAPI {
  feedback: FeedbackAPI;      // busy/clear, success/error/warning/info/alert, confirm/yesNo/yesNoCancel/custom
  http: HttpAPI;              // get/post/put/patch/delete → Result<T> (never throws)
  navigation: NavigationAPI;  // navigate, getCurrentPath, onRouteChange
  auth: AuthAPI;              // reauthenticate(attempt), recoverSession()
}
```

### HTTP

```typescript
const result = await window.shell.http.post('/api/users', data, {
  requestKey: 'create-user',     // de-dupes concurrent identical requests in the busy tracker
  busyMessage: 'Creating user...',
  successMessage: 'User created!',
  showSuccess: true,
  noFeedback: false,             // true suppresses busy + toasts for this call
});
if (result.success) { /* result.data */ } else { /* result.error — toast already shown */ }
```

- Relative paths get `apiUrl` prepended; absolute/protocol-relative URLs are used verbatim.
- Under the `cognito` strategy a `401` triggers one `recoverSession()` + a single retry; the first
  401's toast is suppressed. Under `credentials` a 401 is surfaced to the caller.

### Navigation / Auth

```typescript
window.shell.navigation.navigate('/demo');                 // vetted (same-origin, http(s)) then full reload
const off = window.shell.navigation.onRouteChange(p => {}); // returns an unsubscribe fn
await window.shell.auth.reauthenticate(attempt);            // in-place credential prompt (credentials strategy)
await window.shell.auth.recoverSession();                   // refresh-or-redirect (cognito strategy)
```

## SPA Contract

Every SPA assigns `window.AppMount` and reads services off `window.shell`:

```typescript
import type { ShellAPI } from '@herdingbits/trailhead-types';
import ReactDOM from 'react-dom/client';
import { MyApp } from './MyApp';

declare global {
  interface Window {
    shell: ShellAPI;
    AppMount?: (root: HTMLElement, basePath: string) => void;
  }
}

// The shell dynamic-imports <basePath>/app.js, then calls this with the container + base path.
window.AppMount = (root, basePath) => {
  ReactDOM.createRoot(root).render(<MyApp basePath={basePath} />);
};

// Standalone dev (no shell): mock window.shell and auto-mount to #root.
if (!window.shell) {
  // ...minimal mock of feedback/http/navigation...
  const root = document.getElementById('root');
  if (root) window.AppMount(root, '');
}
```

### Vite config (SPA)

Single-file ES library build. On Vite 8 / Rolldown use `rollupOptions.output.codeSplitting: false`
(the older `inlineDynamicImports: true` is equivalent on Vite ≤7). React's `process.env.NODE_ENV`
is `define`d to `"production"` so the reference doesn't leak into the browser bundle.

```javascript
export default defineConfig({
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  server: { port: 3000, cors: true /* , proxy: shell.json/webawesome/trailhead → 3001 (WA only) */ },
  build: {
    lib: { entry: 'src/index.tsx', formats: ['es'], fileName: () => 'app.js' },
    rollupOptions: { output: { codeSplitting: false } },
  },
});
```

## shell.json

Read at **runtime** — add/remove SPAs with no rebuild. Shape is `{ apps, nav }`, optionally with
`apiUrl` and `auth` (both must be **same-origin paths**, used only when not passed to `create()`):

```json
{
  "apps": [
    { "id": "my-app", "basePath": "/my-app", "src": "my-app" }
  ],
  "nav": [
    { "type": "link", "label": "My App", "icon": "star", "order": 1, "href": "/my-app" },
    { "type": "section", "label": "Group", "icon": "folder", "order": 2, "children": [ /* links */ ] },
    { "type": "divider", "order": 3 }
  ],
  "apiUrl": "/api",
  "auth": { "strategy": "cognito", "refreshPath": "/_auth/refresh", "signinPath": "/_auth/signin" }
}
```

`apps` is the SPA registry (`id`, `basePath`, `src`); `nav` is the menu tree. Entries with an unsafe
`basePath`/`src` (path traversal, `//`, markup) or a nav `href` that isn't a safe same-origin
`http(s)` target are dropped with a console warning — a hostile manifest can't inject markup or
off-origin links.

## Auth strategies

Explicit — never auto-detected from the presence of `/_auth/*`.

- **`credentials`** (default): in-place username/password re-auth via the adapter's `promptCredentials`
  (see `lib/reauth.ts`); `shell.http` does not auto-recover — apps call `shell.auth.reauthenticate`.
- **`cognito`**: redirect/refresh recovery behind the jwt-auth-gateway (`lib/session-recovery.ts`);
  `shell.http` auto-retries once on a `401` (POST `/_auth/refresh`; on failure redirect to
  `/_auth/signin?return=<path>`). The example shells pick the strategy from
  `window.APP_CONFIG.authMode`.

## Design-System Integration

- **Web Awesome** (web components): `WebAwesomeAdapter.init()` is the single source of the theme
  stylesheet — it injects `styles/themes/default.css` from `${shellUrl}/webawesome` (override with
  `webAwesomeUrl`) as a **non-blocking `preload`→`stylesheet`**, idempotently. Do **not** add a
  static `<link>` for it in the shell HTML (the adapter owns it, and a hard-coded base path 404s).
  The shell's `build` copies `@awesome.me/webawesome/dist-cdn` into `dist/webawesome/`.
- **CloudScape** (React): `CloudScapeAdapter` is a bridge — `feedback`/`auth` dispatch `window`
  CustomEvents that the `ShellApp` React component renders (Flashbar, Modal, Spinner). The adapter
  only works mounted inside `ShellApp`.

## Routing & Loading

Full page reload between SPAs — deliberate, for CSS/JS isolation and static-host compatibility.

1. User navigates to `/<basePath>`.
2. CloudFront/host serves `<basePath>/index.html` (a copy of the shell page).
3. Shell boots, reads `shell.json`, finds the matching app by `basePath`.
4. Shell injects `<basePath>/<src>.css` and dynamic-imports `<basePath>/app.js`.
5. The app assigns `window.AppMount`; the shell calls `AppMount(root, basePath)`.
6. Navigating away reloads the page — automatic cleanup.

Every route has its own `index.html` (each site's `build.js` creates them from `shell.json`'s
`apps`). The deep-link `index.html` is required because S3-behind-OAC has no directory index.

## Development Workflow

Dev ports: **shell 3001, SPAs 3000** (SPAs proxy `/shell.json`, `/webawesome`, `/trailhead/shell`
to 3001 — Web Awesome only; CloudScape SPAs run purely against their `window.shell` mock).

```bash
# Shell dev server (port 3001)
cd examples/webawesome-site/shell && npm run dev   # WA: `npm start` is build + vite preview, NOT dev
cd examples/cloudscape-site/shell && npm start     # CS: start IS the dev server (no `dev` script)

# SPA standalone with hot reload (port 3000)
cd examples/webawesome-site/apps/demo && npm start

# Build an SPA → dist/app.js
cd examples/webawesome-site/apps/demo && npm run build
```

Base path for a non-root deployment comes from `VITE_APP_BASE_PATH` (empty = root).

## Build & Preview

```bash
# Packages (core build also regenerates packages/types)
cd packages/core && npm run build
cd packages/webawesome && npm run build
cd packages/cloudscape && npm run build

# Both example sites at their real base paths
cd tools/preview-server && npm run build   # builds shells + apps, runs each site's deploy, copies to public/
cd tools/preview-server && npm start       # http://localhost:8081/sample/trailhead/{webawesome,cloudscape}
```

## Tests

```bash
cd packages/core && npx vitest run
cd packages/core && npx vitest run __tests__/http.test.ts
cd packages/webawesome && npm test
cd packages/cloudscape && npm test
```

Package tests live in `packages/<pkg>/__tests__/` (not under `src/`), vitest + jsdom. Each changed
package is also built, tested, and Sonar-scanned in CI on push/PR.

## Key Principles

1. **Framework agnostic** — SPAs choose their own stack.
2. **Independent deployment** — ship one SPA without touching others.
3. **True isolation** — page reloads give CSS/JS isolation; no shared React context or cross-SPA routing.
4. **Shared infrastructure** — the shell owns navigation, HTTP, feedback, and session recovery.
5. **Static hosting first** — no URL rewrites, no SSR; every route has its own `index.html`.
6. **Runtime nav updates** — change `shell.json` without rebuilding.
7. **The only coupling point** is the contract: `window.shell` + `window.AppMount`.
8. **Untrusted manifest** — `shell.json` fields are validated/escaped; co-hosting mutually-untrusted
   apps on one origin is out of scope (they share `window.shell`).
