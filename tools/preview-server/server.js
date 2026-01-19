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

// Serve static files from public directory
app.use(express.static(join(__dirname, 'public')));

// SPA fallback - serve index.html for all non-file routes
app.use((req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
✓ Production server running!

  Local:   http://localhost:${PORT}
  
  Routes:
  - http://localhost:${PORT}       (Shell home)
  - http://localhost:${PORT}/demo  (Demo plugin)
  
Press Ctrl+C to stop
`);
});
