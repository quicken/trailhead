# Getting Started with Trailhead

**By the end of this guide you'll have a running shell and a real SPA loading inside it — and you'll understand every file you touched.** We'll use the Web Awesome design system; a React/CloudScape shell differs only in the adapter and the mount call. The build is deliberately boring: TypeScript, Vite, static output. The interesting part is how little there is.

New to the *why*? Skim the [Architecture Overview](./ARCHITECTURE.md) first. Want the full `window.shell` surface as you build? Keep the [Shell API](./SHELL_API.md) open alongside this.

## What you'll build

- An application shell with navigation and shared services.
- A demo SPA that uses the shell's HTTP client and feedback system.
- A production deployment layout you can upload to any static host.

## Prerequisites

- Node.js 18+ and npm.
- Working knowledge of TypeScript and Vite.

## Quickest path

The CLI scaffolds the whole thing — shell, a demo app, configs — in one command:

```bash
npx @herdingbits/create-trailhead my-app
cd my-app/shell && npm install && npm start
```

Visit **http://localhost:3001**. The rest of this guide walks through what that scaffold contains and why, so you can build or modify it by hand.

---

## Step 1: Create the shell

### 1.1 Install

```bash
mkdir -p my-app/shell && cd my-app/shell
npm init -y
npm install @herdingbits/trailhead-core @herdingbits/trailhead-webawesome
npm install -D vite typescript @awesome.me/webawesome
```

### 1.2 Shell entry point (`src/shell.ts`)

Start-up is two steps: `Trailhead.create(...)` does the async work and resolves with a loaded shell, then `ShellApp.mount(shell)` wires it to the page.

```typescript
import { Trailhead } from '@herdingbits/trailhead-core';
import { WebAwesomeAdapter, ShellApp } from '@herdingbits/trailhead-webawesome';
import '@herdingbits/trailhead-webawesome/shell.css';

const appBasePath = import.meta.env.VITE_APP_BASE_PATH || '';
const shellUrl    = (window as any).SHELL_DEV_URL || appBasePath;

const shell = await Trailhead.create({
  adapter: new WebAwesomeAdapter(),
  appBasePath,
  shellUrl,
  // apiUrl, auth and allowedOrigins come from shell.json (or pass them here to fix them at
  // build time). Omitting auth gives the default credentials strategy; see Step 6.
});

ShellApp.mount(shell);
```

Top-level `await` is fine — Vite's default build target supports it.

### 1.3 HTML entry point (`index.html`)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Application</title>
    <link rel="stylesheet" href="/webawesome/styles/themes/default.css" />
  </head>
  <body>
    <div id="shell-sidebar"></div>
    <div id="shell-main"><div id="shell-content"></div></div>
    <script type="module" src="/src/shell.ts"></script>
  </body>
</html>
```

### 1.4 Shell manifest (`public/shell.json`)

```json
{
  "apps": [
    { "id": "demo", "basePath": "/demo", "src": "demo" }
  ],
  "nav": [
    { "type": "link", "label": "Demo", "icon": "house", "order": 1, "href": "/demo" }
  ]
}
```

`apps` lists the SPAs the shell can mount — each with an `id`, the `basePath` it's served under, and the `src` asset-directory name (the shell loads `<basePath>/app.js` and `<basePath>/<src>.css`). `nav` describes the menu: a mix of `link`, `section` (a labelled group of links), and `divider` items. Icons use Font Awesome free names — see [fontawesome.com/icons](https://fontawesome.com/icons). This file is read at runtime, so adding or reordering apps never needs a shell rebuild.

### 1.5 Vite config (`vite.config.ts`)

```typescript
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_APP_BASE_PATH ? `${env.VITE_APP_BASE_PATH}/` : '/';

  return {
    base,
    server: { port: 3001 },
    build: {
      manifest: true,
      rollupOptions: {
        output: { entryFileNames: 'shell.js', assetFileNames: 'shell.[ext]' },
      },
    },
  };
});
```

### 1.6 Scripts (`package.json`)

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "start": "vite",
    "build": "vite build && npm run copy-webawesome",
    "copy-webawesome": "rm -rf dist/webawesome && cp -R node_modules/@awesome.me/webawesome/dist-cdn dist/webawesome"
  }
}
```

`copy-webawesome` bundles Web Awesome into the shell's static output so every SPA gets `wa-*` components from the same origin, with no imports.

---

## Step 2: Create your first SPA

SPAs can use any framework. Here's a vanilla TypeScript one — no framework needed. The contract is a single exported mount function: **`window.AppMount(root, basePath)`**.

### 2.1 Install

```bash
cd .. && mkdir -p apps/demo && cd apps/demo
npm init -y
npm install -D vite typescript @herdingbits/trailhead-types
```

### 2.2 SPA entry point (`src/index.ts`)

```typescript
import type { ShellAPI } from '@herdingbits/trailhead-types';

declare global {
  interface Window {
    shell: ShellAPI;
    AppMount?: (root: HTMLElement, basePath: string) => void;
  }
}

// A mock shell so the app runs standalone (http://localhost:3000) before the real
// shell exists. In integration/production the real window.shell is already in place.
if (!window.shell) {
  window.shell = {
    version: '0.0.0-mock',
    feedback: {
      busy: (m: string) => console.log('[mock] busy:', m),
      clear: () => {},
      success: (m: string) => console.log('[mock] success:', m),
      error:   (m: string) => console.error('[mock] error:', m),
      warning: (m: string) => console.warn('[mock] warning:', m),
      info:    (m: string) => console.log('[mock] info:', m),
      alert:   () => {},
      confirm: async () => true,
      ok:      async () => {},
      yesNo:   async () => true,
      yesNoCancel: async () => 'yes' as const,
      custom:  async () => null,
    },
    http: {
      get:    async (u: string) => { console.log('[mock] GET', u);    return { success: true, data: {} as any }; },
      post:   async (u: string) => { console.log('[mock] POST', u);   return { success: true, data: {} as any }; },
      put:    async (u: string) => { console.log('[mock] PUT', u);    return { success: true, data: {} as any }; },
      patch:  async (u: string) => { console.log('[mock] PATCH', u);  return { success: true, data: {} as any }; },
      delete: async (u: string) => { console.log('[mock] DELETE', u); return { success: true, data: {} as any }; },
    },
    navigation: {
      navigate: (p: string) => console.log('[mock] navigate:', p),
      getCurrentPath: () => '/demo',
      onRouteChange: () => () => {},
    },
    auth: {
      reauthenticate: async () => { console.log('[mock] reauthenticate'); return true; },
      recoverSession: async () => { console.log('[mock] recoverSession'); return false; },
    },
  } as unknown as ShellAPI;
}

function mount(root: HTMLElement): void {
  root.innerHTML = `
    <div style="padding: 2rem">
      <h1>Demo App</h1>
      <wa-button variant="brand" id="greet-btn">
        <wa-icon slot="prefix" name="hand-wave"></wa-icon>
        Say Hello
      </wa-button>
    </div>
  `;
  root.querySelector('#greet-btn')!.addEventListener('click', () => {
    window.shell.feedback.success('Hello from your first Trailhead SPA!');
  });
}

// The shell calls this after loading your app.js. `basePath` is this app's full
// mount prefix — pass it to a router as its basename if you use one.
window.AppMount = (root: HTMLElement, _basePath: string) => mount(root);

// Auto-mount when running standalone.
const root = document.getElementById('root');
if (root) mount(root);
```

Note `AppMount`, not `init(shell)` — the shell has no `init` hook; `window.AppMount(root, basePath)` is the entire contract.

### 2.3 Vite config (`vite.config.ts`)

This is where the dev loop is set up. The SPA runs standalone on **:3000** and proxies the shell's runtime assets back to the shell on **:3001**, so you develop against the real shell chrome without copying any build output:

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    cors: true,
    proxy: {
      '/shell.json':  { target: 'http://localhost:3001', changeOrigin: true },
      '/webawesome':  { target: 'http://localhost:3001', changeOrigin: true },
      '/favicon.ico': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'app.js',
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
```

`inlineDynamicImports` is what makes the production build a single `app.js` — the one file the shell loads. (The real example apps proxy a couple more shell paths; add proxy entries as your shell serves more assets.)

---

## Step 3: The development workflow

There is **no copy step** in the dev loop. You run two servers and let the SPA's Vite proxy stitch them together.

```bash
# Terminal 1 — the shell: serves shell.json, nav, and shell assets on :3001
cd my-app/shell && npm install && npm run dev

# Terminal 2 — the SPA: standalone with hot reload on :3000, proxying to the shell
cd my-app/apps/demo && npm install && npm run dev
```

Open **http://localhost:3000**. Your app runs with hot reload, pulling `shell.json` and the Web Awesome assets from the shell on :3001 through the proxy you configured in Step 2.3. Edit the app and the browser updates instantly — nothing is rebuilt or copied into the shell.

Want to see the app loaded *by* the shell's own routing instead (menu, chrome, the lot)? That's the production assembly in Step 4 — in day-to-day development the :3000 proxy loop is the fast path.

> The old "build the SPA, then `cp dist/app.js` into `shell/public/<app>/`" instruction is gone. Copying apps into a folder is the *production* assembly (Step 4), not the dev loop. In dev, the proxy means the shell never needs your built output.

---

## Step 4: Build for production

Build the shell and each app:

```bash
cd my-app/shell     && npm run build   # → shell/dist/   (shell.js, shell.css, shell.json, webawesome/)
cd my-app/apps/demo && npm run build   # → apps/demo/dist/app.js
```

Then assemble one deploy directory. The shell's files sit at the root; **each app gets its own folder with its own `index.html`** — a copy of the shell page, which is what lets a deep link or refresh on `/demo` boot the shell and load the app:

```
deploy/
├── index.html          # shell page
├── shell.js
├── shell.css
├── shell.json          # manifest: apps + nav
├── webawesome/         # Web Awesome assets
└── demo/
    ├── index.html      # copy of the shell page  ← the per-route rule
    ├── app.js
    └── demo.css
```

Upload `deploy/` to any static host — no URL rewrites. The full picture (nginx, S3 + CloudFront, and the Cognito gateway) is in [Deployment](./DEPLOYMENT.md); the example sites' `build-for-gateway.sh` automates exactly this assembly.

---

## Step 5: Using Web Awesome components

Because the shell loads the Web Awesome autoloader, every `wa-*` component is available in every SPA with zero imports:

```html
<wa-button variant="brand">Save</wa-button>
<wa-input label="Email" type="email"></wa-input>
<wa-card>…</wa-card>
<wa-icon name="envelope"></wa-icon>
<wa-dialog label="Confirm">…</wa-dialog>
```

This works in vanilla TS, React, Vue — whatever your SPAs use.

---

## Step 6: Handling session expiry

Real apps eventually hit an expired session — a call comes back `401` partway through the user's work. How you recover depends on the shell's **auth strategy**, chosen on the shell config. See [Shell API → session recovery](./SHELL_API.md#shellauth--session-recovery) for the full behaviour; here's each one wired into this demo.

### Credentials strategy (the default) — in-place prompt

For an app that owns its login endpoint (nginx/Lucee). The shell shows a credential prompt, hands what the user types to **your** `attempt` function, and retries in place:

```typescript
async function reauthAndRetry(): Promise<void> {
  const ok = await window.shell.auth.reauthenticate(async (username, password) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return res.ok;
  });
  window.shell.feedback.info(ok ? 'Signed back in!' : 'Sign-in cancelled.');
}
```

`reauthenticate` re-prompts with an error on a wrong password, shares one prompt across concurrent callers, and closes this tab's prompt automatically if another tab logs back in first. In real code you'd call it from wherever you handle a `401`; wiring it to a button (like `greet-btn` above) is just the easiest way to see the prompt in standalone dev — the Step 2.2 mock has no real session to expire.

The shell is configured for this strategy by omitting `auth`, or setting it explicitly:

```typescript
await Trailhead.create({ adapter: new WebAwesomeAdapter(), auth: { strategy: 'credentials' } });
```

### Cognito strategy — redirect / refresh at the edge

For a hosted-UI identity provider behind the [aws-static-hosting](https://github.com/herdingbits/aws-static-hosting) gateway, where the app never sees credentials. Configure it on the shell:

```typescript
await Trailhead.create({ adapter: new WebAwesomeAdapter(), auth: { strategy: 'cognito' } });
```

Then **your app code does nothing special** — `shell.http` auto-recovers on a `401` (one `POST /_auth/refresh`, retry on success, else redirect to `/_auth/signin`):

```typescript
const result = await window.shell.http.get('/orders'); // 401 → refresh+retry, or redirect to sign-in
if (result.success) render(result.data);
```

To drive it manually, `window.shell.auth.recoverSession()` resolves `true` when the session was refreshed in place (retry your request) and otherwise redirects away. The example shell reads the strategy from `shell.json` (`build-for-gateway.sh` writes `cognito` behind the gateway; without it the default is `credentials`), so the same build runs in both places.

---

## Troubleshooting

- **SPA not loading in the shell** — in dev, confirm both servers are up (shell :3001, app :3000) and you're visiting :3000; check that `shell.json`'s `basePath`/`src` match the app. In production, confirm `app.js` and `<src>.css` are at `<basePath>/` and the per-route `index.html` exists.
- **404 on `/webawesome/…`** — the shell's `copy-webawesome` step didn't run after build (production), or the Vite proxy entry is missing (standalone dev).
- **Type errors on `window.shell`** — install `@herdingbits/trailhead-types` as a dev dependency and declare the `Window` augmentation (Step 2.2).
- **`window.shell.auth is undefined`** — your mock (or custom shell) is missing the `auth` block; every `ShellAPI` has one. At the real-shell level, an adapter supplies the credential prompt or uses `NoopAuthAdapter`.

---

## Next steps

- [Shell API](./SHELL_API.md) — the complete `window.shell` reference, the page to keep open while building
- [Architecture Overview](./ARCHITECTURE.md) — why the shell works the way it does
- [Creating Adapters](./CREATING_ADAPTERS.md) — back the shell with your own design system
- [Deployment](./DEPLOYMENT.md) — static hosting and the Cognito gateway
- [CloudScape example](../examples/cloudscape-site/) — a React-first shell
- [i18n plugin](../tools/vite-i18n-plugin/README.md) — build-time translations
