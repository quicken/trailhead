#!/usr/bin/env node
/**
 * Build script - copies production builds from shell and plugins
 * Usage: node build.js [shoelace|cloudscape]
 */

import { execSync } from 'child_process';
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync } from 'fs';

// Get site from command line argument (default: shoelace)
const site = process.argv[2] || 'shoelace';

if (!['shoelace', 'cloudscape'].includes(site)) {
  console.error('Error: Site must be either "shoelace" or "cloudscape"');
  console.log('Usage: node build.js [shoelace|cloudscape]');
  process.exit(1);
}

console.log(`Building production artifacts for ${site} site...\n`);

// Clean public directory
console.log('Cleaning public/...');
rmSync('public', { recursive: true, force: true });
mkdirSync('public', { recursive: true });

// Build shell
console.log(`\n1. Building ${site} shell...`);
execSync('VITE_BASE_PATH=/sample/trailhead npm run build', { 
  cwd: `../../site/${site}-site`, 
  stdio: 'inherit',
  env: { ...process.env, VITE_BASE_PATH: '/sample/trailhead' }
});

// Copy shell build
console.log('\n2. Copying shell build...');
cpSync(`../../site/${site}-site/dist`, 'public', { recursive: true });

// Read navigation to determine which apps to build
const navigation = JSON.parse(readFileSync('public/navigation.json', 'utf-8'));
const indexTemplate = readFileSync('public/index.html', 'utf-8');

// Build and copy each app
let step = 3;
navigation.forEach(route => {
  const appName = route.app;
  const routePath = route.path.substring(1); // Remove leading slash
  
  console.log(`\n${step}. Building ${appName} app...`);
  execSync('npm run build', { cwd: `../../site/${site}-site/apps/${appName}`, stdio: 'inherit' });
  step++;
  
  console.log(`\n${step}. Copying ${appName} app to ${routePath}/...`);
  const routeDir = `public/${routePath}`;
  mkdirSync(routeDir, { recursive: true });
  
  // Copy app.js to route directory
  cpSync(`../../site/${site}-site/apps/${appName}/dist/app.js`, `${routeDir}/app.js`);
  
  // Copy CSS if it exists (find any .css file in dist or public)
  try {
    const distFiles = readdirSync(`../../site/${site}-site/apps/${appName}/dist`);
    const cssFile = distFiles.find(f => f.endsWith('.css'));
    if (cssFile) {
      cpSync(`../../site/${site}-site/apps/${appName}/dist/${cssFile}`, `${routeDir}/${appName}.css`);
      console.log(`  Copied ${cssFile} as ${appName}.css`);
    } else {
      // Try public folder
      cpSync(`../../site/${site}-site/apps/${appName}/public/${appName}.css`, `${routeDir}/${appName}.css`);
      console.log(`  Copied ${appName}.css from public`);
    }
  } catch (e) {
    console.log(`  No CSS file for ${appName}`);
  }
  
  // Copy index.html to route directory
  writeFileSync(`${routeDir}/index.html`, indexTemplate);
  console.log(`  Created ${routePath}/index.html and ${routePath}/app.js`);
  step++;
});

console.log('\n✓ Production build complete!');
console.log('\nPublic directory structure:');
execSync('find public -type f | head -30', { stdio: 'inherit' });
