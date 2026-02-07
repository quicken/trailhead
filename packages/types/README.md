# @herdingbits/trailhead-types

TypeScript type definitions for Trailhead micro-frontend applications.

**Note:** This package is auto-generated from `@herdingbits/trailhead-core` during build. Do not edit these files directly.

## What is this?

Provides TypeScript types for micro-frontend applications that integrate with the Trailhead shell. Install this as a dev dependency to get type checking and IntelliSense for the shell API.

## Installation

```bash
npm install --save-dev @herdingbits/trailhead-types
```

## Usage

### In Micro-Frontend Applications

```typescript
import type { ShellAPI } from '@herdingbits/trailhead-types';

export function init(shell: ShellAPI) {
  // TypeScript knows the shell API
  shell.feedback.success('App loaded!');
  
  const result = await shell.http.get('/api/data');
  if (result.success) {
    console.log(result.data);
  }
}
```

### For Custom Adapter Development

```typescript
import type { DesignSystemAdapter, FeedbackAdapter } from '@herdingbits/trailhead-types/adapters';

export class MyAdapter implements DesignSystemAdapter {
  name = 'my-adapter';
  version = '1.0.0';
  
  async init(basePath: string): Promise<void> {
    // Initialize your design system
  }
  
  feedback: FeedbackAdapter = {
    // Implement feedback methods
  };
}
```

## Documentation

See the [main Trailhead documentation](https://github.com/herdingbits/trailhead) for more information.

## License

MIT
