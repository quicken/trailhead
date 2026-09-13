# Creating Custom Design System Adapters

Trailhead's shell is design-system agnostic. You can create adapters for any design system (Material UI, Ant Design, Shoelace forks, etc.).

## Adapter Interface

```typescript
import type { DesignSystemAdapter } from '@herdingbits/trailhead-types/adapters';
import { NoopAuthAdapter } from '@herdingbits/trailhead-core';

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

  // Not building a login prompt yet? Start with the no-op below and swap it in later —
  // see "Implementing Authentication Prompts" for a real one.
  auth: AuthAdapter = new NoopAuthAdapter();
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

## Implementing Authentication Prompts

Sooner or later a user's session expires mid-task. Trailhead's answer is `window.shell.auth.reauthenticate(attempt)` — one shared API, backed by whatever login UI your adapter provides. Your job as an adapter author is just the UI: show a username/password form, hand back what the user typed.

```typescript
import type { AuthAdapter, Credentials, CredentialPromptHandle } from '@herdingbits/trailhead-types/adapters';

export class MyAuthAdapter implements AuthAdapter {
  promptCredentials(errorMessage?: string): CredentialPromptHandle {
    let settle!: (value: Credentials | null) => void;
    const result = new Promise<Credentials | null>((resolve) => { settle = resolve; });

    // Build your dialog however your design system does dialogs — show `errorMessage`
    // if it's set (that's a retry after a wrong password), collect username/password,
    // and call settle({ username, password }) on submit or settle(null) on cancel.

    return {
      result,
      // Called if something else (e.g. another tab succeeding first) needs to
      // close this prompt without the user having submitted anything.
      close: () => settle(null),
    };
  }
}
```

A few things worth knowing before you build one:

- **You never call this yourself.** The shell's `reauthenticate()` calls `promptCredentials()`, waits on `result`, and hands whatever the user typed to the *app's* own `attempt` function — your adapter never talks to the backend or knows what "correct" means.
- **You'll be called again on a wrong password.** If `attempt` returns `false`, the shell calls `promptCredentials()` a second time with `errorMessage` set to something like "Incorrect username or password." — show it, don't just repeat the same blank form.
- **`close()` is not the same as cancelling.** It fires when the *shell* decides the prompt should go away for a reason that isn't the user submitting or dismissing it — right now, that's "another browser tab already logged back in." Just hide your UI; don't treat it as a failed login.
- **Don't already have a login UI to reuse?** Skip all of this for now and use `NoopAuthAdapter` (shown above) — it declines every attempt immediately, so the app behaves exactly as it did before this feature existed. Nothing else changes; you can add a real prompt any time later without touching app code.

See `packages/webawesome/src/adapter.ts` or `packages/cloudscape/src/adapter.tsx` for two complete, working implementations — one plain-DOM, one React — that you can use as a starting point.

## Official Adapters

### Web Awesome
- Package: `@herdingbits/trailhead-webawesome`
- Status: ✅ Implemented
- Design System: [Web Awesome](https://webawesome.com/) (Font Awesome's web component library, successor to Shoelace)
- Config: `WebAwesomeAdapterConfig { webAwesomeUrl? }` — explicit CDN or local path; defaults to `${shellUrl}/webawesome`
- Auth: ✅ Real `<wa-dialog>` credential prompt

### CloudScape
- Package: `@herdingbits/trailhead-cloudscape`
- Status: ✅ Implemented
- Design System: [CloudScape](https://cloudscape.design/)
- Config: `CloudScapeAdapterConfig { cloudscapeUrl? }` — if provided, injects global-styles CSS dynamically
- Auth: ✅ Real `<Modal>` credential prompt

## Adapter Requirements

Your adapter must:

1. ✅ Implement `DesignSystemAdapter` interface
2. ✅ Handle all feedback methods (toasts, dialogs, busy states)
3. ✅ Implement (or explicitly opt out of, via `NoopAuthAdapter`) the re-authentication prompt
4. ✅ Initialise design system assets in `init()`
5. ✅ Work with the shell's CSS (or provide its own)
6. ✅ Run standalone in the browser — vanilla JS/TS, or a UI framework like React, whatever your design system needs

## Testing Your Adapter

```typescript
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

// Auth: show the prompt, then resolve it as if the user typed something and hit submit
const prompt = adapter.auth.promptCredentials();
prompt.result.then((credentials) => console.log('User submitted:', credentials));
// ...trigger your dialog's submit button here, or call prompt.close() to dismiss it
```

## Contributing Adapters

To contribute a new adapter:

1. Create `packages/your-adapter/src/adapter.ts`
2. Implement `DesignSystemAdapter` interface
3. Add tests
4. Update this documentation
5. Submit a pull request

Community adapters will be listed in the main README.
