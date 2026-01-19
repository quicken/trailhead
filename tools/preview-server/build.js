#!/usr/bin/env node
/**
 * Build script - copies production builds from shell and plugins
 */

import { execSync } from 'child_process';
import { cpSync, mkdirSync, rmSync } from 'fs';

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

// Build demo app
console.log('\n3. Building demo app...');
execSync('npm run build', { cwd: '../../apps/demo', stdio: 'inherit' });

// Copy demo app build
console.log('\n4. Copying demo app build...');
mkdirSync('public/apps/demo', { recursive: true });
cpSync('../../apps/demo/dist/app.js', 'public/apps/demo/app.js');

// Build saas-demo app
console.log('\n5. Building saas-demo app...');
execSync('npm run build', { cwd: '../../apps/saas-demo', stdio: 'inherit' });

// Copy saas-demo app build
console.log('\n6. Copying saas-demo app build...');
mkdirSync('public/apps/saas', { recursive: true });
cpSync('../../apps/saas-demo/dist/app.js', 'public/apps/saas/app.js');

console.log('\n✓ Production build complete!');
console.log('\nPublic directory structure:');
execSync('find public -type f', { stdio: 'inherit' });
