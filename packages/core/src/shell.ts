/**
 * Trailhead Core Shell - Design system agnostic orchestration
 */
import type { ShellAPI, NavItem, NavLink, AppEntry, ShellManifest } from "./types/shell-api.js";
import type { DesignSystemAdapter } from "./adapters/types.js";
import * as http from "./lib/http.js";
import * as requestManager from "./lib/requestManager.js";

/**
 * Configuration passed to the `Trailhead` constructor.
 */
export interface ShellConfig {
  /** Design system adapter that backs all shell UI — toasts, dialogs, and busy overlays. */
  adapter: DesignSystemAdapter;

  /** URL prefix under which SPAs are hosted (e.g., `"/sample/trailhead"`). Used to strip the prefix from routes, construct SPA asset URLs, and build navigation links. */
  appBasePath?: string;

  /** Base URL prepended to all SPA HTTP requests made via `shell.http`. */
  apiUrl?: string;

  /** URL from which the shell bundle and static assets (e.g., `shell.json`) are fetched. Defaults to `appBasePath`. */
  shellUrl?: string;
}

/**
 * The Trailhead shell. Bootstraps the micro-frontend host by loading navigation config,
 * mounting SPAs on route activation, and exposing `window.shell` to every hosted application.
 *
 * @example
 * ```typescript
 * import { Trailhead } from '@herdingbits/trailhead-core';
 * import { WebAwesomeAdapter } from '@herdingbits/trailhead-webawesome';
 *
 * new Trailhead({ adapter: createAdapter() });
 * ```
 */
export class Trailhead {
  private apps: AppEntry[] = [];
  private nav: NavItem[] = [];
  private routeChangeCallbacks: Array<(path: string) => void> = [];

  /** URL prefix under which SPAs are hosted. Empty string when hosted at the root. */
  public readonly appBasePath: string;
  private readonly shellUrl: string;

  /** The active design system adapter supplying UI components to the shell. */
  public readonly adapter: DesignSystemAdapter;

  /**
   * Creates the shell and immediately begins async initialisation (adapter setup,
   * navigation load, initial route handling). Mount errors are logged to the console.
   *
   * @param config - Shell configuration
   */
  constructor(config: ShellConfig) {
    this.appBasePath = config.appBasePath || "";
    this.shellUrl = config.shellUrl || this.appBasePath;
    this.adapter = config.adapter;
    this.init(config.apiUrl);
  }

  /**
   * Returns the nav menu items loaded from `shell.json`.
   * Adapters call this to render the shell's navigation menu.
   */
  public getNavigation(): NavItem[] {
    return this.nav;
  }

  /**
   * Returns the SPA registry loaded from `shell.json`.
   * Adapters that manage their own routing call this to resolve which app to load.
   */
  public getApps(): AppEntry[] {
    return this.apps;
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
      await this.adapter.init(this.shellUrl);
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
        success: (message: string, duration?: number) => adapter.feedback.showToast(message, "success", duration),
        error: (message: string, duration?: number) => adapter.feedback.showToast(message, "error", duration || 5000),
        warning: (message: string, duration?: number) => adapter.feedback.showToast(message, "warning", duration || 4000),
        info: (message: string, duration?: number) => adapter.feedback.showToast(message, "info", duration),
        alert: (message: string, variant: any = "info", duration?: number) => adapter.feedback.showToast(message, variant, duration),
        confirm: (message: string, title: string = "Confirm") =>
          adapter.feedback
            .showDialog({
              message,
              title,
              buttons: [
                { label: "Cancel", value: "cancel", variant: "secondary" },
                { label: "Confirm", value: "confirm", variant: "primary" },
              ],
            })
            .then((result) => result.value === "confirm"),
        ok: (message: string, title: string = "Information") =>
          adapter.feedback
            .showDialog({
              message,
              title,
              buttons: [{ label: "OK", value: "ok", variant: "primary" }],
            })
            .then(() => undefined),
        yesNo: (message: string, title: string = "Confirm") =>
          adapter.feedback
            .showDialog({
              message,
              title,
              buttons: [
                { label: "No", value: "no", variant: "secondary" },
                { label: "Yes", value: "yes", variant: "primary" },
              ],
            })
            .then((result) => result.value === "yes"),
        yesNoCancel: (message: string, title: string = "Confirm") =>
          adapter.feedback
            .showDialog({
              message,
              title,
              buttons: [
                { label: "Cancel", value: "cancel", variant: "secondary" },
                { label: "No", value: "no", variant: "secondary" },
                { label: "Yes", value: "yes", variant: "primary" },
              ],
            })
            .then((result) => (result.value as "yes" | "no" | "cancel") || "cancel"),
        custom: <T extends string>(message: string, title: string, buttons: Array<{ label: string; value: T; variant?: string }>) =>
          adapter.feedback.showDialog({ message, title, buttons }).then((result) => result.value),
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
      const response = await fetch(`${this.shellUrl}/shell.json`);
      const manifest: ShellManifest = await response.json();
      this.apps = manifest.apps ?? [];
      this.nav = manifest.nav ?? [];
    } catch (error) {
      console.error("Failed to load shell.json:", error);
      this.apps = [];
      this.nav = [];
    }
  }

  /**
   * Render navigation menu
   */
  private renderNavigation(): void {
    const nav = document.getElementById("shell-navigation");
    if (!nav) return;

    const isExternal = (href: string) => /^https?:\/\/|^\/\//.test(href);

    const renderLink = (item: NavLink, isChild = false): string => {
      const external = isExternal(item.href);
      return `<a href="${item.href}"
         class="shell-nav-item${isChild ? " shell-nav-item-child" : ""}"
         data-path="${item.href}"
         data-external="${external}">
        <i class="shell-icon shell-icon-${item.icon ?? ""}"></i>
        <span class="shell-nav-label">${item.label}</span>
      </a>`;
    };

    nav.innerHTML = [...this.nav]
      .sort((a, b) => a.order - b.order)
      .map((item) => {
        switch (item.type) {
          case "link":
            return renderLink(item);
          case "section":
            return `<div class="shell-nav-section">
              <span class="shell-nav-section-header">
                <i class="shell-icon shell-icon-${item.icon ?? ""}"></i>
                <span class="shell-nav-label">${item.label}</span>
              </span>
              ${[...item.children].sort((a, b) => a.order - b.order).map((c) => renderLink(c, true)).join("")}
            </div>`;
          case "divider":
            return `<hr class="shell-nav-divider" />`;
        }
      })
      .join("");

    nav.querySelectorAll("a").forEach((link) => {
      if (link.getAttribute("data-external") !== "true") {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const path = link.getAttribute("data-path");
          if (path) {
            this.navigate(path);
          }
        });
      }
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
    window.location.href = path;
  }

  /**
   * Handle route change
   */
  private handleRoute(): void {
    let path = window.location.pathname;

    if (this.appBasePath && path.startsWith(this.appBasePath)) {
      path = path.substring(this.appBasePath.length) || "/";
    }

    const app = this.apps.find((entry) => path.startsWith(entry.basePath));

    if (app) {
      // Skip loading if app is already mounted (dev mode)
      const shellContent = document.getElementById("shell-content");
      const rootElement = shellContent?.querySelector("#root");
      const isAlreadyMounted = rootElement && rootElement.children.length > 0;

      if (!isAlreadyMounted) {
        this.loadPlugin(app.src, app.basePath);
      }
      this.updateActiveNav(app.basePath);
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

    const isDev = (window as any).__SHELL_DEV__ === true;
    const appBasePath = this.appBasePath + appPath;

    try {
      if (isDev) {
        // ✅ DEV PATH — Vite-native, HMR-compatible
        const mod = await import(
          /* @vite-ignore */
          `${this.appBasePath}${appPath}/src/index.ts`
        );

        root.innerHTML = "";
        mod.AppMount(root, appBasePath);
        return;
      }

      const pluginUrl = `${this.appBasePath}${appPath}/app.js`;
      const pluginCss = `${this.appBasePath}${appPath}/${appName}.css`;

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
          window.AppMount(root, appBasePath);
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
