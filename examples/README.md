# Trailhead Examples

Example implementations showing how to build shells and micro-frontend applications using Trailhead.

## What's Here

This directory contains working examples of:
- **Shell implementations** - Host applications using different design systems
- **Micro-frontend apps** - Independent applications that integrate with the shell

## Available Examples

### Shoelace Site
- **Location**: `examples/shoelace-site/`
- **Design System**: Shoelace web components
- **Shell**: Vanilla TypeScript
- **Apps**: Demo app, SaaS demo

### CloudScape Site
- **Location**: `examples/cloudscape-site/`
- **Design System**: AWS CloudScape Design System
- **Shell**: React
- **Apps**: Demo app, SaaS demo

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

Each shell imports the published Trailhead packages:

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

### Micro-Frontend Apps

Apps are framework-agnostic and export an `init` function:

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

## Creating Your Own

### New Shell

1. Install packages:
```bash
npm install @herdingbits/trailhead-core @herdingbits/trailhead-shoelace
```

2. Create entry point:
```typescript
import { Trailhead } from '@herdingbits/trailhead-core';
import { ShoelaceAdapter, ShellApp } from '@herdingbits/trailhead-shoelace';

const shell = new Trailhead({
  adapter: new ShoelaceAdapter(),
  basePath: '/app'
});

ShellApp.mount(shell);
```

### New Micro-Frontend

1. Install types:
```bash
npm install --save-dev @herdingbits/trailhead-types
```

2. Export init function:
```typescript
import type { ShellAPI } from '@herdingbits/trailhead-types';

export function init(shell: ShellAPI) {
  // Your app logic
}
```

## Learn More

See the [main Trailhead documentation](https://github.com/herdingbits/trailhead) for architecture details and best practices.
