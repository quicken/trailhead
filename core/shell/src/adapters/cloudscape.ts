/**
 * CloudScape Design System Adapter
 */
import type { DesignSystemAdapter, FeedbackAdapter, DialogConfig, DialogResult, ToastVariant } from './types.js';

class CloudScapeFeedbackAdapter implements FeedbackAdapter {
  private busyOverlay: HTMLElement | null = null;
  private flashbarContainer: HTMLElement | null = null;

  showBusy(message: string): void {
    if (!this.busyOverlay) {
      this.busyOverlay = document.createElement("div");
      this.busyOverlay.id = "cloudscape-busy-overlay";
      this.busyOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;
      this.busyOverlay.innerHTML = `
        <div style="background: white; padding: 24px; border-radius: 8px; text-align: center;">
          <div class="cloudscape-spinner" style="margin-bottom: 16px;">
            <svg width="40" height="40" viewBox="0 0 40 40" style="animation: spin 1s linear infinite;">
              <circle cx="20" cy="20" r="18" fill="none" stroke="#0972d3" stroke-width="4" stroke-dasharray="90 30"/>
            </svg>
          </div>
          <div class="cloudscape-busy-message" style="color: #000716; font-size: 14px;"></div>
        </div>
        <style>
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      `;
      document.body.appendChild(this.busyOverlay);
    }

    const messageEl = this.busyOverlay.querySelector(".cloudscape-busy-message");
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
    if (!this.flashbarContainer) {
      this.flashbarContainer = document.createElement("div");
      this.flashbarContainer.id = "cloudscape-flashbar";
      this.flashbarContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
      `;
      document.body.appendChild(this.flashbarContainer);
    }

    const variantColors = {
      success: { bg: '#037f0c', border: '#037f0c' },
      error: { bg: '#d13212', border: '#d13212' },
      warning: { bg: '#8d6605', border: '#8d6605' },
      info: { bg: '#0972d3', border: '#0972d3' }
    };

    const colors = variantColors[variant];
    
    const flash = document.createElement("div");
    flash.style.cssText = `
      background: white;
      border-left: 4px solid ${colors.border};
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 16px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideIn 0.3s ease-out;
    `;
    
    flash.innerHTML = `
      <div style="width: 20px; height: 20px; border-radius: 50%; background: ${colors.bg};"></div>
      <div style="flex: 1; color: #000716; font-size: 14px;">${message}</div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      </style>
    `;

    this.flashbarContainer.appendChild(flash);

    setTimeout(() => {
      flash.style.animation = "slideOut 0.3s ease-in";
      setTimeout(() => flash.remove(), 300);
    }, duration);
  }

  showDialog<T extends string>(config: DialogConfig<T>): Promise<DialogResult<T>> {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;

      const modal = document.createElement("div");
      modal.style.cssText = `
        background: white;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        max-width: 500px;
        width: 90%;
      `;

      modal.innerHTML = `
        ${config.title ? `
          <div style="padding: 20px 24px; border-bottom: 1px solid #e9ebed;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #000716;">${config.title}</h2>
          </div>
        ` : ''}
        <div style="padding: 24px; color: #000716; font-size: 14px; line-height: 1.5;">
          ${config.message}
        </div>
        <div style="padding: 20px 24px; border-top: 1px solid #e9ebed; display: flex; gap: 8px; justify-content: flex-end;">
          ${config.buttons.map(btn => {
            const isPrimary = btn.variant === 'primary';
            return `
              <button 
                data-value="${btn.value}"
                style="
                  padding: 8px 16px;
                  border-radius: 8px;
                  border: ${isPrimary ? 'none' : '1px solid #545b64'};
                  background: ${isPrimary ? '#0972d3' : 'white'};
                  color: ${isPrimary ? 'white' : '#000716'};
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                "
                onmouseover="this.style.background='${isPrimary ? '#0761b3' : '#f2f3f3'}'"
                onmouseout="this.style.background='${isPrimary ? '#0972d3' : 'white'}'"
              >
                ${btn.label}
              </button>
            `;
          }).join('')}
        </div>
      `;

      modal.querySelectorAll("button").forEach((btn) => {
        btn.onclick = () => {
          const value = btn.getAttribute("data-value") as T;
          overlay.remove();
          resolve({ value });
        };
      });

      overlay.onclick = (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve({ value: null });
        }
      };

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
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
    
    // Import CloudScape global styles
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = 'https://unpkg.com/@cloudscape-design/global-styles@1.0.0/index.css';
    document.head.appendChild(style);
  }
}
