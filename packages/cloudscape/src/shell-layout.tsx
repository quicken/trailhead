import React, { useState } from 'react';
import AppLayout from '@cloudscape-design/components/app-layout';
import SideNavigation, { SideNavigationProps } from '@cloudscape-design/components/side-navigation';
import type { NavItem, NavLink } from '@herdingbits/trailhead-core';

interface ShellLayoutProps {
  navigation: NavItem[];
  currentPath: string;
  /** URL prefix under which the shell is hosted — prepended to nav hrefs so they resolve
   * correctly under a non-root deployment (e.g. `/sample/trailhead/cloudscape`). */
  appBasePath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

const isExternal = (href: string) => /^https?:\/\/|^\/\//.test(href);

/**
 * True when `href` resolves to an `http(s)` URL and, unless `allowCrossOrigin`, stays on this
 * origin. Mirrors core's nav guard: resolving through the URL parser catches what the browser
 * itself normalises (leading whitespace, `java\tscript:`, `\` read as `/`). Kept local because
 * this adapter builds against the published core.
 */
function isSafeHref(href: string, allowCrossOrigin: boolean): boolean {
  let url: URL;
  try {
    url = new URL(href, document.baseURI);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  return allowCrossOrigin || url.origin === new URL(document.URL).origin;
}

export function ShellLayout({ navigation, currentPath, appBasePath, onNavigate, children }: ShellLayoutProps) {
  const [navigationOpen, setNavigationOpen] = useState(true);

  // Links with an unsafe href are dropped, so onFollow → onNavigate only ever sees vetted hrefs.
  const mapLink = (item: NavLink): SideNavigationProps.Link | null => {
    const external = item.external === true || isExternal(item.href);
    const href = external ? item.href : appBasePath + item.href;
    if (!isSafeHref(href, external)) {
      console.warn('[Trailhead] Dropping shell.json nav link with an unsafe href:', item.href);
      return null;
    }
    return { type: 'link', text: item.label, href };
  };
  const isLink = (link: SideNavigationProps.Link | null): link is SideNavigationProps.Link => link !== null;

  const navItems: SideNavigationProps['items'] = [...navigation]
    .sort((a, b) => a.order - b.order)
    .flatMap((item): SideNavigationProps.Item | SideNavigationProps.Item[] => {
      switch (item.type) {
        case 'link':
          return mapLink(item) ?? [];
        case 'section':
          return {
            type: 'section',
            text: item.label,
            items: [...item.children].sort((a, b) => a.order - b.order).map(mapLink).filter(isLink),
          };
        case 'divider':
          return { type: 'divider' };
      }
    });

  return (
    <AppLayout
      navigationOpen={navigationOpen}
      onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
      navigation={
        <SideNavigation
          activeHref={window.location.pathname.replace(/\/$/, '') || '/'}
          items={navItems}
          onFollow={(event) => {
            event.preventDefault();
            onNavigate(event.detail.href);
          }}
        />
      }
      content={children}
      toolsHide
    />
  );
}
