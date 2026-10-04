#!/usr/bin/env node
/**
 * Production server - serves shell and plugins
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 8081;

/**
 * Content-Security-Policy recommended for hosting a Trailhead site (security review H-2). Trailhead
 * doesn't need it to work, but sending it here proves the shells stay compatible with it, so a
 * regression (an inline script, an unlisted origin) shows up locally.
 * connect-src lists the example sites' shell.json allowedOrigins plus the Font Awesome kit host
 * Web Awesome fetches icons from, and data: for the system icons <wa-icon> fetch()es as data: URIs.
 * CSP=report-only sends it as Report-Only; CSP=off disables it.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' data: https://jsonplaceholder.typicode.com https://ka-f.fontawesome.com",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

if (process.env.CSP !== 'off') {
  const header = process.env.CSP === 'report-only' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
  app.use((req, res, next) => {
    res.setHeader(header, CSP);
    next();
  });
}

/**
 * Serve static files from public directory.
 * Files are in public/sample/trailhead/{webawesome,cloudscape}
 */
app.use(express.static(join(__dirname, 'public')));

// Redirect root to Web Awesome site
app.get('/', (req, res) => {
  res.redirect('/sample/trailhead/webawesome');
});

app.listen(PORT, () => {
  console.log(`
✓ Production server running!

  Web Awesome: http://localhost:${PORT}/sample/trailhead/webawesome
  CloudScape:  http://localhost:${PORT}/sample/trailhead/cloudscape

Press Ctrl+C to stop
`);
});
