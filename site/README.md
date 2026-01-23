# Trailhead Shell Sites

Pre-configured shell builds for different design systems.

## Available Sites

### Shoelace Site
- **Location**: `site/shoelace-site/`
- **Design System**: Shoelace
- **Bundle Size**: ~23 KB
- **Status**: ✅ Production ready

### CloudScape Site
- **Location**: `site/cloudscape-site/`
- **Design System**: CloudScape (basic implementation)
- **Bundle Size**: ~22 KB
- **Status**: 🚧 Basic implementation

## How It Works

Each site imports the core shell logic from `core/shell/src/` and wires in a specific design system adapter:

```typescript
// site/shoelace-site/src/index.ts
import { Trailhead } from '../../core/shell/src/core.ts';
import { ShoelaceAdapter } from '../../core/shell/src/adapters/shoelace.ts';

new Trailhead({
  adapter: new ShoelaceAdapter(),
  basePath: '/',
});
```

## Development

### Build Shoelace Shell
```bash
cd site/shoelace-site
npm install
npm run build
# Output: dist/shell.js
```

### Build CloudScape Shell
```bash
cd site/cloudscape-site
npm install
npm run build
# Output: dist/shell.js
```

### Start Development Server
```bash
cd site/shoelace-site  # or cloudscape-site
npm start
# Opens at http://localhost:3000
```

## Deployment

Deploy each site to a versioned path:

```
CDN/
├── shell/
│   ├── shoelace/
│   │   └── 1.0.0/
│   │       ├── shell.js
│   │       ├── shell.css
│   │       └── shoelace/  (design system assets)
│   └── cloudscape/
│       └── 1.0.0/
│           ├── shell.js
│           └── shell.css
```

Apps choose which shell to load:

```html
<!-- Shoelace apps -->
<script type="module" src="/shell/shoelace/1.0.0/shell.js"></script>

<!-- CloudScape apps -->
<script type="module" src="/shell/cloudscape/1.0.0/shell.js"></script>
```

## Creating a New Site

1. Create directory: `site/my-design-site/`
2. Copy `package.json`, `vite.config.js`, `tsconfig.json` from an existing site
3. Create `src/index.ts`:
```typescript
import { Trailhead } from '../../core/shell/src/core.ts';
import { MyAdapter } from '../../core/shell/src/adapters/my-adapter.ts';

new Trailhead({
  adapter: new MyAdapter(),
  basePath: '/',
});
```
4. Build: `npm install && npm run build`

## Benefits

✅ **One Codebase** - Core shell logic shared across all sites  
✅ **Multiple Design Systems** - Each site uses a different adapter  
✅ **Independent Builds** - Build and deploy each site separately  
✅ **Type Safe** - Full TypeScript support  
✅ **Small Bundles** - Only includes chosen design system  
