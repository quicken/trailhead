# Trailhead Design System Adapters

Design system adapters for Trailhead shell.

## Available Adapters

### Shoelace (Default)
- **Status**: ✅ Implemented
- **Design System**: [Shoelace](https://shoelace.style/)
- **Location**: `core/adapters/shoelace/`
- **Used by**: `core/shell/src/adapters/shoelace.ts`

### CloudScape
- **Status**: 🚧 Stub (not yet implemented)
- **Design System**: [CloudScape](https://cloudscape.design/)
- **Location**: `core/adapters/cloudscape/`

## How It Works

The shell uses the adapter pattern to support different design systems. The adapter is imported directly in `core/shell/src/index.ts`:

```typescript
import { ShoelaceAdapter } from './adapters/shoelace.js';

new Trailhead({
  adapter: new ShoelaceAdapter(),
  basePath: '/',
});
```

## Creating a New Adapter

See [Creating Adapters Guide](../../docs/CREATING_ADAPTERS.md) for detailed instructions.

### Quick Example

```typescript
// core/shell/src/adapters/my-adapter.ts
import type { DesignSystemAdapter } from './types.js';

export class MyAdapter implements DesignSystemAdapter {
  name = "my-adapter";
  version = "1.0.0";
  
  async init(basePath: string): Promise<void> {
    // Load design system
  }
  
  feedback = {
    showBusy(message: string) { /* ... */ },
    clearBusy() { /* ... */ },
    showToast(message, variant, duration) { /* ... */ },
    showDialog(config) { /* ... */ },
  };
}
```

Then use it in `core/shell/src/index.ts`:

```typescript
import { MyAdapter } from './adapters/my-adapter.js';

new Trailhead({
  adapter: new MyAdapter(),
  basePath: '/',
});
```

## Adapter Requirements

All adapters must:
- ✅ Implement `DesignSystemAdapter` interface
- ✅ Provide all feedback methods (toasts, dialogs, busy states)
- ✅ Initialize design system in `init()` method
- ✅ Be framework-agnostic (vanilla JS/TS)
