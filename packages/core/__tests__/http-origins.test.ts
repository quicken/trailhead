// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * M-3: `shell.http` is scoped to an origin allowlist. With `allowedOrigins` configured, a request to
 * an unlisted origin is refused before it is sent; without it (0.x compatibility) requests go out but
 * each cross-origin target is warned about once. The page's own origin and an absolute `apiUrl`'s
 * origin are always allowed, and 401 recovery only ever runs for own/listed origins. `ky` is mocked;
 * jsdom's page origin is `http://localhost:3000`.
 */
const outcomes: Array<{ kind: 'ok' } | { kind: 'status'; status: number }> = [];

function httpError(status: number) {
  const err = new Error(`HTTP ${status}`) as Error & { response: { status: number; json: () => Promise<unknown> } };
  err.name = 'HTTPError';
  err.response = { status, json: async () => ({ message: `error ${status}` }) };
  return err;
}

const fakeInstance = vi.fn(async (_url: string) => {
  const next = outcomes.shift() ?? { kind: 'ok' };
  if (next.kind === 'status') throw httpError(next.status);
  return { json: async () => ({ ok: true }) } as unknown as Response;
});

vi.mock('ky', () => ({
  default: { create: vi.fn(() => fakeInstance) },
}));

import * as http from '../src/lib/http.js';

const PAGE_ORIGIN = 'http://localhost:3000';
const sentUrls = () => fakeInstance.mock.calls.map(([url]) => url);

beforeEach(() => {
  outcomes.length = 0;
  fakeInstance.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('allowedOrigins not configured (0.x compatibility)', () => {
  it('still sends a cross-origin request', async () => {
    http.init('/api');

    const result = await http.get('https://third-party.example/data', { noFeedback: true });

    expect(result.success).toBe(true);
    expect(sentUrls()).toEqual(['https://third-party.example/data']);
  });

  it('warns once per cross-origin target, naming the origin', async () => {
    http.init('/api');

    await http.get('https://third-party.example/a', { noFeedback: true });
    await http.get('https://third-party.example/b', { noFeedback: true });
    await http.get('https://other.example/c', { noFeedback: true });

    expect(console.warn).toHaveBeenCalledTimes(2);
    expect(String(vi.mocked(console.warn).mock.calls[0])).toContain('https://third-party.example');
    expect(String(vi.mocked(console.warn).mock.calls[1])).toContain('https://other.example');
  });

  it('does not warn for same-origin requests or the apiUrl origin', async () => {
    http.init('https://api.example.com');

    await http.get('/orders', { noFeedback: true });
    await http.get(`${PAGE_ORIGIN}/health`, { noFeedback: true });
    await http.get('https://api.example.com/users', { noFeedback: true });

    expect(console.warn).not.toHaveBeenCalled();
    expect(fakeInstance).toHaveBeenCalledTimes(3);
  });
});

describe('allowedOrigins configured', () => {
  it('sends a request to a listed origin', async () => {
    http.init('/api', null, ['https://api.example.com']);

    const result = await http.get('https://api.example.com/users', { noFeedback: true });

    expect(result.success).toBe(true);
    expect(sentUrls()).toEqual(['https://api.example.com/users']);
  });

  it('refuses an unlisted origin without sending it, returning OriginNotAllowedError', async () => {
    http.init('/api', null, ['https://api.example.com']);

    const result = await http.get('https://evil.example/collect', { noFeedback: true });

    expect(fakeInstance).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('OriginNotAllowedError');
      expect(result.error.message).toContain('https://evil.example');
    }
  });

  it.each([
    ['a protocol-relative URL', '//evil.example/collect'],
    ['a look-alike host', 'https://api.example.com.evil.net/x'],
    ['a scheme downgrade', 'http://api.example.com/x'],
    ['a different port', 'https://api.example.com:8443/x'],
    ['a subdomain', 'https://eu.api.example.com/x'],
  ])('refuses %s of a listed origin', async (_case, url) => {
    http.init('/api', null, ['https://api.example.com']);

    const result = await http.get(url, { noFeedback: true });

    expect(fakeInstance).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it('always allows the page origin and the apiUrl origin, listed or not', async () => {
    http.init('https://api.example.com', null, ['https://reports.example.com']);

    await http.get('/orders', { noFeedback: true });
    await http.get(`${PAGE_ORIGIN}/health`, { noFeedback: true });
    await http.get('https://api.example.com/users', { noFeedback: true });
    await http.get('https://reports.example.com/daily', { noFeedback: true });

    expect(sentUrls()).toEqual([
      'https://api.example.com/orders',
      `${PAGE_ORIGIN}/health`,
      'https://api.example.com/users',
      'https://reports.example.com/daily',
    ]);
  });

  it('does not warn when a cross-origin request is listed', async () => {
    http.init('/api', null, ['https://api.example.com']);

    await http.get('https://api.example.com/users', { noFeedback: true });

    expect(console.warn).not.toHaveBeenCalled();
  });

  it('shows the refusal as an error toast unless feedback is disabled', async () => {
    const requestManager = await import('../src/lib/requestManager.js');
    const showError = vi.spyOn(requestManager, 'showError').mockImplementation(() => {});
    http.init('/api', null, ['https://api.example.com']);

    await http.get('https://evil.example/x');
    await http.get('https://evil.example/y', { noFeedback: true });

    expect(showError).toHaveBeenCalledTimes(1);
  });
});

describe('401 recovery is scoped to own and listed origins', () => {
  it('does not run recovery for a 401 from an origin let through only by compatibility mode', async () => {
    const recover = vi.fn(async () => true);
    http.init('/api', recover);
    outcomes.push({ kind: 'status', status: 401 });

    const result = await http.get('https://third-party.example/x', { noFeedback: true });

    expect(recover).not.toHaveBeenCalled();
    expect(fakeInstance).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
  });

  it('runs recovery for a 401 from a listed origin', async () => {
    const recover = vi.fn(async () => true);
    http.init('/api', recover, ['https://api.example.com']);
    outcomes.push({ kind: 'status', status: 401 }, { kind: 'ok' });

    const result = await http.get('https://api.example.com/users', { noFeedback: true });

    expect(recover).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it('runs recovery for a 401 from the absolute apiUrl origin', async () => {
    const recover = vi.fn(async () => true);
    http.init('https://api.example.com', recover);
    outcomes.push({ kind: 'status', status: 401 }, { kind: 'ok' });

    const result = await http.get('/users', { noFeedback: true });

    expect(recover).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });
});
