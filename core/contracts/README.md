# @cfkit/shell-api-types

TypeScript type definitions for the shell API.

## Usage

```typescript
import type { ShellAPI } from "@cfkit/shell-api-types";

declare global {
  interface Window {
    shell: ShellAPI;
  }
}

// Use the API
window.shell.feedback.success("Hello!");
```

## Types Included

- `ShellAPI` - Main shell API interface
- `FeedbackAPI` - Feedback service (toasts, dialogs, busy overlay)
- `HttpAPI` - HTTP client with Result type
- `NavigationAPI` - Client-side navigation
- `Result<T>` - Success/error result type

## Development

This is a local package. To update:

1. Edit `index.ts`
2. Increment version in `package.json`
3. Run `npm install` in consuming projects to update
