import React, { useState, useEffect } from 'react';
import AppLayout from '@cloudscape-design/components/app-layout';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import Flashbar from '@cloudscape-design/components/flashbar';
import Spinner from '@cloudscape-design/components/spinner';

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
}

interface ShellLayoutProps {
  navigation: NavigationItem[];
  currentPath: string;
  basePath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export function ShellLayout({ navigation, currentPath, basePath, onNavigate, children }: ShellLayoutProps) {
  const [navigationOpen, setNavigationOpen] = useState(true);

  const navItems = navigation.map(item => ({
    type: 'link' as const,
    text: item.label,
    href: basePath + item.path,
  }));

  return (
    <AppLayout
      navigationOpen={navigationOpen}
      onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
      navigation={
        <SideNavigation
          activeHref={currentPath}
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
