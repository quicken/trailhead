#!/usr/bin/env node
/**
 * Build script - copies templates from examples
 */

import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
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

// The examples' tsconfigs extend examples/tsconfig.base.json, which sits outside every
// template (and one directory level deeper than a scaffolded project would put it), so a
// scaffolded project can't resolve it. Inline the base into each template's tsconfig.
console.log('Inlining tsconfig.base.json into template tsconfigs...');
const baseTsconfig = JSON.parse(readFileSync(join(__dirname, '../../examples/tsconfig.base.json'), 'utf-8'));
readdirSync(join(__dirname, 'templates')).forEach(template => {
  const tsconfigPath = join(__dirname, 'templates', template, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) return;
  const { extends: base, ...tsconfig } = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
  if (!base?.endsWith('tsconfig.base.json')) return;
  tsconfig.compilerOptions = { ...baseTsconfig.compilerOptions, ...tsconfig.compilerOptions };
  writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
});

console.log('\n✓ Templates built successfully!');
