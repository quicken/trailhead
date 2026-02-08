# Demo App

React 19 single page application demonstrating shell API integration.

## Features

- React 19 with hooks
- Shell API integration (feedback, HTTP, navigation)
- Test counter component
- Standalone dev mode + shell integration

## Tech Stack

- React 19
- TypeScript
- Vite + esbuild
- Bundles own React (no shared runtime)

## Development

```bash
npm install
npm start  # Runs on port 3001
```

Visit `http://localhost:3001` for standalone dev with hot reload.

## Build

```bash
npm run build  # Outputs to dist/app.js
```

## Bundle Size

- App: ~313 kB (72 kB gzipped) - includes React

## Integration

App exports `window.AppMount(container)` for shell integration:

```typescript
window.AppMount = (container: HTMLElement) => {
  const root = ReactDOM.createRoot(container);
  root.render(<DemoApp />);
  return { unmount: () => root.unmount() };
};
```

## Shell API Usage

```typescript
// Feedback
window.shell.feedback.success("Operation successful!");

// HTTP
const result = await window.shell.http.get("/api/data");

// Navigation
window.shell.navigation.navigate("/demo");
```

## Standalone Dev

The app includes a mock shell API for standalone development at localhost:3001.
