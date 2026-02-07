import React, { useState, useEffect, useRef } from 'react';
import Flashbar from '@cloudscape-design/components/flashbar';
import Spinner from '@cloudscape-design/components/spinner';
import { ShellLayout } from './shell-layout.tsx';
import type { Trailhead } from '../../core/shell/src/core.ts';

interface ShellAppProps {
  shell: Trailhead;
}

interface FlashMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  content: string;
  dismissible: boolean;
}

export function ShellApp({ shell }: ShellAppProps) {
  const [navigation, setNavigation] = useState<any[]>([]);
  const [flashMessages, setFlashMessages] = useState<FlashMessage[]>([]);
  const [busyMessage, setBusyMessage] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  // Get current path without basePath
  const getCurrentPath = () => {
    let path = window.location.pathname;
    if (shell.basePath && path.startsWith(shell.basePath)) {
      path = path.substring(shell.basePath.length) || '/';
    }
    return path;
  };

  const [currentPath, setCurrentPath] = useState(getCurrentPath());

  useEffect(() => {
    // Connect adapter to React state
    const adapter = shell.adapter.feedback as any;
    adapter.setFlashChangeHandler(setFlashMessages);
    adapter.setBusyChangeHandler(setBusyMessage);

    // Load navigation
    fetch(`${shell.basePath}/navigation.json`)
      .then(res => res.json())
      .then(data => {
        setNavigation(data);
      })
      .catch(err => console.error('Failed to load navigation:', err));
  }, []);

  useEffect(() => {
    // Handle route when navigation is loaded
    if (navigation.length > 0) {
      handleRoute(currentPath);
    }
  }, [navigation, currentPath]);

  const handleRoute = (path: string) => {
    // Normalize path by removing trailing slash for matching
    const normalizedPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
    const route = navigation.find(item => item.path === normalizedPath);
    if (route && contentRef.current) {
      loadApp(route.app, route.path);
    }
  };

  const loadApp = async (appName: string, appPath: string) => {
    if (!contentRef.current) return;

    contentRef.current.innerHTML = '<div>Loading...</div>';

    try {
      const pluginUrl = `${shell.basePath}${appPath}/app.js`;
      const pluginCss = `${shell.basePath}${appPath}/${appName}.css`;
      
      // Load CSS
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = pluginCss;
      document.head.appendChild(link);
      
      // Load JS
      const script = document.createElement("script");
      script.src = pluginUrl;
      script.type = "module";

      script.onload = () => {
        contentRef.current!.innerHTML = "";
        if ((window as any).AppMount) {
          (window as any).AppMount(contentRef.current);
        }
      };

      script.onerror = () => {
        contentRef.current!.innerHTML = `<div>Failed to load application: ${appName}</div>`;
      };

      document.body.appendChild(script);
    } catch (error) {
      console.error("Failed to load plugin:", error);
      contentRef.current.innerHTML = '<div>Failed to load application</div>';
    }
  };

  const handleNavigate = (path: string) => {
    // Use full page reload for navigation (no server rewrites needed)
    window.location.href = path;
  };

  return (
    <>
      {flashMessages.length > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
          <Flashbar
            items={flashMessages.map(msg => ({
              type: msg.type,
              content: msg.content,
              dismissible: msg.dismissible,
              onDismiss: () => (shell.adapter.feedback as any).dismissFlash(msg.id),
              id: msg.id,
            }))}
          />
        </div>
      )}
      
      {busyMessage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            <Spinner size="large" />
            <div style={{ marginTop: '16px' }}>{busyMessage}</div>
          </div>
        </div>
      )}

      <ShellLayout
        navigation={navigation}
        currentPath={currentPath}
        basePath={shell.basePath}
        onNavigate={handleNavigate}
      >
        <div ref={contentRef} />
      </ShellLayout>
    </>
  );
}
