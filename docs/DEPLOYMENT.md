# Deployment

**A Trailhead site is a folder of static files — deploying it is copying that folder to a web server.** There is no build step on the server, no Node process, no URL-rewrite configuration to get right. The whole deployment model follows from one rule the shell relies on: *every route has its own `index.html`.* Get that right and the site works on anything that serves files — nginx, S3 + CloudFront, GitHub Pages, a USB stick.

This page covers two things: static hosting in general, and the specific path for putting an app behind a Cognito identity provider using the [aws-static-hosting](https://github.com/herdingbits/aws-static-hosting) gateway. If you haven't built a site yet, [Getting Started](./GETTING_STARTED.md) walks through the build; this picks up where that leaves off.

## The deploy layout

After building the shell and each app, you assemble a single directory. The shell's own files sit at the root (or under `appBasePath`); each app gets its own sibling folder named by its `basePath`:

```
deploy/
├── index.html          # the shell page
├── shell.js
├── shell.css
├── shell.json          # manifest: apps + nav (read at runtime)
├── webawesome/         # design-system assets (Web Awesome sites)
├── customers/
│   ├── index.html      # a COPY of the shell page
│   ├── app.js          # the customers SPA bundle
│   └── customers.css   # <src>.css — matches the app's `src` in shell.json
└── orders/
    ├── index.html      # a copy of the shell page
    ├── app.js
    └── orders.css
```

Three things make this work:

- **`shell.json` is runtime config.** The shell `fetch`es it on boot to learn which apps exist and how to build the nav. Add, remove, or reorder apps by editing this one file and re-uploading — no rebuild of the shell.
- **Each app ships a single bundled `app.js`.** SPAs build with `inlineDynamicImports` so there is exactly one JS file to place at `<basePath>/app.js`, plus its `<src>.css`.
- **Every route has its own `index.html`.** This is the load-bearing rule — the next section explains why.

### Why every route needs its own `index.html`

When a user deep-links to `/customers` (or refreshes there), the server gets a request for `/customers`, not for the shell at `/`. On a static host there is no server-side router to say "serve the shell for any path." So Trailhead's model is: **each route is a real `index.html` on disk** — a copy of the shell page. The browser loads it, the shell boots, reads `window.location`, finds the matching app in `shell.json`, and mounts it. Same shell, same `shell.json`, different URL.

This is exactly why no URL-rewrite rules are needed, and why the site survives a hard refresh on any route. It is also why the production assembly *copies* the shell's `index.html` into every app folder.

> **Don't confuse this with the dev loop.** In development you run the shell on `:3001` and each SPA standalone on `:3000`, with the SPA's Vite config proxying `shell.json` and shell assets back to `:3001` — nothing is copied. The copy-into-each-folder step is the *production assembly* only. See [Getting Started → development workflow](./GETTING_STARTED.md#step-3-development-workflow).

## `appBasePath` and where the site lives

If you deploy at a server's root, `appBasePath` is `""` and asset URLs are absolute from `/`. If you deploy under a subdirectory — the common case — build the shell with that prefix so every asset URL, every `shell.json` nav `href`, and each app's base path resolve under it.

The recommended prefix is **`/app`** (set `VITE_APP_BASE_PATH=/app` at build time). It keeps the site root free for a public landing page and matches the default the aws-static-hosting gateway expects. The shell reads it from `import.meta.env.VITE_APP_BASE_PATH` in the example sites.

## Plain static hosting

Any file server works. There is no special configuration — you are serving files.

### nginx

```nginx
server {
  listen 80;
  root /var/www/trailhead;   # the assembled deploy/ folder

  # That's it. Each route has its own index.html on disk, so the default
  # "serve the file at this path" behaviour is already correct. No try_files
  # SPA-fallback rewrite is needed (or wanted).
  location / {
    index index.html;
  }
}
```

### S3 + CloudFront (no gateway)

Sync the folder up and point CloudFront at the bucket:

```bash
aws s3 sync deploy/ s3://my-bucket/app/ --delete
```

One wrinkle with S3 behind CloudFront: an S3 origin has **no directory index**, so an extensionless deep link like `/app/customers` won't resolve to `/app/customers/index.html` on its own. Either serve `index.html` objects at those keys (the assembly already places them) and link with the trailing path the object sits at, or configure CloudFront to map directory requests to `index.html`. The gateway path below solves this for you.

### Any other static host

Netlify, GitHub Pages, Cloudflare Pages, a plain Apache box — all fine. Upload the assembled folder. The only requirement is that the per-route `index.html` files are served at their paths; because they are real files, most hosts do the right thing with zero config.

## The aws-static-hosting gateway (Cognito)

When the site needs authentication and you don't want to run a server, the [aws-static-hosting](https://github.com/herdingbits/aws-static-hosting) gateway (a.k.a. jwt-auth-gateway) fronts the static files with a CloudFront + Lambda@Edge gate that enforces a Cognito hosted-UI (Managed Login) session. Trailhead pairs with it through the **`cognito` auth strategy** — the shell's `shell.http` auto-recovers an expired session against the gateway's `/_auth/*` endpoints. See [Architecture → auth strategies](./ARCHITECTURE.md#the-two-auth-strategies) and [Shell API → session recovery](./SHELL_API.md#shellauth--session-recovery) for the runtime behaviour; this is the deploy side.

### What the gateway expects

- The shell served under **`APP_BASE_PATH`** (default `/app`) — the gateway's `.env` and the shell's build base **must match**.
- **Every route is its own `index.html` object.** The gate rewrites an extensionless deep link `<APP_BASE_PATH>/<app>` to the S3 key `<APP_BASE_PATH>/<app>/index.html` (because S3-behind-OAC has no directory index — without that object CloudFront returns 403). This is the same per-route-`index.html` rule as above, now mandatory.
- The gateway exposes `/_auth/*`: `POST /_auth/refresh` (refresh the session cookie at the edge), `/_auth/signin` (redirect to the hosted UI), `/_auth/signout`. The shell's `cognito` strategy targets `/_auth/refresh` and `/_auth/signin` by default; both are overridable on the shell config.
- `window.APP_CONFIG` is injected into each `index.html` with `apiUrl` (the gateway's same-origin API proxy, e.g. `/api`) and `authMode: "cognito"`, which the shell reads to select the strategy.

### Build and deploy with the example scripts

The example sites ship two scripts that do exactly this assembly and sync. They are the reference for building any Trailhead site for the gateway.

**`examples/build-for-gateway.sh`** builds both example shells with `base = APP_BASE_PATH/`, injects `window.APP_CONFIG`, and lays out `examples/.deploy/<site>/` per the gateway's expectations — including copying the configured shell `index.html` into every app folder:

```bash
# both sites, APP_BASE_PATH=/app, authMode=cognito (the defaults)
examples/build-for-gateway.sh

# one site, explicit knobs
API_URL=/api AUTH_MODE=cognito APP_BASE_PATH=/app examples/build-for-gateway.sh webawesome
```

Knobs (all optional, with defaults): `APP_BASE_PATH=/app` (bucket prefix; `""` for root), `API_URL=/api` (the `shell.http` base, the gateway's same-origin proxy), `AUTH_MODE=cognito` (`cognito` or `credentials`).

**`examples/deploy-to-gateway.sh`** syncs one staged site to the gateway's S3 bucket with the same flags the gateway runbook uses (`--delete`, `--cache-control no-cache`), after a dry-run diff and a confirmation prompt:

```bash
examples/deploy-to-gateway.sh webawesome my-gateway-bucket us-east-1
# AWS_PROFILE, DISTRIBUTION_ID (to invalidate CloudFront), and YES=1 (skip prompt) are honoured
```

Two cautions the script enforces: `APP_BASE_PATH` here must match both the build and the gateway's `.env`; and only one Trailhead shell can own a given `APP_BASE_PATH` in a bucket, so the two example sites collide if synced to the same bucket+prefix — use separate buckets or deploy one at a time.

After syncing, reach the site **through CloudFront** (not the bucket URL): `<APP_BASE_PATH>/` boots the shell (which redirects to the first app), and `<APP_BASE_PATH>/_auth/signin` is the gateway's sign-in. For the gateway's own CloudFront/Lambda@Edge setup, Cognito wiring, and `.env` reference, see the [aws-static-hosting repo](https://github.com/herdingbits/aws-static-hosting).

## Checklist

- [ ] Shell built with the right `appBasePath` (`VITE_APP_BASE_PATH`) for where it's hosted.
- [ ] `shell.json` lists every app with the correct `basePath` and `src`.
- [ ] Each app placed at `<basePath>/app.js` + `<basePath>/<src>.css`.
- [ ] Each app folder has its own `index.html` (a copy of the shell page).
- [ ] Design-system assets present (`webawesome/` for Web Awesome sites).
- [ ] Behind the gateway: `APP_BASE_PATH` matches the gateway `.env`; `APP_CONFIG.authMode` is `cognito`; `/_auth/*` reachable.

## See also

- [Getting Started](./GETTING_STARTED.md) — build the shell and apps that produce this layout
- [Architecture Overview](./ARCHITECTURE.md) — the deployment architecture and the two auth strategies
- [Shell API](./SHELL_API.md) — session recovery as the app sees it
- [aws-static-hosting gateway](https://github.com/herdingbits/aws-static-hosting) — the Cognito gateway this pairs with
