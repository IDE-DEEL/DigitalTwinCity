import { describe, expect, it, vi } from 'vitest';
import { useAccessCodeLoader } from '../useAccessCodeLoader.js';

describe('useAccessCodeLoader', () => {
  it('shows loading until a successful request finishes', async () => {
    const state = useAccessCodeLoader();
    let resolve;
    const pending = new Promise((done) => { resolve = done; });
    const request = vi.fn(() => pending);
    const result = state.load(request);
    expect(state.isLoading.value).toBe(true);
    expect(state.error.value).toBe('');
    resolve([{ id: 1 }]);
    expect(await result).toEqual([{ id: 1 }]);
    expect(state.isLoading.value).toBe(false);
    expect(request).toHaveBeenCalledOnce();
  });

  it('reports server errors without exposing technical details', async () => {
    const state = useAccessCodeLoader();
    expect(await state.load(() => Promise.reject(new Error('API Error')))).toBeNull();
    expect(state.error.value).toBe('Toegangscodes konden niet worden geladen. Probeer het opnieuw.');
    expect(state.isLoading.value).toBe(false);
  });

  it('reports network errors and ends loading', async () => {
    const state = useAccessCodeLoader();
    expect(await state.load(() => Promise.reject(new TypeError('Failed to fetch')))).toBeNull();
    expect(state.error.value).toContain('Probeer het opnieuw');
    expect(state.isLoading.value).toBe(false);
  });

  it('shows a specific message for expired sessions', async () => {
    const state = useAccessCodeLoader();
    await state.load(() => Promise.reject(new Error('Sessie verlopen, log opnieuw in.')));
    expect(state.error.value).toBe('Je sessie is verlopen. Log opnieuw in.');
  });

  it('handles errors without a message property', async () => {
  const state = useAccessCodeLoader();

  const result = await state.load(() =>
    Promise.reject({ code: 'UNKNOWN_ERROR' })
  );

  expect(result).toBeNull();
  expect(state.error.value).toBe(
    'Toegangscodes konden niet worden geladen. Probeer het opnieuw.'
  );
  expect(state.isLoading.value).toBe(false);
  });

  it('clears the previous error when retrying', async () => {
    const state = useAccessCodeLoader();
    await state.load(() => Promise.reject(new Error('API Error')));
    let resolve;
    const pending = new Promise((done) => { resolve = done; });
    const retry = state.load(() => pending);
    expect(state.error.value).toBe('');
    expect(state.isLoading.value).toBe(true);
    resolve([{ id: 2 }]);
    expect(await retry).toEqual([{ id: 2 }]);
    expect(state.isLoading.value).toBe(false);
    expect(state.error.value).toBe('');
  });

  it('handles rejection without an error object', async () => {
    const state = useAccessCodeLoader();
    expect(await state.load(() => Promise.reject(null))).toBeNull();
    expect(state.error.value).toContain('Toegangscodes');
  });
});
