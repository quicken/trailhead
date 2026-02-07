# @herdingbits/trailhead-core

Core shell orchestration for the Trailhead micro-frontend framework.

## Installation

```bash
npm install @herdingbits/trailhead-core
```

## Usage

```typescript
import { Trailhead } from '@herdingbits/trailhead-core';
import { YourAdapter } from '@herdingbits/trailhead-your-design-system';

const shell = new Trailhead({
  adapter: new YourAdapter(),
  basePath: '/app',
  apiUrl: 'https://api.example.com'
});
```

## Documentation

See the [main Trailhead documentation](https://github.com/herdingbits/trailhead) for more information.

## License

MIT
