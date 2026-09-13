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

# Visit http://localhost:8081/sample/trailhead/webawesome
# or   http://localhost:8081/sample/trailhead/cloudscape
```

## What It Does

1. **Build Scripts**:
   - Builds shell (production)
   - Builds SPAs (production)
   - Copies all artefacts to `public/` directory
   - Structure (each design system gets its own full copy, side by side):
     ```
     public/sample/trailhead/
     ├── webawesome/
     │   ├── index.html          (Shell entry)
     │   ├── shell.js            (Shell bundle)
     │   ├── shell.css           (Shell styles)
     │   ├── shell.json          (Shell config: SPA registry + nav)
     │   ├── webawesome/         (Web Awesome assets)
     │   ├── demo/
     │   │   └── app.js          (SPA bundle)
     │   └── saas-demo/
     │       └── app.js          (SPA bundle)
     └── cloudscape/
         ├── index.html
         ├── shell.js
         ├── shell.css
         ├── shell.json
         ├── demo/
         │   └── app.js
         └── saas-demo/
             └── app.js
     ```

2. **Server** (`server.js`):
   - Express server on port 8081
   - Serves static files from `public/`

## Testing Production

1. Build: `npm run build:webawesome` or `npm run build:cloudscape`
2. Start: `npm start`
3. Open: http://localhost:8081/sample/trailhead/webawesome (or `/cloudscape`)
4. Check Network tab:
   - Shell loaded once
   - SPAs load as ES modules
   - Web Awesome components cached

## Differences from Dev

- **Dev**: SPAs run on separate ports (3001, 3000)
- **Prod**: Everything served from one server (8081)
- **Dev**: Hot reload enabled
- **Prod**: Static files
