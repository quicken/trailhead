# Creating Custom Design System Adapters

Trailhead's shell is design-system agnostic. You can create adapters for any design system (Material-UI, Ant Design, CloudScape, etc.).

## Adapter Interface

```typescript
import type { DesignSystemAdapter } from '@cfkit/contracts/adapters';

export class MyAdapter implements DesignSystemAdapter {
  name = "my-design-system";
  version = "1.0.0";
  
  async init(basePath: string): Promise<void> {
    // Load design system assets, set base paths, etc.
  }
  
  feedback: FeedbackAdapter = {
    showBusy(message: string): void {
      // Show loading overlay
    },
    
    clearBusy(): void {
      // Hide loading overlay
    },
    
    showToast(message: string, variant: ToastVariant, duration?: number): void {
      // Show toast notification
    },
    
    showDialog<T extends string>(config: DialogConfig<T>): Promise<DialogResult<T>> {
      // Show modal dialog with custom buttons
      // Return user's selection
    }
  };
}
```

## Using Your Adapter

```typescript
// core/shell/src/shell.ts
import { MyAdapter } from './adapters/my-adapter';

class Shell {
  constructor() {
    this.adapter = new MyAdapter();
    // ... rest of initialization
  }
}
```

## Official Adapters

### Shoelace (Default)
- Location: `core/shell/src/adapters/shoelace.ts`
- Status: ✅ Implemented
- Design System: [Shoelace](https://shoelace.style/)

### CloudScape (Coming Soon)
- Location: `core/shell/src/adapters/cloudscape.ts`
- Status: 🚧 Planned
- Design System: [CloudScape](https://cloudscape.design/)

## Adapter Requirements

Your adapter must:

1. ✅ Implement `DesignSystemAdapter` interface
2. ✅ Handle all feedback methods (toasts, dialogs, busy states)
3. ✅ Initialize design system assets in `init()`
4. ✅ Work with the shell's CSS (or provide its own)
5. ✅ Be framework-agnostic (vanilla JS/TS)

## Testing Your Adapter

```typescript
// Test in isolation
const adapter = new MyAdapter();
await adapter.init('/');

adapter.feedback.showToast('Hello!', 'success');
const result = await adapter.feedback.showDialog({
  message: 'Are you sure?',
  title: 'Confirm',
  buttons: [
    { label: 'Cancel', value: 'cancel' },
    { label: 'OK', value: 'ok' }
  ]
});
```

## Contributing Adapters

To contribute a new adapter:

1. Create `core/shell/src/adapters/your-adapter.ts`
2. Implement `DesignSystemAdapter` interface
3. Add tests
4. Update this documentation
5. Submit a pull request

Community adapters will be listed in the main README.
