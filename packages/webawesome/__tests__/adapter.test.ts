import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebAwesomeAdapter } from '../src/adapter.js';

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('WebAwesomeFeedbackAdapter — showToast', () => {
  it.each([
    ['success', 'success', 'circle-check'],
    ['error', 'danger', 'circle-exclamation'],
    ['warning', 'warning', 'triangle-exclamation'],
    ['info', 'brand', 'circle-info'],
  ] as const)('maps "%s" toast to wa-callout variant "%s" with icon "%s"', (variant, calloutVariant, iconName) => {
    const adapter = new WebAwesomeAdapter();
    adapter.feedback.showToast('Something happened', variant);

    const toast = document.querySelector('.shell-toast')!;
    expect(toast.tagName.toLowerCase()).toBe('wa-callout');
    expect(toast.getAttribute('variant')).toBe(calloutVariant);

    const icon = toast.querySelector('wa-icon')!;
    expect(icon.getAttribute('name')).toBe(iconName);
    // Regression: "regular"/"light"/"thin" icon styles are Font Awesome Pro-only and 403
    // silently on a free kit. Only the default (solid) style is safe to rely on here.
    expect(icon.hasAttribute('variant')).toBe(false);
  });

  it('reuses one toast container across multiple toasts', () => {
    const adapter = new WebAwesomeAdapter();
    adapter.feedback.showToast('First', 'info');
    adapter.feedback.showToast('Second', 'success');

    const containers = document.querySelectorAll('#shell-toast-container');
    expect(containers.length).toBe(1);
    expect(containers[0].querySelectorAll('.shell-toast').length).toBe(2);
  });
});

describe('WebAwesomeFeedbackAdapter — showBusy / clearBusy', () => {
  it('shows a wa-spinner and the given message', () => {
    const adapter = new WebAwesomeAdapter();
    adapter.feedback.showBusy('Loading…');

    const dialog = document.querySelector('.shell-busy-dialog') as HTMLElement & { open: boolean };
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('wa-spinner')).not.toBeNull();
    expect(dialog.querySelector('.shell-busy-message')!.textContent).toBe('Loading…');
  });

  it('reuses the same dialog element across repeated showBusy calls', () => {
    const adapter = new WebAwesomeAdapter();
    adapter.feedback.showBusy('First');
    adapter.feedback.showBusy('Second');

    expect(document.querySelectorAll('.shell-busy-dialog').length).toBe(1);
    expect(document.querySelector('.shell-busy-message')!.textContent).toBe('Second');
  });

  it('regression: blocks wa-hide (Escape / light-dismiss) while busy is active', () => {
    const adapter = new WebAwesomeAdapter();
    adapter.feedback.showBusy('Loading…');
    const dialog = document.querySelector('.shell-busy-dialog')!;

    const hideEvent = new Event('wa-hide', { cancelable: true });
    dialog.dispatchEvent(hideEvent);

    expect(hideEvent.defaultPrevented).toBe(true);
  });

  it('allows the dialog to close once clearBusy() has been called', () => {
    const adapter = new WebAwesomeAdapter();
    adapter.feedback.showBusy('Loading…');
    adapter.feedback.clearBusy();

    const dialog = document.querySelector('.shell-busy-dialog') as HTMLElement & { open: boolean };
    expect(dialog.open).toBe(false);

    const hideEvent = new Event('wa-hide', { cancelable: true });
    dialog.dispatchEvent(hideEvent);
    expect(hideEvent.defaultPrevented).toBe(false);
  });
});

describe('WebAwesomeFeedbackAdapter — showDialog', () => {
  it.each([
    ['primary', 'brand', 'filled'],
    ['secondary', 'neutral', 'outlined'],
    [undefined, 'neutral', 'plain'],
    ['default', 'neutral', 'plain'],
  ] as const)('maps button variant %s to wa-button variant=%s appearance=%s', (variant, waVariant, waAppearance) => {
    const adapter = new WebAwesomeAdapter();
    adapter.feedback.showDialog({
      message: 'Are you sure?',
      buttons: [{ label: 'Go', value: 'go', variant }],
    });

    const button = document.querySelector('.shell-dialog wa-button')!;
    expect(button.getAttribute('variant')).toBe(waVariant);
    expect(button.getAttribute('appearance')).toBe(waAppearance);
  });

  it('shows a header when a title is given, and omits it otherwise', () => {
    const adapter = new WebAwesomeAdapter();
    adapter.feedback.showDialog({ title: 'Confirm', message: 'Sure?', buttons: [] });
    let dialog = document.querySelector('.shell-dialog')!;
    expect(dialog.getAttribute('label')).toBe('Confirm');
    expect(dialog.hasAttribute('without-header')).toBe(false);

    document.body.innerHTML = '';
    adapter.feedback.showDialog({ message: 'No title here', buttons: [] });
    dialog = document.querySelector('.shell-dialog')!;
    expect(dialog.hasAttribute('without-header')).toBe(true);
  });

  it('resolves with the value of the clicked button', async () => {
    const adapter = new WebAwesomeAdapter();
    const promise = adapter.feedback.showDialog({
      message: 'Delete this?',
      buttons: [
        { label: 'Cancel', value: 'cancel', variant: 'secondary' },
        { label: 'Delete', value: 'delete', variant: 'primary' },
      ],
    });

    const buttons = document.querySelectorAll('.shell-dialog wa-button[data-value]');
    (buttons[1] as HTMLElement).click();

    const result = await promise;
    expect(result.value).toBe('delete');
  });

  it('resolves with null when dismissed via wa-hide without clicking a button', async () => {
    const adapter = new WebAwesomeAdapter();
    const promise = adapter.feedback.showDialog({ message: 'Info', buttons: [{ label: 'OK', value: 'ok' }] });

    document.querySelector('.shell-dialog')!.dispatchEvent(new Event('wa-hide'));

    const result = await promise;
    expect(result.value).toBeNull();
  });

  it('only resolves once even if wa-hide fires after a button click', async () => {
    const adapter = new WebAwesomeAdapter();
    const promise = adapter.feedback.showDialog({ message: 'Info', buttons: [{ label: 'OK', value: 'ok' }] });

    const dialog = document.querySelector('.shell-dialog')!;
    (dialog.querySelector('wa-button[data-value]') as HTMLElement).click();
    dialog.dispatchEvent(new Event('wa-hide')); // fires as a side effect of dialog.open = false

    const result = await promise;
    expect(result.value).toBe('ok');
  });

  it('removes the dialog element once wa-after-hide fires', () => {
    const adapter = new WebAwesomeAdapter();
    adapter.feedback.showDialog({ message: 'Info', buttons: [{ label: 'OK', value: 'ok' }] });

    const dialog = document.querySelector('.shell-dialog')!;
    dialog.dispatchEvent(new Event('wa-hide'));
    dialog.dispatchEvent(new Event('wa-after-hide'));

    expect(document.querySelector('.shell-dialog')).toBeNull();
  });
});

describe('WebAwesomeAuthAdapter — promptCredentials', () => {
  it('renders a username and password field, and no error callout by default', () => {
    const adapter = new WebAwesomeAdapter();
    adapter.auth.promptCredentials();

    const dialog = document.querySelector('.shell-auth-dialog')!;
    expect(dialog.getAttribute('label')).toBe('Session Expired');
    expect(dialog.querySelector('wa-input[name="username"]')).not.toBeNull();
    expect(dialog.querySelector('wa-input[name="password"]')!.getAttribute('type')).toBe('password');
    expect(dialog.querySelector('.shell-auth-error')).toBeNull();
  });

  it('renders the error message in a danger callout when retrying after a failed attempt', () => {
    const adapter = new WebAwesomeAdapter();
    adapter.auth.promptCredentials('Incorrect username or password.');

    const callout = document.querySelector('.shell-auth-error')!;
    expect(callout.getAttribute('variant')).toBe('danger');
    expect(callout.textContent).toContain('Incorrect username or password.');
    // Same Pro-icon-style regression as toasts — must not request a Pro-only variant.
    expect(callout.querySelector('wa-icon')!.hasAttribute('variant')).toBe(false);
  });

  it('resolves null and closes the dialog when Cancel is clicked', async () => {
    const adapter = new WebAwesomeAdapter();
    const prompt = adapter.auth.promptCredentials();

    const dialog = document.querySelector('.shell-auth-dialog') as HTMLElement & { open: boolean };
    (dialog.querySelector('[data-action="cancel"]') as HTMLElement).click();

    const credentials = await prompt.result;
    expect(credentials).toBeNull();
    expect(dialog.open).toBe(false);
  });

  it('resolves null when dismissed via wa-hide (Escape, close button, light-dismiss)', async () => {
    const adapter = new WebAwesomeAdapter();
    const prompt = adapter.auth.promptCredentials();

    document.querySelector('.shell-auth-dialog')!.dispatchEvent(new Event('wa-hide'));

    expect(await prompt.result).toBeNull();
  });

  it('submitting the form resolves with a credentials object and closes the dialog', async () => {
    const adapter = new WebAwesomeAdapter();
    const prompt = adapter.auth.promptCredentials();

    const dialog = document.querySelector('.shell-auth-dialog') as HTMLElement & { open: boolean };
    const form = dialog.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    // wa-input isn't a real form-associated custom element in this DOM-only test environment,
    // so FormData can't read a typed value out of it here — this verifies the submit handler
    // runs, doesn't throw, and resolves with the expected shape. The full typed-value round
    // trip (a user actually typing a password and it reaching this object) is covered by the
    // live Playwright verification against the real browser build.
    const credentials = await prompt.result;
    expect(credentials).toEqual({ username: '', password: '' });
    expect(dialog.open).toBe(false);
  });

  it('close() resolves null and closes the dialog without the user acting (e.g. another tab succeeded)', async () => {
    const adapter = new WebAwesomeAdapter();
    const prompt = adapter.auth.promptCredentials();
    const dialog = document.querySelector('.shell-auth-dialog') as HTMLElement & { open: boolean };

    prompt.close();

    expect(await prompt.result).toBeNull();
    expect(dialog.open).toBe(false);
  });

  it('only settles once, even if close() is called after the dialog already resolved', async () => {
    const adapter = new WebAwesomeAdapter();
    const prompt = adapter.auth.promptCredentials();
    const dialog = document.querySelector('.shell-auth-dialog')!;

    (dialog.querySelector('[data-action="cancel"]') as HTMLElement).click();
    prompt.close(); // should be a no-op — must not throw or change the resolved value

    expect(await prompt.result).toBeNull();
  });
});
