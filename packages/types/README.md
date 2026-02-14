# @herdingbits/trailhead-types

TypeScript types for Trailhead SPAs. Provides shell API types for independent applications.

**Note:** This package is auto-generated from `@herdingbits/trailhead-core` during build. Do not edit these files directly.

## What is this?

Provides TypeScript types for single page applications (SPAs) that integrate with the Trailhead shell. Install this as a dev dependency to get type checking and IntelliSense for the shell API.

**Your SPAs don't import the shell** - they access it via `window.shell`. These types just help TypeScript understand what's available.

## Installation

```bash
npm install --save-dev @herdingbits/trailhead-types
```

## Usage

### In Single Page Applications (SPAs)

```typescript
import type { ShellAPI } from '@herdingbits/trailhead-types';

// Declare global type
declare global {
  interface Window {
    shell: ShellAPI;
  }
}

export function init() {
  // TypeScript knows the shell API
  window.shell.feedback.success('App loaded!');
  
  const result = await window.shell.http.get('/api/data');
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

See the [main Trailhead documentation](https://github.com/quicken/trailhead) for more information.

## License

MIT
