import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CloudScapeAdapter } from '../src/adapter.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CloudScapeFeedbackAdapter — showToast', () => {
  it('pushes a flash message and notifies the registered handler', () => {
    const adapter = new CloudScapeAdapter();
    const onFlashChange = vi.fn();
    (adapter.feedback as any).setFlashChangeHandler(onFlashChange);

    adapter.feedback.showToast('Saved!', 'success');

    expect(onFlashChange).toHaveBeenCalledTimes(1);
    const [messages] = onFlashChange.mock.calls[0];
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ type: 'success', content: 'Saved!', dismissible: true });
  });

  it('auto-removes the flash after the given duration', () => {
    const adapter = new CloudScapeAdapter();
    const onFlashChange = vi.fn();
    (adapter.feedback as any).setFlashChangeHandler(onFlashChange);

    adapter.feedback.showToast('Heads up', 'warning', 1000);
    expect(onFlashChange).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ content: 'Heads up' })]));

    vi.advanceTimersByTime(1000);

    expect(onFlashChange).toHaveBeenLastCalledWith([]);
  });

  it('never auto-removes when duration is 0', () => {
    const adapter = new CloudScapeAdapter();
    const onFlashChange = vi.fn();
    (adapter.feedback as any).setFlashChangeHandler(onFlashChange);

    adapter.feedback.showToast('Sticky', 'info', 0);
    vi.advanceTimersByTime(60_000);

    expect(onFlashChange).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ content: 'Sticky' })]));
  });

  it('dismissFlash removes a specific message by id', () => {
    const adapter = new CloudScapeAdapter();
    const onFlashChange = vi.fn();
    (adapter.feedback as any).setFlashChangeHandler(onFlashChange);

    adapter.feedback.showToast('First', 'info', 0);
    const [[firstMessages]] = onFlashChange.mock.calls;
    const id = firstMessages[0].id;

    (adapter.feedback as any).dismissFlash(id);

    expect(onFlashChange).toHaveBeenLastCalledWith([]);
  });
});

describe('CloudScapeFeedbackAdapter — showBusy / clearBusy', () => {
  it('notifies the busy handler with the message, and with an empty string on clear', () => {
    const adapter = new CloudScapeAdapter();
    const onBusyChange = vi.fn();
    (adapter.feedback as any).setBusyChangeHandler(onBusyChange);

    adapter.feedback.showBusy('Loading…');
    expect(onBusyChange).toHaveBeenLastCalledWith('Loading…');

    adapter.feedback.clearBusy();
    expect(onBusyChange).toHaveBeenLastCalledWith('');
  });
});

describe('CloudScapeFeedbackAdapter — showDialog', () => {
  it('dispatches a cloudscape-dialog event and resolves when the event handler calls resolve', async () => {
    const adapter = new CloudScapeAdapter();

    const handler = (event: Event) => {
      const { config, resolve } = (event as CustomEvent).detail;
      expect(config.message).toBe('Delete this?');
      resolve({ value: 'delete' });
    };
    window.addEventListener('cloudscape-dialog', handler);

    const result = await adapter.feedback.showDialog({
      message: 'Delete this?',
      buttons: [{ label: 'Delete', value: 'delete' }],
    });

    expect(result.value).toBe('delete');
    window.removeEventListener('cloudscape-dialog', handler);
  });
});

describe('CloudScapeAuthAdapter — promptCredentials', () => {
  it('dispatches a cloudscape-auth event carrying the error message and a resolve callback', () => {
    const adapter = new CloudScapeAdapter();
    const handler = vi.fn();
    window.addEventListener('cloudscape-auth', handler);

    adapter.auth.promptCredentials('Incorrect username or password.');

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.errorMessage).toBe('Incorrect username or password.');
    expect(typeof event.detail.resolve).toBe('function');

    window.removeEventListener('cloudscape-auth', handler);
  });

  it('resolves with whatever the dispatched resolve callback is given', async () => {
    const adapter = new CloudScapeAdapter();
    const handler = (event: Event) => {
      (event as CustomEvent).detail.resolve({ username: 'alice', password: 'hunter2' });
    };
    window.addEventListener('cloudscape-auth', handler);

    const prompt = adapter.auth.promptCredentials();
    expect(await prompt.result).toEqual({ username: 'alice', password: 'hunter2' });

    window.removeEventListener('cloudscape-auth', handler);
  });

  it('close() resolves null and dispatches cloudscape-auth-dismiss so the UI can hide itself', async () => {
    const adapter = new CloudScapeAdapter();
    const dismissHandler = vi.fn();
    window.addEventListener('cloudscape-auth-dismiss', dismissHandler);

    const prompt = adapter.auth.promptCredentials();
    prompt.close();

    expect(await prompt.result).toBeNull();
    expect(dismissHandler).toHaveBeenCalledTimes(1);

    window.removeEventListener('cloudscape-auth-dismiss', dismissHandler);
  });

  it('only settles once, even if close() is called after resolve already ran', async () => {
    const adapter = new CloudScapeAdapter();
    const handler = (event: Event) => (event as CustomEvent).detail.resolve({ username: 'alice', password: 'x' });
    window.addEventListener('cloudscape-auth', handler);

    const prompt = adapter.auth.promptCredentials();
    prompt.close(); // must not overwrite the already-resolved value with null

    expect(await prompt.result).toEqual({ username: 'alice', password: 'x' });

    window.removeEventListener('cloudscape-auth', handler);
  });
});
