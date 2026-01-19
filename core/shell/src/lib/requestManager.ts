/**
 * Request manager - orchestrates HTTP requests with feedback
 */
import * as feedback from "./feedback";

let activeRequests = 0;
const requestKeys = new Map<string, number>();

/**
 * Track request start
 */
export function startRequest(
  requestKey?: string,
  busyMessage?: string,
  noFeedback?: boolean
): void {
  if (noFeedback) return;

  if (requestKey) {
    const count = requestKeys.get(requestKey) || 0;
    requestKeys.set(requestKey, count + 1);
  }

  activeRequests++;
  if (activeRequests === 1) {
    feedback.busy(busyMessage || "Loading...");
  }
}

/**
 * Track request end
 */
export function endRequest(
  requestKey?: string,
  noFeedback?: boolean
): void {
  if (noFeedback) return;

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
    feedback.clear();
  }
}

/**
 * Show success feedback
 */
export function showSuccess(message: string): void {
  feedback.success(message);
}

/**
 * Show error feedback
 */
export function showError(message: string): void {
  feedback.error(message);
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
