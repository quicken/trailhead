# Production Test Server

Simulates production deployment of the shell + plugin architecture.

## Quick Start

```bash
# Build shell and plugins
npm run build

# Start production server
npm start

# Visit http://localhost:8080
```

## What It Does

1. **Build Script** (`build.js`):
   - Builds ui-shell (production)
   - Builds plugin-demo (production)
   - Copies all artifacts to `public/` directory
   - Structure:
     ```
     public/
     ├── index.html              (Shell entry)
     ├── shell.js                (Shell bundle)
     ├── shell.css               (Shell styles)
     ├── react.production.min.js (React runtime)
     ├── react-dom.production.min.js (ReactDOM runtime)
     ├── navigation.json         (Menu config)
     └── apps/
         └── demo/
             └── app.js          (Plugin bundle)
     ```

2. **Server** (`server.js`):
   - Express server on port 8080
   - Serves static files from `public/`
   - SPA routing (all routes → index.html)

## Testing Production

1. Build: `npm run build`
2. Start: `npm start`
3. Open: http://localhost:8080/demo
4. Check Network tab:
   - React loaded once from shell
   - Plugin loads as ESM module
   - No duplicate React

## Differences from Dev

- **Dev**: Plugin uses React from node_modules
- **Prod**: Plugin uses React from shell via import map
- **Dev**: Two servers (3000 + 3001)
- **Prod**: One server (8080)
