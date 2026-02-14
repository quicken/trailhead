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

// Dev mode notice (only in development)
if (import.meta.env.DEV) {
  const shellMain = document.getElementById('shell-main');
  if (shellMain) {
    const notice = document.createElement('div');
    notice.id = 'dev-notice';
    notice.innerHTML = `
      <div style="padding: 2rem; max-width: 600px; margin: 2rem auto; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #0369a1;">🚀 Shell Development Mode</h3>
        <p style="margin: 0.5rem 0;">This shell is running in standalone mode on <strong>port 3001</strong>.</p>
        <p style="margin: 0.5rem 0;"><strong>To develop apps:</strong></p>
        <ol style="margin: 0.5rem 0; padding-left: 1.5rem;">
          <li>Run app in standalone mode: <code>cd apps/demo && npm start</code></li>
          <li>Visit <strong>http://localhost:3000</strong> (app loads shell from here)</li>
        </ol>
        <p style="margin: 0.5rem 0; font-size: 0.9em; color: #64748b;">
          <em>Note: "Failed to load application" errors are normal here. Apps need to be built and copied to <code>public/</code> to load in the shell.</em>
        </p>
      </div>
    `;
    shellMain.insertBefore(notice, shellMain.firstChild);
  }
}

// Redirect root to first app
const currentPath = window.location.pathname;
if (currentPath === basePath || currentPath === basePath + '/') {
  window.location.href = basePath + '/demo';
}

console.log('[Trailhead] Shoelace shell initialized');
