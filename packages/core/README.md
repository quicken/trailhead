# @herdingbits/trailhead-core

Simple application shell that orchestrates multiple SPAs. No webpack magic, just the browser's native module system.

## What is this?

This package provides the core shell logic for the Trailhead micro-frontend pattern:
- Orchestrates multiple single page applications (SPAs) within a shared layout
- Manages navigation and routing (no URL rewrites needed between apps)
- Provides centralised HTTP client with error handling
- Coordinates user feedback (toasts, dialogs, busy states)
- Integrates with design systems via adapters

**Think of it like browser extensions or VS Code plugins** — the shell provides infrastructure, SPAs focus on business logic.

## Key Features

- **Framework Agnostic**: SPAs can use React, Vue, Svelte, or vanilla JS
- **Independent Deployment**: Deploy one SPA without touching others
- **Simple Deployment**: No URL rewrites, works on any static host
- **Design System Adapters**: Pluggable UI layer (Web Awesome, CloudScape, or custom)
- **Session Re-authentication**: `window.shell.auth.reauthenticate()` shows an in-place credential prompt on an expired session, retries the failed request, and syncs across tabs — no full-page login redirect

## Installation

```bash
npm install @herdingbits/trailhead-core
```

## Usage

```typescript
import { Trailhead } from '@herdingbits/trailhead-core';
import { YourAdapter, ShellApp } from '@herdingbits/trailhead-your-design-system';

// Async: initialises the adapter, loads shell.json and exposes window.shell.
const shell = await Trailhead.create({
  adapter: new YourAdapter(),
  appBasePath: '/app',       // URL prefix where SPAs are hosted
  shellUrl: '/app',          // URL where shell.js and shell.json are served (defaults to appBasePath)
  apiUrl: 'https://api.example.com'
});

// Renders the shell UI, then calls shell.start() to render navigation and load the current app.
ShellApp.mount(shell);
```

`Trailhead.create()` rejects if the adapter fails to initialise; a missing `shell.json` only leaves navigation empty. Upgrading from 0.4? See the [changelog](https://github.com/quicken/trailhead/blob/master/CHANGELOG.md).

### Deployment config in `shell.json`

`apiUrl` and `auth` can be left out of `Trailhead.create()` and set per deployment in `shell.json` instead, with no rebuild and no inline script:

```json
{
  "apiUrl": "/api",
  "auth": { "strategy": "cognito" },
  "apps": [],
  "nav": []
}
```

Values passed to `create()` take precedence. From `shell.json`, `apiUrl` and the `auth` endpoints must be same-origin paths starting with `/`; anything else is ignored with a console warning.

## Available Adapters

- **[@herdingbits/trailhead-webawesome](https://www.npmjs.com/package/@herdingbits/trailhead-webawesome)** — Web Awesome web components (vanilla TypeScript)
- **[@herdingbits/trailhead-cloudscape](https://www.npmjs.com/package/@herdingbits/trailhead-cloudscape)** — AWS CloudScape Design System (React)

## Documentation

See the [main Trailhead documentation](https://github.com/quicken/trailhead) for more information.

## License

MIT
