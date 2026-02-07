# @herdingbits/trailhead-cloudscape

AWS CloudScape design system adapter for Trailhead micro-frontend shell.

## What is this?

This package provides a Trailhead adapter for the [AWS CloudScape Design System](https://cloudscape.design/). It includes:
- CloudScape React components integration
- Pre-built shell UI (AppLayout, SideNavigation, Modal, Flashbar)
- Event-based communication between adapter and React components

## Installation

```bash
npm install @herdingbits/trailhead-core @herdingbits/trailhead-cloudscape @cloudscape-design/components @cloudscape-design/global-styles react react-dom
```

## Usage

```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Trailhead } from '@herdingbits/trailhead-core';
import { CloudScapeAdapter, ShellApp } from '@herdingbits/trailhead-cloudscape';
import '@cloudscape-design/global-styles/index.css';
import '@herdingbits/trailhead-cloudscape/shell.css';

const shell = new Trailhead({
  adapter: new CloudScapeAdapter(),
  basePath: '/app',
  apiUrl: 'https://api.example.com'
});

const root = createRoot(document.getElementById('app')!);
root.render(<ShellApp shell={shell} />);
```

## What's Included

- **CloudScapeAdapter** - Implements the Trailhead adapter interface
- **ShellApp** - React component that renders the shell UI
- **ShellLayout** - CloudScape AppLayout with navigation
- **shell.css** - Base styles for the shell UI

## Documentation

See the [main Trailhead documentation](https://github.com/herdingbits/trailhead) for more information.

## License

MIT
