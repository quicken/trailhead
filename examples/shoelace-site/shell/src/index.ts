/**
 * Trailhead Shell - Shoelace Edition
 */
import { Trailhead } from '@herdingbits/trailhead-core';
import { ShoelaceAdapter, ShellApp } from '@herdingbits/trailhead-shoelace';

// Get configuration
const basePath = import.meta.env.VITE_BASE_PATH || "";
const apiUrl = (window as any).APP_CONFIG?.apiUrl || "";

// Initialize shell with Shoelace adapter
const shell = new Trailhead({
  adapter: new ShoelaceAdapter(),
  basePath,
  apiUrl,
});

ShellApp.mount(shell);

console.log('[Trailhead] Shoelace shell initialized');
