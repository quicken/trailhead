/**
 * Shell Entry Point - Initializes Trailhead with Shoelace adapter
 */
import { Trailhead } from './shell.js';
import { ShoelaceAdapter } from './adapters/shoelace.js';

// Get configuration
const basePath = import.meta.env.VITE_BASE_PATH || "";
const apiUrl = (window as any).APP_CONFIG?.apiUrl || "";

// Initialize shell with Shoelace adapter
new Trailhead({
  adapter: new ShoelaceAdapter(),
  basePath,
  apiUrl,
});

console.log('[Shell] Initialized with Shoelace adapter');

