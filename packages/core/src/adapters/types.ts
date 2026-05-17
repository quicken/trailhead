/**
 * Design System Adapter Interfaces
 *
 * These interfaces define the contract between Trailhead core and design system implementations.
 */

/** Visual category of a toast notification, mapped to the adapter's colour/icon scheme. */
export type ToastVariant = "success" | "error" | "warning" | "info";

/**
 * A button rendered inside a shell dialog.
 */
export interface DialogButton<T extends string = string> {
  /** User-visible button text. */
  label: string;
  /** Value the dialog promise resolves to when this button is clicked. */
  value: T;
  /** Design-system-specific style variant (e.g., `"primary"`, `"danger"`). */
  variant?: string;
}

/**
 * Configuration passed to the adapter when the shell needs to display a modal dialog.
 */
export interface DialogConfig<T extends string = string> {
  /** Body text displayed inside the dialog. */
  message: string;
  /** Dialog heading. */
  title?: string;
  /** Ordered list of buttons to render, left to right. */
  buttons: DialogButton<T>[];
}

/**
 * Value returned when a shell dialog closes.
 * `null` when dismissed without clicking a button (e.g., clicking outside).
 */
export interface DialogResult<T extends string = string> {
  value: T | null;
}

/**
 * Implemented by adapters to supply shell feedback UI — busy overlays, toasts, and dialogs.
 * Each adapter wires these methods to its own design system components.
 */
export interface FeedbackAdapter {
  /** Block the UI with a spinner and message while a long-running operation is in progress. */
  showBusy(message: string): void;

  /** Dismiss the busy overlay once the operation completes. */
  clearBusy(): void;

  /** Show a transient status notification that auto-dismisses after `duration` ms. */
  showToast(message: string, variant: ToastVariant, duration?: number): void;

  /** Render a modal dialog and resolve with whichever button the user clicked. */
  showDialog<T extends string>(config: DialogConfig<T>): Promise<DialogResult<T>>;
}

/**
 * The integration contract between Trailhead core and a specific design system.
 * Implement this interface to support a new component library as the shell's UI layer.
 */
export interface DesignSystemAdapter {
  /** Identifier used in startup logs and diagnostics (e.g., `"shoelace"`, `"cloudscape"`). */
  name: string;

  /** Adapter package version, logged at shell startup. */
  version: string;

  /**
   * Called once at shell startup. Register web component base paths,
   * inject global stylesheets, or perform any other design-system-specific setup.
   */
  init(shellUrl: string): Promise<void>;

  /** Feedback implementation backed by this adapter's design system components. */
  feedback: FeedbackAdapter;
}
