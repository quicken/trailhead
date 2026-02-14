# @herdingbits/trailhead-shoelace

Shoelace web components adapter for Trailhead. Vanilla TypeScript, no React required.

## What is this?

This package provides a Trailhead adapter for the [Shoelace](https://shoelace.style/) web component library. It handles:
- Loading and configuring Shoelace components
- Rendering toasts, dialogs, and busy overlays
- Integrating Shoelace with the Trailhead shell
- **Vanilla TypeScript implementation** - no framework required

**Perfect for teams that want to stay close to HTML/CSS/JavaScript** without React complexity.

## Key Features

- **Framework Agnostic**: Works with any SPA framework (or no framework)
- **Web Components**: Shoelace components work everywhere
- **Lightweight**: No React, no virtual DOM, just the browser
- **Simple**: Straightforward DOM manipulation and event handling

## Installation

```bash
npm install @herdingbits/trailhead-core @herdingbits/trailhead-shoelace @shoelace-style/shoelace
```

## Usage

```typescript
import { Trailhead } from '@herdingbits/trailhead-core';
import { ShoelaceAdapter, ShellApp } from '@herdingbits/trailhead-shoelace';
import '@herdingbits/trailhead-shoelace/shell.css';

const shell = new Trailhead({
  adapter: new ShoelaceAdapter(),
  basePath: '/app',
  apiUrl: 'https://api.example.com'
});

ShellApp.mount(shell);
```

## What's Included

- **ShoelaceAdapter** - Implements the Trailhead adapter interface
- **ShellApp** - Minimal mounting wrapper for API consistency
- **shell.css** - Base styles for the shell UI

## Documentation

See the [main Trailhead documentation](https://github.com/herdingbits/trailhead) for more information.

## License

MIT
