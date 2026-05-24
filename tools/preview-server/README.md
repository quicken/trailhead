# Production Preview Server

Simulates production deployment of the Trailhead shell and SPAs.

## Quick Start

```bash
# Build Web Awesome site
npm run build:webawesome

# Build CloudScape site
npm run build:cloudscape

# Start production server
npm start

# Visit http://localhost:8081/sample/trailhead
```

## What It Does

1. **Build Scripts**:
   - Builds shell (production)
   - Builds SPAs (production)
   - Copies all artefacts to `public/` directory
   - Structure:
     ```
     public/sample/trailhead/
     ├── index.html              (Shell entry)
     ├── shell.js                (Shell bundle)
     ├── shell.css               (Shell styles)
     ├── shell.json              (Shell config: SPA registry + nav)
     ├── webawesome/             (Web Awesome assets)
     └── apps/
         ├── demo/
         │   └── app.js          (SPA bundle)
         └── saas-demo/
             └── app.js          (SPA bundle)
     ```

2. **Server** (`server.js`):
   - Express server on port 8081
   - Serves static files from `public/`

## Testing Production

1. Build: `npm run build:webawesome` or `npm run build:cloudscape`
2. Start: `npm start`
3. Open: http://localhost:8081/sample/trailhead
4. Check Network tab:
   - Shell loaded once
   - SPAs load as ES modules
   - Web Awesome components cached

## Differences from Dev

- **Dev**: SPAs run on separate ports (3001, 3000)
- **Prod**: Everything served from one server (8081)
- **Dev**: Hot reload enabled
- **Prod**: Static files
