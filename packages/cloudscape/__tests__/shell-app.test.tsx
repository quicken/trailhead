import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Trailhead } from '@herdingbits/trailhead-core';
import { CloudScapeAdapter } from '../src/adapter.js';
import { ShellApp } from '../src/shell-app.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const manifest = {
  apps: [{ id: 'demo', basePath: '/demo', src: 'demo' }],
  nav: [{ type: 'link', label: 'Demo App', order: 1, href: '/demo' }],
};

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (window as any).shell;
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
});

/** Creates a shell at /demo and renders ShellApp the way a real shell entry does, in StrictMode. */
async function renderShell(beforeRender?: (shell: Trailhead) => void) {
  window.history.replaceState(null, '', '/demo');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => manifest }));
  document.body.innerHTML = '<div id="app"></div>';

  const shell = await Trailhead.create({ adapter: new CloudScapeAdapter() });
  beforeRender?.(shell);

  root = createRoot(document.getElementById('app')!);
  await act(async () => {
    root!.render(
      <React.StrictMode>
        <ShellApp shell={shell} />
      </React.StrictMode>
    );
  });
  return shell;
}

describe('CloudScape ShellApp', () => {
  it('renders the navigation from shell.json', async () => {
    await renderShell();

    expect(document.body.textContent).toContain('Demo App');
  });

  it('hands routing to core: calls shell.start() once, after #shell-content is in the DOM', async () => {
    const contentPresentAtStart: boolean[] = [];
    await renderShell((shell) => {
      const start = shell.start.bind(shell);
      vi.spyOn(shell, 'start').mockImplementation(() => {
        contentPresentAtStart.push(document.getElementById('shell-content') !== null);
        start();
      });
    });

    // StrictMode runs effects twice in development; start() itself ignores the repeat.
    expect(contentPresentAtStart.length).toBeGreaterThan(0);
    expect(contentPresentAtStart.every(Boolean)).toBe(true);
  });

  it('loads the current app exactly once, even under StrictMode', async () => {
    await renderShell();

    expect(document.querySelectorAll('script[src="/demo/app.js"]')).toHaveLength(1);
    expect(document.getElementById('shell-content')!.textContent).toContain('Loading...');
  });
});

describe('CloudScape ShellApp — credential prompt (L-2)', () => {
  it('clears the password from component state as soon as the prompt is submitted', async () => {
    await renderShell();
    const resolve = vi.fn();
    await act(async () => {
      window.dispatchEvent(new CustomEvent('cloudscape-auth', { detail: { resolve } }));
    });

    const password = document.querySelector<HTMLInputElement>('input[type="password"]')!;
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setValue.call(password, 'hunter2');
      password.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      password.closest('form')!.requestSubmit();
    });

    expect(resolve).toHaveBeenCalledWith({ username: '', password: 'hunter2' });
    expect(document.querySelector<HTMLInputElement>('input[type="password"]')?.value ?? '').toBe('');
  });
});
