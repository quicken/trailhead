/**
 * HTTP client using ky with automatic feedback orchestration
 */
import ky, { type KyInstance, type Options } from "ky";
import type { RequestOptions, Result, HttpError, SuccessResult, ErrorResult } from "../types/shell-api";
import * as requestManager from "./requestManager.js";

let kyInstance: KyInstance;

/**
 * Recovery hook invoked once on a `401` before a single retry. Set by {@link init} from the
 * shell's configured auth strategy. Returns `true` when the session was recovered in place and
 * the request should be retried; `false`/never-returns otherwise (e.g. a redirect strategy that
 * navigated away). `null` means no recovery is configured (the credentials strategy, or none),
 * in which case a `401` is surfaced to the caller unchanged — apps recover explicitly via
 * `shell.auth.reauthenticate`.
 */
let recoverSession: (() => Promise<boolean>) | null = null;

/**
 * Initialize HTTP client.
 *
 * @param baseUrl - Prefix prepended to every request URL.
 * @param onRecoverSession - Optional session-recovery hook. When provided (the redirect/`cognito`
 *   strategy), a `401` triggers one recovery attempt and, on success, one retry of the original
 *   request — the first `401`'s error toast is suppressed on that auto-recovered path. Omitted
 *   for the credentials strategy, where `401`s are surfaced to the caller and apps call
 *   `shell.auth.reauthenticate` themselves. Backward compatible: a call with only `baseUrl`
 *   installs no recovery and behaves exactly as before.
 */
export function init(baseUrl: string = "", onRecoverSession: (() => Promise<boolean>) | null = null): void {
  recoverSession = onRecoverSession;
  kyInstance = ky.create({
    prefix: baseUrl,
    timeout: 30000,
    retry: 0,
  });
}

/**
 * Make HTTP request with feedback orchestration
 */
async function request<T>(
  method: string,
  url: string,
  data?: any,
  options: RequestOptions = {},
  isRetry = false
): Promise<Result<T>> {
  const {
    requestKey,
    busyMessage,
    successMessage,
    showSuccess = false,
    noFeedback = false,
    headers = {},
  } = options;

  // On a 401, if a recovery strategy is configured and this is the first attempt, suppress this
  // attempt's error feedback — we're about to try to recover and retry, so a transient 401 toast
  // would be noise. The retry (or a genuine post-recovery failure) handles feedback normally.
  const canRecover = recoverSession !== null && !isRetry;

  try {
    requestManager.startRequest(requestKey, busyMessage, noFeedback);

    const kyOptions: Options = {
      method,
      headers,
    };

    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      kyOptions.json = data;
    }

    const response = await kyInstance(url, kyOptions);
    const result = await response.json<T>();

    requestManager.endRequest(requestKey, noFeedback);

    if (!noFeedback && showSuccess && successMessage) {
      requestManager.showSuccess(successMessage);
    }

    return {
      success: true,
      data: result,
      requestKey,
    } as SuccessResult<T>;
  } catch (err: any) {
    requestManager.endRequest(requestKey, noFeedback);

    const error: HttpError = {
      name: err.name || "HttpError",
      message: err.message || "Request failed",
      status: err.response?.status,
    };

    if (err.response) {
      try {
        error.data = await err.response.json();
        error.message = error.data.message || error.message;
      } catch {
        // Response not JSON
      }
    }

    // Auto-recovery: a 401 under a configured recovery strategy gets exactly one recovery +
    // retry. We suppress this first 401's toast; the single retry runs with recovery disabled
    // (isRetry = true) so it can never loop.
    if (error.status === 401 && canRecover && recoverSession) {
      const recovered = await recoverSession();
      if (recovered) {
        return request<T>(method, url, data, options, true);
      }
      // recoverSession() resolving false means it could not recover without a redirect and
      // did not navigate; fall through and surface the original 401 to the caller.
    }

    // Suppress feedback for the first 401 on an auto-recovered path (we attempted recovery just
    // above); every other failure shows the error toast as before unless feedback is disabled.
    const suppressFeedback = noFeedback || (error.status === 401 && canRecover);
    if (!suppressFeedback) {
      requestManager.showError(error.message);
    }

    return {
      success: false,
      error,
      requestKey,
    } as ErrorResult;
  }
}

/**
 * GET request
 */
export function get<T>(url: string, options?: RequestOptions): Promise<Result<T>> {
  return request<T>("GET", url, undefined, options);
}

/**
 * POST request
 */
export function post<T>(
  url: string,
  data?: any,
  options?: RequestOptions
): Promise<Result<T>> {
  return request<T>("POST", url, data, options);
}

/**
 * PUT request
 */
export function put<T>(
  url: string,
  data?: any,
  options?: RequestOptions
): Promise<Result<T>> {
  return request<T>("PUT", url, data, options);
}

/**
 * PATCH request
 */
export function patch<T>(
  url: string,
  data?: any,
  options?: RequestOptions
): Promise<Result<T>> {
  return request<T>("PATCH", url, data, options);
}

/**
 * DELETE request
 */
export function del<T>(url: string, options?: RequestOptions): Promise<Result<T>> {
  return request<T>("DELETE", url, undefined, options);
}
