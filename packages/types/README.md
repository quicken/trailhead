# @herdingbits/trailhead-types

TypeScript type definitions for the Trailhead micro-frontend framework.

**Note:** This package is auto-generated from `@herdingbits/trailhead-core` during build. Do not edit these files directly.

## Installation

```bash
npm install --save-dev @herdingbits/trailhead-types
```

## Usage

```typescript
import type { ShellAPI } from '@herdingbits/trailhead-types';
import type { DesignSystemAdapter } from '@herdingbits/trailhead-types/adapters';

// Use in your SPA apps
export function init(shell: ShellAPI) {
  shell.feedback.success('App loaded!');
}

// Use when creating custom adapters
export class MyAdapter implements DesignSystemAdapter {
  // ...
}
```

## Documentation

See the [main Trailhead documentation](https://github.com/herdingbits/trailhead) for more information.

## License

MIT
