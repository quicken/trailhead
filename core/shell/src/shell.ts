/**
 * Shell - Application shell providing services to plugin apps
 */
import type { ShellAPI, NavItem } from "./types/shell-api";
import type { DesignSystemAdapter } from "./adapters/types";
import { ShoelaceAdapter } from "./adapters/shoelace";
import * as http from "./lib/http";
import { t } from "./lib/i18n";

class Shell {
  private navigation: NavItem[] = [];
  private routeChangeCallbacks: Array<(path: string) => void> = [];
  private basePath: string = "";
  private adapter: DesignSystemAdapter;

  constructor(adapter?: DesignSystemAdapter) {
    this.basePath = import.meta.env.VITE_BASE_PATH || "";
    this.adapter = adapter || new ShoelaceAdapter();
    this.init();
  }

  /**
   * Initialize design system adapter
   */
  private async initAdapter(): Promise<void> {
    try {
      await this.adapter.init(this.basePath);
      console.log(`[Shell] Initialized ${this.adapter.name} adapter v${this.adapter.version}`);
    } catch (error) {
      console.error("Failed to initialize design system adapter:", error);
    }
  }

  /**
   * Initialize shell
   */
  private async init(): Promise<void> {
    // Initialize design system adapter
    await this.initAdapter();

    // Initialize HTTP client
    const apiUrl = (window as any).APP_CONFIG?.apiUrl || "";
    http.init(apiUrl);

    // Expose shell API globally
    window.shell = this.createAPI();

    // Load navigation
    await this.loadNavigation();

    // Setup routing
    this.setupRouting();

    // Render navigation
    this.renderNavigation();

    // Load initial route
    this.handleRoute();
  }

  /**
   * Create shell API
   */
  private createAPI(): ShellAPI {
    const adapter = this.adapter;
    
    return {
      version: "1.0.0",
      feedback: {
        busy: (message: string) => adapter.feedback.showBusy(message),
        clear: () => adapter.feedback.clearBusy(),
        success: (message: string, duration?: number) => 
          adapter.feedback.showToast(message, "success", duration),
        error: (message: string, duration?: number) => 
          adapter.feedback.showToast(message, "error", duration || 5000),
        warning: (message: string, duration?: number) => 
          adapter.feedback.showToast(message, "warning", duration || 4000),
        info: (message: string, duration?: number) => 
          adapter.feedback.showToast(message, "info", duration),
        alert: (message: string, variant: any = "info", duration?: number) => 
          adapter.feedback.showToast(message, variant, duration),
        confirm: (message: string, title: string = "Confirm") =>
          adapter.feedback.showDialog({
            message,
            title,
            buttons: [
              { label: "Cancel", value: "cancel", variant: "secondary" },
              { label: "Confirm", value: "confirm", variant: "primary" },
            ],
          }).then((result) => result.value === "confirm"),
        ok: (message: string, title: string = "Information") =>
          adapter.feedback.showDialog({
            message,
            title,
            buttons: [{ label: "OK", value: "ok", variant: "primary" }],
          }).then(() => undefined),
        yesNo: (message: string, title: string = "Confirm") =>
          adapter.feedback.showDialog({
            message,
            title,
            buttons: [
              { label: "No", value: "no", variant: "secondary" },
              { label: "Yes", value: "yes", variant: "primary" },
            ],
          }).then((result) => result.value === "yes"),
        yesNoCancel: (message: string, title: string = "Confirm") =>
          adapter.feedback.showDialog({
            message,
            title,
            buttons: [
              { label: "Cancel", value: "cancel", variant: "secondary" },
              { label: "No", value: "no", variant: "secondary" },
              { label: "Yes", value: "yes", variant: "primary" },
            ],
          }).then((result) => (result.value as "yes" | "no" | "cancel") || "cancel"),
        custom: <T extends string>(
          message: string,
          title: string,
          buttons: Array<{ label: string; value: T; variant?: string }>
        ) =>
          adapter.feedback.showDialog({ message, title, buttons })
            .then((result) => result.value),
      },
      http: {
        get: http.get,
        post: http.post,
        put: http.put,
        patch: http.patch,
        delete: http.del,
      },
      navigation: {
        navigate: (path: string) => this.navigate(path),
        getCurrentPath: () => window.location.pathname,
        onRouteChange: (callback: (path: string) => void) => {
          this.routeChangeCallbacks.push(callback);
          return () => {
            const index = this.routeChangeCallbacks.indexOf(callback);
            if (index > -1) {
              this.routeChangeCallbacks.splice(index, 1);
            }
          };
        },
      },
    };
  }

  /**
   * Load navigation configuration
   */
  private async loadNavigation(): Promise<void> {
    try {
      // In dev, navigation.json is on the shell server
      const baseUrl = import.meta.env.DEV ? "http://localhost:3000" : this.basePath;
      const response = await fetch(`${baseUrl}/navigation.json`);
      this.navigation = await response.json();
    } catch (error) {
      console.error("Failed to load navigation:", error);
      this.navigation = [];
    }
  }

  /**
   * Render navigation menu
   */
  private renderNavigation(): void {
    const nav = document.getElementById("shell-navigation");
    if (!nav) return;

    nav.innerHTML = this.navigation
      .map(
        (item) => `
      <a href="${this.basePath}${item.path}"
         class="shell-nav-item"
         data-path="${item.path}"
         data-app="${item.app}">
        <i class="shell-icon shell-icon-${item.icon}"></i>
        <span class="shell-nav-label">${item.label}</span>
      </a>
    `,
      )
      .join("");

    // Add click handlers
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const path = link.getAttribute("data-path");
        if (path) {
          this.navigate(path);
        }
      });
    });
  }

  /**
   * Setup routing
   */
  private setupRouting(): void {
    window.addEventListener("popstate", () => {
      this.handleRoute();
    });
  }

  /**
   * Navigate to path
   */
  private navigate(path: string): void {
    // Simple page reload for navigation
    window.location.href = this.basePath + path;
  }

  /**
   * Handle route change
   */
  private handleRoute(): void {
    let path = window.location.pathname;
    
    // Remove base path if present
    if (this.basePath && path.startsWith(this.basePath)) {
      path = path.substring(this.basePath.length) || "/";
    }
    
    const navItem = this.navigation.find((item) => path.startsWith(item.path));

    if (navItem) {
      this.loadPlugin(navItem.app, navItem.path);
      this.updateActiveNav(navItem.path);
    }
  }

  /**
   * Update active navigation item
   */
  private updateActiveNav(path: string): void {
    const nav = document.getElementById("shell-navigation");
    if (!nav) return;

    nav.querySelectorAll("a").forEach((link) => {
      if (link.getAttribute("data-path") === path) {
        link.classList.add("shell-nav-item-active");
      } else {
        link.classList.remove("shell-nav-item-active");
      }
    });
  }

  /**
   * Load plugin application
   */
  private async loadPlugin(appName: string, appPath: string): Promise<void> {
    const root = document.getElementById("shell-content");
    if (!root) return;

    // Clear and show loading
    root.innerHTML = `<div class="shell-loading">${t("Loading...")}</div>`;

    try {
      const pluginUrl = this.getPluginUrl(appName, appPath);
      const script = document.createElement("script");
      script.src = pluginUrl;
      script.type = "module";

      script.onload = () => {
        root.innerHTML = "";
        if (window.AppMount) {
          window.AppMount(root);
        }
      };

      script.onerror = () => {
        root.innerHTML = `<div class="shell-error">${t("Failed to load application")}: ${appName}</div>`;
      };

      document.body.appendChild(script);
    } catch (error) {
      console.error("Failed to load plugin:", error);
      root.innerHTML = `<div class="shell-error">${t("Failed to load application")}</div>`;
    }
  }

  /**
   * Get plugin URL based on environment
   */
  private getPluginUrl(appName: string, appPath: string): string {
    // Development: Use environment variable for port
    if (import.meta.env.DEV) {
      const envKey = `VITE_PLUGIN_PORT_${appName.toUpperCase()}`;
      const port = import.meta.env[envKey];

      if (port) {
        // Load from Vite dev server - Vite transforms /src/index.tsx on the fly
        const url = `http://localhost:${port}/src/index.tsx`;
        console.log(`[Shell] Loading plugin "${appName}" from:`, url);
        return url;
      }

      console.warn(`No dev port defined for plugin "${appName}". Add ${envKey} to .env.development`);
    }

    // Production: Use app's base path from navigation
    const url = `${this.basePath}${appPath}/app.js`;
    console.log(`[Shell] Loading plugin "${appName}" from:`, url);
    return url;
  }
}

// Initialize shell when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new Shell());
} else {
  new Shell();
}
