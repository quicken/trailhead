import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Drives `lib/http.ts`'s 401 auto-recovery by mocking `ky` so each request's outcome is scripted.
 * `ky.create()` returns our fake instance; each call to it shifts the next scripted outcome.
 */
const outcomes: Array<{ kind: 'ok'; body: unknown } | { kind: 'status'; status: number }> = [];

/** Builds a ky-style HTTPError whose `.response.status` the client reads. */
function httpError(status: number): Error & { response: { status: number; json: () => Promise<unknown> } } {
  const err = new Error(`HTTP ${status}`) as Error & {
    response: { status: number; json: () => Promise<unknown> };
  };
  err.name = 'HTTPError';
  err.response = { status, json: async () => ({ message: `error ${status}` }) };
  return err;
}

const fakeInstance = vi.fn(async () => {
  const next = outcomes.shift();
  if (!next) throw new Error('no scripted outcome');
  if (next.kind === 'status') throw httpError(next.status);
  return { json: async () => next.body } as unknown as Response;
});

vi.mock('ky', () => ({
  default: { create: vi.fn(() => fakeInstance) },
}));

import * as http from '../src/lib/http.js';

beforeEach(() => {
  outcomes.length = 0;
  fakeInstance.mockClear();
});

describe('http 401 auto-recovery (cognito/redirect strategy)', () => {
  it('on 401, invokes recovery once and retries the request a single time', async () => {
    const recover = vi.fn(async () => true);
    http.init('', recover);

    outcomes.push({ kind: 'status', status: 401 }); // first attempt
    outcomes.push({ kind: 'ok', body: { ok: true } }); // retry succeeds

    const result = await http.get<{ ok: boolean }>('/orders');

    expect(recover).toHaveBeenCalledTimes(1);
    expect(fakeInstance).toHaveBeenCalledTimes(2); // original + one retry
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ ok: true });
  });

  it('does not loop: a 401 on the retry is surfaced, recovery runs only once', async () => {
    const recover = vi.fn(async () => true);
    http.init('', recover);

    outcomes.push({ kind: 'status', status: 401 }); // first attempt
    outcomes.push({ kind: 'status', status: 401 }); // retry still 401

    const result = await http.get('/orders');

    expect(recover).toHaveBeenCalledTimes(1);
    expect(fakeInstance).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.status).toBe(401);
  });

  it('when recovery redirects (resolves false), surfaces the original 401 without retrying', async () => {
    const recover = vi.fn(async () => false); // redirect path: no in-place refresh
    http.init('', recover);

    outcomes.push({ kind: 'status', status: 401 });

    const result = await http.get('/orders');

    expect(recover).toHaveBeenCalledTimes(1);
    expect(fakeInstance).toHaveBeenCalledTimes(1); // no retry
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.status).toBe(401);
  });

  it('does not engage recovery for a non-401 error', async () => {
    const recover = vi.fn(async () => true);
    http.init('', recover);

    outcomes.push({ kind: 'status', status: 500 });

    const result = await http.get('/orders');

    expect(recover).not.toHaveBeenCalled();
    expect(fakeInstance).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
  });
});

describe('http credentials strategy (no recovery hook)', () => {
  it('surfaces a 401 untouched and never retries when no recovery is configured', async () => {
    http.init(''); // no hook — credentials strategy / backward compatible

    outcomes.push({ kind: 'status', status: 401 });

    const result = await http.get('/orders');

    expect(fakeInstance).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.status).toBe(401);
  });
});
