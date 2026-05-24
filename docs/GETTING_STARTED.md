# Getting Started with Trailhead

This guide walks you through creating a Trailhead shell and your first SPA using the Web Awesome design system.

## What You'll Build

- An application shell with navigation and shared services
- A demo SPA that uses the shell's HTTP client and feedback system
- A production-ready deployment structure

## Prerequisites

- Node.js 18+ and npm
- Basic knowledge of TypeScript and Vite

## Quickest Path

Use the CLI — it scaffolds everything in one command:

```bash
npx @herdingbits/create-trailhead my-app
cd my-app/shell && npm install && npm start
```

The rest of this guide walks you through what the CLI generates and why.

---

## Step 1: Create the Shell

### 1.1 Install Dependencies

```bash
mkdir -p my-app/shell && cd my-app/shell
npm init -y
npm install @herdingbits/trailhead-core @herdingbits/trailhead-webawesome
npm install -D vite typescript @awesome.me/webawesome
```

### 1.2 Shell Entry Point (`src/shell.ts`)

```typescript
import { Trailhead } from '@herdingbits/trailhead-core';
import { WebAwesomeAdapter, ShellApp } from '@herdingbits/trailhead-webawesome';
import '@herdingbits/trailhead-webawesome/shell.css';

const appBasePath = import.meta.env.VITE_APP_BASE_PATH || '';
const shellUrl    = (window as any).SHELL_DEV_URL || appBasePath;
const apiUrl      = (window as any).APP_CONFIG?.apiUrl || '';

const shell = new Trailhead({
  adapter: new WebAwesomeAdapter(),
  appBasePath,
  shellUrl,
  apiUrl,
});

ShellApp.mount(shell);
```

### 1.3 HTML Entry Point (`index.html`)

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

### 1.4 Navigation Config (`public/navigation.json`)

```json
[
  {
    "id": "demo",
    "path": "/demo",
    "app": "demo",
    "icon": "house",
    "label": "Demo",
    "order": 1
  }
]
```

Icons use Font Awesome free names — see [fontawesome.com/icons](https://fontawesome.com/icons).

### 1.5 Vite Config (`vite.config.ts`)

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
        output: {
          entryFileNames: 'shell.js',
          assetFileNames: 'shell.[ext]',
        },
      },
    },
  };
});
```

### 1.6 Build Script (`package.json`)

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build && npm run copy-webawesome",
    "copy-webawesome": "rm -rf dist/webawesome && cp -R node_modules/@awesome.me/webawesome/dist-cdn dist/webawesome"
  }
}
```

The `copy-webawesome` step bundles Web Awesome into the shell's static output so it's served from the same origin as the shell.

---

## Step 2: Create Your First SPA

SPAs can use any framework. Here's a vanilla TypeScript example — no framework needed.

### 2.1 Install Dependencies

```bash
cd .. && mkdir -p apps/demo && cd apps/demo
npm init -y
npm install -D vite typescript @herdingbits/trailhead-types
```

### 2.2 SPA Entry Point (`src/index.ts`)

```typescript
import type { ShellAPI } from '@herdingbits/trailhead-types';

declare global {
  interface Window { shell: ShellAPI; }
}

// Mock shell for standalone development
if (!window.shell) {
  window.shell = {
    feedback: {
      busy: (msg: string) => console.log('[Mock] busy:', msg),
      clear: () => {},
      success: (msg: string) => console.log('[Mock] success:', msg),
      error: (msg: string) => console.error('[Mock] error:', msg),
      warning: (msg: string) => console.warn('[Mock] warning:', msg),
      info: (msg: string) => console.log('[Mock] info:', msg),
      confirm: async () => true,
      yesNo: async () => true,
      yesNoCancel: async () => 'yes' as const,
      alert: async () => {},
      ok: async () => {},
      custom: async () => null,
    },
    http: {
      get: async (url: string) => { console.log('[Mock] GET', url); return { success: true, data: {} as any }; },
      post: async (url: string) => { console.log('[Mock] POST', url); return { success: true, data: {} as any }; },
      put: async (url: string) => { console.log('[Mock] PUT', url); return { success: true, data: {} as any }; },
      patch: async (url: string) => { console.log('[Mock] PATCH', url); return { success: true, data: {} as any }; },
      delete: async (url: string) => { console.log('[Mock] DELETE', url); return { success: true, data: {} as any }; },
    },
    navigation: {
      navigate: (path: string) => console.log('[Mock] navigate:', path),
      getCurrentPath: () => '/demo',
      onRouteChange: () => () => {},
    },
  } as unknown as ShellAPI;
}

function mount(container: HTMLElement): void {
  container.innerHTML = `
    <div style="padding: 2rem">
      <h1>Demo App</h1>
      <wa-button variant="brand" id="greet-btn">
        <wa-icon slot="prefix" name="hand-wave"></wa-icon>
        Say Hello
      </wa-button>
    </div>
  `;
  container.querySelector('#greet-btn')!.addEventListener('click', () => {
    window.shell.feedback.success('Hello from your first Trailhead SPA!');
  });
}

// Called by shell when your app.js is loaded
window.AppMount = (container: HTMLElement, _basePath: string) => mount(container);

// Auto-mount for standalone dev
const root = document.getElementById('root');
if (root) mount(root);
```

### 2.3 Vite Config (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    cors: true,
    proxy: {
      '/webawesome': { target: 'http://localhost:3001', changeOrigin: true },
      '/shell.json':  { target: 'http://localhost:3001', changeOrigin: true },
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

The proxy ensures Web Awesome assets resolve in standalone dev mode without the shell running.

---

## Step 3: Development Workflow

### Standalone SPA development (fastest)

```bash
cd my-app/apps/demo && npm run dev
# http://localhost:3000 — mock shell, hot reload
```

### Integration testing with the shell

```bash
# 1. Build the SPA
cd my-app/apps/demo && npm run build

# 2. Copy into the shell's public directory
mkdir -p ../shell/public/demo
cp dist/app.js ../shell/public/demo/

# 3. Start the shell
cd ../shell && npm run dev
# http://localhost:3001 — click "Demo" in the nav
```

---

## Step 4: Build for Production

```bash
cd my-app/shell  && npm run build   # → shell/dist/
cd my-app/apps/demo && npm run build # → apps/demo/dist/app.js
```

Assemble the deployment:

```
deploy/
├── index.html          # Shell HTML
├── shell.js
├── shell.css
├── navigation.json
├── webawesome/         # Web Awesome assets
└── demo/
    ├── index.html      # Copy of shell HTML
    └── app.js
```

Upload `deploy/` to any static host — S3, Netlify, GitHub Pages. No URL rewrites needed.

---

## Step 5: Using Web Awesome Components

Because the shell loads the Web Awesome autoloader, all `wa-*` components are available in every SPA with zero imports:

```html
<wa-button variant="brand">Save</wa-button>
<wa-input label="Email" type="email"></wa-input>
<wa-card>...</wa-card>
<wa-icon name="envelope"></wa-icon>
<wa-dialog label="Confirm">...</wa-dialog>
```

This works in vanilla TS, React, Vue — whatever your SPAs use.

---

## Troubleshooting

**SPA not loading** — check `app.js` is in `shell/public/<app-name>/`, verify `navigation.json` path is correct, check browser console.

**404 on `/webawesome/...`** — ensure the shell's `copy-webawesome` step ran after build, or that the Vite proxy is configured for standalone mode.

**Type errors** — ensure `@herdingbits/trailhead-types` is installed as a dev dependency.

---

## Next Steps

- [Architecture Overview](./ARCHITECTURE.md)
- [Creating custom adapters](./CREATING_ADAPTERS.md)
- [CloudScape adapter](../examples/cloudscape-site/) for React-first teams
- [i18n plugin](../tools/vite-i18n-plugin/README.md) for build-time translations
