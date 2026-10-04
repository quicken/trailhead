import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Baseline `lib/http.ts` behaviour with a mocked `ky` — no real network. The network-error case
 * asserts that a thrown transport error (DNS failure, connection refused, etc.) is caught and
 * returned as `{ success: false }` rather than propagating. It used to hit a bogus domain and
 * wait for a real DNS failure, which made it depend on the resolver's timeout and flake (a slow
 * or captive resolver blew past vitest's 5s limit); the mock reproduces the same thrown-error
 * path deterministically and instantly.
 */
const fakeInstance = vi.fn();

vi.mock('ky', () => ({
  default: { create: vi.fn(() => fakeInstance) },
}));

import * as http from '../src/lib/http.js';

beforeEach(() => {
  fakeInstance.mockReset();
});

describe('HTTP Client', () => {
  it('initializes without errors', () => {
    expect(() => http.init('https://api.example.com')).not.toThrow();
  });

  it('handles network errors gracefully', async () => {
    http.init('https://api.example.com');
    // Simulate a transport-level failure (no `.response`) the way ky surfaces one.
    fakeInstance.mockRejectedValueOnce(
      Object.assign(new Error('Failed to fetch'), { name: 'TypeError' })
    );

    const result = await http.get('/test', { noFeedback: true });

    // Caught and returned as an error result, not thrown.
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Failed to fetch');
      expect(result.error.status).toBeUndefined();
    }
  });
});
