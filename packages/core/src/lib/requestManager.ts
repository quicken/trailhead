/**
 * Request manager - orchestrates HTTP requests with feedback
 */
import type { FeedbackAdapter } from "../adapters/types.js";

let activeRequests = 0;
const requestKeys = new Map<string, number>();
let feedbackAdapter: FeedbackAdapter | null = null;

/**
 * Initialize request manager with feedback adapter
 */
export function init(adapter: FeedbackAdapter): void {
  feedbackAdapter = adapter;
}

/**
 * Track request start
 */
export function startRequest(
  requestKey?: string,
  busyMessage?: string,
  noFeedback?: boolean
): void {
  if (noFeedback || !feedbackAdapter) return;

  if (requestKey) {
    const count = requestKeys.get(requestKey) || 0;
    requestKeys.set(requestKey, count + 1);
  }

  activeRequests++;
  if (activeRequests === 1) {
    feedbackAdapter.showBusy(busyMessage || "Loading...");
  }
}

/**
 * Track request end
 */
export function endRequest(
  requestKey?: string,
  noFeedback?: boolean
): void {
  if (noFeedback || !feedbackAdapter) return;

  if (requestKey) {
    const count = requestKeys.get(requestKey) || 0;
    if (count > 1) {
      requestKeys.set(requestKey, count - 1);
    } else {
      requestKeys.delete(requestKey);
    }
  }

  activeRequests--;
  if (activeRequests === 0) {
    feedbackAdapter.clearBusy();
  }
}

/**
 * Show success feedback
 */
export function showSuccess(message: string): void {
  if (feedbackAdapter) {
    feedbackAdapter.showToast(message, "success");
  }
}

/**
 * Show error feedback
 */
export function showError(message: string): void {
  if (feedbackAdapter) {
    feedbackAdapter.showToast(message, "error", 5000);
  }
}

/**
 * Get active request count
 */
export function getActiveRequestCount(): number {
  return activeRequests;
}

/**
 * Check if specific request is active
 */
export function isRequestActive(requestKey: string): boolean {
  return requestKeys.has(requestKey);
}
