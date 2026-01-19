#!/usr/bin/env node
/**
 * Build script - copies production builds from shell and plugins
 */

import { execSync } from 'child_process';
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';

console.log('Building production artifacts...\n');

// Clean public directory
console.log('Cleaning public/...');
rmSync('public', { recursive: true, force: true });
mkdirSync('public', { recursive: true });

// Build shell
console.log('\n1. Building shell...');
execSync('npm run build', { cwd: '../../core/shell', stdio: 'inherit' });

// Copy shell build
console.log('\n2. Copying shell build...');
cpSync('../../core/shell/dist', 'public', { recursive: true });

// Read navigation to determine which apps to build
const navigation = JSON.parse(readFileSync('public/navigation.json', 'utf-8'));
const indexTemplate = readFileSync('public/index.html', 'utf-8');

// Build and copy each app
let step = 3;
navigation.forEach(route => {
  const appName = route.app;
  const routePath = route.path.substring(1); // Remove leading slash
  
  console.log(`\n${step}. Building ${appName} app...`);
  execSync('npm run build', { cwd: `../../apps/${appName}`, stdio: 'inherit' });
  step++;
  
  console.log(`\n${step}. Copying ${appName} app to ${routePath}/...`);
  const routeDir = `public/${routePath}`;
  mkdirSync(routeDir, { recursive: true });
  
  // Copy app.js to route directory
  cpSync(`../../apps/${appName}/dist/app.js`, `${routeDir}/app.js`);
  
  // Copy index.html to route directory
  writeFileSync(`${routeDir}/index.html`, indexTemplate);
  console.log(`  Created ${routePath}/index.html and ${routePath}/app.js`);
  step++;
});

console.log('\n✓ Production build complete!');
console.log('\nPublic directory structure:');
execSync('find public -type f | head -30', { stdio: 'inherit' });
