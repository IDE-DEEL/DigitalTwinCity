// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useLanguageStore } from '../languageStore.js';
import { LABELS } from '../../constants/ui_labels.js';
import { TOAST_MESSAGES } from '../../constants/toast_messages.js';

describe('languageStore additional regression cases', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'nl';
    setActivePinia(createPinia());
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('uses the document language if no preference is stored', () => {
    document.documentElement.lang = 'en';
    expect(useLanguageStore().currentLanguage).toBe('en');
  });

  it('prefers saved language over the document language', () => {
    localStorage.setItem('preferredLanguage', 'nl');
    document.documentElement.lang = 'en';
    expect(useLanguageStore().currentLanguage).toBe('nl');
  });

  it('switches from Dutch to English and persists the choice', () => {
    const store = useLanguageStore();
    store.switchLanguage();
    expect(store.currentLanguage).toBe('en');
    expect(localStorage.getItem('preferredLanguage')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('switches from English back to Dutch', () => {
    localStorage.setItem('preferredLanguage', 'en');
    const store = useLanguageStore();
    store.switchLanguage();
    expect(store.currentLanguage).toBe('nl');
    expect(localStorage.getItem('preferredLanguage')).toBe('nl');
    expect(document.documentElement.lang).toBe('nl');
  });

  it('returns undefined for missing nested labels and messages', () => {
    const store = useLanguageStore();
    expect(store.getLabel('__missing__.nested')).toBeUndefined();
    expect(store.getToastMessage('__missing__.nested')).toBeUndefined();
  });

  it('looks up labels and toast messages in the selected language', () => {
    const store = useLanguageStore();
    const labelKey = Object.keys(LABELS.nl)[0];
    const toastKey = Object.keys(TOAST_MESSAGES.nl)[0];
    expect(store.getLabel(labelKey)).toEqual(LABELS.nl[labelKey]);
    expect(store.getToastMessage(toastKey)).toEqual(TOAST_MESSAGES.nl[toastKey]);
    store.switchLanguage();
    expect(store.getLabel(labelKey)).toEqual(LABELS.en[labelKey]);
    expect(store.getToastMessage(toastKey)).toEqual(TOAST_MESSAGES.en[toastKey]);
  });
});
