/**
 * CloudScape Design System Adapter
 */
import type { DesignSystemAdapter, FeedbackAdapter, DialogConfig, DialogResult, ToastVariant } from './types.js';

class CloudScapeFeedbackAdapter implements FeedbackAdapter {
  private busyOverlay: HTMLElement | null = null;

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
    // Simple toast implementation (CloudScape would use Flashbar)
    console.log(`[CloudScape Toast] ${variant}: ${message}`);
    
    const toast = document.createElement("div");
    toast.className = `shell-toast shell-toast-${variant}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${variant === 'error' ? '#d13212' : variant === 'success' ? '#037f0c' : '#0972d3'};
      color: white;
      border-radius: 4px;
      z-index: 10000;
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), duration);
  }

  showDialog<T extends string>(config: DialogConfig<T>): Promise<DialogResult<T>> {
    // Simple dialog implementation (CloudScape would use Modal)
    console.log(`[CloudScape Dialog] ${config.title}: ${config.message}`);
    
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

export class CloudScapeAdapter implements DesignSystemAdapter {
  name = "cloudscape";
  version = "1.0.0";
  feedback: FeedbackAdapter;

  constructor() {
    this.feedback = new CloudScapeFeedbackAdapter();
  }

  async init(basePath: string): Promise<void> {
    console.log('[CloudScape] Initializing with basePath:', basePath);
    // TODO: Load CloudScape components when implemented
    // For now, using basic HTML/CSS implementation
  }
}
