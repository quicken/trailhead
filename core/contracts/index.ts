/**
 * Shell API Interface
 * Exposed to plugin applications via window.shell
 */

export interface ShellAPI {
  feedback: FeedbackAPI;
  http: HttpAPI;
  navigation: NavigationAPI;
}

/**
 * Feedback system API
 */
export interface FeedbackAPI {
  busy(message: string): void;
  clear(): void;
  success(message: string, duration?: number): void;
  error(message: string, duration?: number): void;
  warning(message: string, duration?: number): void;
  info(message: string, duration?: number): void;
  alert(message: string, variant?: AlertVariant, duration?: number): void;
  confirm(message: string, title?: string): Promise<boolean>;
  ok(message: string, title?: string): Promise<void>;
  yesNo(message: string, title?: string): Promise<boolean>;
  yesNoCancel(message: string, title?: string): Promise<"yes" | "no" | "cancel">;
  custom<T extends string>(
    message: string,
    title: string,
    buttons: Array<{ label: string; value: T; variant?: string }>
  ): Promise<T | null>;
}

export type AlertVariant = "success" | "error" | "warning" | "info";

/**
 * HTTP client API with automatic feedback orchestration
 */
export interface HttpAPI {
  get<T = any>(url: string, options?: RequestOptions): Promise<Result<T>>;
  post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<Result<T>>;
  put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<Result<T>>;
  patch<T = any>(url: string, data?: any, options?: RequestOptions): Promise<Result<T>>;
  delete<T = any>(url: string, options?: RequestOptions): Promise<Result<T>>;
}

export interface RequestOptions {
  requestKey?: string;
  busyMessage?: string;
  successMessage?: string;
  showSuccess?: boolean;
  noFeedback?: boolean;
  headers?: Record<string, string>;
}

export interface SuccessResult<T> {
  success: true;
  data: T;
  requestKey?: string;
}

export interface ErrorResult {
  success: false;
  error: HttpError;
  requestKey?: string;
}

export type Result<T> = SuccessResult<T> | ErrorResult;

export interface HttpError {
  name: string;
  message: string;
  status?: number;
  data?: any;
}

/**
 * Navigation API
 */
export interface NavigationAPI {
  navigate(path: string): void;
  getCurrentPath(): string;
  onRouteChange(callback: (path: string) => void): () => void;
}

/**
 * Plugin mount function signature
 */
export interface PluginMount {
  (container: HTMLElement): PluginInstance;
}

export interface PluginInstance {
  unmount(): void;
}

/**
 * Navigation configuration
 */
export interface NavItem {
  id: string;
  path: string;
  app: string;
  icon: string;
  label: string;
  order: number;
  badge?: () => number;
}

/**
 * Global window extension
 */
declare global {
  interface Window {
    shell: ShellAPI;
    AppMount?: PluginMount;
  }
}
