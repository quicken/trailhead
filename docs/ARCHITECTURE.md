# Trailhead Architecture

**Trailhead is a host application, not a framework.** It renders a navigation menu, hands every app a small shared API on `window.shell`, loads apps as ES modules, and reloads the page when you move between them. That last part is the whole trick: isolation comes from the browser, not from a runtime module loader. This page explains how the pieces fit, what each one is responsible for, and — just as important — which clever things it deliberately does *not* do.

If you want the argument for *why* this shape instead of Module Federation or single-spa, read the [Problem Statement](../PROBLEM_STATEMENT.md). If you want to build something, [Getting Started](./GETTING_STARTED.md) and the [Shell API](./SHELL_API.md) are the practical paths.

## The shape

```
┌─────────────────────────────────────────────────────────┐
│                      Apps (SPAs)                         │
│          React · Vue · Svelte · vanilla — any            │
└────────────────┬─────────────────────────────────────────┘
                 │  window.shell  (feedback · http · navigation · auth)
                 ▼
┌─────────────────────────────────────────────────────────┐
│                      Shell Core                          │
│   HTTP client · navigation & routing · app loading ·     │
│   exposes window.shell · delegates all UI to the adapter │
└────────────────┬─────────────────────────────────────────┘
                 │  DesignSystemAdapter interface
                 ▼
┌─────────────────────────────────────────────────────────┐
│                 Design System Adapter                    │
│   Web Awesome · CloudScape · your own                    │
│   toasts · dialogs · busy overlays · credential prompt   │
└─────────────────────────────────────────────────────────┘
```

The coupling between the three layers is deliberately thin. Apps know only `window.shell` and the `AppMount` contract. The core knows only the `DesignSystemAdapter` interface, never a specific component library. The adapter knows nothing about apps.

## Core components

### Shell core — `packages/core/src/shell.ts`

The orchestration layer. It loads apps, provides the HTTP client, manages navigation, exposes `window.shell`, and delegates every piece of UI to the adapter. It is framework-agnostic; it loads apps but never unmounts them (a page reload does that); it reads its navigation from JSON at runtime; and it moves between apps with hard redirects rather than client-side routing.

Start-up is **two explicit steps**:

```typescript
import { Trailhead } from '@herdingbits/trailhead-core';
import { WebAwesomeAdapter, ShellApp } from '@herdingbits/trailhead-webawesome';

const shell = await Trailhead.create({ adapter: new WebAwesomeAdapter() });
ShellApp.mount(shell);
```

- `Trailhead.create(config)` does the async work — initialises the adapter, exposes `window.shell`, and loads `shell.json` — and resolves with a fully loaded shell (`getNavigation()`/`getApps()` are already populated). It rejects if the adapter fails to initialise.
- `ShellApp.mount(shell)` wires the loaded shell to the page; the adapter's `mount` calls `shell.start()` for you once the layout (`#shell-navigation`, `#shell-content`) is in the DOM. `start()` renders the nav, begins listening for route changes, and loads the app for the current URL. It is idempotent — repeat calls do nothing.

(`new Trailhead(...)` was removed in 0.5.0, which split start-up into these two steps so that holders of the shell have a real "ready" signal. See the [changelog](../CHANGELOG.md).)

### Design system adapter — `packages/core/src/adapters/`

An adapter implements one interface:

```typescript
interface DesignSystemAdapter {
  name: string;
  version: string;
  init(shellUrl: string): Promise<void>;
  feedback: FeedbackAdapter;   // toasts, dialogs, busy overlays
  auth: AuthAdapter;           // the credential prompt (or NoopAuthAdapter)
}
```

It is responsible for loading its design system's assets in `init()`, and for backing every piece of shell UI — toasts, modal dialogs, busy overlays, and the re-authentication credential prompt — with that design system's native components, so every app gets a consistent look regardless of which framework the app itself uses. An adapter that isn't ready to build a login UI opts out with `NoopAuthAdapter` (see [why `auth` is required with a no-op default](#why-is-authadapter-required-with-a-no-op-default)).

The two official adapters:

- **Web Awesome** — `@herdingbits/trailhead-webawesome`, vanilla TypeScript, a real `<wa-dialog>` credential prompt.
- **CloudScape** — `@herdingbits/trailhead-cloudscape`, React, a real `<Modal>` credential prompt.

Building your own is a small job — see [Creating Adapters](./CREATING_ADAPTERS.md).

### Types package — `packages/types/`

TypeScript definitions for the shell API (`ShellAPI`, `FeedbackAPI`, `HttpAPI`, `NavigationAPI`, `AuthAPI`) and the adapter interfaces (`DesignSystemAdapter`, `FeedbackAdapter`, `AuthAdapter`). Apps install it as a dev dependency for type safety; it carries no runtime code.

### Apps (SPAs)

Independent applications, each built with whatever framework its team prefers. An app's entire obligation to the shell is to assign `window.AppMount` and render into the element the shell hands it:

```typescript
window.AppMount = (root: HTMLElement, basePath: string) => {
  // render into `root`; pass `basePath` to your router as its basename
};
```

Apps use `window.shell` for shared services and deploy independently as a single bundled `app.js`. There is no `init(shell)` function and no shell-provided unmount — the full `window.shell` API is the only coupling point. (The complete reference is the [Shell API](./SHELL_API.md).)

### Re-authentication — `packages/core/src/lib/reauth.ts` and `session-recovery.ts`

Sessions expire, and an app shouldn't have to reinvent "what do we do when they do." The shell exposes one `shell.auth` surface backed by two strategies — covered under [the two auth strategies](#the-two-auth-strategies) below.

## Data flow

### App loading

```
1. User navigates to /customers
2. Shell matches the URL against shell.json's apps[].basePath
3. Shell injects a <script type="module"> for <basePath>/app.js
4. app.js assigns window.AppMount
5. On script load, the shell empties #shell-content and calls
   window.AppMount(container, appBasePath + appPath)
6. The app renders into the container and uses window.shell for services
```

(In dev mode — `window.__SHELL_DEV__` — the shell instead `import()`s the app's `src/index.ts` through Vite for HMR, then calls the module's `AppMount`. Same contract, different fetch.)

### Feedback

```
1. App calls shell.feedback.success("Saved!")
2. Shell delegates to adapter.feedback.showToast(...)
3. The adapter renders the toast with its design system's components
```

### Navigation

```
1. App calls shell.navigation.navigate("/orders")
2. Shell performs a hard redirect (window.location.href = appBasePath + "/orders")
3. The page reloads; the previous app is destroyed by the browser
4. The shell boots fresh on the new URL and loads the /orders app
```

### Session recovery — credentials strategy

```
1. An API call comes back 401 (session expired)
2. App calls shell.auth.reauthenticate(attempt)
3. Shell asks adapter.auth.promptCredentials() to show the login prompt
4. User submits → shell calls the app's attempt(username, password)
5. attempt() fails → prompt reopens with an error, back to step 4
6. attempt() succeeds → shell resolves true, app retries its original request
   (or another tab already succeeded → this tab's prompt closes automatically
    via a BroadcastChannel message)
```

### Session recovery — cognito strategy

```
1. shell.http gets a 401 and a cognito strategy is configured
2. Shell POSTs the refresh endpoint (default /_auth/refresh)
3a. 2xx → the edge set a fresh cookie → shell retries the original request once
3b. non-2xx or network error → shell redirects to the sign-in endpoint
    (default /_auth/signin?return=<current path>); the page unloads
```

The app makes its call exactly as normal — the recovery is invisible to app code. Core carries no identity-provider knowledge beyond those two overridable default paths.

## Design decisions

### Why hard redirects?

Moving between apps is a full page reload, and that is the point. A reload gives each app a genuinely clean slate — fresh CSS, fresh JS context, no leaked global state — so two apps built by two teams in two frameworks can't collide. The browser handles all the cleanup, which means no unmount lifecycle, no memory-leak hunting, and no coordination between apps. The trade-off is a ~100ms transition between apps instead of an instant client-side route change; for a SaaS console moving between modules, that is a trade worth making. Routing *inside* a single app is still as instant as that app's own router makes it.

### Why the adapter pattern?

Keeping the core design-system-agnostic lets an organisation bring its own component library, keeps orchestration logic separate from UI concerns, lets the community add adapters without touching core, and makes the core trivial to test against a mock adapter. The cost is a thin interface to implement per design system — a few dozen lines, not a framework.

### Why no client-side routing *between* apps?

A cross-app router would need a router library, would reintroduce the shared-runtime coupling the reload model avoids, and would need server-side URL rewrites to survive a deep-link refresh. Instead, every route is its own `index.html` on disk, so the site works on any static file server with zero rewrite rules. (This is the backbone of [Deployment](./DEPLOYMENT.md).)

### The two auth strategies

An expired session is recovered one of two ways, and the shell is told which **explicitly** on its config — `auth: { strategy: … }`. There is no auto-detection from the presence of `/_auth/*` endpoints.

```typescript
await Trailhead.create({ adapter, auth: { strategy: "credentials" } }); // default
await Trailhead.create({ adapter, auth: { strategy: "cognito" } });
await Trailhead.create({ adapter, auth: { strategy: "cognito", refreshPath: "/_auth/refresh", signinPath: "/_auth/signin" } });
```

Omitting `auth` is equivalent to `{ strategy: "credentials" }`, so existing shells are unchanged.

- **`credentials` (default)** — the app owns its login endpoint (nginx/Lucee). `shell.auth.reauthenticate(attempt)` shows an in-place credential prompt (via the adapter), retries the app's `attempt`, and syncs tabs over a `BroadcastChannel`. `shell.http` does **not** auto-recover under this strategy; a `401` is surfaced to the caller.
- **`cognito`** — a hosted-UI identity provider (e.g. Cognito Managed Login) sits at the edge behind the [aws-static-hosting](https://github.com/herdingbits/aws-static-hosting) gateway; the app never sees credentials. `shell.http` auto-recovers once on a `401` by refreshing at the edge, else redirecting to sign-in. `shell.auth.recoverSession()` exposes the same mechanism manually.

Crucially the two layers are independent: the **strategy** lives in core/shell config and decides whether `shell.http` auto-recovers; the **adapter's `AuthAdapter`** only ever supplies the credential-prompt UI used by the `credentials` strategy. A cognito deployment needs no adapter auth UI at all (`NoopAuthAdapter` is fine). The app-facing side of both is documented in [Shell API → session recovery](./SHELL_API.md#shellauth--session-recovery).

### Why `apiUrl` is relative-only

`shell.http` prepends the configured `apiUrl` base to **relative** request paths only. An absolute (`http(s)://…`) or protocol-relative (`//host/…`) URL is used verbatim. Without this guard, a call like `shell.http.get("https://api.other.com/x")` under `apiUrl: "/api"` would become the nonsensical `/api/https://api.other.com/x`. (Fixed in core 0.5.3 — see the [changelog](../CHANGELOG.md).) The practical rule for apps: keep your calls relative and let deployment decide where the API lives.

### Why is `AuthAdapter` required, with a no-op default?

Making `auth` a required field with `NoopAuthAdapter` as the easy opt-out means an adapter can never *silently* forget re-authentication — a gap you'd otherwise only discover when a real user hit an expired session in production. But it's never a blocker: `NoopAuthAdapter` satisfies the interface by declining every prompt, so a new or in-progress adapter still compiles and runs — you just don't get the in-place prompt until you build one. Every app calls the same `window.shell.auth.reauthenticate()` regardless of which adapter is behind it.

### Why build-time i18n?

Translations are resolved at build time (`tools/vite-i18n-plugin`), so there is zero runtime i18n library, zero runtime overhead, compile-time validation of keys, and a bundle that carries only one language. The trade-off is one build per language — acceptable for apps that deploy per-locale.

## Deployment architecture

The shell's own files sit at the deployment root (or under `appBasePath`); each app gets a sibling directory, and — the load-bearing rule — **each app has its own `index.html`**, a copy of the shell page, so a deep-link or refresh on any route resolves to a real file and boots the shell there.

```
deploy/
├── index.html          # shell page
├── shell.js
├── shell.css
├── shell.json          # manifest: apps + nav, read at runtime
├── webawesome/         # Web Awesome assets, loaded once by the shell
├── customers/
│   ├── index.html      # copy of the shell page
│   ├── app.js
│   └── customers.css
└── orders/
    ├── index.html
    ├── app.js
    └── orders.css
```

Because every route is a real file, no URL-rewrite rules are needed and the site runs on S3 + CloudFront, nginx, Netlify, or any file server. The full guide — plain static hosting and the Cognito gateway path — is [Deployment](./DEPLOYMENT.md).

## What's next, and what was rejected

Planned: a Material UI adapter, and adapter certification tests. Deliberately rejected, each for the reason the design turns on: client-side routing between apps (simplicity / isolation), runtime i18n (performance), shared state across apps (isolation), and Webpack Module Federation (complexity). The [Problem Statement](../PROBLEM_STATEMENT.md) makes the case for each rejection.

## See also

- [Problem Statement](../PROBLEM_STATEMENT.md) — why this shape at all
- [Getting Started](./GETTING_STARTED.md) — build a shell and first SPA
- [Shell API](./SHELL_API.md) — the full `window.shell` reference
- [Creating Adapters](./CREATING_ADAPTERS.md) — add a design system
- [Deployment](./DEPLOYMENT.md) — ship it
