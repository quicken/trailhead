# @herdingbits/trailhead-cloudscape

CloudScape design system adapter for the Trailhead micro-frontend framework.

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

## Documentation

See the [main Trailhead documentation](https://github.com/herdingbits/trailhead) for more information.

## License

MIT
