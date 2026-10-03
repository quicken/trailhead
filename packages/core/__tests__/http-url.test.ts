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
  it('prepends apiUrl to a relative path', async () => {
    http.init('/api');
    await http.get('/orders');
    expect(fakeInstance).toHaveBeenCalledWith('/api/orders', expect.anything());
  });

  it('leaves an absolute https URL untouched (no apiUrl prefix)', async () => {
    http.init('/api');
    await http.get('https://jsonplaceholder.typicode.com/users/1');
    expect(fakeInstance).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/users/1', expect.anything());
  });

  it('leaves a protocol-relative URL untouched', async () => {
    http.init('/api');
    await http.get('//cdn.example.com/data.json');
    expect(fakeInstance).toHaveBeenCalledWith('//cdn.example.com/data.json', expect.anything());
  });

  it('with an empty apiUrl, a relative path is used as-is', async () => {
    http.init('');
    await http.get('/orders');
    expect(fakeInstance).toHaveBeenCalledWith('/orders', expect.anything());
  });
});
