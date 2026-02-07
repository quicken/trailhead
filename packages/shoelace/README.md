# @herdingbits/trailhead-shoelace

Shoelace design system adapter for the Trailhead micro-frontend framework.

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

## Documentation

See the [main Trailhead documentation](https://github.com/herdingbits/trailhead) for more information.

## License

MIT
