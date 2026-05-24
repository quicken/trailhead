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
