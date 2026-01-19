# UI Shell

Pure TypeScript application shell that provides core services to plugin applications.

## Features

- **Feedback System**: Toast notifications, busy overlays, confirmation dialogs
- **HTTP Client**: Wrapper around ky with Result type pattern
- **Navigation**: Client-side routing and plugin loading
- **Plugin Architecture**: Dynamically loads React plugins based on routes

## Tech Stack

- Pure TypeScript (no React)
- Vite + esbuild
- Minimal dependencies (ky only)

## Development

```bash
npm install
npm start  # Runs on port 3000
```

## Build

```bash
npm run build  # Outputs to dist/
```

## Bundle Size

- Shell: ~21 kB (7 kB gzipped)
- CSS: ~3.5 kB (1.2 kB gzipped)

## Configuration

### Environment Variables (.env.development)

```bash
VITE_PLUGIN_PORT_DEMO=3001
```

Maps plugin names to dev server ports.

### Navigation (public/navigation.json)

```json
[
  {
    "id": "demo",
    "path": "/demo",
    "app": "demo",
    "icon": "star",
    "label": "Demo",
    "order": 1
  }
]
```

## Shell API

Plugins access shell services via `window.shell`:

```typescript
// Feedback
window.shell.feedback.success("Saved!");
window.shell.feedback.busy("Loading...");
const confirmed = await window.shell.feedback.confirm("Delete?");

// HTTP
const result = await window.shell.http.get("/api/data");
if (result.success) {
  console.log(result.data);
}

// Navigation
window.shell.navigation.navigate("/demo");
const path = window.shell.navigation.getCurrentPath();
```

## Plugin Loading

**Dev mode**: Loads from `http://localhost:{PORT}/src/index.tsx`
**Production**: Loads from `/apps/{name}/app.js`

Plugins must export `window.AppMount(container)` function.
