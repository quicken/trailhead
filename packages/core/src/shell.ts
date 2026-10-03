/**
 * Trailhead Core Shell - Design system agnostic orchestration
 */
import type { ShellAPI, NavItem, NavLink, AppEntry, ShellManifest, AuthStrategyConfig } from "./types/shell-api.js";
import type { DesignSystemAdapter } from "./adapters/types.js";
import * as http from "./lib/http.js";
import * as requestManager from "./lib/requestManager.js";
import { createReauthenticator, type Reauthenticator } from "./lib/reauth.js";
import { createRedirectSessionRecovery, type SessionRecoverer } from "./lib/session-recovery.js";

/** `http(s)://…` or protocol-relative `//…` — an href the shell treats as external by default. */
const isExternalHref = (href: string) => /^https?:\/\/|^\/\//.test(href);

/**
 * Resolves `href` against the current page and returns it only when it is safe to navigate to:
 * an `http(s)` URL and, unless `allowCrossOrigin`, on this page's origin. Resolving through the
 * URL parser (rather than pattern-matching the string) is what catches the browser's own
 * normalisation — leading whitespace, tabs inside `java\tscript:`, `\` read as `/`. Resolves
 * against `document.baseURI`, exactly as the browser resolves an `<a href>`.
 */
function isSafeHref(href: string, allowCrossOrigin: boolean): boolean {
  let url: URL;
  try {
    url = new URL(href, document.baseURI);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return allowCrossOrigin || url.origin === new URL(document.URL).origin;
}

/** A same-origin path such as `/api` or `/_auth/refresh` — the only form `shell.json` may give for endpoints. */
const isSameOriginPath = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("/") && isSafeHref(value, false);

/** `shell.json`'s `apiUrl`, or `undefined` (with a warning) when absent or unsafe. */
function manifestApiUrl(manifest: Partial<ShellManifest> | null): string | undefined {
  const value = manifest?.apiUrl;
  if (value === undefined) return undefined;
  if (isSameOriginPath(value)) return value;
  console.warn("[Trailhead] Ignoring shell.json apiUrl — it must be a same-origin path such as \"/api\":", value);
  return undefined;
}

/** `shell.json`'s `auth`, or `undefined` (with a warning) when absent or unsafe. */
function manifestAuth(manifest: Partial<ShellManifest> | null): AuthStrategyConfig | undefined {
  const value: unknown = manifest?.auth;
  if (value === undefined) return undefined;
  const auth = value as { strategy?: unknown; refreshPath?: unknown; signinPath?: unknown } | null;
  if (auth?.strategy === "credentials") return { strategy: "credentials" };
  if (
    auth?.strategy === "cognito" &&
    (auth.refreshPath === undefined || isSameOriginPath(auth.refreshPath)) &&
    (auth.signinPath === undefined || isSameOriginPath(auth.signinPath))
  ) {
    return { strategy: "cognito", refreshPath: auth.refreshPath as string | undefined, signinPath: auth.signinPath as string | undefined };
  }
  console.warn("[Trailhead] Ignoring shell.json auth — unknown strategy or an endpoint that isn't a same-origin path:", value);
  return undefined;
}

/** An `AppEntry.basePath`: `/`, or `/`-separated segments that don't start with `.` (no `..`, no `//`). */
const SAFE_BASE_PATH = /^(?:\/|(?:\/[\w~-][\w.~-]*)+\/?)$/;

/** An `AppEntry.src`: a single file-name-safe segment — it becomes part of the stylesheet URL. */
const SAFE_SRC = /^[\w~-][\w.~-]*$/;

/**
 * Configuration passed to {@link Trailhead.create}.
 */
export interface ShellConfig {
  /** Design system adapter that backs all shell UI — toasts, dialogs, and busy overlays. */
  adapter: DesignSystemAdapter;

  /** URL prefix under which SPAs are hosted (e.g., `"/sample/trailhead"`). Used to strip the prefix from routes, construct SPA asset URLs, and build navigation links. */
  appBasePath?: string;

  /**
   * Base URL prepended to all SPA HTTP requests made via `shell.http`. Falls back to `apiUrl` in
   * `shell.json` when omitted or empty, so a deployment can set it without rebuilding the shell.
   */
  apiUrl?: string;

  /** URL from which the shell bundle and static assets (e.g., `shell.json`) are fetched. Defaults to `appBasePath`. */
  shellUrl?: string;

  /**
   * Session-recovery strategy. Explicit — the shell never auto-detects it from the presence of
   * `/_auth/*` endpoints. Omit it for the default `{ strategy: "credentials" }` (in-place
   * username/password re-authentication via the adapter; `shell.http` does not auto-recover).
   * Pass `{ strategy: "cognito" }` for redirect-based recovery behind the jwt-auth-gateway, where
   * `shell.http` auto-recovers once on a `401`. When omitted, `auth` in `shell.json` is used if
   * present. See {@link AuthStrategyConfig}.
   */
  auth?: AuthStrategyConfig;
}

/**
 * The Trailhead shell. Bootstraps the micro-frontend host by loading navigation config,
 * mounting SPAs on route activation, and exposing `window.shell` to every hosted application.
 *
 * Start-up is two explicit steps: {@link Trailhead.create} does the async work (adapter
 * initialisation, loading `shell.json`, exposing `window.shell`) and resolves with a fully
 * loaded shell; {@link Trailhead.start} then wires it to the page once the layout is in the
 * DOM. Adapters' `ShellApp.mount(shell)` calls `start()` for you.
 *
 * @example
 * ```typescript
 * import { Trailhead } from '@herdingbits/trailhead-core';
 * import { WebAwesomeAdapter, ShellApp } from '@herdingbits/trailhead-webawesome';
 *
 * const shell = await Trailhead.create({ adapter: new WebAwesomeAdapter() });
 * ShellApp.mount(shell);
 * ```
 */
export class Trailhead {
  private apps: AppEntry[] = [];
  private nav: NavItem[] = [];
  private readonly routeChangeCallbacks: Array<(path: string) => void> = [];

  /** URL prefix under which SPAs are hosted. Empty string when hosted at the root. */
  public readonly appBasePath: string;
  private readonly shellUrl: string;
  private started = false;

  /** The active design system adapter supplying UI components to the shell. */
  public readonly adapter: DesignSystemAdapter;

  /** Backs `window.shell.auth.reauthenticate` — built from `adapter.auth`. */
  private readonly reauthenticator: Reauthenticator;

  /**
   * Backs `window.shell.auth.recoverSession` and `shell.http`'s 401 auto-recovery. `null` under
   * the credentials strategy (the default), where there's nothing to recover without a prompt.
   * Set by {@link create} once `shell.json` has been read, since it may name the strategy.
   */
  private sessionRecoverer: SessionRecoverer | null = null;

  private constructor(config: ShellConfig) {
    this.appBasePath = config.appBasePath || "";
    this.shellUrl = config.shellUrl || this.appBasePath;
    this.adapter = config.adapter;
    this.reauthenticator = createReauthenticator(this.adapter.auth);
  }

  /**
   * Creates the shell: initialises the design system adapter, loads `shell.json`, then wires
   * `shell.http` and the auth strategy and exposes `window.shell`. `apiUrl` and `auth` come from
   * `config` when given, otherwise from `shell.json`. The returned shell is fully loaded —
   * {@link getNavigation} and {@link getApps} are populated — but hasn't touched the page yet; call {@link start}
   * (or an adapter's `ShellApp.mount`) once the layout is in the DOM.
   *
   * A missing or unreadable `shell.json` is logged and leaves navigation empty. If the
   * adapter fails to initialise, the error is shown in `#shell-content` (when it exists)
   * and the returned promise rejects.
   *
   * @param config - Shell configuration
   */
  public static async create(config: ShellConfig): Promise<Trailhead> {
    const shell = new Trailhead(config);
    try {
      await shell.initAdapter();
    } catch (error) {
      const root = document.getElementById("shell-content");
      if (root) {
        root.innerHTML = `<div class="shell-error">Failed to start the application shell</div>`;
      }
      throw error;
    }

    const manifest = await shell.loadManifest();

    // create() config wins; shell.json supplies deployment defaults; then the built-in defaults.
    // Default strategy is credentials: no redirect recoverer, http does not auto-recover.
    const apiUrl = config.apiUrl || manifestApiUrl(manifest) || "";
    const auth = config.auth ?? manifestAuth(manifest) ?? { strategy: "credentials" };
    const recoverer =
      auth.strategy === "cognito"
        ? createRedirectSessionRecovery({ refreshPath: auth.refreshPath, signinPath: auth.signinPath })
        : null;
    shell.sessionRecoverer = recoverer;

    requestManager.init(shell.adapter.feedback);
    http.init(apiUrl, recoverer ? () => recoverer.recoverSession() : null);
    window.shell = shell.createAPI();

    return shell;
  }

  /**
   * Wires the shell to the page: renders navigation into `#shell-navigation`, starts
   * listening for route changes and loads the app for the current URL into
   * `#shell-content`. Call it once the layout is in the DOM; later calls do nothing.
   */
  public start(): void {
    if (this.started) return;
    this.started = true;

    this.setupRouting();
    this.renderNavigation();
    this.handleRoute();
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
      auth: {
        reauthenticate: (attempt) => this.reauthenticator.reauthenticate(attempt),
        recoverSession: () => (this.sessionRecoverer ? this.sessionRecoverer.recoverSession() : Promise.resolve(false)),
      },
    };
  }

  /**
   * Loads `shell.json`: keeps its apps and nav, and returns the whole manifest so {@link create}
   * can read its deployment config. Returns `null` (empty apps and nav) when it can't be loaded.
   */
  private async loadManifest(): Promise<Partial<ShellManifest> | null> {
    try {
      const response = await fetch(`${this.shellUrl}/shell.json`);
      const manifest: Partial<ShellManifest> = await response.json();
      this.apps = (manifest.apps ?? []).filter((app) => {
        const valid = typeof app.basePath === "string" && SAFE_BASE_PATH.test(app.basePath) && typeof app.src === "string" && SAFE_SRC.test(app.src);
        if (!valid) console.warn("[Trailhead] Ignoring shell.json app with an unsafe basePath or src:", app);
        return valid;
      });
      this.nav = manifest.nav ?? [];
      return manifest;
    } catch (error) {
      console.error("Failed to load shell.json:", error);
      this.apps = [];
      this.nav = [];
      return null;
    }
  }

  /**
   * Render navigation menu. Built with DOM APIs, never an HTML string: `shell.json` labels, icons
   * and hrefs are data, and must not be able to inject markup. Links whose href is not a safe
   * `http(s)` target (internal links must also stay on this origin) are dropped with a warning.
   */
  private renderNavigation(): void {
    const nav = document.getElementById("shell-navigation");
    if (!nav) return;

    const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] => {
      const node = document.createElement(tag);
      node.className = className;
      return node;
    };

    const iconAndLabel = (parent: HTMLElement, icon: string | undefined, label: string) => {
      parent.append(el("i", `shell-icon shell-icon-${icon ?? ""}`));
      parent.append(Object.assign(el("span", "shell-nav-label"), { textContent: label }));
    };

    const renderLink = (item: NavLink, isChild = false): HTMLAnchorElement | null => {
      const external = item.external === true || isExternalHref(item.href);
      const href = external ? item.href : this.appBasePath + item.href;
      if (!isSafeHref(href, external)) {
        console.warn("[Trailhead] Dropping shell.json nav link with an unsafe href:", item.href);
        return null;
      }

      const link = el("a", `shell-nav-item${isChild ? " shell-nav-item-child" : ""}`);
      link.setAttribute("href", href);
      link.dataset.path = item.href;
      link.dataset.external = String(external);
      if (external) {
        link.rel = "noopener noreferrer";
      } else {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          this.navigate(item.href);
        });
      }
      iconAndLabel(link, item.icon, item.label);
      return link;
    };

    const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;

    const nodes = [...this.nav].sort(byOrder).map((item): HTMLElement | null => {
      switch (item.type) {
        case "link":
          return renderLink(item);
        case "section": {
          const section = el("div", "shell-nav-section");
          const header = el("span", "shell-nav-section-header");
          iconAndLabel(header, item.icon, item.label);
          section.append(header);
          for (const child of [...item.children].sort(byOrder)) {
            const link = renderLink(child, true);
            if (link) section.append(link);
          }
          return section;
        }
        case "divider":
          return el("hr", "shell-nav-divider");
      }
    });

    nav.replaceChildren(...nodes.filter((node): node is HTMLElement => node !== null));
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
   * Navigate to path. `path` is relative to `appBasePath` — the same convention used by
   * `shell.json`'s nav `href`s and by `AppEntry.basePath` — so callers (nav links, and
   * `window.shell.navigation.navigate()`) don't need to know the deployment's base path.
   */
  private navigate(path: string): void {
    const target = this.appBasePath + path;
    if (!isSafeHref(target, false)) {
      console.warn("[Trailhead] Refusing to navigate to an unsafe or off-origin path:", path);
      return;
    }
    window.location.href = target;
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
        // loadPlugin reports its own failures in #shell-content; nothing to await here.
        void this.loadPlugin(app.src, app.basePath);
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

    // shell.json often writes app links with a trailing slash ("/apps/x/") while the app's
    // basePath has none ("/apps/x"), or the reverse; treat them as the same route.
    const withoutTrailingSlash = (p: string) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);
    const activePath = withoutTrailingSlash(path);

    nav.querySelectorAll("a").forEach((link) => {
      if (link.dataset.path !== undefined && withoutTrailingSlash(link.dataset.path) === activePath) {
        link.classList.add("shell-nav-item-active");
        link.setAttribute("aria-current", "page");
      } else {
        link.classList.remove("shell-nav-item-active");
        link.removeAttribute("aria-current");
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
        const error = document.createElement("div");
        error.className = "shell-error";
        error.textContent = `Failed to load application: ${appName}`;
        root.replaceChildren(error);
      };

      document.body.appendChild(script);
    } catch (error) {
      console.error("Failed to load plugin:", error);
      root.innerHTML = `<div class="shell-error">Failed to load application</div>`;
    }
  }
}
