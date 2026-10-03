# The Shell API

**This is the one page to keep open while you build an app.** Everything your SPA can ask the shell to do lives on a single global — `window.shell` — and this is the reference for it: feedback, HTTP, navigation, and session recovery. There is nothing else to import and nothing else to wire up. The shell puts `window.shell` in place before it loads your code, so it is always there by the time your `AppMount` runs.

If you want the bigger picture first — why there is a shell at all, how apps are isolated — read the [Architecture Overview](./ARCHITECTURE.md). If you just want to ship an app, [Getting Started](./GETTING_STARTED.md) builds one end to end. This page assumes you already have an app mounting and now want to use the shell's services.

## The contract: `AppMount`

Your app's one obligation is to export a mount function the shell can call:

```typescript
window.AppMount = (root: HTMLElement, basePath: string) => {
  // root  — an empty, attached element you own. Render into it.
  // basePath — the full URL prefix this app is mounted under
  //            (e.g. "/app/customers"). Pass it to your router as its basename.
};
```

The shell dynamic-imports your built `app.js`, which assigns `window.AppMount`, and then calls it with a container element and the app's full base path. That is the entire lifecycle — there is no `init(shell)`, no unmount, no teardown hook. When the user leaves your app, the shell does a full page reload and the browser throws your app away. (That reload is deliberate — see [Why hard redirects](./ARCHITECTURE.md#why-hard-redirects).)

For type safety, install the types package and let `window.shell` be `ShellAPI`:

```bash
npm install --save-dev @herdingbits/trailhead-types
```

```typescript
import type { ShellAPI } from '@herdingbits/trailhead-types';

declare global {
  interface Window {
    shell: ShellAPI;
    AppMount?: (root: HTMLElement, basePath: string) => void;
  }
}
```

Everything below hangs off `window.shell`.

---

## `shell.feedback` — toasts, dialogs, busy state

The shell owns a single, consistent feedback surface so every app's toasts and dialogs look the same — they are rendered by the active [design system adapter](./CREATING_ADAPTERS.md), not by your app. You never touch the adapter directly; you call these.

### Toasts

```typescript
shell.feedback.success('Saved!');            // default duration 3000ms
shell.feedback.error('Could not save.');     // default 5000ms
shell.feedback.warning('Unsaved changes.');  // default 4000ms
shell.feedback.info('Syncing…');             // default 3000ms
shell.feedback.alert('Done.', 'success', 2000); // variant + duration explicitly
```

Each takes an optional `duration` in milliseconds. `alert(message, variant, duration)` is the general form — `variant` is one of `"success" | "error" | "warning" | "info"`.

### Busy overlay

Block the UI with a spinner while something runs, then clear it:

```typescript
shell.feedback.busy('Loading report…');
try {
  await buildReport();
} finally {
  shell.feedback.clear(); // always clear, even on failure
}
```

Most of the time you don't need this directly — `shell.http` can show a busy overlay for you via `busyMessage` (below).

### Dialogs

All dialogs return a promise. Branch on the result:

```typescript
if (await shell.feedback.confirm('Delete this user?', 'Confirm delete')) {
  await deleteUser();
}

await shell.feedback.ok('Export finished.', 'Done');   // single OK button

const answer = await shell.feedback.yesNo('Discard changes?');          // true / false
const choice = await shell.feedback.yesNoCancel('Save before closing?'); // 'yes' | 'no' | 'cancel'
```

For arbitrary buttons, `custom` returns the `value` of the button clicked (or `null` if dismissed):

```typescript
const action = await shell.feedback.custom('Choose an action', 'User', [
  { label: 'Edit',   value: 'edit',   variant: 'primary' },
  { label: 'Delete', value: 'delete', variant: 'danger' },
  { label: 'Cancel', value: 'cancel' },
]);
if (action === 'delete') await deleteUser();
```

The `title` argument on `confirm`/`ok`/`yesNo`/`yesNoCancel` is optional and has a sensible default.

---

## `shell.http` — HTTP with a `Result<T>`, not exceptions

`shell.http` is a thin HTTP client (`get`, `post`, `put`, `patch`, `delete`) built around one idea: **a failed request is a value, not a thrown exception.** Every call resolves to a `Result<T>` discriminated union, so you branch on `result.success` instead of wrapping calls in `try/catch`:

```typescript
const result = await shell.http.get<User[]>('/api/users');

if (result.success) {
  render(result.data);          // result.data is User[]
} else {
  // result.error.status, result.error.message, result.error.data
  console.error(result.error.message);
}
```

The type:

```typescript
type Result<T> =
  | { success: true;  data: T;          requestKey?: string }
  | { success: false; error: HttpError; requestKey?: string };

interface HttpError {
  name: string;      // "HTTPError", "TimeoutError", …
  message: string;   // extracted from the server's JSON body when present
  status?: number;   // present when the server replied; absent for network errors
  data?: any;        // parsed server body, when it was JSON
}
```

### How URLs resolve — `apiUrl` is prepended to *relative* paths only

The shell is configured with an `apiUrl` base. It is prepended to **relative** request paths; an absolute (`http(s)://…`) or protocol-relative (`//host/…`) URL is used **verbatim**. (This changed in core 0.5.3 — previously the base was concatenated unconditionally, which mangled absolute URLs.)

```typescript
// With apiUrl: "/api"
shell.http.get('/users');                       // → /api/users
shell.http.get('https://other.example.com/x');  // → https://other.example.com/x  (untouched)
```

Keep your app's calls relative and let deployment decide where the API lives.

### Request options

Every method takes an options object as its last argument:

```typescript
await shell.http.post('/api/users', userData, {
  requestKey: 'save-user',        // de-dupe: a second call with the same key while one is in flight is ignored
  busyMessage: 'Creating user…',  // show the busy overlay for the duration of the request
  successMessage: 'User created', // toast on success …
  showSuccess: true,              // … but only when this is true
  noFeedback: false,              // true disables ALL automatic feedback (busy, success, error)
  headers: { 'X-Trace': 'abc' },  // extra headers
});
```

By default the client shows an **error toast automatically** on failure. Set `noFeedback: true` when you want to present the error yourself. Signatures:

```typescript
get<T>(url, options?)
post<T>(url, data?, options?)
put<T>(url, data?, options?)
patch<T>(url, data?, options?)
delete<T>(url, options?)
```

Session expiry (a `401`) is handled differently depending on the shell's auth strategy — see [Session recovery](#shellauth--session-recovery) below.

---

## `shell.navigation` — moving between apps

Navigation between apps is a **hard redirect** — a full page reload — because that reload is how Trailhead isolates one app from the next. There is no client-side router spanning apps.

```typescript
shell.navigation.navigate('/orders');  // full reload into the /orders app
```

Paths are relative to the shell's `appBasePath`, exactly like the `href`s in `shell.json`. You pass `/orders`; the shell prepends the deployment's base path for you, so your app never hard-codes it.

```typescript
const here = shell.navigation.getCurrentPath();   // e.g. "/app/orders"

const unsubscribe = shell.navigation.onRouteChange((path) => {
  console.log('route is now', path);
});
// later:
unsubscribe();
```

For routing **inside** your own app, use your framework's router as usual — pass the `basePath` the shell handed to `AppMount` as its `basename` so internal links resolve under the deployment's prefix.

---

## `shell.auth` — session recovery

Sessions expire. When one does, you don't want the user's work to vanish behind a silent `401`, and you don't want to bounce them to a full-page login that discards whatever they were doing. The shell gives every app two ways to recover, and **which one applies is decided by the shell's configured strategy**, not by your app. The strategy is set explicitly on the shell config (`auth: { strategy: … }`) — there is no auto-detection. See [Architecture → auth strategies](./ARCHITECTURE.md#the-two-auth-strategies) for how a shell is configured and [Deployment](./DEPLOYMENT.md) for where each one fits.

Both methods are always present on `shell.auth`, so calling either is always safe — the one that doesn't match the configured strategy simply resolves without doing anything useful.

### Credentials strategy — `reauthenticate` (the default)

For an app that owns its own login endpoint (nginx/Lucee). The shell shows a credential prompt — rendered by the adapter's native components — collects a username and password, hands them to **your** `attempt` function, and loops with an error message until it succeeds or the user cancels. The shell never sees the credentials and has no opinion on your auth mechanism.

```typescript
async function loadOrder(id: string) {
  const res = await shell.http.get(`/orders/${id}`);
  if (!res.success && res.error.status === 401) {
    const ok = await shell.auth.reauthenticate(async (username, password) => {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      return r.ok; // did this credential pair work?
    });
    if (ok) return loadOrder(id); // session is fresh — retry
  }
  return res;
}
```

`reauthenticate` returns `true` once a session is re-established (by this tab *or* another one — a success in one open tab closes the prompt in all of them via `BroadcastChannel`), or `false` if the user cancelled. Concurrent callers share a single prompt rather than stacking dialogs.

Under this strategy `shell.http` does **not** recover automatically — a `401` is surfaced to you as an `ErrorResult`, and you call `reauthenticate` yourself.

### Cognito strategy — `recoverSession` + automatic `shell.http` recovery

For a hosted-UI identity provider (e.g. AWS Cognito Managed Login) sitting at the edge — the layout the [aws-static-hosting](https://github.com/herdingbits/aws-static-hosting) gateway provides. The app never sees credentials; tokens live in `HttpOnly` cookies. The only levers are "ask the edge to refresh" and "redirect to sign-in", so there is no prompt.

Under this strategy `shell.http` recovers for you: a `401` triggers one `POST` to the refresh endpoint (default `/_auth/refresh`); on a `2xx` the original request is retried once; otherwise the browser is redirected to sign-in (default `/_auth/signin?return=<current path>`). **Your app code does nothing special** — it makes the call and reads the `Result`:

```typescript
const result = await shell.http.get('/orders'); // 401 → refresh+retry, or redirect to sign-in
```

To drive recovery by hand, call `recoverSession`:

```typescript
if (!result.success && result.error.status === 401) {
  if (await shell.auth.recoverSession()) retryOriginalRequest();
}
```

`recoverSession` resolves `true` when the session was refreshed in place (retry your request). On the redirect path, in a real browser, it does not resolve — the page is already navigating to sign-in. Under the `credentials` strategy it resolves `false` immediately (use `reauthenticate` instead).

### Which do I call?

You generally don't have to choose per call — write for the deployment you're targeting. If you want app code that works under either strategy, handle a `401` from `shell.http` by trying `recoverSession()` first (a no-op false under credentials) and falling back to `reauthenticate()`. In practice most apps know their deployment and use one.

---

## Quick reference

| Call | Returns | Notes |
|---|---|---|
| `feedback.busy(msg)` / `feedback.clear()` | `void` | Busy overlay |
| `feedback.success/error/warning/info(msg, duration?)` | `void` | Toasts |
| `feedback.alert(msg, variant?, duration?)` | `void` | Toast, explicit variant |
| `feedback.confirm(msg, title?)` | `Promise<boolean>` | OK/Cancel |
| `feedback.ok(msg, title?)` | `Promise<void>` | Single OK |
| `feedback.yesNo(msg, title?)` | `Promise<boolean>` | Yes/No |
| `feedback.yesNoCancel(msg, title?)` | `Promise<'yes'\|'no'\|'cancel'>` | Three-way |
| `feedback.custom(msg, title, buttons)` | `Promise<T \| null>` | Arbitrary buttons |
| `http.get/post/put/patch/delete(...)` | `Promise<Result<T>>` | `apiUrl` on relative paths only |
| `navigation.navigate(path)` | `void` | Hard redirect |
| `navigation.getCurrentPath()` | `string` | |
| `navigation.onRouteChange(cb)` | `() => void` | Returns unsubscribe |
| `auth.reauthenticate(attempt)` | `Promise<boolean>` | Credentials strategy |
| `auth.recoverSession()` | `Promise<boolean>` | Cognito strategy; auto-invoked by `http` on 401 |

---

## See also

- [Getting Started](./GETTING_STARTED.md) — build a shell and first SPA end to end
- [Architecture Overview](./ARCHITECTURE.md) — how the shell, adapters, and isolation fit together
- [Creating Adapters](./CREATING_ADAPTERS.md) — supply the design system behind `feedback` and the credential prompt
- [Deployment](./DEPLOYMENT.md) — static hosting and the Cognito gateway path
