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
  custom<T extends string>(
    message: string,
    title: string,
    buttons: Array<{ label: string; value: T; variant?: string }>
  ): Promise<T | null>;
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
 * Successful HTTP response
 */
export interface SuccessResult<T> {
  /** Always true for successful responses */
  success: true;
  
  /** Response data */
  data: T;
  
  /** Request key if provided in options */
  requestKey?: string;
}

/**
 * Failed HTTP response
 */
export interface ErrorResult {
  /** Always false for error responses */
  success: false;
  
  /** Error details */
  error: HttpError;
  
  /** Request key if provided in options */
  requestKey?: string;
}

/**
 * Discriminated union of success or error result.
 * Use the `success` property to narrow the type.
 * 
 * @example
 * ```typescript
 * const result = await shell.http.get('/api/data');
 * 
 * if (result.success) {
 *   // TypeScript knows result.data exists
 *   console.log(result.data);
 * } else {
 *   // TypeScript knows result.error exists
 *   console.error(result.error.message);
 * }
 * ```
 */
export type Result<T> = SuccessResult<T> | ErrorResult;

/**
 * HTTP error details
 */
export interface HttpError {
  /** Error name (e.g., "HTTPError", "TimeoutError") */
  name: string;
  
  /** Human-readable error message */
  message: string;
  
  /** HTTP status code if available (e.g., 404, 500) */
  status?: number;
  
  /** Additional error data from server response */
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
  /** Unique identifier for the navigation item */
  id: string;
  
  /** URL path for the navigation item (e.g., "/demo") */
  path: string;
  
  /** SPA identifier (matches directory name) */
  app: string;
  
  /** Icon name (design system specific) */
  icon: string;
  
  /** Display label for the navigation item */
  label: string;
  
  /** Sort order (lower numbers appear first) */
  order: number;
  
  /** Optional badge function that returns a count to display */
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
    
    /** Legacy mount function (deprecated, use init() export instead) */
    AppMount?: (container: HTMLElement) => void;
  }
}
