/**
 * Shoelace initialization
 * Sets base path and loads autoloader
 */

// Get base path from meta tag or default to root
const getBasePath = () => {
  const base = document.querySelector('base')?.getAttribute('href') || 
                document.querySelector('script[src*="shell.js"]')?.getAttribute('src')?.replace('/shell.js', '') ||
                '';
  return base;
};

const basePath = getBasePath();

import(`${basePath}/shoelace/utilities/base-path.js`).then(({ setBasePath }) => {
  // Set base path for Shoelace assets
  setBasePath(`${basePath}/shoelace`);
  
  // Load autoloader
  import(`${basePath}/shoelace/shoelace-autoloader.js`);
});
