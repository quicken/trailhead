/**
 * Web Awesome Design System Adapter
 */
import type { DesignSystemAdapter, FeedbackAdapter, DialogConfig, DialogResult, ToastVariant, AuthAdapter, Credentials, CredentialPromptHandle } from '@herdingbits/trailhead-types/adapters';

const TOAST_ICONS: Record<ToastVariant, string> = {
  success: "circle-check",
  error: "circle-exclamation",
  warning: "triangle-exclamation",
  info: "circle-info",
};

// wa-callout has no "error"/"info" variant — map onto its brand/danger vocabulary.
function toastCalloutVariant(variant: ToastVariant): "brand" | "success" | "warning" | "danger" {
  if (variant === "error") return "danger";
  if (variant === "info") return "brand";
  return variant;
}

// DialogButton.variant is a free-form string set by callers (only "primary"/"secondary" are
// used anywhere in practice); map it onto wa-button's variant/appearance vocabulary.
function dialogButtonAppearance(variant?: string): { variant: string; appearance: string } {
  if (variant === "primary") return { variant: "brand", appearance: "filled" };
  if (variant === "secondary") return { variant: "neutral", appearance: "outlined" };
  return { variant: "neutral", appearance: "plain" };
}

// Toast/dialog/auth-error text below is interpolated into innerHTML template literals rather
// than set via textContent, because it sits alongside real markup (icons, buttons). Escape it
// so caller-supplied text — a message string a caller built from a server error response, say —
// can never be parsed as an element or attribute rather than displayed as the text it is.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

class WebAwesomeFeedbackAdapter implements FeedbackAdapter {
  private busyDialog: (HTMLElement & { open: boolean }) | null = null;
  private busyActive = false;
  private toastContainer: HTMLElement | null = null;

  showBusy(message: string): void {
    if (!this.busyDialog) {
      const dialog = document.createElement("wa-dialog") as HTMLElement & { open: boolean };
      dialog.setAttribute("without-header", "");
      dialog.className = "shell-busy-dialog";
      dialog.innerHTML = `
        <div class="shell-busy-content">
          <wa-spinner></wa-spinner>
          <div class="shell-busy-message"></div>
        </div>
      `;
      // Busy is a blocking state — Escape (or any other close trigger) must not dismiss it
      // early; only our own clearBusy() call is allowed to close it. See "Preventing the
      // Dialog from Closing" in the wa-dialog docs.
      dialog.addEventListener("wa-hide", (e) => {
        if (this.busyActive) e.preventDefault();
      });
      document.body.appendChild(dialog);
      this.busyDialog = dialog;
    }

    const messageEl = this.busyDialog.querySelector(".shell-busy-message");
    if (messageEl) {
      messageEl.textContent = message;
    }
    this.busyActive = true;
    this.busyDialog.open = true;
  }

  clearBusy(): void {
    this.busyActive = false;
    if (this.busyDialog) {
      this.busyDialog.open = false;
    }
  }

  showToast(message: string, variant: ToastVariant, duration: number = 3000): void {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement("div");
      this.toastContainer.id = "shell-toast-container";
      document.body.appendChild(this.toastContainer);
    }

    const toast = document.createElement("wa-callout");
    toast.setAttribute("variant", toastCalloutVariant(variant));
    toast.setAttribute("appearance", "filled");
    toast.className = "shell-toast";
    // "solid" (the default) is the only style free Font Awesome kits are guaranteed to carry —
    // "regular"/"light"/"thin" are Pro-only and 403 silently on a free kit.
    toast.innerHTML = `<wa-icon slot="icon" name="${TOAST_ICONS[variant]}"></wa-icon>${escapeHtml(message)}`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add("shell-toast-show"), 10);
    setTimeout(() => {
      toast.classList.remove("shell-toast-show");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  showDialog<T extends string>(config: DialogConfig<T>): Promise<DialogResult<T>> {
    return new Promise((resolve) => {
      let settled = false;

      const dialog = document.createElement("wa-dialog") as HTMLElement & { open: boolean };
      if (config.title) {
        dialog.setAttribute("label", config.title);
      } else {
        dialog.setAttribute("without-header", "");
      }
      dialog.setAttribute("light-dismiss", "");
      dialog.className = "shell-dialog";
      dialog.innerHTML = `
        <p class="shell-dialog-message">${escapeHtml(config.message)}</p>
        ${config.buttons
          .map((btn) => {
            const { variant, appearance } = dialogButtonAppearance(btn.variant);
            return `<wa-button slot="footer" variant="${variant}" appearance="${appearance}" data-value="${escapeHtml(btn.value)}">${escapeHtml(btn.label)}</wa-button>`;
          })
          .join("")}
      `;

      const settleOnce = (value: T | null) => {
        if (settled) return;
        settled = true;
        resolve({ value });
        dialog.open = false;
      };

      dialog.addEventListener("wa-after-hide", () => dialog.remove());
      // Escape, the header close button, and light-dismiss all fire wa-hide — treat as no selection.
      dialog.addEventListener("wa-hide", () => settleOnce(null));

      dialog.querySelectorAll("wa-button[data-value]").forEach((btn) => {
        btn.addEventListener("click", () => settleOnce(btn.getAttribute("data-value") as T));
      });

      document.body.appendChild(dialog);
      dialog.open = true;
    });
  }
}

class WebAwesomeAuthAdapter implements AuthAdapter {
  promptCredentials(errorMessage?: string): CredentialPromptHandle {
    let settle!: (value: Credentials | null) => void;
    const result = new Promise<Credentials | null>((resolve) => {
      settle = resolve;
    });
    let settled = false;

    const formId = `shell-auth-form-${Math.random().toString(36).slice(2)}`;

    const dialog = document.createElement("wa-dialog") as HTMLElement & { open: boolean };
    dialog.setAttribute("label", "Session Expired");
    dialog.setAttribute("light-dismiss", "");
    dialog.className = "shell-auth-dialog";
    dialog.innerHTML = `
      <p class="shell-auth-message">Sign in to continue where you left off.</p>
      ${errorMessage
        ? `<wa-callout variant="danger" size="small" class="shell-auth-error">
             <wa-icon slot="icon" name="circle-exclamation"></wa-icon>
             ${escapeHtml(errorMessage)}
           </wa-callout>`
        : ""}
      <form id="${formId}" class="shell-auth-form">
        <wa-input name="username" label="Username" autocomplete="username" autofocus required></wa-input>
        <wa-input name="password" type="password" label="Password" autocomplete="current-password" password-toggle required></wa-input>
      </form>
      <wa-button slot="footer" appearance="outlined" data-action="cancel">Cancel</wa-button>
      <wa-button slot="footer" variant="brand" appearance="filled" type="submit" form="${formId}">Sign In</wa-button>
    `;

    const settleOnce = (value: Credentials | null) => {
      if (settled) return;
      settled = true;
      settle(value);
      dialog.open = false;
    };

    // wa-dialog owns its own close animation; only remove the element once it's finished.
    dialog.addEventListener("wa-after-hide", () => dialog.remove());
    // Escape, the header close button, and light-dismiss all fire wa-hide — treat every one as cancel.
    dialog.addEventListener("wa-hide", () => settleOnce(null));

    const form = dialog.querySelector("form") as HTMLFormElement;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      settleOnce({
        username: String(data.get("username") ?? ""),
        password: String(data.get("password") ?? ""),
      });
    });

    dialog.querySelector('[data-action="cancel"]')?.addEventListener("click", () => settleOnce(null));

    document.body.appendChild(dialog);
    dialog.open = true;
    requestAnimationFrame(() => {
      (dialog.querySelector('wa-input[name="username"]') as (HTMLElement & { focus(): void }) | null)?.focus();
    });

    return {
      result,
      close: () => settleOnce(null),
    };
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
  auth: AuthAdapter;
  private readonly config?: WebAwesomeAdapterConfig;

  constructor(config?: WebAwesomeAdapterConfig) {
    this.config = config;
    this.feedback = new WebAwesomeFeedbackAdapter();
    this.auth = new WebAwesomeAuthAdapter();
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
