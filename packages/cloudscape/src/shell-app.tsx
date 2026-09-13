import React, { useState, useEffect, useRef } from 'react';
import Flashbar from '@cloudscape-design/components/flashbar';
import Spinner from '@cloudscape-design/components/spinner';
import Modal from '@cloudscape-design/components/modal';
import Box from '@cloudscape-design/components/box';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Button from '@cloudscape-design/components/button';
import Alert from '@cloudscape-design/components/alert';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import { ShellLayout } from './shell-layout.js';
import type { Trailhead, NavItem } from '@herdingbits/trailhead-core';
import type { Credentials } from '@herdingbits/trailhead-types/adapters';

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

interface AuthState {
  visible: boolean;
  errorMessage?: string;
  resolve?: (value: Credentials | null) => void;
}

export function ShellApp({ shell }: ShellAppProps) {
  const [navigation, setNavigation] = useState<NavItem[]>([]);
  const [flashMessages, setFlashMessages] = useState<FlashMessage[]>([]);
  const [busyMessage, setBusyMessage] = useState('');
  const [dialogState, setDialogState] = useState<DialogState>({
    visible: false,
    message: '',
    buttons: []
  });
  const [authState, setAuthState] = useState<AuthState>({ visible: false });
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const navigationLoadedRef = useRef(false);

  // Get current path without basePath
  const getCurrentPath = () => {
    let path = window.location.pathname;
    if (shell.appBasePath && path.startsWith(shell.appBasePath)) {
      path = path.substring(shell.appBasePath.length) || '/';
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

    // Listen for re-authentication prompt events. A fresh 'cloudscape-auth' dispatch on retry
    // (see CloudScapeAuthAdapter) just updates this same modal's state with the new error —
    // it isn't a close/reopen cycle.
    const handleAuthEvent = (event: CustomEvent) => {
      const { errorMessage, resolve } = event.detail;
      setAuthUsername('');
      setAuthPassword('');
      setAuthState({ visible: true, errorMessage, resolve });
    };
    const handleAuthDismiss = () => {
      setAuthState({ visible: false });
    };
    window.addEventListener('cloudscape-auth', handleAuthEvent as EventListener);
    window.addEventListener('cloudscape-auth-dismiss', handleAuthDismiss);

    // Load navigation once (prevent React 18 double-mount in dev)
    if (!navigationLoadedRef.current) {
      navigationLoadedRef.current = true;
      // Get navigation from core (already loaded)
      const nav = shell.getNavigation();
      if (nav.length > 0) {
        setNavigation(nav);
      } else {
        // Wait for core to load navigation
        setTimeout(() => {
          setNavigation(shell.getNavigation());
        }, 100);
      }
    }

    return () => {
      window.removeEventListener('cloudscape-dialog', handleDialogEvent as EventListener);
      window.removeEventListener('cloudscape-auth', handleAuthEvent as EventListener);
      window.removeEventListener('cloudscape-auth-dismiss', handleAuthDismiss);
    };
  }, []);

  useEffect(() => {
    // Handle route when navigation is loaded
    if (navigation.length > 0) {
      handleRoute(currentPath);
    }
  }, [navigation, currentPath]);

  const handleRoute = (path: string) => {
    const normalizedPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
    const app = shell.getApps().find(entry => normalizedPath.startsWith(entry.basePath));
    if (app && contentRef.current) {
      loadApp(app.src, app.basePath);
    }
  };

  const loadApp = async (appName: string, appPath: string) => {
    if (!contentRef.current) return;

    contentRef.current.innerHTML = '<div>Loading...</div>';

    const appBasePath = shell.appBasePath + appPath;

    try {
      const pluginUrl = `${shell.appBasePath}${appPath}/app.js`;
      const pluginCss = `${shell.appBasePath}${appPath}/${appName}.css`;

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
          (window as any).AppMount(contentRef.current, appBasePath);
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

  // Submitting closes the modal immediately (optimistic) — if the attempt turns out to be
  // wrong, the core reauthenticator calls promptCredentials() again, which reopens it with
  // an error. Mirrors the webawesome adapter's dialog lifecycle.
  const handleAuthSubmit = () => {
    authState.resolve?.({ username: authUsername, password: authPassword });
    setAuthState({ visible: false });
  };

  const handleAuthCancel = () => {
    authState.resolve?.(null);
    setAuthState({ visible: false });
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

      <Modal
        visible={authState.visible}
        onDismiss={handleAuthCancel}
        header="Session Expired"
        closeAriaLabel="Cancel"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={handleAuthCancel}>Cancel</Button>
              <Button variant="primary" onClick={handleAuthSubmit}>Sign In</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleAuthSubmit(); }}>
          <SpaceBetween size="m">
            <Box color="text-body-secondary">Sign in to continue where you left off.</Box>
            {authState.errorMessage && <Alert type="error">{authState.errorMessage}</Alert>}
            <FormField label="Username">
              <Input value={authUsername} onChange={(e) => setAuthUsername(e.detail.value)} autoFocus />
            </FormField>
            <FormField label="Password">
              <Input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.detail.value)} />
            </FormField>
            {/* Invisible submit control so pressing Enter in a field submits the form. */}
            <button type="submit" hidden />
          </SpaceBetween>
        </form>
      </Modal>

      <ShellLayout
        navigation={navigation}
        currentPath={currentPath}
        appBasePath={shell.appBasePath}
        onNavigate={handleNavigate}
      >
        <div id="shell-content" ref={contentRef} />
      </ShellLayout>
    </>
  );
}
