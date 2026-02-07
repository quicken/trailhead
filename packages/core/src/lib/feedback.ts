/**
 * Feedback system - imperative API for user feedback
 * No React, pure DOM manipulation
 */
import type { AlertVariant } from "../types/shell-api";

let busyOverlay: HTMLElement | null = null;
let toastContainer: HTMLElement | null = null;

/**
 * Show blocking busy overlay with spinner
 */
export function busy(message: string): void {
  if (!busyOverlay) {
    busyOverlay = document.createElement("div");
    busyOverlay.id = "shell-busy-overlay";
    busyOverlay.innerHTML = `
      <div class="shell-busy-content">
        <div class="shell-spinner"></div>
        <div class="shell-busy-message"></div>
      </div>
    `;
    document.body.appendChild(busyOverlay);
  }

  const messageEl = busyOverlay.querySelector(".shell-busy-message");
  if (messageEl) {
    messageEl.textContent = message;
  }
  busyOverlay.style.display = "flex";
}

/**
 * Clear busy overlay
 */
export function clear(): void {
  if (busyOverlay) {
    busyOverlay.style.display = "none";
  }
}

/**
 * Show toast notification
 */
export function alert(
  message: string,
  variant: AlertVariant = "info",
  duration: number = 3000
): void {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "shell-toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `shell-toast shell-toast-${variant}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => toast.classList.add("shell-toast-show"), 10);
  setTimeout(() => {
    toast.classList.remove("shell-toast-show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Show success toast
 */
export function success(message: string, duration?: number): void {
  alert(message, "success", duration);
}

/**
 * Show error toast
 */
export function error(message: string, duration?: number): void {
  alert(message, "error", duration || 5000);
}

/**
 * Show warning toast
 */
export function warning(message: string, duration?: number): void {
  alert(message, "warning", duration || 4000);
}

/**
 * Show info toast
 */
export function info(message: string, duration?: number): void {
  alert(message, "info", duration);
}

/**
 * Show dialog with custom buttons
 */
export function custom<T extends string>(
  message: string,
  title: string,
  buttons: Array<{ label: string; value: T; variant?: string }>
): Promise<T | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement("div");
    dialog.className = "shell-dialog-overlay";
    dialog.innerHTML = `
      <div class="shell-dialog">
        <div class="shell-dialog-title">${title}</div>
        <div class="shell-dialog-message">${message}</div>
        <div class="shell-dialog-buttons">
          ${buttons
            .map(
              (btn) =>
                `<button class="shell-btn shell-btn-${btn.variant || "default"}" data-value="${btn.value}">${btn.label}</button>`
            )
            .join("")}
        </div>
      </div>
    `;

    dialog.querySelectorAll("button").forEach((btn) => {
      btn.onclick = () => {
        const value = btn.getAttribute("data-value") as T;
        dialog.remove();
        resolve(value);
      };
    });

    // Click outside to cancel
    dialog.onclick = (e) => {
      if (e.target === dialog) {
        dialog.remove();
        resolve(null);
      }
    };

    document.body.appendChild(dialog);
  });
}

/**
 * Show confirm dialog (Cancel/Confirm)
 */
export function confirm(message: string, title: string = "Confirm"): Promise<boolean> {
  return custom(message, title, [
    { label: "Cancel", value: "cancel", variant: "secondary" },
    { label: "Confirm", value: "confirm", variant: "primary" },
  ]).then((result) => result === "confirm");
}

/**
 * Show OK dialog
 */
export function ok(message: string, title: string = "Information"): Promise<void> {
  return custom(message, title, [
    { label: "OK", value: "ok", variant: "primary" },
  ]).then(() => undefined);
}

/**
 * Show Yes/No dialog
 */
export function yesNo(message: string, title: string = "Confirm"): Promise<boolean> {
  return custom(message, title, [
    { label: "No", value: "no", variant: "secondary" },
    { label: "Yes", value: "yes", variant: "primary" },
  ]).then((result) => result === "yes");
}

/**
 * Show Yes/No/Cancel dialog
 */
export function yesNoCancel(
  message: string,
  title: string = "Confirm"
): Promise<"yes" | "no" | "cancel"> {
  return custom(message, title, [
    { label: "Cancel", value: "cancel", variant: "secondary" },
    { label: "No", value: "no", variant: "secondary" },
    { label: "Yes", value: "yes", variant: "primary" },
  ]).then((result) => result || "cancel");
}
