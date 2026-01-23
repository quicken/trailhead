# Trailhead Micro-Frontend Architecture

## What is Trailhead?

Trailhead is a micro-frontend framework built on browser-native ES modules. It consists of a lightweight shell (21 KB) that provides core services to independent plugin applications. Each app can use any framework and deploys independently.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Shell (21 KB)                  │
│  - Navigation Management                         │
│  - HTTP Client with feedback orchestration       │
│  - User Feedback (toasts, dialogs, loading)      │
│  - Shoelace Web Components                       │
│  - Routing & Plugin Loading                      │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │  App 1  │  │  App 2  │  │  App N  │
   │ (React) │  │  (Vue)  │  │(Vanilla)│
   └─────────┘  └─────────┘  └─────────┘
```

## Monorepo Structure

```
trailhead/
├── core/
│   ├── shell/              # Vanilla TypeScript shell
│   │   ├── src/
│   │   │   ├── shell.ts    # Main shell orchestrator
│   │   │   ├── lib/        # Core services
│   │   │   │   ├── http.ts        # HTTP client
│   │   │   │   ├── feedback.ts    # User feedback
│   │   │   │   └── requestManager.ts
│   │   │   └── types/
│   │   │       └── shell-api.ts   # Shell API contract
│   │   └── public/
│   │       ├── navigation.json    # Dynamic menu config
│   │       └── shoelace/          # UI components
│   │
│   └── contracts/          # Shared TypeScript types
│       └── index.ts        # Re-exports shell-api types
│
├── apps/
│   ├── demo/               # React demo app
│   │   └── src/
│   │       ├── index.tsx   # Plugin mount point
│   │       └── DemoApp.tsx # App component
│   │
│   └── saas-demo/          # Another example app
│
└── tools/
    ├── vite-i18n-plugin/   # Build-time i18n
    └── preview-server/     # Production build tool
        ├── build.js        # Builds all apps
        └── server.js       # Local preview server
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

## Building a Trailhead App

### 1. App Entry Point (index.tsx)

Every app must export a `window.AppMount` function:

```typescript
import ReactDOM from "react-dom/client";
import { MyApp } from "./MyApp";

// Plugin mount function - called by shell
window.AppMount = (container: HTMLElement) => {
  const root = ReactDOM.createRoot(container);
  root.render(<MyApp />);
  
  return {
    unmount: () => root.unmount(),
  };
};

// Standalone dev mode - auto-mount
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<MyApp />);
}
```

### 2. Mock Shell for Development

Apps should provide a mock shell for standalone development:

```typescript
if (!window.shell) {
  window.shell = {
    feedback: {
      busy: (msg) => console.log("[Mock] busy:", msg),
      success: (msg) => console.log("[Mock] success:", msg),
      // ... other methods
    },
    http: {
      get: async (url) => ({ success: true, data: {} }),
      // ... other methods
    },
    navigation: {
      navigate: (path) => console.log("[Mock] navigate:", path),
      getCurrentPath: () => "/my-app",
      onRouteChange: () => () => {},
    },
  };
}
```

### 3. Vite Configuration

Apps build as ES modules with single-file output:

```javascript
export default defineConfig({
  server: {
    port: 3001,  // Unique port per app
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

### 4. Type Definitions

Import shell types from contracts:

```typescript
import type { ShellAPI } from "@cfkit/contracts";

declare global {
  interface Window {
    shell: ShellAPI;
    AppMount?: (container: HTMLElement) => { unmount: () => void };
  }
}
```

## Navigation Configuration

Update `core/shell/public/navigation.json` to add apps:

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

```bash
# Terminal 1: Start shell
cd core/shell
npm start  # Port 3000

# Terminal 2: Start your app
cd apps/my-app
npm start  # Port 3001

# Visit http://localhost:3000
```

### Environment Configuration

Create `core/shell/.env.development`:

```bash
VITE_PLUGIN_PORT_DEMO=3001
VITE_PLUGIN_PORT_MYAPP=3002
```

The shell loads apps from dev servers in development:
- Dev: `http://localhost:3001/src/index.tsx` (Vite transforms on-the-fly)
- Prod: `/my-app/app.js` (pre-built bundle)

## Production Build

### Building All Apps

```bash
cd tools/preview-server
npm run build  # Builds shell + all apps from navigation.json
npm start      # Preview at http://localhost:8081
```

### Build Process

1. Reads `navigation.json` to discover apps
2. Builds shell → `public/`
3. For each app:
   - Builds app → `public/<app-path>/app.js`
   - Copies `index.html` → `public/<app-path>/index.html`

### Deployment Structure

```
public/
├── index.html           # Shell HTML
├── shell.js             # Shell bundle (21 KB)
├── shell.css            # Shell styles
├── navigation.json      # Menu config
├── shoelace/            # UI components
├── demo/
│   ├── index.html       # Copy of shell HTML
│   └── app.js           # Demo app bundle
└── my-app/
    ├── index.html
    └── app.js
```

## Routing & Loading

### Page-Based Routing

Trailhead uses full page reloads for navigation:
- Provides automatic CSS/JS isolation
- No complex client-side routing
- Works on any static file server (S3, Netlify, etc.)

### Plugin Loading Flow

1. User navigates to `/demo`
2. Shell loads `demo/index.html` (contains shell)
3. Shell reads `navigation.json`
4. Shell finds route: `{ path: "/demo", app: "demo" }`
5. Shell injects `<script src="/demo/app.js">`
6. App exports `window.AppMount`
7. Shell calls `AppMount(container)`
8. App renders into container

### Unmounting

When navigating away:
```typescript
if (this.currentPlugin) {
  this.currentPlugin.unmount();  // Cleanup
  this.currentPlugin = null;
}
```

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

All use Shoelace components loaded by shell.

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

## Adding a New App

1. **Create app directory**
   ```bash
   mkdir -p apps/my-app/src
   cd apps/my-app
   npm init -y
   ```

2. **Install dependencies**
   ```bash
   npm install react react-dom
   npm install -D vite typescript @types/react @types/react-dom
   npm install @cfkit/contracts@file:../../core/contracts
   ```

3. **Create entry point** (`src/index.tsx`)
   - Export `window.AppMount`
   - Add mock shell for dev
   - Auto-mount for standalone mode

4. **Configure Vite** (`vite.config.js`)
   - Library mode with ES format
   - Output: `app.js`
   - Enable CORS

5. **Add to navigation** (`core/shell/public/navigation.json`)
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

6. **Configure shell dev port** (`core/shell/.env.development`)
   ```bash
   VITE_PLUGIN_PORT_MYAPP=3002
   ```

7. **Start developing**
   ```bash
   npm start  # Port 3002
   ```

## Key Principles

1. **Framework Agnostic**: Apps choose their own framework
2. **Independent Deployment**: Deploy one app without touching others
3. **True Isolation**: Page reloads provide CSS/JS isolation
4. **Shared Infrastructure**: Shell handles common concerns
5. **Zero Configuration**: No URL rewrites, works on static hosts
6. **Runtime Updates**: Change navigation without rebuilding apps

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

### Shoelace Components

Shell loads Shoelace - apps use directly:

```typescript
return (
  <sl-button variant="primary" onClick={handleClick}>
    Click Me
  </sl-button>
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

- Shell: 21 KB (loads once)
- Apps: Self-contained bundles (React app ~150 KB)
- Page reload: ~200ms (acceptable for navigation)
- No client-side routing complexity
- Automatic code splitting per app
