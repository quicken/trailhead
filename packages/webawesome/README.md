# @herdingbits/trailhead-webawesome

Web Awesome adapter for Trailhead. Vanilla TypeScript, no React required.

## What is this?

This package provides a Trailhead adapter for [Web Awesome](https://webawesome.com/) — the successor to Shoelace, built by Font Awesome. It handles:

- Loading and configuring Web Awesome components via the autoloader
- Rendering toasts, dialogs, and busy overlays
- Integrating Web Awesome with the Trailhead shell

**Vanilla TypeScript implementation — no framework required.** Web Awesome components are native web components and work in any SPA regardless of framework.

## Installation

```bash
npm install @herdingbits/trailhead-core @herdingbits/trailhead-webawesome @awesome.me/webawesome
```

## Usage

```typescript
import { Trailhead } from '@herdingbits/trailhead-core';
import { WebAwesomeAdapter, ShellApp } from '@herdingbits/trailhead-webawesome';
import '@herdingbits/trailhead-webawesome/shell.css';

const shell = new Trailhead({
  adapter: new WebAwesomeAdapter(),
  appBasePath: '/app',
  apiUrl: 'https://api.example.com'
});

ShellApp.mount(shell);
```

By default, Web Awesome is served from `${shellUrl}/webawesome`. To load from a CDN instead:

```typescript
const shell = new Trailhead({
  adapter: new WebAwesomeAdapter({
    webAwesomeUrl: 'https://cdn.webawesome.com/3.6.0'
  }),
  appBasePath: '/app',
});
```

## What's Included

- **WebAwesomeAdapter** — implements the Trailhead adapter interface
- **ShellApp** — minimal mounting wrapper for API consistency
- **shell.css** — base styles for the shell UI

## Web Awesome in SPAs

Because the shell loads the Web Awesome autoloader, all `wa-*` components are available in every hosted SPA without any additional imports:

```html
<wa-button variant="brand">Click Me</wa-button>
<wa-icon name="envelope"></wa-icon>
<wa-dialog label="Confirm">...</wa-dialog>
```

Icons use Font Awesome names (free tier). See [fontawesome.com/icons](https://fontawesome.com/icons) for the full list.

## Documentation

See the [main Trailhead documentation](https://github.com/quicken/trailhead) for more information.

## License

MIT
