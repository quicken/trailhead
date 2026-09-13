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
/** Credentials collected by an `AuthAdapter`'s re-authentication prompt. */
export interface Credentials {
    username: string;
    password: string;
}
/**
 * A still-open (or just-closed) credential prompt. Returned by `AuthAdapter.promptCredentials`
 * so the core orchestration in `lib/reauth.ts` can dismiss a stale prompt — e.g. when another
 * browser tab's re-authentication already succeeded and this tab's own prompt is no longer
 * needed. `close()` must be safe to call after the prompt has already resolved on its own.
 */
export interface CredentialPromptHandle {
    /** Resolves with the entered credentials, or `null` if the user cancelled. */
    result: Promise<Credentials | null>;
    /** Dismisses the prompt programmatically, resolving `result` with `null` if still pending. */
    close(): void;
}
/**
 * Implemented by adapters to collect credentials for in-place session re-authentication —
 * e.g. when a request fails because the session expired, and the app wants to recover without
 * losing the user's place (no navigation, no lost form state) rather than forcing a full reload.
 * Each adapter renders this however fits its design system; `lib/reauth.ts` only depends on the
 * `promptCredentials` contract, never on how it's drawn.
 */
export interface AuthAdapter {
    /**
     * Prompts for a username and password.
     * @param errorMessage - Set when re-prompting after a failed attempt (e.g. "Incorrect
     *   username or password."); omitted on the first prompt.
     */
    promptCredentials(errorMessage?: string): CredentialPromptHandle;
}
/**
 * `AuthAdapter` that never actually prompts — `promptCredentials` resolves `null` (cancelled)
 * immediately. Lets an adapter satisfy the required `auth` field with zero UI work: requests
 * that hit an expired session simply fail exactly as they would with no re-authentication
 * support at all, until a real implementation is built for that design system.
 */
export declare class NoopAuthAdapter implements AuthAdapter {
    promptCredentials(): CredentialPromptHandle;
}
/**
 * The integration contract between Trailhead core and a specific design system.
 * Implement this interface to support a new component library as the shell's UI layer.
 */
export interface DesignSystemAdapter {
    /** Identifier used in startup logs and diagnostics (e.g., `"webawesome"`, `"cloudscape"`). */
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
    /**
     * Credential-prompt implementation backed by this adapter's design system components.
     * Required so every adapter has an explicit answer — use `NoopAuthAdapter` if this design
     * system doesn't have a real implementation yet.
     */
    auth: AuthAdapter;
}
