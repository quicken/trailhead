#!/usr/bin/env node
/**
 * Deployment assembly script for CloudScape site
 * Assembles pre-built shell and apps into deployment structure
 * 
 * Prerequisites: Shell and apps must be built first
 * Usage: node deploy.js
 */

import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const BASE_PATH = process.env.BASE_PATH || '/sample/trailhead/cloudscape';
const OUTPUT_DIR = join(__dirname, 'dist');

console.log('Assembling CloudScape site for deployment...');
console.log(`Base path: ${BASE_PATH}`);
console.log(`Output: ${OUTPUT_DIR}\n`);

// Check shell is built
const shellDist = join(__dirname, 'shell/dist');
if (!existsSync(shellDist)) {
  console.error('Error: Shell not built. Run: cd shell && npm run build');
  process.exit(1);
}

// Clean output directory
console.log('1. Cleaning output directory...');
rmSync(OUTPUT_DIR, { recursive: true, force: true });
mkdirSync(OUTPUT_DIR, { recursive: true });

// Copy shell build
console.log('\n2. Copying shell...');
cpSync(shellDist, OUTPUT_DIR, { recursive: true });

// Read navigation to determine which apps to assemble
const navigation = JSON.parse(readFileSync(join(OUTPUT_DIR, 'navigation.json'), 'utf-8'));
const indexTemplate = readFileSync(join(OUTPUT_DIR, 'index.html'), 'utf-8');

// Copy each app
let step = 3;
navigation.forEach(route => {
  const appName = route.app;
  const routePath = route.path.substring(1); // Remove leading slash
  const appDist = join(__dirname, 'apps', appName, 'dist');
  
  // Check app is built
  if (!existsSync(appDist)) {
    console.error(`\nError: App "${appName}" not built. Run: cd apps/${appName} && npm run build`);
    process.exit(1);
  }
  
  console.log(`\n${step}. Copying ${appName} app to ${routePath}/...`);
  const routeDir = join(OUTPUT_DIR, routePath);
  mkdirSync(routeDir, { recursive: true });
  
  // Copy app.js
  cpSync(join(appDist, 'app.js'), join(routeDir, 'app.js'));
  
  // Copy CSS if it exists
  try {
    const distFiles = readdirSync(appDist);
    const cssFile = distFiles.find(f => f.endsWith('.css'));
    if (cssFile) {
      cpSync(join(appDist, cssFile), join(routeDir, `${appName}.css`));
      console.log(`  Copied ${cssFile} as ${appName}.css`);
    }
  } catch (e) {
    console.log(`  No CSS file for ${appName}`);
  }
  
  // Copy index.html to route directory
  writeFileSync(join(routeDir, 'index.html'), indexTemplate);
  console.log(`  Created ${routePath}/index.html and ${routePath}/app.js`);
  step++;
});

console.log('\n✓ Deployment assembly complete!');
console.log(`\nOutput directory: ${OUTPUT_DIR}`);
console.log('\nTo deploy, upload the contents of dist/ to your web server.');

