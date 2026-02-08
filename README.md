# Trailhead - Simple App Orchestration

**What if every team could build and deploy their apps independently while sharing a common shell?** No webpack magic. No complex tooling. Just the browser's native module system and some common sense.

Trailhead is an application shell that orchestrates multiple single page applications (SPAs) within a shared layout (chrome) - the classic SaaS pattern where you have a main menu and dozens of independent modules. It provides shared infrastructure (navigation, HTTP, feedback) while letting each app use any framework and deploy independently.

**Works seamlessly with design systems** - The shell and SPAs share the same design system (Shoelace, CloudScape, or your own), ensuring visual consistency across all modules without coordination overhead.

**[Read the full story →](https://www.herdingbits.com/blog/building-trailhead-micro-frontend-framework)** | **[Try it live →](https://www.herdingbits.com/sample/trailhead)**

---

## What is Trailhead?

Trailhead is a **front-end orchestration shell** that provides orchestration and shared services to independent applications. Built with vanilla TypeScript, it acts as the host application that loads and coordinates multiple single page applications (SPAs).

**Key Concepts:**
- **Shell/Host Application**: The container that provides shared infrastructure
- **Single Page Applications (SPAs)**: Independent applications loaded by the shell
- **Orchestration**: Coordinating navigation, shared UI template, and intentially minimal shared UI services.
- **Design System Adapters**: Pluggable UI layer supporting any component library

Each SPA can use any framework (React, Vue, Svelte, vanilla JS) and deploys independently without affecting other orchestrated SPAs.

## Architecture

### Shell Responsibilities

The shell acts as the **host application**, providing:

- **Navigation Orchestration**: Dynamic menu from JSON configuration. To navigate between SPAs, no URL rewrites needed.
- **HTTP Client**: Centralized API calls with error handling and UI loading states
- **User Feedback**: Consistent toasts, dialogs, and busy overlays
- **Design System Integration**: Adapter pattern for any UI component library
- **Routing**: Page-based navigation that works on any static host. (Unless your SPA framework needs client-side routing, then you can do that too!)

### Single Page Applications (SPAs)

Applications focus purely on business logic and UI, without worrying about shared infrastructure. They are:
- Loaded as ES modules by the shell
- Access shell services via `window.shell` API
- No shared dependencies or build coordination
- Deploy independently without affecting other apps

Think of them as browser extensions or VS Code plugins - isolated but integrated.

## Key Features

- **Framework Agnostic**: Each SPA chooses its own framework
- **Design System Agnostic**: Pluggable adapter pattern (Shoelace, CloudScape, Material-UI, etc.)
- **Independent Deployment**: Deploy one app without touching others
- **Zero Configuration**: No URL rewrites or complex CDN rules - just static files
- **Build-time i18n**: Zero runtime overhead for translations
- **True Isolation**: Page reloads provide automatic CSS and JavaScript isolation
- **Runtime Configuration**: Update navigation menu without rebuilding

## Project Structure

```
trailhead/
├── packages/                      # Published NPM packages
│   ├── core/                     # @herdingbits/trailhead-core
│   ├── types/                    # @herdingbits/trailhead-types
│   ├── shoelace/                 # @herdingbits/trailhead-shoelace
│   └── cloudscape/               # @herdingbits/trailhead-cloudscape
├── examples/                     # Example implementations
│   ├── shoelace-site/
│   │   ├── shell/               # Shoelace shell implementation
│   │   └── apps/                # Demo micro-frontends
│   └── cloudscape-site/
│       ├── shell/               # CloudScape shell implementation
│       └── apps/                # Demo micro-frontends
└── tools/
    ├── vite-i18n-plugin/        # Build-time i18n
    └── preview-server/          # Local production preview
```

## Installation

### For Shell Developers

```bash
# Shoelace shell
npm install @herdingbits/trailhead-core @herdingbits/trailhead-shoelace

# CloudScape shell (React)
npm install @herdingbits/trailhead-core @herdingbits/trailhead-cloudscape
```

### For SPA Developers

```bash
# Types only (for TypeScript support)
npm install --save-dev @herdingbits/trailhead-types
```

## Quick Start

### Using Published Packages

**Shoelace Shell:**
```typescript
import { Trailhead } from '@herdingbits/trailhead-core';
import { ShoelaceAdapter, ShellApp } from '@herdingbits/trailhead-shoelace';

const shell = new Trailhead({
  adapter: new ShoelaceAdapter(),
  basePath: '/app',
  apiUrl: 'https://api.example.com'
});

ShellApp.mount(shell);
```

**CloudScape Shell (React):**
```typescript
import { createRoot } from 'react-dom/client';
import { Trailhead } from '@herdingbits/trailhead-core';
import { CloudScapeAdapter, ShellApp } from '@herdingbits/trailhead-cloudscape';

const shell = new Trailhead({
  adapter: new CloudScapeAdapter(),
  basePath: '/app',
  apiUrl: 'https://api.example.com'
});

const root = createRoot(document.getElementById('app')!);
root.render(<ShellApp shell={shell} />);
```

**Single Page Application:**
```typescript
import type { ShellAPI } from '@herdingbits/trailhead-types';

export function init(shell: ShellAPI) {
  shell.feedback.success('App loaded!');

  const result = await shell.http.get('/api/data');
  if (result.success) {
    // Use data
  }
}
```

## Configuration

### Environment Variables

**Shell Configuration:**

- **`VITE_BASE_PATH`** - Base URL path for deployment (e.g., `/app`, `/sample/trailhead`)
  - Used when deploying to a subdirectory instead of root
  - Example: Deploying to `https://example.com/app/` → set `VITE_BASE_PATH=/app`
  - Default: `""` (root path)

- **`APP_CONFIG.apiUrl`** - API endpoint URL (runtime configuration)
  - Set via `window.APP_CONFIG` in your HTML
  - Used by shell's HTTP client for API calls
  - Example: `<script>window.APP_CONFIG = { apiUrl: 'https://api.example.com' };</script>`

**Development Configuration:**

Create `.env.development` in your shell directory:

```bash
# Base path for local development (usually empty for root)
VITE_BASE_PATH=
```

**Note:** For development, SPAs are typically developed in standalone mode with hot reload. To test integration with the shell, build the SPA and copy it to the shell's public directory.

**Production Build:**

```bash
# Build with custom base path
VITE_BASE_PATH=/app npm run build

# Or set in .env.production
echo "VITE_BASE_PATH=/app" > .env.production
npm run build
```

### Shell Configuration Example

```typescript
import { Trailhead } from '@herdingbits/trailhead-core';
import { ShoelaceAdapter, ShellApp } from '@herdingbits/trailhead-shoelace';

const shell = new Trailhead({
  adapter: new ShoelaceAdapter(),
  basePath: import.meta.env.VITE_BASE_PATH || '',  // From build-time env var
  apiUrl: window.APP_CONFIG?.apiUrl || '',         // From runtime config
});

ShellApp.mount(shell);
```

### Why Set Base Path?

**Subdirectory Deployment:**
- Deploying to `https://example.com/app/` instead of root
- Hosting multiple applications on same domain
- CDN path requirements

**Example Deployment Scenarios:**

```bash
# Root deployment (default)
VITE_BASE_PATH= npm run build
# Serves at: https://example.com/

# Subdirectory deployment
VITE_BASE_PATH=/app npm run build
# Serves at: https://example.com/app/

# Multi-tenant deployment
VITE_BASE_PATH=/tenant1 npm run build
# Serves at: https://example.com/tenant1/
```

## Example Preview

```bash
cd tools/preview-server

# Build and preview Shoelace site
npm run build:shoelace
npm start

# Build and preview CloudScape site
npm run build:cloudscape
npm start

# Serves at http://localhost:8081/sample/trailhead
```

## Developing Locally

```bash
# Install dependencies
cd examples/shoelace-site/shell && npm install
cd examples/shoelace-site/apps/demo && npm install

# Develop SPA in standalone mode (with hot reload)
cd examples/shoelace-site/apps/demo && npm start

# Visit http://localhost:3001

# To test with shell:
# 1. Build the SPA
cd examples/shoelace-site/apps/demo && npm run build

# 2. Copy to shell public directory
mkdir -p ../shell/public/demo
cp dist/app.js ../shell/public/demo/

# 3. Start shell
cd ../shell && npm start

# Visit http://localhost:3000
```

## Dynamic Navigation

Update `navigation.json` to add, remove, or reorder menu items - **no rebuild required**:

```json
{
  "id": "customers",
  "path": "/customers",
  "app": "customers",
  "icon": "people",
  "label": "Customers"
}
```

The shell reads this at runtime and updates the navigation menu across all SPAs.

## Learn More

Read the full article: [Building Trailhead - A Rainy Day Micro-Frontend Experiment](https://www.herdingbits.com/blog/building-trailhead-micro-frontend-framework)

The article covers:
- Architecture decisions and tradeoffs
- Performance analysis (page reloads vs client-side routing)
- Deployment on AWS (S3 + CloudFront)
- Scaling to multiple modules
- The React exit strategy

### Additional Documentation

- [Creating Adapters](docs/CREATING_ADAPTERS.md) - Build custom design system adapters
- [Architecture Overview](docs/ARCHITECTURE.md) - Deep dive into the adapter pattern

## Published Packages

- **[@herdingbits/trailhead-core](packages/core)** - Core shell orchestration
- **[@herdingbits/trailhead-types](packages/types)** - TypeScript type definitions
- **[@herdingbits/trailhead-shoelace](packages/shoelace)** - Shoelace design system adapter
- **[@herdingbits/trailhead-cloudscape](packages/cloudscape)** - CloudScape design system adapter

## License

MIT License - See [LICENSE](LICENSE) file for details
