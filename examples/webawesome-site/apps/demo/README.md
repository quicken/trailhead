# Demo App

React 19 SPA demonstrating the Trailhead shell API.

## What It Shows

- Shell feedback API — toasts, busy overlays, all dialog variants
- Shell HTTP client — success, error, and silent requests
- Shell navigation API
- Standalone dev mode with mocked shell

## Tech Stack

- React 19
- TypeScript
- Vite

## Bundle Size

~778 kB (196 kB gzipped) — includes React.

## Development

```bash
npm install
npm start  # Port 3000, standalone mode
```

The Vite dev server proxies `/webawesome`, `/shell.json`, and `/trailhead/shell` to the shell on port 3001 when it's running.

## Build

```bash
npm run build  # Outputs dist/app.js
```

## Shell API Usage

```typescript
// Toasts
window.shell.feedback.success('Done!');
window.shell.feedback.error('Failed!');
window.shell.feedback.warning('Watch out!');
window.shell.feedback.info('FYI');

// Busy overlay
window.shell.feedback.busy('Processing…');
window.shell.feedback.clear();

// Dialogs
const confirmed = await window.shell.feedback.confirm('Are you sure?', 'Title');
const answer    = await window.shell.feedback.yesNo('Do you agree?', 'Title');
const choice    = await window.shell.feedback.yesNoCancel('Save before closing?');

// HTTP
const result = await window.shell.http.get('https://api.example.com/users/1', {
  busyMessage: 'Loading…',
  showSuccess: true,
});

// Navigation
window.shell.navigation.navigate('/demo');
const path = window.shell.navigation.getCurrentPath();
```
