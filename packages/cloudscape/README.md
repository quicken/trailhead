# @herdingbits/trailhead-cloudscape

AWS CloudScape adapter for Trailhead. React-based shell with CloudScape components.

## What is this?

This package provides a Trailhead adapter for the [AWS CloudScape Design System](https://cloudscape.design/). CloudScape is built with React, so this adapter demonstrates Trailhead when you're all-in on React for both the shell and SPAs.

It includes:
- CloudScape React components integration
- Pre-built shell UI (AppLayout, SideNavigation, Modal, Flashbar)
- Event-based communication between adapter and React components
- **Supports React 18 and React 19**

## Key Features

- **React-Based**: Full CloudScape component library
- **AWS Design Language**: Consistent with AWS console UX
- **Pre-Built Shell**: AppLayout with navigation out of the box
- **Modern React**: Works with React 18+ and React 19

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

## React Version Support

This adapter supports React 18 and React 19. Peer dependencies specify `^19.0.0` but will work with React 18 if needed.

## Documentation

See the [main Trailhead documentation](https://github.com/herdingbits/trailhead) for more information.

## License

MIT
