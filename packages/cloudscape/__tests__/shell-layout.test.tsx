import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { NavItem } from '@herdingbits/trailhead-core';
import { ShellLayout } from '../src/shell-layout.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

/** Renders ShellLayout with `navigation` under `appBasePath`; returns the onNavigate spy. */
async function renderLayout(navigation: unknown[], appBasePath = '/base') {
  const onNavigate = vi.fn();
  document.body.innerHTML = '<div id="app"></div>';
  root = createRoot(document.getElementById('app')!);
  await act(async () => {
    root!.render(
      <ShellLayout navigation={navigation as NavItem[]} currentPath="/" appBasePath={appBasePath} onNavigate={onNavigate}>
        <div />
      </ShellLayout>
    );
  });
  return onNavigate;
}

const linkByText = (text: string) =>
  [...document.querySelectorAll('a')].find((a) => a.textContent?.trim() === text) as HTMLAnchorElement | undefined;

describe('CloudScape ShellLayout navigation', () => {
  it('prefixes internal hrefs with appBasePath and leaves http(s) hrefs as written', async () => {
    await renderLayout([
      { type: 'link', label: 'Orders', order: 1, href: '/orders' },
      { type: 'link', label: 'Docs', order: 2, href: 'https://example.com/docs' },
    ]);

    expect(linkByText('Orders')?.getAttribute('href')).toBe('/base/orders');
    expect(linkByText('Docs')?.getAttribute('href')).toBe('https://example.com/docs');
  });

  it('renders section children sorted by order', async () => {
    await renderLayout([
      {
        type: 'section',
        label: 'Admin',
        order: 1,
        children: [
          { type: 'link', label: 'Users', order: 2, href: '/users' },
          { type: 'link', label: 'Roles', order: 1, href: '/roles' },
        ],
      },
    ]);

    expect(document.body.textContent).toContain('Admin');
    const labels = [...document.querySelectorAll('a')].map((a) => a.textContent?.trim());
    expect(labels.indexOf('Roles')).toBeLessThan(labels.indexOf('Users'));
  });

  it('clicking an internal link hands its resolved href to onNavigate', async () => {
    const onNavigate = await renderLayout([{ type: 'link', label: 'Orders', order: 1, href: '/orders' }]);

    act(() => linkByText('Orders')!.click());

    expect(onNavigate).toHaveBeenCalledWith('/base/orders');
  });

  it('renders a hostile label as text, never as markup', async () => {
    await renderLayout([{ type: 'link', label: '<img src=x onerror="window.__pwned=true">', order: 1, href: '/a' }]);

    expect(document.querySelector('nav img, a img')).toBeNull();
  });
});

describe('CloudScape ShellLayout — hostile shell.json hrefs (M-2)', () => {
  it.each(['javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,x', 'vbscript:x'])(
    'drops a link whose href resolves to a non-http(s) scheme: %j',
    async (href) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      await renderLayout(
        [
          { type: 'link', label: 'Bad', order: 1, href },
          { type: 'link', label: 'Good', order: 2, href: '/good' },
        ],
        ''
      );

      expect(linkByText('Bad')).toBeUndefined();
      expect(linkByText('Good')).toBeDefined();
    }
  );

  it('drops an internal link that resolves off-origin', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await renderLayout([{ type: 'link', label: 'Bad', order: 1, href: '/\\evil.example/x' }], '');

    expect(linkByText('Bad')).toBeUndefined();
  });

  it('honours external:true like core does — the href is left unprefixed', async () => {
    await renderLayout([{ type: 'link', label: 'Legacy', order: 1, href: '/legacy/', external: true }]);

    expect(linkByText('Legacy')?.getAttribute('href')).toBe('/legacy/');
  });
});
