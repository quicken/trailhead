# Trailhead Application Shell Architecture

## What is Trailhead?

Trailhead is an application shell that orchestrates multiple single page applications (SPAs) within a shared layout (chrome) - the classic SaaS pattern where you have a main menu and dozens of independent modules. Built on browser-native ES modules, the shell (21 KB / 8 KB gzipped) provides core services to independent SPAs. Each SPA can use any framework and deploys independently.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│            Application Shell (21 KB)             │
│  - Navigation Management                         │
│  - HTTP Client with feedback orchestration       │
│  - User Feedback (toasts, dialogs, loading)      │
│  - Design System Integration (Shoelace/CloudScape)│
│  - Routing & SPA Loading                         │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │  SPA 1  │  │  SPA 2  │  │  SPA N  │
   │ (React) │  │  (Vue)  │  │(Vanilla)│
   └─────────┘  └─────────┘  └─────────┘
```

## Monorepo Structure

```
trailhead/
├── packages/                      # Published NPM packages
│   ├── core/                     # @herdingbits/trailhead-core
│   │   ├── src/
│   │   │   ├── shell.ts          # Main shell orchestrator
│   │   │   ├── lib/              # Core services
│   │   │   │   ├── http.ts      # HTTP client
│   │   │   │   ├── feedback.ts  # User feedback
│   │   │   │   └── requestManager.ts
│   │   │   └── types/
│   │   │       └── shell-api.ts # Shell API contract
│   │   └── package.json
│   │
│   ├── types/                    # @herdingbits/trailhead-types
│   │   └── index.d.ts           # Auto-generated from core
│   │
│   ├── shoelace/                 # @herdingbits/trailhead-shoelace
│   │   ├── src/
│   │   │   ├── adapter.ts       # Shoelace adapter
│   │   │   └── ShellApp.ts      # Shell mounting
│   │   └── shell.css
│   │
│   └── cloudscape/               # @herdingbits/trailhead-cloudscape
│       ├── src/
│       │   ├── adapter.ts       # CloudScape adapter
│       │   └── ShellApp.tsx     # React shell component
│       └── shell.css
│
├── examples/                     # Example implementations
│   ├── shoelace-site/
│   │   ├── shell/               # Shoelace shell implementation
│   │   │   ├── src/
│   │   │   │   └── index.ts    # Shell entry point
│   │   │   └── public/
│   │   │       └── navigation.json  # Dynamic menu config
│   │   └── apps/
│   │       ├── demo/            # React demo SPA
│   │       └── saas-demo/       # SaaS example SPA
│   │
│   └── cloudscape-site/
│       ├── shell/               # CloudScape shell (React)
│       └── apps/
│           ├── demo/
│           └── saas-demo/
│
└── tools/
    ├── vite-i18n-plugin/        # Build-time i18n
    └── preview-server/          # Production preview
        ├── build.js             # Builds all sites
        └── server.js            # Local preview server
```

## Shell API Contract

The shell exposes a global API via `window.shell`:

```typescript
interface ShellAPI {
  feedback: FeedbackAPI;    // User notifications
  http: HttpAPI;            // HTTP client
  navigation: NavigationAPI; // Routing
}
```

### Feedback API
```typescript
window.shell.feedback.busy("Loading...");
window.shell.feedback.success("Saved!");
window.shell.feedback.error("Failed!");
const confirmed = await window.shell.feedback.confirm("Delete?");
const choice = await window.shell.feedback.yesNoCancel("Save changes?");
```

### HTTP API
```typescript
const result = await window.shell.http.get("/api/users", {
  busyMessage: "Loading users...",
  successMessage: "Users loaded!",
  showSuccess: true,
});

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

### Navigation API
```typescript
window.shell.navigation.navigate("/demo");
const path = window.shell.navigation.getCurrentPath();
const unsubscribe = window.shell.navigation.onRouteChange((path) => {
  console.log("Route changed:", path);
});
```

## Building a Trailhead SPA

### 1. SPA Entry Point (index.tsx)

Every SPA exports an `init` function that receives the shell API:

```typescript
import type { ShellAPI } from '@herdingbits/trailhead-types';
import ReactDOM from "react-dom/client";
import { MyApp } from "./MyApp";

// SPA init function - called by shell
export function init(shell: ShellAPI) {
  const container = document.getElementById('app-content');
  if (!container) return;
  
  const root = ReactDOM.createRoot(container);
  root.render(<MyApp shell={shell} />);
}

// Standalone dev mode - provide mock shell
if (!window.shell) {
  window.shell = {
    feedback: {
      busy: (msg) => console.log("[Mock] busy:", msg),
      success: (msg) => console.log("[Mock] success:", msg),
      error: (msg) => console.error("[Mock] error:", msg),
      clear: () => {},
      confirm: async () => true,
    },
    http: {
      get: async (url) => ({ success: true, data: {} }),
      post: async (url, data) => ({ success: true, data: {} }),
      put: async (url, data) => ({ success: true, data: {} }),
      delete: async (url) => ({ success: true, data: {} }),
    },
    navigation: {
      navigate: (path) => console.log("[Mock] navigate:", path),
      getCurrentPath: () => "/my-app",
      onRouteChange: () => () => {},
    },
  };
  
  // Auto-mount for standalone dev
  init(window.shell);
}
```

### 2. Vite Configuration

SPAs build as ES modules with single-file output:

```javascript
export default defineConfig({
  server: {
    port: 3001,  // Unique port per SPA
    cors: true,
  },
  build: {
    lib: {
      entry: "src/index.tsx",
      formats: ["es"],
      fileName: () => "app.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,  // Single file
      },
    },
  },
});
```

### 3. Type Definitions

Import shell types from published package:

```typescript
import type { ShellAPI } from "@herdingbits/trailhead-types";

declare global {
  interface Window {
    shell: ShellAPI;
  }
}

export function init(shell: ShellAPI) {
  // Your SPA logic
}
```

## Navigation Configuration

Update `examples/shoelace-site/shell/public/navigation.json` to add SPAs:

```json
[
  {
    "id": "my-app",
    "path": "/my-app",
    "app": "my-app",
    "icon": "star",
    "label": "My App",
    "order": 1
  }
]
```

Changes take effect immediately - no rebuild needed.

## Development Workflow

### Starting Development

**Standalone SPA Development (Recommended):**

```bash
# Develop SPA with hot reload
cd examples/shoelace-site/apps/demo
npm start  # Port 3001

# Visit http://localhost:3001
```

**Testing with Shell:**

```bash
# 1. Build the SPA
cd examples/shoelace-site/apps/demo
npm run build

# 2. Copy to shell public directory
mkdir -p ../shell/public/demo
cp dist/app.js ../shell/public/demo/

# 3. Start shell
cd ../shell
npm start  # Port 3000

# Visit http://localhost:3000
```

### Environment Configuration

Create `examples/shoelace-site/shell/.env.development`:

```bash
# Base path for local development (usually empty for root)
VITE_BASE_PATH=
```

The shell loads SPAs from their built output in the `public/` directory. For rapid development with hot reload, develop SPAs in standalone mode using the mock shell API.

## Production Build

### Building All Sites

```bash
cd tools/preview-server

# Build Shoelace site
npm run build:shoelace

# Build CloudScape site
npm run build:cloudscape

# Preview
npm start  # http://localhost:8081/sample/trailhead
```

### Build Process

1. Reads `navigation.json` to discover SPAs
2. Builds shell → `public/sample/trailhead/`
3. For each SPA:
   - Builds SPA → `public/sample/trailhead/<app-path>/app.js`
   - Copies `index.html` → `public/sample/trailhead/<app-path>/index.html`

### Deployment Structure

```
public/sample/trailhead/
├── index.html           # Shell HTML
├── shell.js             # Shell bundle (21 KB / 8 KB gzipped)
├── shell.css            # Shell styles
├── navigation.json      # Menu config
├── shoelace/            # Design system (if using Shoelace)
├── demo/
│   ├── index.html       # Copy of shell HTML
│   └── app.js           # Demo SPA bundle
└── saas-demo/
    ├── index.html
    └── app.js
```

## Routing & Loading

### Page-Based Routing

Trailhead uses full page reloads for navigation between SPAs:
- Provides automatic CSS/JS isolation
- No complex client-side routing between SPAs
- Works on any static file server (S3, Netlify, etc.)
- Each SPA can use its own internal routing (React Router, etc.)

### SPA Loading Flow

1. User navigates to `/demo`
2. Shell loads `demo/index.html` (contains shell)
3. Shell reads `navigation.json`
4. Shell finds route: `{ path: "/demo", app: "demo" }`
5. Shell loads `/demo/app.js` as ES module
6. SPA exports `init(shell)` function
7. Shell calls `init(shell)` with shell API
8. SPA renders into container

### Unmounting

When navigating away, the page reloads - automatic cleanup.

## Shared Services

### HTTP Client Features

- Automatic loading indicators
- Success/error feedback
- Request deduplication via `requestKey`
- Centralized error handling

```typescript
const result = await window.shell.http.post("/api/users", userData, {
  requestKey: "create-user",  // Prevents duplicate requests
  busyMessage: "Creating user...",
  successMessage: "User created!",
  showSuccess: true,
});
```

### Feedback System

- **Toasts**: `success()`, `error()`, `warning()`, `info()`
- **Loading**: `busy()`, `clear()`
- **Dialogs**: `confirm()`, `yesNo()`, `yesNoCancel()`, `custom()`
- **Alerts**: `alert()` with variants

All use design system components (Shoelace or CloudScape) loaded by shell.

## Design System Integration

### Shoelace (Web Components)

Shell loads Shoelace once - all SPAs use the same components:

```typescript
// In any SPA - no imports needed
<sl-button variant="primary" onClick={handleClick}>
  Click Me
</sl-button>
```

### CloudScape (React)

Shell and SPAs share CloudScape React components:

```typescript
import { Button } from '@cloudscape-design/components';

<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>
```

## Internationalization

### Build-Time Translation

- Zero runtime overhead
- One build per language
- Strings replaced at build time

```typescript
// Source code
const msg = t("Hello, world!");

// After build (English)
const msg = "Hello, world!";

// After build (German)
const msg = "Hallo, Welt!";
```

### Translation Workflow

1. Write code with `t("key")`
2. Run `npm run i18n:extract` → generates `translations/template.json`
3. Translate to `translations/de.json`
4. Run `npm run build:de` → German build
5. Run `npm run i18n:validate` → check for missing translations

## Adding a New SPA

1. **Create SPA directory**
   ```bash
   mkdir -p examples/shoelace-site/apps/my-app/src
   cd examples/shoelace-site/apps/my-app
   npm init -y
   ```

2. **Install dependencies**
   ```bash
   npm install react react-dom
   npm install -D vite typescript @types/react @types/react-dom
   npm install -D @herdingbits/trailhead-types
   ```

3. **Create entry point** (`src/index.tsx`)
   - Export `init(shell)` function
   - Add mock shell for dev
   - Auto-mount for standalone mode

4. **Configure Vite** (`vite.config.js`)
   - Library mode with ES format
   - Output: `app.js`
   - Enable CORS

5. **Add to navigation** (`examples/shoelace-site/shell/public/navigation.json`)
   ```json
   {
     "id": "my-app",
     "path": "/my-app",
     "app": "my-app",
     "icon": "star",
     "label": "My App",
     "order": 3
   }
   ```

6. **Configure shell dev port** (`examples/shoelace-site/shell/.env.development`)
   ```bash
   VITE_APP_PORT_MYAPP=3002
   ```

6. **Start developing**
   ```bash
   # Standalone mode with hot reload
   npm start  # Port 3002
   
   # To test with shell, build and copy:
   npm run build
   mkdir -p ../shell/public/my-app
   cp dist/app.js ../shell/public/my-app/
   ```

## Key Principles

1. **Framework Agnostic**: SPAs choose their own framework
2. **Independent Deployment**: Deploy one SPA without touching others
3. **True Isolation**: Page reloads provide CSS/JS isolation between SPAs
4. **Shared Infrastructure**: Shell handles common concerns (navigation, HTTP, feedback)
5. **Zero Configuration**: No URL rewrites between SPAs, works on static hosts
6. **Runtime Updates**: Change navigation without rebuilding SPAs
7. **Design System Consistency**: Shell and SPAs share the same design system

## Common Patterns

### Using Shell Services

```typescript
export const MyComponent = () => {
  const handleSave = async () => {
    const result = await window.shell.http.post("/api/save", data, {
      busyMessage: "Saving...",
      successMessage: "Saved successfully!",
      showSuccess: true,
    });
    
    if (result.success) {
      // Handle success
    }
  };
  
  return <button onClick={handleSave}>Save</button>;
};
```

### Design System Components

**Shoelace (Web Components):**
```typescript
return (
  <sl-button variant="primary" onClick={handleClick}>
    Click Me
  </sl-button>
);
```

**CloudScape (React):**
```typescript
import { Button } from '@cloudscape-design/components';

return (
  <Button variant="primary" onClick={handleClick}>
    Click Me
  </Button>
);
```

### Error Handling

```typescript
const result = await window.shell.http.get("/api/data");

if (!result.success) {
  // Error already shown by shell
  console.error(result.error);
  return;
}

// Use result.data
```

## Performance Considerations

- Shell: 21 KB (8 KB gzipped) - loads once
- SPAs: Self-contained bundles (React SPA ~74 KB)
- Page reload between SPAs: ~70-150ms (imperceptible on fast connections)
- No client-side routing complexity between SPAs
- Automatic code splitting per SPA
- Design system loaded once, shared across all SPAs
