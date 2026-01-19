/**
 * Shell - Application shell providing services to plugin apps
 */
import type { ShellAPI, NavItem, PluginInstance } from "./types/shell-api";
import * as feedback from "./lib/feedback";
import * as http from "./lib/http";
import { t } from "./lib/i18n";

class Shell {
  private currentPlugin: PluginInstance | null = null;
  private navigation: NavItem[] = [];
  private routeChangeCallbacks: Array<(path: string) => void> = [];
  private basePath: string = "";

  constructor() {
    this.basePath = import.meta.env.VITE_BASE_PATH || "";
    this.initShoelace();
    this.init();
  }

  /**
   * Initialize Shoelace with correct base path
   */
  private async initShoelace(): Promise<void> {
    try {
      const shoelacePath = `${this.basePath}/shoelace`;
      const { setBasePath } = await import(/* @vite-ignore */ `${shoelacePath}/utilities/base-path.js`);
      setBasePath(shoelacePath);
      await import(/* @vite-ignore */ `${shoelacePath}/shoelace-autoloader.js`);
    } catch (error) {
      console.error("Failed to initialize Shoelace:", error);
    }
  }

  /**
   * Initialize shell
   */
  private async init(): Promise<void> {
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
    return {
      feedback: {
        busy: feedback.busy,
        clear: feedback.clear,
        success: feedback.success,
        error: feedback.error,
        warning: feedback.warning,
        info: feedback.info,
        alert: feedback.alert,
        confirm: feedback.confirm,
        ok: feedback.ok,
        yesNo: feedback.yesNo,
        yesNoCancel: feedback.yesNoCancel,
        custom: feedback.custom,
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
      this.loadPlugin(navItem.app);
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
  private async loadPlugin(appName: string): Promise<void> {
    // Unmount previous plugin
    if (this.currentPlugin) {
      this.currentPlugin.unmount();
      this.currentPlugin = null;
    }

    // Clear content
    const root = document.getElementById("shell-content");
    if (!root) return;

    // Clear the container completely
    root.innerHTML = "";

    // Show loading state
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "shell-loading";
    loadingDiv.textContent = t("Loading...");
    root.appendChild(loadingDiv);

    try {
      const pluginUrl = this.getPluginUrl(appName);

      // Load plugin script
      const script = document.createElement("script");
      script.src = pluginUrl;
      script.type = "module";

      script.onload = () => {
        // Remove loading indicator
        loadingDiv.remove();

        if (window.AppMount) {
          this.currentPlugin = window.AppMount(root);
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
  private getPluginUrl(appName: string): string {
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

    // Production: Use standard path with base path
    const url = `${this.basePath}/apps/${appName}/app.js`;
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
