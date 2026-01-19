#!/usr/bin/env node
/**
 * Validate i18n translations
 * Checks for missing, extra, and untranslated strings
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Read template
let template;
try {
  template = JSON.parse(readFileSync('translations/template.json', 'utf-8'));
} catch (error) {
  console.error('❌ translations/template.json not found. Run: npm run i18n:extract');
  process.exit(1);
}

const templateKeys = new Set(Object.keys(template));

// Find all translation files
const translationFiles = readdirSync('translations')
  .filter(f => f.endsWith('.json') && f !== 'template.json');

if (translationFiles.length === 0) {
  console.log('No translation files found.');
  process.exit(0);
}

let hasErrors = false;

// Validate each translation file
for (const file of translationFiles) {
  const lang = file.replace('.json', '');
  const translations = JSON.parse(readFileSync(join('translations', file), 'utf-8'));
  const translationKeys = new Set(Object.keys(translations));
  
  console.log(`\n${lang}.json:`);
  
  // Missing translations
  const missing = [...templateKeys].filter(k => !translationKeys.has(k));
  if (missing.length > 0) {
    console.log(`  ❌ Missing ${missing.length} translations:`);
    missing.slice(0, 5).forEach(k => console.log(`     - "${k}"`));
    if (missing.length > 5) {
      console.log(`     ... and ${missing.length - 5} more`);
    }
    hasErrors = true;
  }
  
  // Extra translations (not in template)
  const extra = [...translationKeys].filter(k => !templateKeys.has(k));
  if (extra.length > 0) {
    console.log(`  ⚠️  Extra ${extra.length} translations (not in source code):`);
    extra.slice(0, 5).forEach(k => console.log(`     - "${k}"`));
    if (extra.length > 5) {
      console.log(`     ... and ${extra.length - 5} more`);
    }
  }
  
  // Untranslated (still same as template)
  const untranslated = Object.entries(translations)
    .filter(([k, v]) => template[k] && v === template[k])
    .map(([k]) => k);
  
  if (untranslated.length > 0) {
    console.log(`  ⚠️  Untranslated ${untranslated.length} strings (still in English):`);
    untranslated.slice(0, 5).forEach(k => console.log(`     - "${k}"`));
    if (untranslated.length > 5) {
      console.log(`     ... and ${untranslated.length - 5} more`);
    }
  }
  
  // Summary
  const translated = translationKeys.size - untranslated.length;
  const total = templateKeys.size;
  const percent = Math.round((translated / total) * 100);
  
  if (missing.length === 0 && extra.length === 0 && untranslated.length === 0) {
    console.log(`  ✓ All ${total} strings translated (100%)`);
  } else {
    console.log(`  📊 ${translated}/${total} strings translated (${percent}%)`);
  }
}

if (hasErrors) {
  console.log('\n❌ Validation failed. Fix missing translations.');
  process.exit(1);
} else {
  console.log('\n✓ Validation passed');
}
