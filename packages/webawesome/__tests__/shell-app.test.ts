import { describe, it, expect, vi, afterEach } from 'vitest';
import { Trailhead } from '@herdingbits/trailhead-core';
import { WebAwesomeAdapter } from '../src/adapter.js';
import { ShellApp } from '../src/shell-app.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (window as any).shell;
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
});

/** Creates a shell at /demo against the static Web Awesome layout from index.html. */
async function createShell() {
  window.history.replaceState(null, '', '/demo');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    json: async () => ({
      apps: [{ id: 'demo', basePath: '/demo', src: 'demo' }],
      nav: [{ type: 'link', label: 'Demo App', order: 1, href: '/demo' }],
    }),
  }));
  document.body.innerHTML = '<nav id="shell-navigation"></nav><div id="shell-content"></div>';

  const adapter = new WebAwesomeAdapter();
  // init() imports Web Awesome from a URL at runtime, which jsdom can't do; mount() is what's under test.
  adapter.init = vi.fn(async () => {});
  return Trailhead.create({ adapter });
}

describe('Web Awesome ShellApp', () => {
  it('mount() starts the shell: navigation is rendered and the current app is loading by the time it returns', async () => {
    const shell = await createShell();
    const start = vi.spyOn(shell, 'start');

    ShellApp.mount(shell);

    expect(start).toHaveBeenCalledTimes(1);
    expect(document.querySelector('#shell-navigation a[data-path="/demo"]')).not.toBeNull();
    expect(document.querySelectorAll('script[src="/demo/app.js"]')).toHaveLength(1);
  });
});
