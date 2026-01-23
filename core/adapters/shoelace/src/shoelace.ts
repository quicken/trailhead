/**
 * Shoelace Design System Adapter
 */
import type { DesignSystemAdapter, FeedbackAdapter, DialogConfig, DialogResult, ToastVariant } from '../../shell/src/adapters/types.js';

class ShoelaceFeedbackAdapter implements FeedbackAdapter {
  private busyOverlay: HTMLElement | null = null;
  private toastContainer: HTMLElement | null = null;

  showBusy(message: string): void {
    if (!this.busyOverlay) {
      this.busyOverlay = document.createElement("div");
      this.busyOverlay.id = "shell-busy-overlay";
      this.busyOverlay.innerHTML = `
        <div class="shell-busy-content">
          <div class="shell-spinner"></div>
          <div class="shell-busy-message"></div>
        </div>
      `;
      document.body.appendChild(this.busyOverlay);
    }

    const messageEl = this.busyOverlay.querySelector(".shell-busy-message");
    if (messageEl) {
      messageEl.textContent = message;
    }
    this.busyOverlay.style.display = "flex";
  }

  clearBusy(): void {
    if (this.busyOverlay) {
      this.busyOverlay.style.display = "none";
    }
  }

  showToast(message: string, variant: ToastVariant, duration: number = 3000): void {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement("div");
      this.toastContainer.id = "shell-toast-container";
      document.body.appendChild(this.toastContainer);
    }

    const toast = document.createElement("div");
    toast.className = `shell-toast shell-toast-${variant}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add("shell-toast-show"), 10);
    setTimeout(() => {
      toast.classList.remove("shell-toast-show");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  showDialog<T extends string>(config: DialogConfig<T>): Promise<DialogResult<T>> {
    return new Promise((resolve) => {
      const dialog = document.createElement("div");
      dialog.className = "shell-dialog-overlay";
      dialog.innerHTML = `
        <div class="shell-dialog">
          ${config.title ? `<div class="shell-dialog-title">${config.title}</div>` : ''}
          <div class="shell-dialog-message">${config.message}</div>
          <div class="shell-dialog-buttons">
            ${config.buttons
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
          resolve({ value });
        };
      });

      // Click outside to cancel
      dialog.onclick = (e) => {
        if (e.target === dialog) {
          dialog.remove();
          resolve({ value: null });
        }
      };

      document.body.appendChild(dialog);
    });
  }
}

export class ShoelaceAdapter implements DesignSystemAdapter {
  name = "shoelace";
  version = "1.0.0";
  feedback: FeedbackAdapter;

  constructor() {
    this.feedback = new ShoelaceFeedbackAdapter();
  }

  async init(basePath: string): Promise<void> {
    try {
      const shoelacePath = `${basePath}/shoelace`;
      const { setBasePath } = await import(/* @vite-ignore */ `${shoelacePath}/utilities/base-path.js`);
      setBasePath(shoelacePath);
      await import(/* @vite-ignore */ `${shoelacePath}/shoelace-autoloader.js`);
    } catch (error) {
      console.error("Failed to initialize Shoelace:", error);
      throw error;
    }
  }
}
