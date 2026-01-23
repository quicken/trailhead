/**
 * Trailhead Shell - CloudScape Edition
 */
import { Trailhead } from '../../core/shell/src/core.ts';
import { CloudScapeAdapter } from '../../core/shell/src/adapters/cloudscape.ts';

// Get configuration
const basePath = import.meta.env.VITE_BASE_PATH || "";
const apiUrl = (window as any).APP_CONFIG?.apiUrl || "";

// Initialize shell with CloudScape adapter
new Trailhead({
  adapter: new CloudScapeAdapter(),
  basePath,
  apiUrl,
});

console.log('[Trailhead] CloudScape shell initialized');
