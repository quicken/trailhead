/**
 * Shoelace initialization
 * Sets base path and loads autoloader
 */
import { setBasePath } from '/shoelace/utilities/base-path.js';

// Set base path for Shoelace assets
setBasePath('/shoelace');

// Load autoloader
import '/shoelace/shoelace-autoloader.js';
