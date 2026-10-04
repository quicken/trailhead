import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Covers `lib/http.ts` paths the url/recovery suites don't exercise: the verb wrappers
 * (`post`/`put`/`patch`/`del`) and the JSON-body attachment, the success-feedback branch
 * (`showSuccess` + `successMessage`), and both error-body branches (JSON `message` extraction
 * vs a non-JSON response body). `ky` and the feedback request-manager are mocked so we assert
 * on the exact calls the client makes.
 */
const fakeInstance = vi.fn();

vi.mock('ky', () => ({
  default: { create: vi.fn(() => fakeInstance) },
}));

const showSuccess = vi.fn();
const showError = vi.fn();
const startRequest = vi.fn();
const endRequest = vi.fn();

vi.mock('../src/lib/requestManager.js', () => ({
  init: vi.fn(),
  startRequest: (...a: unknown[]) => startRequest(...a),
  endRequest: (...a: unknown[]) => endRequest(...a),
  showSuccess: (...a: unknown[]) => showSuccess(...a),
  showError: (...a: unknown[]) => showError(...a),
}));

import * as http from '../src/lib/http.js';

/** A ky-style HTTPError whose `.response.json()` yields `body` (or throws for a non-JSON body). */
function httpError(status: number, body: unknown | 'not-json'): Error & { response: unknown } {
  const err = new Error(`HTTP ${status}`) as Error & { response: unknown };
  err.name = 'HTTPError';
  err.response = {
    status,
    json: async () => {
      if (body === 'not-json') throw new SyntaxError('Unexpected token');
      return body;
    },
  };
  return err;
}

beforeEach(() => {
  fakeInstance.mockReset();
  showSuccess.mockClear();
  showError.mockClear();
  startRequest.mockClear();
  endRequest.mockClear();
  http.init('/api');
});

describe('http verb wrappers', () => {
  beforeEach(() => {
    fakeInstance.mockResolvedValue({ json: async () => ({ ok: true }) } as unknown as Response);
  });

  it('post attaches a JSON body and resolves success', async () => {
    const result = await http.post('/orders', { item: 1 });
    expect(fakeInstance).toHaveBeenCalledWith('/api/orders', expect.objectContaining({ method: 'POST', json: { item: 1 } }));
    expect(result.success).toBe(true);
  });

  it('put attaches a JSON body', async () => {
    await http.put('/orders/1', { item: 2 });
    expect(fakeInstance).toHaveBeenCalledWith('/api/orders/1', expect.objectContaining({ method: 'PUT', json: { item: 2 } }));
  });

  it('patch attaches a JSON body', async () => {
    await http.patch('/orders/1', { item: 3 });
    expect(fakeInstance).toHaveBeenCalledWith('/api/orders/1', expect.objectContaining({ method: 'PATCH', json: { item: 3 } }));
  });

  it('delete sends no body', async () => {
    await http.del('/orders/1');
    const [, opts] = fakeInstance.mock.calls[0];
    expect(opts.method).toBe('DELETE');
    expect(opts).not.toHaveProperty('json');
  });
});

describe('http success feedback', () => {
  beforeEach(() => {
    fakeInstance.mockResolvedValue({ json: async () => ({ ok: true }) } as unknown as Response);
  });

  it('shows a success toast when showSuccess + successMessage are set', async () => {
    await http.get('/orders', { showSuccess: true, successMessage: 'Saved' });
    expect(showSuccess).toHaveBeenCalledWith('Saved');
  });

  it('shows no success toast under noFeedback even with showSuccess', async () => {
    await http.get('/orders', { showSuccess: true, successMessage: 'Saved', noFeedback: true });
    expect(showSuccess).not.toHaveBeenCalled();
  });

  it('always calls endRequest (success path)', async () => {
    await http.get('/orders');
    expect(startRequest).toHaveBeenCalledTimes(1);
    expect(endRequest).toHaveBeenCalledTimes(1);
  });
});

describe('http error-body parsing', () => {
  it('lifts the server JSON message into error.message and shows it', async () => {
    fakeInstance.mockRejectedValue(httpError(400, { message: 'Bad order' }));
    const result = await http.get('/orders');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Bad order');
      expect(result.error.status).toBe(400);
    }
    expect(showError).toHaveBeenCalledWith('Bad order');
  });

  it('keeps the ky message when the error body is not JSON', async () => {
    fakeInstance.mockRejectedValue(httpError(500, 'not-json'));
    const result = await http.get('/orders');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toBe('HTTP 500');
    expect(showError).toHaveBeenCalledWith('HTTP 500');
  });

  it('suppresses the error toast under noFeedback', async () => {
    fakeInstance.mockRejectedValue(httpError(500, { message: 'boom' }));
    await http.get('/orders', { noFeedback: true });
    expect(showError).not.toHaveBeenCalled();
  });

  it('calls endRequest on the error path too', async () => {
    fakeInstance.mockRejectedValue(httpError(500, { message: 'boom' }));
    await http.get('/orders');
    expect(endRequest).toHaveBeenCalledTimes(1);
  });
});
