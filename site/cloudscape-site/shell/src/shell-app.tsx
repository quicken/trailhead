import React, { useState, useEffect, useRef } from 'react';
import Flashbar from '@cloudscape-design/components/flashbar';
import Spinner from '@cloudscape-design/components/spinner';
import Modal from '@cloudscape-design/components/modal';
import Box from '@cloudscape-design/components/box';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Button from '@cloudscape-design/components/button';
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

interface DialogState {
  visible: boolean;
  title?: string;
  message: string;
  buttons: Array<{ label: string; value: string; variant?: string }>;
  resolve?: (result: { value: string | null }) => void;
}

export function ShellApp({ shell }: ShellAppProps) {
  const [navigation, setNavigation] = useState<any[]>([]);
  const [flashMessages, setFlashMessages] = useState<FlashMessage[]>([]);
  const [busyMessage, setBusyMessage] = useState('');
  const [dialogState, setDialogState] = useState<DialogState>({
    visible: false,
    message: '',
    buttons: []
  });
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

    // Listen for dialog events
    const handleDialogEvent = (event: CustomEvent) => {
      const { config, resolve } = event.detail;
      setDialogState({
        visible: true,
        title: config.title,
        message: config.message,
        buttons: config.buttons,
        resolve
      });
    };
    window.addEventListener('cloudscape-dialog', handleDialogEvent as EventListener);

    // Load navigation
    fetch(`${shell.basePath}/navigation.json`)
      .then(res => res.json())
      .then(data => {
        setNavigation(data);
      })
      .catch(err => console.error('Failed to load navigation:', err));

    return () => {
      window.removeEventListener('cloudscape-dialog', handleDialogEvent as EventListener);
    };
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

  const handleDialogButton = (value: string) => {
    if (dialogState.resolve) {
      dialogState.resolve({ value });
    }
    setDialogState({ ...dialogState, visible: false });
  };

  const handleDialogDismiss = () => {
    if (dialogState.resolve) {
      dialogState.resolve({ value: null });
    }
    setDialogState({ ...dialogState, visible: false });
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

      <Modal
        visible={dialogState.visible}
        onDismiss={handleDialogDismiss}
        header={dialogState.title}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              {dialogState.buttons.map((btn, idx) => (
                <Button
                  key={idx}
                  variant={btn.variant === 'primary' ? 'primary' : 'normal'}
                  onClick={() => handleDialogButton(btn.value)}
                >
                  {btn.label}
                </Button>
              ))}
            </SpaceBetween>
          </Box>
        }
      >
        {dialogState.message}
      </Modal>

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
