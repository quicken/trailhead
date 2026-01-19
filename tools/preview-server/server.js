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

// Redirect root to base path
app.get('/', (req, res) => {
  res.redirect(BASE_PATH);
});

app.listen(PORT, () => {
  console.log(`
✓ Production server running!

  Local:   http://localhost:${PORT}${BASE_PATH}
  
  Routes:
  - http://localhost:${PORT}${BASE_PATH}           (Shell home)
  - http://localhost:${PORT}${BASE_PATH}/demo      (Demo plugin)
  - http://localhost:${PORT}${BASE_PATH}/saas-demo (SaaS Demo plugin)
  
  Note: No URL rewrite rules needed - each route has its own index.html
  
Press Ctrl+C to stop
`);
});
