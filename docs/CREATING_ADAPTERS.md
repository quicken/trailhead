# Creating Custom Design System Adapters

Trailhead's shell is design-system agnostic. You can create adapters for any design system (Material-UI, Ant Design, CloudScape, etc.).

## Adapter Interface

```typescript
import type { DesignSystemAdapter } from '@herdingbits/trailhead-types/adapters';

export class MyAdapter implements DesignSystemAdapter {
  name = "my-design-system";
  version = "1.0.0";
  
  async init(shellUrl: string): Promise<void> {
    // Load design system assets from shellUrl, set base paths, etc.
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
import { Trailhead } from '@herdingbits/trailhead-core';
import { MyAdapter } from './my-adapter';

const shell = new Trailhead({
  adapter: new MyAdapter(),
  appBasePath: '/app',
});
```

## Official Adapters

### Shoelace
- Package: `@herdingbits/trailhead-shoelace`
- Status: ✅ Implemented
- Design System: [Shoelace](https://shoelace.style/)
- Config: `ShoelaceAdapterConfig { shoelaceUrl? }` — explicit CDN or local path; defaults to `${shellUrl}/shoelace`

### CloudScape
- Package: `@herdingbits/trailhead-cloudscape`
- Status: ✅ Implemented
- Design System: [CloudScape](https://cloudscape.design/)
- Config: `CloudScapeAdapterConfig { cloudscapeUrl? }` — if provided, injects global-styles CSS dynamically

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
await adapter.init('https://my-shell.example.com');

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
