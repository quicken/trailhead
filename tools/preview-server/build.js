#!/usr/bin/env node
/**
 * Build and assemble script for preview server
 * Builds shells and apps, then assembles for deployment
 * Usage: node build.js [shoelace|cloudscape|both]
 */

import { execSync } from 'child_process';
import { cpSync, mkdirSync, rmSync } from 'fs';

// Get site from command line argument (default: both)
const site = process.argv[2] || 'both';

if (!['shoelace', 'cloudscape', 'both'].includes(site)) {
  console.error('Error: Site must be either "shoelace", "cloudscape", or "both"');
  console.log('Usage: node build.js [shoelace|cloudscape|both]');
  process.exit(1);
}

console.log(`Building and assembling sites for preview...\n`);

// Clean public directory
console.log('Cleaning public/...');
rmSync('public', { recursive: true, force: true });
mkdirSync('public/sample/trailhead', { recursive: true });

const sites = site === 'both' ? ['shoelace', 'cloudscape'] : [site];

sites.forEach(siteName => {
  const siteDir = `../../examples/${siteName}-site`;
  
  console.log(`\n=== Building ${siteName} site ===\n`);
  
  // Build shell
  console.log(`Building ${siteName} shell...`);
  execSync('npm run build', { 
    cwd: `${siteDir}/shell`,
    stdio: 'inherit',
    env: { ...process.env, VITE_BASE_PATH: `/sample/trailhead/${siteName}` }
  });
  
  // Build apps (demo and saas-demo)
  ['demo', 'saas-demo'].forEach(appName => {
    console.log(`\nBuilding ${siteName}/${appName} app...`);
    execSync('npm run build', { 
      cwd: `${siteDir}/apps/${appName}`,
      stdio: 'inherit'
    });
  });
  
  // Assemble deployment
  console.log(`\nAssembling ${siteName} site...`);
  execSync('npm run deploy', { 
    cwd: siteDir,
    stdio: 'inherit',
    env: { ...process.env, BASE_PATH: `/sample/trailhead/${siteName}` }
  });
  
  // Copy to public directory
  console.log(`\nCopying ${siteName} to public/sample/trailhead/${siteName}/...`);
  cpSync(
    `${siteDir}/dist`,
    `public/sample/trailhead/${siteName}`,
    { recursive: true }
  );
});

console.log('\n✓ Build and assembly complete!');
console.log('\nServes at:');
sites.forEach(siteName => {
  console.log(`  - http://localhost:8081/sample/trailhead/${siteName}`);
});
