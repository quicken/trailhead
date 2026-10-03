# Changelog

Notable changes to the Trailhead packages, newest first, with upgrade notes for existing shells and apps. Versions follow [semver](https://semver.org/); while Trailhead is on 0.x, a minor bump (0.4 → 0.5) can be breaking.

## 0.5.3 — 2026-10-03

`@herdingbits/trailhead-core` only. No upgrade steps: `^0.5.0` ranges pick it up with `npm update`.

### Fixed

- `shell.http` now prepends the configured `apiUrl` to **relative paths only**. An absolute URL (`http(s)://…`) or protocol-relative URL (`//host/…`) passed to `shell.http.get/post/…` is used verbatim. Previously the base was concatenated unconditionally, so under `apiUrl: "/api"` a call like `shell.http.get("https://example.com/x")` became the broken `/api/https://example.com/x`.

## 0.5.2 — 2026-10-03

`@herdingbits/trailhead-core` only (plus a dependency refresh across the published packages). No upgrade steps: `^0.5.0` ranges pick it up with `npm update`.

### Added: redirect-based session recovery (hosted-UI / Cognito)

Trailhead's existing `shell.auth.reauthenticate(attempt)` collects a username and password in-app — right for an app-owned login (nginx/Lucee), but not for a hosted-UI identity provider (e.g. Cognito Managed Login at the edge) where the app never sees credentials and tokens live in `HttpOnly` cookies. This release adds a second, explicit strategy without changing the first.

- **`ShellConfig.auth`** selects the strategy explicitly (no auto-detection):

  ```typescript
  new Trailhead({ adapter, auth: { strategy: "cognito" } });                 // redirect/refresh
  new Trailhead({ adapter, auth: { strategy: "credentials" } });             // default — unchanged
  new Trailhead({ adapter, auth: { strategy: "cognito", refreshPath: "/_auth/refresh", signinPath: "/_auth/signin" } });
  ```

  Omitting `auth` keeps the previous behaviour (`credentials`).

- **`shell.auth.recoverSession(): Promise<boolean>`** recovers an expired session per the configured strategy. For `cognito`: `POST`s the refresh endpoint (default `/_auth/refresh`); on a `2xx` resolves `true` (retry your request); otherwise redirects to the sign-in endpoint (default `/_auth/signin?return=<current path>`). For `credentials` it resolves `false` (apps use `reauthenticate` as before).

- **`shell.http` auto-recovery:** under the `cognito` strategy, a `401` triggers one `recoverSession()` attempt and a single retry of the original request (no loops; the first `401`'s error toast is suppressed on the recovered path). Under `credentials`, a `401` is surfaced unchanged.

Core stays identity-provider-agnostic: the only Cognito-shaped knowledge is the two overridable gateway default paths. `reauthenticate` and the credential path are untouched.

## 0.5.1 — 2026-10-03

`@herdingbits/trailhead-core` only. No upgrade steps: `^0.5.0` ranges pick it up with `npm update`.

### Fixed

- The current app's nav link is now highlighted (`shell-nav-item-active`) when its `href` in `shell.json` and the app's `basePath` differ only by a trailing slash — e.g. a link to `/apps/connote/` for an app at `/apps/connote`. Previously the exact-match comparison never highlighted it, so shells that style the active section (such as one built from dropdowns) showed nothing as active.

## 0.5.0 — 2026-10-03

Released together: `@herdingbits/trailhead-core`, `@herdingbits/trailhead-cloudscape` and `@herdingbits/trailhead-webawesome` 0.5.0, and `@herdingbits/create-trailhead` 0.2.0, which scaffolds new shells with the API below. `@herdingbits/trailhead-types` is unchanged at 0.4.x; apps keep using it as before.

### Breaking: the shell starts in two explicit steps

`new Trailhead(...)` is gone. The constructor used to return immediately and finish starting up in the background, so anything holding the shell had no way to know when it was ready:

- `getNavigation()` and `getApps()` returned `[]` until `shell.json` had loaded. The CloudScape `ShellApp` papered over this with a single 100 ms retry, so a slow `shell.json` left a CloudScape shell with an empty nav menu and, since its routing waited for navigation, no app either.
- The CloudScape `ShellApp` also ran its own copy of routing and app loading alongside core's, so the same app could be loaded twice into `#shell-content`.
- A failed adapter initialisation surfaced only as an unhandled promise rejection and a blank page.

Start-up is now:

```ts
// Async: initialises the adapter, exposes window.shell and loads shell.json.
const shell = await Trailhead.create({ adapter, appBasePath, shellUrl, apiUrl });

// Renders the shell UI, then calls shell.start() to render navigation,
// start routing and load the app for the current URL.
ShellApp.mount(shell);
```

- `Trailhead.create(config)` resolves with a fully loaded shell, so `getNavigation()` and `getApps()` are populated. It rejects if the adapter fails to initialise, and shows "Failed to start the application shell" in `#shell-content` when that element exists. A missing or unreadable `shell.json` still only logs an error and leaves navigation empty.
- `shell.start()` wires the shell to the page. It runs once; later calls do nothing. Both adapters' `ShellApp.mount(shell)` call it for you, so a standard shell never calls it directly.
- The `ShellConfig` options are unchanged.

### Upgrading a shell from 0.4

1. Move to 0.5 of every Trailhead package together; the adapters' peer dependency on `@herdingbits/trailhead-core` is now `^0.5.0`.

   ```bash
   npm install @herdingbits/trailhead-core@^0.5.0 @herdingbits/trailhead-webawesome@^0.5.0
   # or, for CloudScape:
   npm install @herdingbits/trailhead-core@^0.5.0 @herdingbits/trailhead-cloudscape@^0.5.0
   ```

2. In the shell's entry file, replace the constructor with `await Trailhead.create(...)`. Keep `ShellApp.mount(shell)` (Web Awesome) or `<ShellApp shell={shell} />` (CloudScape) straight after it. Top-level `await` works with Vite's default build target.

   ```diff
   -const shell = new Trailhead({
   +const shell = await Trailhead.create({
      adapter: new WebAwesomeAdapter(),
      appBasePath,
      shellUrl,
      apiUrl,
    });

    ShellApp.mount(shell);
   ```

3. Remove anything that waits for the shell by guessing: `setTimeout` retries around `getNavigation()`/`getApps()`, or a `MutationObserver` on `#shell-navigation`. After `ShellApp.mount(shell)` returns (Web Awesome), navigation is already rendered; for React-based shells, use `shell.getNavigation()` directly since it's populated before render.

4. Optional: catch a failed start-up if you want to do more than the built-in message, e.g. report it.

   ```ts
   const shell = await Trailhead.create({ ... }).catch((error) => {
     reportError(error);
     throw error;
   });
   ```

### Upgrading a custom adapter

Your adapter's `ShellApp.mount(shell)` (or equivalent) must call `shell.start()` once the elements Trailhead renders into exist: `#shell-navigation` for navigation (optional) and `#shell-content` for apps. For a statically-rendered layout, call it synchronously in `mount`. For a framework-rendered layout, call it after the first render commits (e.g. in a React `useEffect`). `start()` ignores repeat calls, so React StrictMode's double effects are safe.

### Apps (SPAs) hosted in a shell

No changes. `window.shell` has the same API and is still in place before any app loads.

### Fixed

- CloudScape shells now load apps through core, the same way Web Awesome shells do: each app is loaded exactly once, and dev mode (`window.__SHELL_DEV__`, loading an app's `src/index.ts` through Vite) works, which the CloudScape copy of the loader never supported.
- `@herdingbits/trailhead-core` can now be loaded by Node's ES module loader, not only by bundlers. `dist/lib/http.js` imported `./requestManager` without its `.js` extension, so vitest suites, SSR and Node scripts that imported the package failed with "Cannot find module". Vite-built shells were unaffected.
