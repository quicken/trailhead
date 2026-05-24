#!/usr/bin/env node
/**
 * Build script - copies templates from examples
 */

import { cpSync, rmSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Building create-trailhead templates...\n');

// Clean templates directory
console.log('Cleaning templates/...');
rmSync(join(__dirname, 'templates'), { recursive: true, force: true });
mkdirSync(join(__dirname, 'templates'), { recursive: true });

// Copy Web Awesome templates
console.log('Copying Web Awesome shell template...');
cpSync(
  join(__dirname, '../../examples/webawesome-site/shell'),
  join(__dirname, 'templates/webawesome-shell'),
  {
    recursive: true,
    filter: (src) => {
      const name = src.split('/').pop();
      return name !== 'node_modules' && name !== 'dist' && name !== '.env.development';
    }
  }
);

console.log('Copying Web Awesome app template...');
cpSync(
  join(__dirname, '../../examples/webawesome-site/apps/demo'),
  join(__dirname, 'templates/webawesome-app'),
  {
    recursive: true,
    filter: (src) => {
      const name = src.split('/').pop();
      return name !== 'node_modules' && name !== 'dist';
    }
  }
);

// Copy CloudScape templates
console.log('Copying CloudScape shell template...');
cpSync(
  join(__dirname, '../../examples/cloudscape-site/shell'),
  join(__dirname, 'templates/cloudscape-shell'),
  {
    recursive: true,
    filter: (src) => {
      const name = src.split('/').pop();
      return name !== 'node_modules' && name !== 'dist' && name !== '.env.development';
    }
  }
);

console.log('Copying CloudScape app template...');
cpSync(
  join(__dirname, '../../examples/cloudscape-site/apps/demo'),
  join(__dirname, 'templates/cloudscape-app'),
  {
    recursive: true,
    filter: (src) => {
      const name = src.split('/').pop();
      return name !== 'node_modules' && name !== 'dist';
    }
  }
);

console.log('\n✓ Templates built successfully!');
