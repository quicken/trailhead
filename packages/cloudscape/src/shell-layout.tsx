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

export function ShellLayout({ navigation, currentPath, appBasePath, onNavigate, children }: ShellLayoutProps) {
  const [navigationOpen, setNavigationOpen] = useState(true);

  const mapLink = (item: NavLink): SideNavigationProps.Link => ({
    type: 'link',
    text: item.label,
    href: isExternal(item.href) ? item.href : appBasePath + item.href,
  });

  const navItems: SideNavigationProps['items'] = [...navigation]
    .sort((a, b) => a.order - b.order)
    .map((item) => {
      switch (item.type) {
        case 'link':
          return mapLink(item);
        case 'section':
          return {
            type: 'section',
            text: item.label,
            items: [...item.children].sort((a, b) => a.order - b.order).map(mapLink),
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
