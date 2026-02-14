# Trailhead Examples

Example implementations showing how to build application shells and single page applications (SPAs) using Trailhead.

## What's Here

This directory contains working examples of:
- **Shell implementations** - Host applications that orchestrate multiple SPAs using different design systems
- **Single Page Applications (SPAs)** - Independent applications that integrate with the shell

## Available Examples

### Shoelace Site
- **Location**: `examples/shoelace-site/`
- **Design System**: Shoelace web components
- **Shell**: Vanilla TypeScript
- **Apps**: Demo app, SaaS demo
- **Use Case**: Framework-agnostic shell with web components

### CloudScape Site
- **Location**: `examples/cloudscape-site/`
- **Design System**: AWS CloudScape Design System (React-based)
- **Shell**: React
- **Apps**: Demo app, SaaS demo
- **Use Case**: React-first architecture where both shell and SPAs use React. CloudScape is built around React, so this example demonstrates Trailhead when you're all-in on React.

## Running Examples

### Development Mode

```bash
# Shoelace shell
cd examples/shoelace-site/shell
npm install
npm start  # http://localhost:3000

# Shoelace demo app (in another terminal)
cd examples/shoelace-site/apps/demo
npm install
npm start  # http://localhost:3001
```

### Production Preview

```bash
cd tools/preview-server

# Build and preview Shoelace site
npm run build:shoelace
npm start  # http://localhost:8081/sample/trailhead

# Build and preview CloudScape site
npm run build:cloudscape
npm start
```

## Structure

```
examples/
├── shoelace-site/
│   ├── shell/              # Shell implementation
│   │   ├── src/
│   │   │   └── index.ts   # Uses @herdingbits/trailhead-shoelace
│   │   └── public/
│   │       └── navigation.json
│   └── apps/
│       ├── demo/          # Simple demo app
│       └── saas-demo/     # SaaS dashboard demo
└── cloudscape-site/
    ├── shell/              # Shell implementation
    │   ├── src/
    │   │   └── index.tsx  # Uses @herdingbits/trailhead-cloudscape
    │   └── public/
    │       └── navigation.json
    └── apps/
        ├── demo/          # Simple demo app
        └── saas-demo/     # SaaS dashboard demo
```

## How It Works

### Shell Implementation

Each shell imports the published Trailhead packages and uses a design system adapter:

**Shoelace (Vanilla TypeScript):**
```typescript
// examples/shoelace-site/shell/src/index.ts
import { Trailhead } from '@herdingbits/trailhead-core';
import { ShoelaceAdapter, ShellApp } from '@herdingbits/trailhead-shoelace';

const shell = new Trailhead({
  adapter: new ShoelaceAdapter(),
  basePath: import.meta.env.VITE_BASE_PATH || '',
  apiUrl: window.APP_CONFIG?.apiUrl || ''
});

ShellApp.mount(shell);
```

**CloudScape (React):**
```typescript
// examples/cloudscape-site/shell/src/index.tsx
import { createRoot } from 'react-dom/client';
import { Trailhead } from '@herdingbits/trailhead-core';
import { CloudScapeAdapter, ShellApp } from '@herdingbits/trailhead-cloudscape';

const shell = new Trailhead({
  adapter: new CloudScapeAdapter(),
  basePath: import.meta.env.VITE_BASE_PATH || '',
  apiUrl: window.APP_CONFIG?.apiUrl || ''
});

const root = createRoot(document.getElementById('app')!);
root.render(<ShellApp shell={shell} />);
```

### Single Page Applications (SPAs)

SPAs are framework-agnostic and export an `init` function that receives the shell API:

```typescript
// examples/shoelace-site/apps/demo/src/index.ts
import type { ShellAPI } from '@herdingbits/trailhead-types';

export function init(shell: ShellAPI) {
  // Use shell services
  shell.feedback.success('App loaded!');
  
  const result = await shell.http.get('/api/data');
  if (result.success) {
    renderApp(result.data);
  }
}
```

The shell and SPAs share the same design system for visual consistency. Each SPA can use any framework (React, Vue, Svelte, vanilla JS) internally while consuming the shared design system components.

## Creating Your Own

### New Shell

1. Install packages:
```bash
# For Shoelace (vanilla TypeScript)
npm install @herdingbits/trailhead-core @herdingbits/trailhead-shoelace

# For CloudScape (React)
npm install @herdingbits/trailhead-core @herdingbits/trailhead-cloudscape
```

2. Create entry point:
```typescript
// Shoelace
import { Trailhead } from '@herdingbits/trailhead-core';
import { ShoelaceAdapter, ShellApp } from '@herdingbits/trailhead-shoelace';

const shell = new Trailhead({
  adapter: new ShoelaceAdapter(),
  basePath: '/app'
});

ShellApp.mount(shell);

// CloudScape (React)
import { createRoot } from 'react-dom/client';
import { Trailhead } from '@herdingbits/trailhead-core';
import { CloudScapeAdapter, ShellApp } from '@herdingbits/trailhead-cloudscape';

const shell = new Trailhead({
  adapter: new CloudScapeAdapter(),
  basePath: '/app'
});

const root = createRoot(document.getElementById('app')!);
root.render(<ShellApp shell={shell} />);
```

### New Single Page Application (SPA)

1. Install types:
```bash
npm install --save-dev @herdingbits/trailhead-types
```

2. Export init function:
```typescript
import type { ShellAPI } from '@herdingbits/trailhead-types';

export function init(shell: ShellAPI) {
  // Your app logic - use any framework you want
  // Access shell services via shell.http, shell.feedback, etc.
}
```

3. Use the shared design system components in your app for visual consistency

## Learn More

See the [main Trailhead documentation](https://github.com/quicken/trailhead) for architecture details and best practices.
