import React from "react";
import ReactDOM from "react-dom/client";
import { DemoApp } from "./DemoApp";
import type { ShellAPI } from "@herdingbits/trailhead-types";

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
    version: "1.0.0",
    feedback: {
      busy: (msg: string) => console.log("[Mock] busy:", msg),
      clear: () => console.log("[Mock] clear"),
      success: (msg: string) => console.log("[Mock] success:", msg),
      error: (msg: string) => console.log("[Mock] error:", msg),
      warning: (msg: string) => console.log("[Mock] warning:", msg),
      info: (msg: string) => console.log("[Mock] info:", msg),
      alert: (msg: string) => console.log("[Mock] alert:", msg),
      confirm: async (msg: string) => { console.log("[Mock] confirm:", msg); return true; },
      ok: async (msg: string) => { console.log("[Mock] ok:", msg); },
      yesNo: async (msg: string) => { console.log("[Mock] yesNo:", msg); return true; },
      yesNoCancel: async (msg: string) => { console.log("[Mock] yesNoCancel:", msg); return "yes" as const; },
      custom: async (msg: string) => { console.log("[Mock] custom:", msg); return null; },
    },
    http: {
      get: async (url: string) => { console.log("[Mock] GET:", url); return { success: true, data: {} }; },
      post: async (url: string) => { console.log("[Mock] POST:", url); return { success: true, data: {} }; },
      put: async (url: string) => { console.log("[Mock] PUT:", url); return { success: true, data: {} }; },
      patch: async (url: string) => { console.log("[Mock] PATCH:", url); return { success: true, data: {} }; },
      delete: async (url: string) => { console.log("[Mock] DELETE:", url); return { success: true, data: {} }; },
    },
    navigation: {
      navigate: (path: string) => console.log("[Mock] navigate:", path),
      getCurrentPath: () => "/demo",
      onRouteChange: () => () => {},
    },
  } as any;
}

/**
 * Plugin mount function
 * Called by shell when plugin is loaded
 */
window.AppMount = (container: HTMLElement, _basePath: string) => {
  const root = ReactDOM.createRoot(container);

  root.render(
    <React.StrictMode>
      <DemoApp />
    </React.StrictMode>
  );
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
