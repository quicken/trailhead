# @herdingbits/trailhead-core

Core orchestration for Trailhead - an application shell that coordinates multiple single page applications (SPAs).

## What is this?

This package provides the core shell logic that:
- Orchestrates multiple single page applications (SPAs) within a shared layout
- Manages navigation and routing
- Provides centralized HTTP client with error handling
- Coordinates user feedback (toasts, dialogs, busy states)
- Integrates with design systems via adapters

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
