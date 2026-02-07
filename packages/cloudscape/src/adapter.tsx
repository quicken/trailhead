/**
 * CloudScape Design System Adapter
 * Uses CloudScape Flashbar, Modal, and Spinner components
 */
import type { DesignSystemAdapter, FeedbackAdapter, DialogConfig, DialogResult, ToastVariant } from '@herdingbits/trailhead-types/adapters';

interface FlashMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  content: string;
  dismissible: boolean;
}

class CloudScapeFeedbackAdapter implements FeedbackAdapter {
  private flashMessages: FlashMessage[] = [];
  private onFlashChange?: (messages: FlashMessage[]) => void;
  private busyMessage: string = '';
  private onBusyChange?: (message: string) => void;

  setFlashChangeHandler(handler: (messages: FlashMessage[]) => void) {
    this.onFlashChange = handler;
  }

  setBusyChangeHandler(handler: (message: string) => void) {
    this.onBusyChange = handler;
  }

  showBusy(message: string): void {
    this.busyMessage = message;
    this.onBusyChange?.(message);
  }

  clearBusy(): void {
    this.busyMessage = '';
    this.onBusyChange?.('');
  }

  showToast(message: string, variant: ToastVariant, duration: number = 3000): void {
    const id = `flash-${Date.now()}`;
    const flash: FlashMessage = {
      id,
      type: variant,
      content: message,
      dismissible: true,
    };

    this.flashMessages.push(flash);
    this.onFlashChange?.([...this.flashMessages]);

    if (duration > 0) {
      setTimeout(() => {
        this.flashMessages = this.flashMessages.filter(f => f.id !== id);
        this.onFlashChange?.([...this.flashMessages]);
      }, duration);
    }
  }

  dismissFlash(id: string): void {
    this.flashMessages = this.flashMessages.filter(f => f.id !== id);
    this.onFlashChange?.([...this.flashMessages]);
  }

  async showDialog<T extends string>(config: DialogConfig<T>): Promise<DialogResult<T>> {
    // Modal dialogs handled by React component
    return new Promise((resolve) => {
      const event = new CustomEvent('cloudscape-dialog', {
        detail: { config, resolve }
      });
      window.dispatchEvent(event);
    });
  }

  async initAdapter(): Promise<void> {
    // No initialization needed
  }
}

export class CloudScapeAdapter implements DesignSystemAdapter {
  name = 'cloudscape';
  version = '3.0.0';
  feedback: FeedbackAdapter;

  constructor() {
    this.feedback = new CloudScapeFeedbackAdapter();
  }

  async init(basePath: string): Promise<void> {
    // CloudScape styles loaded via global-styles package
  }
}
