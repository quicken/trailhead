# Trailhead - Simple App Orchestration

**What if every team could build and deploy their apps independently while sharing a common shell?** No webpack magic. No complex tooling. Just the browser's native module system and some common sense.

Trailhead is an application shell that orchestrates multiple SPAs within a shared layout — the classic SaaS pattern where you have a main menu and dozens of independent modules. It provides shared infrastructure (navigation, HTTP, feedback) while letting each app use any framework and deploy independently.

**[Read the full story →](https://www.herdingbits.com/blog/building-trailhead-micro-frontend-framework)** | **[Try it live →](https://www.herdingbits.com/sample/trailhead)**

---

## Project Structure

```
trailhead/
├── packages/
│   ├── core/                     # @herdingbits/trailhead-core
│   ├── types/                    # @herdingbits/trailhead-types
│   ├── webawesome/               # @herdingbits/trailhead-webawesome
│   ├── cloudscape/               # @herdingbits/trailhead-cloudscape
│   └── create-trailhead/         # @herdingbits/create-trailhead (CLI scaffolding)
├── examples/
│   ├── webawesome-site/          # Web Awesome reference implementation
│   └── cloudscape-site/          # CloudScape reference implementation
└── tools/
    ├── vite-i18n-plugin/         # Build-time i18n
    └── preview-server/           # Local production preview
```

## Installation

```bash
# Web Awesome shell (vanilla TypeScript)
npm install @herdingbits/trailhead-core @herdingbits/trailhead-webawesome

# CloudScape shell (React)
npm install @herdingbits/trailhead-core @herdingbits/trailhead-cloudscape

# SPA types only
npm install --save-dev @herdingbits/trailhead-types
```

## Quick Start

### CLI (Recommended)

```bash
npx @herdingbits/create-trailhead my-app
cd my-app/shell && npm install && npm start
```

Visit http://localhost:3001

### Web Awesome Shell

```typescript
import { Trailhead } from '@herdingbits/trailhead-core';
import { WebAwesomeAdapter, ShellApp } from '@herdingbits/trailhead-webawesome';

const shell = new Trailhead({
  adapter: new WebAwesomeAdapter(),
  appBasePath: import.meta.env.VITE_APP_BASE_PATH || '',
  shellUrl: (window as any).SHELL_DEV_URL || '',
  apiUrl: (window as any).APP_CONFIG?.apiUrl || '',
});

ShellApp.mount(shell);
```

### CloudScape Shell (React)

```typescript
import { createRoot } from 'react-dom/client';
import { Trailhead } from '@herdingbits/trailhead-core';
import { CloudScapeAdapter, ShellApp } from '@herdingbits/trailhead-cloudscape';
import '@cloudscape-design/global-styles/index.css';

const shell = new Trailhead({
  adapter: new CloudScapeAdapter(),
  appBasePath: import.meta.env.VITE_APP_BASE_PATH || '',
  shellUrl: (window as any).SHELL_DEV_URL || '',
  apiUrl: (window as any).APP_CONFIG?.apiUrl || '',
});

createRoot(document.getElementById('app')!).render(<ShellApp shell={shell} />);
```

### Single Page Application

```typescript
import type { ShellAPI } from '@herdingbits/trailhead-types';

// Mock shell for standalone development
if (!window.shell) {
  window.shell = { /* mock implementation */ } as ShellAPI;
}

// Called by the shell after loading your app.js
window.AppMount = (container: HTMLElement, basePath: string) => {
  window.shell.feedback.success('App loaded!');
  container.innerHTML = '<div id="root"></div>';
  // Mount your framework here — or go frameworkless
};

// Auto-mount when running standalone
const rootEl = document.getElementById('root');
if (rootEl) window.AppMount(rootEl, '');
```

## Configuration

### Shell config fields

| Field | Purpose | Default |
|---|---|---|
| `appBasePath` | URL prefix for SPA routing, asset loading, and nav links | `""` |
| `shellUrl` | Where `shell.json` and shell assets are served from | `appBasePath` |
| `apiUrl` | Base URL for all HTTP requests via `shell.http` | `""` |

Set `appBasePath` when deploying to a subdirectory (e.g. `VITE_APP_BASE_PATH=/app`). Leave empty for root deployments.

### Adapter config

| Adapter | Option | Purpose |
|---|---|---|
| `WebAwesomeAdapter` | `webAwesomeUrl` | Where Web Awesome is hosted. Defaults to `${shellUrl}/webawesome` |
| `CloudScapeAdapter` | `cloudscapeUrl` | CloudScape global-styles CSS URL. Omit if importing the CSS directly |

### Runtime globals

| Global | Purpose |
|---|---|
| `window.APP_CONFIG.apiUrl` | Runtime API base URL, set via a `<script>` tag in your HTML |
| `window.SHELL_DEV_URL` | Overrides `shellUrl` — points asset/navigation fetches at a local shell dev server |

## Developing Locally

```bash
# SPA standalone (port 3000, hot reload)
cd examples/webawesome-site/apps/demo && npm install && npm start

# Test with shell: build the SPA, copy it, then start the shell (port 3001)
npm run build && cp dist/app.js ../shell/public/demo/
cd ../shell && npm install && npm start
```

## Preview Server

```bash
cd tools/preview-server
npm run build:both && npm start
# http://localhost:8081/sample/trailhead/webawesome
# http://localhost:8081/sample/trailhead/cloudscape
```

## Re-authentication

Sessions expire. When one does, the last thing you want is for a user's work to just vanish behind a silent failure — or to bounce them to a full-page login that throws away whatever they were doing.

Trailhead gives every app a shared way to handle this in place:

```typescript
async function fetchOrder(id: string) {
  const res = await fetch(`/api/orders/${id}`);
  if (res.status === 401) {
    const attempt = (username: string, password: string) => tryLogin(username, password);
    const ok = await window.shell.auth.reauthenticate(attempt);
    if (ok) return fetchOrder(id); // retry now that the session is fresh
  }
  return res;
}
```

`reauthenticate()` asks the adapter to show a credential prompt, calls your `attempt` function with whatever the user types, and keeps re-prompting (with an error message) until it succeeds or the user cancels. If a second tab logs back in first, every other tab's prompt closes itself automatically — nobody has to solve the same login twice.

Each design system adapter renders this prompt with its own native components (a real `<wa-dialog>` for Web Awesome, a real `<Modal>` for CloudScape), so it looks and feels like the rest of your app. Building your own adapter and not ready to deal with a login UI yet? A `NoopAuthAdapter` is included — it just declines every re-authentication attempt, so requests fail the way they always did until you're ready to add a real prompt.

## Navigation

`shell.json` is read at runtime — add, remove, or reorder menu items without rebuilding. It has two parts: `apps` (the SPAs the shell can mount) and `nav` (the menu structure):

```json
{
  "apps": [
    { "id": "customers", "basePath": "/customers", "src": "customers" }
  ],
  "nav": [
    {
      "type": "section",
      "label": "Applications",
      "icon": "grid",
      "order": 1,
      "children": [
        { "type": "link", "label": "Customers", "icon": "users", "order": 1, "href": "/customers" }
      ]
    }
  ]
}
```

A nav item is one of three types: `link` (points at a `href`, optionally with a `badge` count callback), `section` (a labelled group of links), or `divider` (a visual separator). Icons use Font Awesome free names when using the Web Awesome adapter.

## Published Packages

- **[@herdingbits/trailhead-core](packages/core)** — Core shell orchestration
- **[@herdingbits/trailhead-types](packages/types)** — TypeScript type definitions
- **[@herdingbits/trailhead-webawesome](packages/webawesome)** — Web Awesome adapter (vanilla TypeScript)
- **[@herdingbits/trailhead-cloudscape](packages/cloudscape)** — CloudScape adapter (React)
- **[@herdingbits/create-trailhead](packages/create-trailhead)** — CLI scaffolding tool

## Further Reading

- [Building Trailhead — architecture decisions, AWS deployment, and the React exit strategy](https://www.herdingbits.com/blog/building-trailhead-micro-frontend-framework)
- [Creating Adapters](docs/CREATING_ADAPTERS.md)
- [Architecture Overview](docs/ARCHITECTURE.md)

## License

MIT — See [LICENSE](LICENSE)
