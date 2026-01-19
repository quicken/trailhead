/**
 * Vite plugin for build-time i18n string replacement
 * Zero runtime overhead - strings are replaced at build time
 */

/**
 * Create i18n plugin
 * @param {Object} translations - Translation object { "key": "value" }
 * @returns {import('vite').Plugin}
 */
export function i18nPlugin(translations = {}) {
  return {
    name: 'vite-plugin-i18n',
    
    transform(code, id) {
      // Only process TypeScript/JavaScript files
      if (!id.endsWith('.ts') && !id.endsWith('.tsx') && !id.endsWith('.js') && !id.endsWith('.jsx')) {
        return null;
      }

      // Skip node_modules
      if (id.includes('node_modules')) {
        return null;
      }

      let transformed = code;
      let hasChanges = false;

      // Replace t("key") with "translation"
      Object.entries(translations).forEach(([key, value]) => {
        const pattern = new RegExp(`t\\(["'\`]${escapeRegex(key)}["'\`]\\)`, 'g');
        if (pattern.test(transformed)) {
          transformed = transformed.replace(pattern, `"${escapeString(value)}"`);
          hasChanges = true;
        }
      });

      return hasChanges ? { code: transformed, map: null } : null;
    }
  };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Escape string for JavaScript
 */
function escapeString(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
