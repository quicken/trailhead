import React from "react";
import ReactDOM from "react-dom/client";
import { DemoApp } from "./DemoApp";
import type { ShellAPI } from "@cfkit/shell-api-types";

declare global {
  interface Window {
    shell: ShellAPI;
  }
}

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
      busy: (msg) => console.log("[Mock] busy:", msg),
      clear: () => console.log("[Mock] clear"),
      success: (msg) => console.log("[Mock] success:", msg),
      error: (msg) => console.log("[Mock] error:", msg),
      warning: (msg) => console.log("[Mock] warning:", msg),
      info: (msg) => console.log("[Mock] info:", msg),
      alert: (msg) => console.log("[Mock] alert:", msg),
      confirm: async (msg) => { console.log("[Mock] confirm:", msg); return true; },
      ok: async (msg) => { console.log("[Mock] ok:", msg); },
      yesNo: async (msg) => { console.log("[Mock] yesNo:", msg); return true; },
      yesNoCancel: async (msg) => { console.log("[Mock] yesNoCancel:", msg); return "yes"; },
      custom: async (msg) => { console.log("[Mock] custom:", msg); return null; },
    },
    http: {
      get: async (url) => { console.log("[Mock] GET:", url); return { success: true, data: {} }; },
      post: async (url) => { console.log("[Mock] POST:", url); return { success: true, data: {} }; },
      put: async (url) => { console.log("[Mock] PUT:", url); return { success: true, data: {} }; },
      patch: async (url) => { console.log("[Mock] PATCH:", url); return { success: true, data: {} }; },
      delete: async (url) => { console.log("[Mock] DELETE:", url); return { success: true, data: {} }; },
    },
    navigation: {
      navigate: (path) => console.log("[Mock] navigate:", path),
      getCurrentPath: () => "/demo",
      onRouteChange: () => () => {},
    },
  } as any;
}

/**
 * Plugin mount function
 * Called by shell when plugin is loaded
 */
window.AppMount = (container: HTMLElement) => {
  const root = ReactDOM.createRoot(container);

  root.render(
    <React.StrictMode>
      <DemoApp />
    </React.StrictMode>
  );

  return {
    unmount: () => root.unmount(),
  };
};

/**
 * Auto-mount when running standalone (dev mode)
 */
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <DemoApp />
    </React.StrictMode>
  );
}
