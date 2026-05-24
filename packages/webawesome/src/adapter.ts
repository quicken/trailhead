/**
 * Web Awesome Design System Adapter
 */
import type { DesignSystemAdapter, FeedbackAdapter, DialogConfig, DialogResult, ToastVariant } from '@herdingbits/trailhead-types/adapters';

class WebAwesomeFeedbackAdapter implements FeedbackAdapter {
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

export interface WebAwesomeAdapterConfig {
  /** URL where Web Awesome is hosted (CDN or local path). Defaults to `${shellUrl}/webawesome`. */
  webAwesomeUrl?: string;
}

export class WebAwesomeAdapter implements DesignSystemAdapter {
  name = "webawesome";
  version = "1.0.0";
  feedback: FeedbackAdapter;
  private readonly config?: WebAwesomeAdapterConfig;

  constructor(config?: WebAwesomeAdapterConfig) {
    this.config = config;
    this.feedback = new WebAwesomeFeedbackAdapter();
  }

  async init(shellUrl: string): Promise<void> {
    try {
      const waPath = this.config?.webAwesomeUrl ?? `${shellUrl}/webawesome`;

      // Inject theme CSS dynamically so it resolves correctly regardless of where the page is served from
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `${waPath}/styles/themes/default.css`;
      document.head.appendChild(link);

      const { setBasePath } = await import(/* @vite-ignore */ `${waPath}/webawesome.js`);
      setBasePath(waPath);
      await import(/* @vite-ignore */ `${waPath}/webawesome.loader.js`);
    } catch (error) {
      console.error("Failed to initialize Web Awesome:", error);
      throw error;
    }
  }
}
