# @cfkit/contracts

TypeScript type definitions for the shell API.

**Auto-generated from `core/shell/src/types/public-api.ts`** - Do not edit manually.

## Usage

```typescript
import type { ShellAPI } from "@cfkit/contracts";

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

Types are automatically generated when building the shell:

```bash
cd core/shell
npm run build  # Generates types to ../contracts/dist
```

To update types:
1. Edit `core/shell/src/types/shell-api.ts`
2. Export public types in `core/shell/src/types/public-api.ts`
3. Run `npm run build` in shell project
4. Types are automatically generated to contracts package
