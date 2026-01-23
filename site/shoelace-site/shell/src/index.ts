/**
 * Trailhead Shell - Shoelace Edition
 */
import { Trailhead } from '../../core/shell/src/core.ts';
import { ShoelaceAdapter } from '../../core/shell/src/adapters/shoelace.ts';

// Get configuration
const basePath = import.meta.env.VITE_BASE_PATH || "";
const apiUrl = (window as any).APP_CONFIG?.apiUrl || "";

// Initialize shell with Shoelace adapter
new Trailhead({
  adapter: new ShoelaceAdapter(),
  basePath,
  apiUrl,
});

console.log('[Trailhead] Shoelace shell initialized');
