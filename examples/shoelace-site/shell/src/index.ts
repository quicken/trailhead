/**
 * Trailhead Shell - Shoelace Edition
 */
import { Trailhead } from '@herdingbits/trailhead-core';
import { ShoelaceAdapter, ShellApp } from '@herdingbits/trailhead-shoelace';

// Get configuration
const basePath = import.meta.env.VITE_BASE_PATH || "";
const shellResourceUrl = (window as any).SHELL_DEV_URL || basePath;
const apiUrl = (window as any).APP_CONFIG?.apiUrl || "";

// Initialize shell with Shoelace adapter
const shell = new Trailhead({
  adapter: new ShoelaceAdapter(),
  basePath,
  shellResourceUrl,
  apiUrl,
});

ShellApp.mount(shell);

// Redirect root to first app
const currentPath = window.location.pathname;
if (currentPath === basePath || currentPath === basePath + '/') {
  window.location.href = basePath + '/demo';
}

console.log('[Trailhead] Shoelace shell initialized');
