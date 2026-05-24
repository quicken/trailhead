# SaaS Demo

Vanilla TypeScript SPA demonstrating Web Awesome components integrated with the Trailhead shell.

## What It Shows

- `wa-button`, `wa-card`, `wa-icon`, `wa-dialog`, `wa-input` in action
- Shell feedback API (`busy`, `success`, `error`, `confirm`)
- Shell HTTP client with loading states
- No framework — just the browser, TypeScript, and web components

## Tech Stack

- Vanilla TypeScript (no React, no Vue, no framework)
- Web Awesome web components (loaded by the shell autoloader)
- Vite (build only — not used at runtime)

## Bundle Size

~6 kB gzipped — web components are loaded by the shell, not bundled here.

## Development

```bash
npm install
npm start  # Port 3000, standalone mode
```

In standalone mode the app mocks `window.shell` locally. To develop against the real shell, build the SPA and start the shell on port 3001 — the Vite dev server proxies `/webawesome` and `/shell.json` there automatically.

## Build

```bash
npm run build  # Outputs dist/app.js
```

## Shell API Usage

```typescript
// Feedback
window.shell.feedback.success('Saved!');
window.shell.feedback.busy('Loading…');
window.shell.feedback.clear();

const confirmed = await window.shell.feedback.confirm('Delete this user?', 'Confirm');

// HTTP
const result = await window.shell.http.get<User[]>('https://api.example.com/users');
if (result.success) { /* result.data is typed */ }
```

## Web Awesome Components Used

| Component | Purpose |
|---|---|
| `wa-button` | Load, edit, delete, save, cancel |
| `wa-card` | User cards and empty state |
| `wa-icon` | Icons (Font Awesome free names) |
| `wa-dialog` | Edit user modal |
| `wa-input` | Form fields inside the dialog |
