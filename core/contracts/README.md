# @cfkit/contracts

TypeScript type definitions for the shell API.

**Auto-generated from `core/shell/src/types/public-api.ts`** - Do not edit manually.

## Installation

```bash
npm install @cfkit/contracts@1.0.0 --save-dev
```

## Usage

### Basic Types

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

### Version Checking

Apps can verify shell compatibility at runtime:

```typescript
import { assertShellVersion } from "@cfkit/contracts/version-check";

window.AppMount = (container: HTMLElement) => {
  // Ensure shell v1.x is loaded
  assertShellVersion("1.x");
  
  // ... render your app
};
```

Or use non-throwing check:

```typescript
import { isShellVersionCompatible } from "@cfkit/contracts/version-check";

if (!isShellVersionCompatible("1.x")) {
  console.error("Incompatible shell version");
  return;
}
```

## Version Compatibility

The contracts package version should match your shell version:

- Shell v1.0.0 → `@cfkit/contracts@1.0.0`
- Shell v1.1.0 → `@cfkit/contracts@1.1.0`
- Shell v2.0.0 → `@cfkit/contracts@2.0.0`

## Loading Specific Shell Version

In your app's `index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
  <!-- Load specific shell version from CDN -->
  <script type="module" src="/shell/1.0.0/shell.js"></script>
</head>
<body>
  <div id="shell-root"></div>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

## Types Included

- `ShellAPI` - Main shell API interface with version property
- `FeedbackAPI` - Feedback service (toasts, dialogs, busy overlay)
- `HttpAPI` - HTTP client with Result type
- `NavigationAPI` - Client-side navigation
- `Result<T>` - Success/error result type
- `NavItem` - Navigation configuration

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
5. Bump version in both `shell/package.json` and `contracts/package.json`
