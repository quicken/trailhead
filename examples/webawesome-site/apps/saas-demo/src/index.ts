import { mountSaasApp } from './app.js';
import type { ShellAPI } from '@herdingbits/trailhead-types';

declare global {
  interface Window {
    shell: ShellAPI;
  }
}

/**
 * Mock shell for standalone development
 */
if (!window.shell) {
  window.shell = {
    feedback: {
      busy: (msg: string) => console.log('[Mock] busy:', msg),
      clear: () => console.log('[Mock] clear'),
      success: (msg: string) => console.log('[Mock] success:', msg),
      error: (msg: string) => console.error('[Mock] error:', msg),
      warning: (msg: string) => console.warn('[Mock] warning:', msg),
      info: (msg: string) => console.log('[Mock] info:', msg),
      alert: async (msg: string) => console.log('[Mock] alert:', msg),
      confirm: async (msg: string) => { console.log('[Mock] confirm:', msg); return true; },
      ok: async (msg: string) => console.log('[Mock] ok:', msg),
      yesNo: async (msg: string) => { console.log('[Mock] yesNo:', msg); return true; },
      yesNoCancel: async (msg: string) => { console.log('[Mock] yesNoCancel:', msg); return 'yes' as const; },
      custom: async (msg: string) => { console.log('[Mock] custom:', msg); return null; },
    },
    http: {
      get: async (url: string) => { console.log('[Mock] GET:', url); return { success: true, data: [] as any }; },
      post: async (url: string) => { console.log('[Mock] POST:', url); return { success: true, data: {} as any }; },
      put: async (url: string) => { console.log('[Mock] PUT:', url); return { success: true, data: {} as any }; },
      patch: async (url: string) => { console.log('[Mock] PATCH:', url); return { success: true, data: {} as any }; },
      delete: async (url: string) => { console.log('[Mock] DELETE:', url); return { success: true, data: {} as any }; },
    },
    navigation: {
      navigate: (path: string) => console.log('[Mock] navigate:', path),
      getCurrentPath: () => '/saas',
      onRouteChange: () => () => {},
    },
  } as unknown as ShellAPI;
}

/**
 * Plugin mount — called by shell when this SPA is loaded
 */
window.AppMount = (container: HTMLElement, _basePath: string) => {
  mountSaasApp(container);
};

/**
 * Auto-mount when running standalone (dev mode)
 */
const rootElement = document.getElementById('root');
if (rootElement) {
  mountSaasApp(rootElement);
}
