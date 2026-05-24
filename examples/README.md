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

const shell = new Trailhead({
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

const shell = new Trailhead({
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

## Learn More

See the [main Trailhead documentation](https://github.com/quicken/trailhead) for architecture details and best practices.
