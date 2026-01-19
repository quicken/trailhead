/**
 * HTTP client using ky with automatic feedback orchestration
 */
import ky, { type KyInstance, type Options } from "ky";
import type { RequestOptions, Result, HttpError, SuccessResult, ErrorResult } from "../types/shell-api";
import * as requestManager from "./requestManager";

let kyInstance: KyInstance;

/**
 * Initialize HTTP client
 */
export function init(baseUrl: string = ""): void {
  kyInstance = ky.create({
    prefixUrl: baseUrl,
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
  options: RequestOptions = {}
): Promise<Result<T>> {
  const {
    requestKey,
    busyMessage,
    successMessage,
    showSuccess = false,
    noFeedback = false,
    headers = {},
  } = options;

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

    if (!noFeedback) {
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
