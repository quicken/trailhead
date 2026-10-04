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

/** Base URL prepended to RELATIVE request paths only (see {@link isAbsoluteUrl}). */
let baseUrl = "";

/**
 * Origins `shell.http` may talk to besides the page's own and the `apiUrl` origin (M-3). `null`
 * means not configured: every origin is allowed (0.x compatibility) but each cross-origin target is
 * warned about once.
 */
let allowedOrigins: Set<string> | null = null;

/** Cross-origin targets already warned about in compatibility mode, so each warns only once. */
const warnedOrigins = new Set<string>();

/**
 * The origin a request URL resolves to, as the browser would resolve it from this page, or the
 * input itself when it doesn't parse (it then matches no allowed origin and fails in fetch anyway).
 */
function originOf(url: string): string {
  try {
    return new URL(url, globalThis.location?.href ?? "http://localhost/").origin;
  } catch {
    return url;
  }
}

/** The page's own origin, plus the `apiUrl` origin when `apiUrl` is absolute. */
function ownOrigins(): Set<string> {
  const own = new Set([originOf("/")]);
  if (isAbsoluteUrl(baseUrl)) own.add(originOf(baseUrl));
  return own;
}

/** Thrown-shape error for a request refused by the origin allowlist. */
function originNotAllowed(origin: string): HttpError {
  return {
    name: "OriginNotAllowedError",
    message: `Request to ${origin} blocked: origin is not in allowedOrigins`,
  };
}

/**
 * True for a URL that already names its own origin and so must NOT have `apiUrl` prepended:
 * an absolute `http(s)://…` URL or a protocol-relative `//host/…` one. Everything else is a
 * path relative to `apiUrl` (e.g. `/orders`, `orders/5`). Without this guard, ky's `prefix`
 * concatenates and a call to `shell.http.get("https://api.example.com/x")` under
 * `apiUrl: "/api"` becomes the nonsensical `/api/https://api.example.com/x`.
 */
function isAbsoluteUrl(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) || url.startsWith("//");
}

/**
 * Initialize HTTP client.
 *
 * @param apiUrl - Base URL prepended to RELATIVE request paths. Absolute URLs (`http(s)://…`)
 *   and protocol-relative URLs (`//host/…`) bypass it and are used as-is.
 * @param onRecoverSession - Optional session-recovery hook. When provided (the redirect/`cognito`
 *   strategy), a `401` triggers one recovery attempt and, on success, one retry of the original
 *   request — the first `401`'s error toast is suppressed on that auto-recovered path. Omitted
 *   for the credentials strategy, where `401`s are surfaced to the caller and apps call
 *   `shell.auth.reauthenticate` themselves. Backward compatible: a call with only `apiUrl`
 *   installs no recovery and behaves exactly as before.
 * @param origins - Validated `scheme://host[:port]` origins requests may also go to. When given,
 *   any other cross-origin request is refused before it is sent; `null` keeps the 0.x behaviour
 *   (all origins, warned once each). 401 recovery only runs for own and listed origins either way.
 */
export function init(
  apiUrl: string = "",
  onRecoverSession: (() => Promise<boolean>) | null = null,
  origins: string[] | null = null
): void {
  baseUrl = apiUrl;
  recoverSession = onRecoverSession;
  allowedOrigins = origins ? new Set(origins) : null;
  warnedOrigins.clear();
  kyInstance = ky.create({
    timeout: 30000,
    retry: 0,
  });
}

/** Methods whose request body (`data`) is sent as JSON. */
function sendsJsonBody(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH";
}

/** Assembles the ky request options, attaching a JSON body only for the methods that carry one. */
function buildKyOptions(method: string, data: any, headers: Record<string, string>): Options {
  const kyOptions: Options = { method, headers };
  if (data && sendsJsonBody(method)) {
    kyOptions.json = data;
  }
  return kyOptions;
}

/**
 * Builds the normalised {@link HttpError} from a thrown ky error, reading the response body as
 * JSON for a richer `message`/`data` when the response carries one.
 */
async function buildError(err: any): Promise<HttpError> {
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
      // Response not JSON — keep the ky-derived message.
    }
  }

  return error;
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
  const { requestKey, busyMessage, successMessage, showSuccess = false, noFeedback = false, headers = {} } = options;

  // Prepend the configured base to RELATIVE paths only; absolute/protocol-relative URLs are
  // used verbatim so they never get mangled into `${apiUrl}/https://…`.
  const resolvedUrl = isAbsoluteUrl(url) ? url : `${baseUrl}${url}`;

  // Origin allowlist (M-3): own origins always pass; listed origins pass; anything else is refused
  // when an allowlist is configured, or let through with a one-time warning when it isn't.
  const origin = originOf(resolvedUrl);
  const trusted = ownOrigins().has(origin) || (allowedOrigins?.has(origin) ?? false);
  if (!trusted) {
    if (allowedOrigins) {
      const error = originNotAllowed(origin);
      if (!noFeedback) requestManager.showError(error.message);
      return { success: false, error, requestKey } as ErrorResult;
    }
    if (!warnedOrigins.has(origin)) {
      warnedOrigins.add(origin);
      console.warn(`[Trailhead] shell.http request to ${origin}, which is not in allowedOrigins. Add it to shell.json "allowedOrigins" — unlisted origins will be refused once an allowlist is set.`);
    }
  }

  // On a 401, if a recovery strategy is configured and this is the first attempt, suppress this
  // attempt's error feedback — we're about to try to recover and retry, so a transient 401 toast
  // would be noise. The retry (or a genuine post-recovery failure) handles feedback normally.
  // Only own/listed origins may trigger recovery, never one let through by compatibility mode.
  const canRecover = recoverSession !== null && !isRetry && trusted;

  requestManager.startRequest(requestKey, busyMessage, noFeedback);
  try {
    const response = await kyInstance(resolvedUrl, buildKyOptions(method, data, headers));
    const result = await response.json<T>();

    if (!noFeedback && showSuccess && successMessage) {
      requestManager.showSuccess(successMessage);
    }

    return { success: true, data: result, requestKey } as SuccessResult<T>;
  } catch (err: any) {
    const error = await buildError(err);

    // Auto-recovery: a 401 under a configured recovery strategy gets exactly one recovery +
    // retry. The single retry runs with recovery disabled (isRetry = true) so it can never loop.
    if (error.status === 401 && canRecover && recoverSession && (await recoverSession())) {
      return request<T>(method, url, data, options, true);
    }
    // recoverSession() resolving false means it could not recover without a redirect and did not
    // navigate; fall through and surface the original 401 to the caller.

    // Suppress feedback for the first 401 on an auto-recovered path (we attempted recovery just
    // above); every other failure shows the error toast as before unless feedback is disabled.
    if (!noFeedback && !(error.status === 401 && canRecover)) {
      requestManager.showError(error.message);
    }

    return { success: false, error, requestKey } as ErrorResult;
  } finally {
    requestManager.endRequest(requestKey, noFeedback);
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
