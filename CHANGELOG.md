# Changelog

Notable changes to the Trailhead packages, newest first, with upgrade notes for existing shells and apps. Versions follow [semver](https://semver.org/); while Trailhead is on 0.x, a minor bump (0.4 → 0.5) can be breaking.

## 0.5.0 — unreleased

### Breaking: the shell starts in two explicit steps

`new Trailhead(...)` is gone. The constructor used to return immediately and finish starting up in the background, so anything holding the shell had no way to know when it was ready:

- `getNavigation()` and `getApps()` returned `[]` until `shell.json` had loaded. The CloudScape `ShellApp` papered over this with a 100 ms retry, so a slow `shell.json` left the CloudScape nav menu empty.
- In CloudScape, `#shell-content` only exists once React has rendered `ShellApp`. If `shell.json` loaded first, the initial app was silently never mounted.
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

- `@herdingbits/trailhead-core` can now be loaded by Node's ES module loader, not only by bundlers. `dist/lib/http.js` imported `./requestManager` without its `.js` extension, so vitest suites, SSR and Node scripts that imported the package failed with "Cannot find module". Vite-built shells were unaffected.
