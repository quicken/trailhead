/**
 * Design System Adapter Interfaces
 * 
 * These interfaces define the contract between Trailhead core and design system implementations.
 */

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface DialogButton<T extends string = string> {
  label: string;
  value: T;
  variant?: string;
}

export interface DialogConfig<T extends string = string> {
  message: string;
  title?: string;
  buttons: DialogButton<T>[];
}

export interface DialogResult<T extends string = string> {
  value: T | null;
}

/**
 * Feedback Adapter - Handles user feedback (toasts, dialogs, busy states)
 */
export interface FeedbackAdapter {
  /**
   * Show a busy overlay with a message
   */
  showBusy(message: string): void;

  /**
   * Clear the busy overlay
   */
  clearBusy(): void;

  /**
   * Show a toast notification
   */
  showToast(message: string, variant: ToastVariant, duration?: number): void;

  /**
   * Show a dialog with custom buttons
   */
  showDialog<T extends string>(config: DialogConfig<T>): Promise<DialogResult<T>>;
}

/**
 * Design System Adapter - Main adapter interface
 */
export interface DesignSystemAdapter {
  /**
   * Adapter name (e.g., "shoelace", "cloudscape")
   */
  name: string;

  /**
   * Adapter version
   */
  version: string;

  /**
   * Initialize the design system (load assets, set base paths, etc.)
   */
  init(basePath: string): Promise<void>;

  /**
   * Feedback adapter for user notifications
   */
  feedback: FeedbackAdapter;
}
