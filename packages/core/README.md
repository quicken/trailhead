# @herdingbits/trailhead-core

Simple application shell that orchestrates multiple SPAs. No webpack magic, just the browser's native module system.

## What is this?

This package provides the core shell logic for the Trailhead micro-frontend pattern:
- Orchestrates multiple single page applications (SPAs) within a shared layout
- Manages navigation and routing (no URL rewrites needed between apps)
- Provides centralized HTTP client with error handling
- Coordinates user feedback (toasts, dialogs, busy states)
- Integrates with design systems via adapters

**Think of it like browser extensions or VS Code plugins** - the shell provides infrastructure, SPAs focus on business logic.

## Key Features

- **Framework Agnostic**: SPAs can use React, Vue, Svelte, or vanilla JS
- **Independent Deployment**: Deploy one SPA without touching others
- **Simple Deployment**: No URL rewrites, works on any static host
- **Design System Adapters**: Pluggable UI layer (Shoelace, CloudScape, or custom)

## Installation

```bash
npm install @herdingbits/trailhead-core
```

## Usage

```typescript
import { Trailhead } from '@herdingbits/trailhead-core';
import { YourAdapter } from '@herdingbits/trailhead-your-design-system';

const shell = new Trailhead({
  adapter: new YourAdapter(),
  basePath: '/app',
  apiUrl: 'https://api.example.com'
});
```

## Available Adapters

- **[@herdingbits/trailhead-shoelace](https://www.npmjs.com/package/@herdingbits/trailhead-shoelace)** - Shoelace web components (vanilla TypeScript)
- **[@herdingbits/trailhead-cloudscape](https://www.npmjs.com/package/@herdingbits/trailhead-cloudscape)** - AWS CloudScape Design System (React)

## Documentation

See the [main Trailhead documentation](https://github.com/herdingbits/trailhead) for more information.

## License

MIT
