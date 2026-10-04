import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Verifies `lib/http.ts` prepends the configured `apiUrl` to RELATIVE paths only, and leaves
 * absolute / protocol-relative URLs verbatim — so `apiUrl: "/api"` never mangles an absolute URL
 * into `/api/https://…`. `ky` is mocked; we assert the exact URL the client hands to it.
 */
const fakeInstance = vi.fn(async () => ({ json: async () => ({ ok: true }) }) as unknown as Response);

vi.mock('ky', () => ({
  default: { create: vi.fn(() => fakeInstance) },
}));

import * as http from '../src/lib/http.js';

beforeEach(() => {
  fakeInstance.mockClear();
});

describe('http URL resolution (apiUrl prefix)', () => {
  it.each([
    ['prepends apiUrl to a relative path', '/api', '/orders', '/api/orders'],
    ['leaves an absolute https URL untouched (no apiUrl prefix)', '/api', 'https://jsonplaceholder.typicode.com/users/1', 'https://jsonplaceholder.typicode.com/users/1'],
    ['leaves a protocol-relative URL untouched', '/api', '//cdn.example.com/data.json', '//cdn.example.com/data.json'],
    ['with an empty apiUrl, a relative path is used as-is', '', '/orders', '/orders'],
  ])('%s', async (_name, apiUrl, requestUrl, expectedUrl) => {
    http.init(apiUrl);
    await http.get(requestUrl);
    expect(fakeInstance).toHaveBeenCalledWith(expectedUrl, expect.anything());
  });
});
