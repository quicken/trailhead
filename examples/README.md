# Trailhead Examples

Working reference implementations for Trailhead application shells and SPAs.

## Available Examples

### Web Awesome Site
- **Location**: `examples/webawesome-site/`
- **Design System**: [Web Awesome](https://webawesome.com/) (successor to Shoelace, built by Font Awesome)
- **Shell**: Vanilla TypeScript
- **Apps**: `demo` (React, shell API showcase), `saas-demo` (vanilla TS, Web Awesome components)
- **Use Case**: Framework-agnostic shell; SPAs choose their own stack

### CloudScape Site
- **Location**: `examples/cloudscape-site/`
- **Design System**: [AWS CloudScape](https://cloudscape.design/) (React-based)
- **Shell**: React
- **Apps**: Demo app, SaaS demo
- **Use Case**: React-first architecture; both shell and SPAs use React

## Running Examples

### Development Mode

```bash
# Web Awesome shell (port 3001)
cd examples/webawesome-site/shell
npm install && npm run dev

# Demo app standalone (port 3000, in another terminal)
cd examples/webawesome-site/apps/demo
npm install && npm start
```

### Production Preview

```bash
cd tools/preview-server

# Build and preview Web Awesome site
npm run build:webawesome
npm start  # http://localhost:8081/sample/trailhead/webawesome

# Build and preview CloudScape site
npm run build:cloudscape
npm start
```

## Structure

```
examples/
├── webawesome-site/
│   ├── shell/              # Shell — uses @herdingbits/trailhead-webawesome
│   │   ├── src/shell.ts
│   │   └── public/shell.json
│   └── apps/
│       ├── demo/           # React SPA — shell API demo (feedback, HTTP, navigation)
│       └── saas-demo/      # Vanilla TS SPA — Web Awesome component demo
└── cloudscape-site/
    ├── shell/              # Shell — uses @herdingbits/trailhead-cloudscape
    └── apps/
        ├── demo/
        └── saas-demo/
```

## Shell Implementation

**Web Awesome (vanilla TypeScript):**
```typescript
import { Trailhead } from '@herdingbits/trailhead-core';
import { WebAwesomeAdapter, ShellApp } from '@herdingbits/trailhead-webawesome';

const shell = await Trailhead.create({
  adapter: new WebAwesomeAdapter(),
  appBasePath: import.meta.env.VITE_APP_BASE_PATH || '',
  apiUrl: (window as any).APP_CONFIG?.apiUrl || ''
});

ShellApp.mount(shell);
```

**CloudScape (React):**
```typescript
import { createRoot } from 'react-dom/client';
import { Trailhead } from '@herdingbits/trailhead-core';
import { CloudScapeAdapter, ShellApp } from '@herdingbits/trailhead-cloudscape';

const shell = await Trailhead.create({
  adapter: new CloudScapeAdapter(),
  appBasePath: import.meta.env.VITE_APP_BASE_PATH || '',
  apiUrl: (window as any).APP_CONFIG?.apiUrl || ''
});

createRoot(document.getElementById('app')!).render(<ShellApp shell={shell} />);
```

## SPA Pattern

SPAs assign `window.AppMount` and the shell calls it after loading `app.js`. Any framework works:

```typescript
// Vanilla TypeScript SPA
window.AppMount = (container: HTMLElement, _basePath: string) => {
  container.innerHTML = `<wa-button variant="brand">Hello</wa-button>`;
};

// React SPA
window.AppMount = (container: HTMLElement, _basePath: string) => {
  ReactDOM.createRoot(container).render(<App />);
};
```

Because the shell loads the Web Awesome autoloader, `wa-*` components are available in every hosted SPA at no bundle cost.

## Deploying behind the JWT Auth Gateway (Cognito)

Both example shells are deployable to the [`jwt-auth-gateway`](https://github.com/quicken/trailhead) (Cognito hosted-UI login at the CloudFront edge, tokens in `HttpOnly` cookies) out of the box. The shell picks its session-recovery strategy from a `window.APP_CONFIG` injected by the host page — there is no auto-detection, so nothing changes on an nginx/Lucee deployment.

Inject `APP_CONFIG` from the host HTML **before** the shell module loads:

```html
<!-- index.html, above <script type="module" src="/src/shell.ts"> -->
<script>
  window.APP_CONFIG = {
    apiUrl: "/api",        // same-origin gateway proxy → Authorization: Bearer <id-token>
    authMode: "cognito"    // omit (or any other value) to keep the default credentials strategy
  };
</script>
```

The shell then passes the matching strategy into `Trailhead.create`:

```typescript
const authMode = (window as any).APP_CONFIG?.authMode;

const shell = await Trailhead.create({
  adapter: new WebAwesomeAdapter(),
  appBasePath,
  apiUrl: (window as any).APP_CONFIG?.apiUrl || "",
  auth: authMode === "cognito" ? { strategy: "cognito" } : { strategy: "credentials" },
});
```

Under `{ strategy: "cognito" }`:

- `shell.http` auto-recovers once on a `401`: it `POST`s `/_auth/refresh`; a `204` refreshes the session in place and the request is retried; a failure redirects to `/_auth/signin?return=<current path>`.
- Apps can also recover explicitly with `await shell.auth.recoverSession()` (the demo's **Recover Session (Cognito)** button).
- Both endpoints are overridable: `{ strategy: "cognito", refreshPath: "/edge/refresh", signinPath: "/edge/login" }`.

The example `shell.json` manifests include a `/_auth/signout` nav link marked `"external": true` so the shell leaves it unprefixed — harmless on nginx, where that path simply 404s.

> Note: `shell.auth.recoverSession` and the `auth` config require `@herdingbits/trailhead-core` with this change built in. The examples pin a published core version; bump that dependency once the new core is published for the Cognito path to work at runtime.

## Learn More

See the [main Trailhead documentation](https://github.com/quicken/trailhead) for architecture details and best practices.
