#!/usr/bin/env node
/**
 * Extract i18n strings from source code
 * Scans for t("...") calls and generates translation template
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Extract strings from directory recursively
 */
function extractStrings(dir, strings = new Set()) {
  if (!existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    return strings;
  }

  const files = readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const path = join(dir, file.name);
    
    // Skip node_modules, dist, etc.
    if (file.isDirectory()) {
      if (!['node_modules', 'dist', 'build', '__tests__'].includes(file.name)) {
        extractStrings(path, strings);
      }
    } else if (file.name.match(/\.(ts|tsx|js|jsx)$/)) {
      const content = readFileSync(path, 'utf-8');
      
      // Match t("..."), t('...'), or t(`...`)
      const matches = content.matchAll(/t\(["'`]([^"'`]+)["'`]\)/g);
      
      for (const match of matches) {
        strings.add(match[1]);
      }
    }
  }
  
  return strings;
}

// Extract from src directory
const strings = extractStrings('src');

if (strings.size === 0) {
  console.log('No translatable strings found.');
  process.exit(0);
}

// Create translations directory if it doesn't exist
if (!existsSync('translations')) {
  mkdirSync('translations');
}

// Create template object (sorted alphabetically)
const template = {};
Array.from(strings).sort().forEach(str => {
  template[str] = str; // English as default
});

// Write template
const outputPath = 'translations/template.json';
writeFileSync(outputPath, JSON.stringify(template, null, 2) + '\n');

console.log(`✓ Extracted ${strings.size} strings to ${outputPath}`);
console.log('\nNext steps:');
console.log('  1. Copy template to create language file:');
console.log('     cp translations/template.json translations/de.json');
console.log('  2. Translate the strings in de.json');
console.log('  3. Build: npm run build:de');
