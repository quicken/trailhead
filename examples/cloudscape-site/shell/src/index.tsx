/**
 * Trailhead Shell - CloudScape Edition
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Trailhead } from '@herdingbits/trailhead-core';
import { CloudScapeAdapter, ShellApp } from '@herdingbits/trailhead-cloudscape';
import '@cloudscape-design/global-styles/index.css';

// Get configuration
const basePath = import.meta.env.VITE_BASE_PATH || "";
const apiUrl = (window as any).APP_CONFIG?.apiUrl || "";

// Initialize shell with CloudScape adapter
const shell = new Trailhead({
  adapter: new CloudScapeAdapter(),
  basePath,
  apiUrl,
});

// Redirect root to first app
const currentPath = window.location.pathname;
if (currentPath === basePath || currentPath === basePath + '/') {
  window.location.href = basePath + '/demo';
}

// Render React app
const root = createRoot(document.getElementById('app')!);
root.render(<ShellApp shell={shell} />);

console.log('[Trailhead] CloudScape shell initialized');
