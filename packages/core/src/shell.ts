/**
 * Trailhead Core Shell - Design system agnostic orchestration
 */
import type { ShellAPI, NavItem } from "./types/shell-api.js";
import type { DesignSystemAdapter } from "./adapters/types.js";
import * as http from "./lib/http.js";
import * as requestManager from "./lib/requestManager.js";

export interface ShellConfig {
  adapter: DesignSystemAdapter;
  basePath?: string;
  apiUrl?: string;
  shellResourceUrl?: string;
}

export class Trailhead {
  private navigation: NavItem[] = [];
  private routeChangeCallbacks: Array<(path: string) => void> = [];
  public readonly basePath: string;
  private readonly shellResourceUrl: string;
  public readonly adapter: DesignSystemAdapter;

  constructor(config: ShellConfig) {
    this.basePath = config.basePath || "";
    this.shellResourceUrl = config.shellResourceUrl || this.basePath;
    this.adapter = config.adapter;
    this.init(config.apiUrl);
  }

  /**
   * Get navigation items loaded from navigation.json
   * @returns Array of navigation items
   */
  public getNavigation(): NavItem[] {
    return this.navigation;
  }

  /**
   * Initialize shell
   */
  private async init(apiUrl?: string): Promise<void> {
    // Initialize design system adapter
    await this.initAdapter();

    // Initialize request manager and HTTP client with adapter
    requestManager.init(this.adapter.feedback);
    http.init(apiUrl || "");

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
   * Initialize design system adapter
   */
  private async initAdapter(): Promise<void> {
    try {
      await this.adapter.init(this.basePath);
      console.log(`[Trailhead] Initialized ${this.adapter.name} adapter v${this.adapter.version}`);
    } catch (error) {
      console.error("Failed to initialize design system adapter:", error);
      throw error;
    }
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
      const response = await fetch(`${this.shellResourceUrl}/navigation.json`);
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
    window.location.href = this.basePath + path;
  }

  /**
   * Handle route change
   */
  private handleRoute(): void {
    let path = window.location.pathname;
    
    if (this.basePath && path.startsWith(this.basePath)) {
      path = path.substring(this.basePath.length) || "/";
    }
    
    const navItem = this.navigation.find((item) => path.startsWith(item.path));

    if (navItem) {
      // Skip loading if app is already mounted (dev mode)
      const shellContent = document.getElementById("shell-content");
      const rootElement = shellContent?.querySelector("#root");
      const isAlreadyMounted = rootElement && rootElement.children.length > 0;
      
      if (!isAlreadyMounted) {
        this.loadPlugin(navItem.app, navItem.path);
      }
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

    root.innerHTML = `<div class="shell-loading">Loading...</div>`;

    try {
      const pluginUrl = `${this.basePath}${appPath}/app.js`;
      const pluginCss = `${this.basePath}${appPath}/${appName}.css`;
      
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
        root.innerHTML = "";
        if (window.AppMount) {
          window.AppMount(root);
        }
      };

      script.onerror = () => {
        root.innerHTML = `<div class="shell-error">Failed to load application: ${appName}</div>`;
      };

      document.body.appendChild(script);
    } catch (error) {
      console.error("Failed to load plugin:", error);
      root.innerHTML = `<div class="shell-error">Failed to load application</div>`;
    }
  }
}
