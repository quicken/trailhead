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
const BASE_PATH = '/sample/trailhead';

// Serve static files from public directory at base path
app.use(BASE_PATH, express.static(join(__dirname, 'public')));

// SPA fallback - serve index.html for all routes under base path
app.use(BASE_PATH, (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Redirect root to base path
app.get('/', (req, res) => {
  res.redirect(BASE_PATH);
});

app.listen(PORT, () => {
  console.log(`
✓ Production server running!

  Local:   http://localhost:${PORT}${BASE_PATH}
  
  Routes:
  - http://localhost:${PORT}${BASE_PATH}       (Shell home)
  - http://localhost:${PORT}${BASE_PATH}/demo  (Demo plugin)
  - http://localhost:${PORT}${BASE_PATH}/saas  (SaaS plugin)
  
Press Ctrl+C to stop
`);
});
