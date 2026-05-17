/**
 * Shell API Interface
 *
 * The main API exposed to single page applications (SPAs) via `window.shell`.
 * Provides access to shared services including feedback, HTTP client, and navigation.
 *
 * @example
 * ```typescript
 * export function init(shell: ShellAPI) {
 *   shell.feedback.success('App loaded!');
 *   const result = await shell.http.get('/api/data');
 * }
 * ```
 */
export interface ShellAPI {
  /** Shell version string (e.g., "1.0.0") */
  version: string;

  /** User feedback system for toasts, dialogs, and loading states */
  feedback: FeedbackAPI;

  /** HTTP client with automatic error handling and loading indicators */
  http: HttpAPI;

  /** Navigation and routing utilities */
  navigation: NavigationAPI;
}



/**
 * Contract implemented by applications that can be hosted by the Shell.
 *
 * This is a **type-only interface** used at build time to define the shape of
 * an application entry module. It does **not** introduce runtime dependencies
 * or production code requirements.
 *
 * ### Purpose
 * - Allows the Shell to load and bootstrap applications in both development
 *   and production environments.
 * - Enables strongly-typed guarantees for the Shell without coupling
 *   applications to shell-specific runtime logic.
 *
 * ### Implementation requirements
 * Applications do **not** need to import or reference this type directly.
 * An application satisfies this contract automatically by exporting the
 * required functions from its entry module.
 *
 * ### Development vs Production
 * - In development, the Shell may `import()` an application's source entry
 *   module directly to enable fast reload behaviour.
 * - In production, the Shell loads the application's bundled output.
 *
 * This interface exists solely to document and enforce the expected surface
 * area between the Shell and hosted applications.
 *
 * @example
 * ```ts
 * // src/main.ts
 * export function AppMount(root: HTMLElement) {
 *   // Mount application UI into the provided DOM node
 * }
 * ```
 */

export type ShellPlugin = {
  /**
   * Mounts the application into a DOM element provided by the Shell.
   *
   * The Shell guarantees that:
   * - `root` is an empty, attached DOM element
   * - The application owns the DOM subtree beneath `root`
   *
   * @param root - Container element into which the application should render.
   * @param basePath - Full URL prefix under which this SPA is mounted (e.g. `"/trailhead/apps/mailmerge"`).
   *   Pass this as `basename` to your client-side router so internal links and default redirects
   *   resolve correctly when the shell is hosted under a subpath.
   *
   * @example
   * ```ts
   * export function AppMount(root: HTMLElement, basePath: string) {
   *   ReactDOM.createRoot(root).render(
   *     <BrowserRouter basename={basePath}>
   *       <App />
   *     </BrowserRouter>
   *   );
   * }
   * ```
   */
  AppMount(root: HTMLElement, basePath: string): void;
};


/**
 * Feedback system API
 *
 * Provides consistent user feedback across all SPAs using the shell's design system.
 * Handles toasts, loading overlays, confirmation dialogs, and alerts.
 */
export interface FeedbackAPI {
  /**
   * Show a loading overlay with a message.
   * Call `clear()` to remove it.
   *
   * @param message - Loading message to display
   * @example
   * ```typescript
   * shell.feedback.busy('Loading data...');
   * await fetchData();
   * shell.feedback.clear();
   * ```
   */
  busy(message: string): void;

  /**
   * Clear the loading overlay.
   */
  clear(): void;

  /**
   * Show a success toast notification.
   *
   * @param message - Success message to display
   * @param duration - Duration in milliseconds (default: 3000)
   * @example
   * ```typescript
   * shell.feedback.success('User saved successfully!');
   * ```
   */
  success(message: string, duration?: number): void;

  /**
   * Show an error toast notification.
   *
   * @param message - Error message to display
   * @param duration - Duration in milliseconds (default: 5000)
   * @example
   * ```typescript
   * shell.feedback.error('Failed to save user');
   * ```
   */
  error(message: string, duration?: number): void;

  /**
   * Show a warning toast notification.
   *
   * @param message - Warning message to display
   * @param duration - Duration in milliseconds (default: 4000)
   */
  warning(message: string, duration?: number): void;

  /**
   * Show an info toast notification.
   *
   * @param message - Info message to display
   * @param duration - Duration in milliseconds (default: 3000)
   */
  info(message: string, duration?: number): void;

  /**
   * Show an alert toast with a specific variant.
   *
   * @param message - Alert message to display
   * @param variant - Alert type: "success" | "error" | "warning" | "info"
   * @param duration - Duration in milliseconds
   */
  alert(message: string, variant?: AlertVariant, duration?: number): void;

  /**
   * Show a confirmation dialog with OK/Cancel buttons.
   *
   * @param message - Confirmation message
   * @param title - Dialog title (optional)
   * @returns Promise that resolves to `true` if confirmed, `false` if cancelled
   * @example
   * ```typescript
   * const confirmed = await shell.feedback.confirm('Delete this user?', 'Confirm Delete');
   * if (confirmed) {
   *   await deleteUser();
   * }
   * ```
   */
  confirm(message: string, title?: string): Promise<boolean>;

  /**
   * Show an alert dialog with an OK button.
   *
   * @param message - Alert message
   * @param title - Dialog title (optional)
   * @returns Promise that resolves when OK is clicked
   */
  ok(message: string, title?: string): Promise<void>;

  /**
   * Show a dialog with Yes/No buttons.
   *
   * @param message - Question message
   * @param title - Dialog title (optional)
   * @returns Promise that resolves to `true` for Yes, `false` for No
   */
  yesNo(message: string, title?: string): Promise<boolean>;

  /**
   * Show a dialog with Yes/No/Cancel buttons.
   *
   * @param message - Question message
   * @param title - Dialog title (optional)
   * @returns Promise that resolves to "yes", "no", or "cancel"
   * @example
   * ```typescript
   * const choice = await shell.feedback.yesNoCancel('Save changes?', 'Unsaved Changes');
   * if (choice === 'yes') {
   *   await saveChanges();
   * } else if (choice === 'no') {
   *   discardChanges();
   * }
   * ```
   */
  yesNoCancel(message: string, title?: string): Promise<"yes" | "no" | "cancel">;

  /**
   * Show a custom dialog with user-defined buttons.
   *
   * @param message - Dialog message
   * @param title - Dialog title
   * @param buttons - Array of button configurations
   * @returns Promise that resolves to the selected button's value, or null if cancelled
   * @example
   * ```typescript
   * const action = await shell.feedback.custom(
   *   'Choose an action',
   *   'User Actions',
   *   [
   *     { label: 'Edit', value: 'edit', variant: 'primary' },
   *     { label: 'Delete', value: 'delete', variant: 'danger' },
   *     { label: 'Cancel', value: 'cancel' }
   *   ]
   * );
   * if (action === 'delete') {
   *   await deleteUser();
   * }
   * ```
   */
  custom<T extends string>(message: string, title: string, buttons: Array<{ label: string; value: T; variant?: string }>): Promise<T | null>;
}

/** Alert variant types for toast notifications */
export type AlertVariant = "success" | "error" | "warning" | "info";

/**
 * HTTP client API with automatic feedback orchestration
 *
 * Provides HTTP methods with built-in error handling, loading indicators,
 * and success/error feedback. All requests return a discriminated union
 * for type-safe error handling.
 */
export interface HttpAPI {
  /**
   * Perform a GET request.
   *
   * @param url - Request URL (relative to apiUrl or absolute)
   * @param options - Request options for feedback and headers
   * @returns Promise with success/error result
   * @example
   * ```typescript
   * const result = await shell.http.get('/api/users', {
   *   busyMessage: 'Loading users...',
   *   successMessage: 'Users loaded!',
   *   showSuccess: true
   * });
   *
   * if (result.success) {
   *   console.log(result.data);
   * } else {
   *   console.error(result.error.message);
   * }
   * ```
   */
  get<T = any>(url: string, options?: RequestOptions): Promise<Result<T>>;

  /**
   * Perform a POST request.
   *
   * @param url - Request URL
   * @param data - Request body data
   * @param options - Request options for feedback and headers
   * @returns Promise with success/error result
   * @example
   * ```typescript
   * const result = await shell.http.post('/api/users', userData, {
   *   busyMessage: 'Creating user...',
   *   successMessage: 'User created!',
   *   showSuccess: true
   * });
   * ```
   */
  post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<Result<T>>;

  /**
   * Perform a PUT request.
   *
   * @param url - Request URL
   * @param data - Request body data
   * @param options - Request options for feedback and headers
   * @returns Promise with success/error result
   */
  put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<Result<T>>;

  /**
   * Perform a PATCH request.
   *
   * @param url - Request URL
   * @param data - Request body data
   * @param options - Request options for feedback and headers
   * @returns Promise with success/error result
   */
  patch<T = any>(url: string, data?: any, options?: RequestOptions): Promise<Result<T>>;

  /**
   * Perform a DELETE request.
   *
   * @param url - Request URL
   * @param options - Request options for feedback and headers
   * @returns Promise with success/error result
   * @example
   * ```typescript
   * const result = await shell.http.delete(`/api/users/${userId}`, {
   *   busyMessage: 'Deleting user...',
   *   successMessage: 'User deleted!',
   *   showSuccess: true
   * });
   * ```
   */
  delete<T = any>(url: string, options?: RequestOptions): Promise<Result<T>>;
}

/**
 * HTTP request options
 */
export interface RequestOptions {
  /**
   * Unique key to prevent duplicate concurrent requests.
   * If a request with the same key is in progress, subsequent requests are ignored.
   *
   * @example
   * ```typescript
   * // Only one save request at a time
   * await shell.http.post('/api/save', data, { requestKey: 'save-user' });
   * ```
   */
  requestKey?: string;

  /**
   * Message to show in loading overlay while request is in progress.
   * If not provided, no loading overlay is shown.
   */
  busyMessage?: string;

  /**
   * Message to show in success toast when request completes successfully.
   * Only shown if `showSuccess` is true.
   */
  successMessage?: string;

  /**
   * Whether to show success toast on successful request.
   * Default: false
   */
  showSuccess?: boolean;

  /**
   * Disable all automatic feedback (loading, success, error).
   * Useful when you want to handle feedback manually.
   * Default: false
   */
  noFeedback?: boolean;

  /**
   * Additional HTTP headers to include in the request.
   *
   * @example
   * ```typescript
   * await shell.http.get('/api/data', {
   *   headers: { 'X-Custom-Header': 'value' }
   * });
   * ```
   */
  headers?: Record<string, string>;
}

/**
 * Successful HTTP response — narrows `Result<T>` when `success` is `true`.
 */
export interface SuccessResult<T> {
  success: true;

  /** Parsed JSON response body. */
  data: T;

  /** Echo of the `requestKey` from `RequestOptions`, if supplied. */
  requestKey?: string;
}

/**
 * Failed HTTP response — narrows `Result<T>` when `success` is `false`.
 */
export interface ErrorResult {
  success: false;

  error: HttpError;

  /** Echo of the `requestKey` from `RequestOptions`, if supplied. */
  requestKey?: string;
}

/**
 * Discriminated union returned by all `shell.http` methods.
 * Branch on `result.success` to get type-safe access to `data` or `error`.
 *
 * @example
 * ```typescript
 * const result = await shell.http.get('/api/data');
 *
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export type Result<T> = SuccessResult<T> | ErrorResult;

/**
 * Details of a failed HTTP request, normalised from the underlying ky error.
 */
export interface HttpError {
  /** Error class name (e.g., `"HTTPError"`, `"TimeoutError"`). */
  name: string;

  /** Human-readable description, extracted from the server response body when available. */
  message: string;

  /** HTTP status code, present when the server replied (absent for network errors). */
  status?: number;

  /** Parsed server response body, when the error response was valid JSON. */
  data?: any;
}

/**
 * Navigation API
 *
 * Provides navigation between SPAs and route change notifications.
 */
export interface NavigationAPI {
  /**
   * Navigate to a different path.
   * Triggers a full page reload to load the target SPA.
   *
   * @param path - Target path (e.g., "/demo", "/users")
   * @example
   * ```typescript
   * shell.navigation.navigate('/demo');
   * ```
   */
  navigate(path: string): void;

  /**
   * Get the current path.
   *
   * @returns Current path (e.g., "/demo")
   */
  getCurrentPath(): string;

  /**
   * Subscribe to route changes.
   *
   * @param callback - Function called when route changes
   * @returns Unsubscribe function
   * @example
   * ```typescript
   * const unsubscribe = shell.navigation.onRouteChange((path) => {
   *   console.log('Route changed to:', path);
   * });
   *
   * // Later, unsubscribe
   * unsubscribe();
   * ```
   */
  onRouteChange(callback: (path: string) => void): () => void;
}

/**
 * Navigation item configuration
 *
 * Defines a navigation menu item in `navigation.json`.
 */
export interface NavItem {
  /** Stable key used to match active nav state and correlate items across reloads. */
  id: string;

  /** Route path this item activates (e.g., `"/demo"`). Must match the SPA's base route. */
  path: string;

  /** SPA directory name; the shell resolves `<basePath>/<app>/app.js` when this route is activated. */
  app: string;

  /** Icon identifier passed to the adapter's icon component. Naming convention is design-system-specific. */
  icon: string;

  label: string;

  /** Lower numbers appear earlier in the menu. */
  order: number;

  /** Called on each render to get a live count shown as a badge on the nav item (e.g., unread notifications). */
  badge?: () => number;
}

/**
 * Global window extension
 *
 * Extends the Window interface to include Trailhead shell API.
 */
declare global {
  interface Window {
    /** Trailhead shell API available to all SPAs */
    shell: ShellAPI;

    /** @see {@link ShellPlugin.AppMount} */
    AppMount?: (root: HTMLElement, basePath: string) => void;
  }
}
