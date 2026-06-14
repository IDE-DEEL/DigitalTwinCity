import { defineStore } from 'pinia';
import { ref } from 'vue';
import { LABELS } from '../constants/ui_labels';
import { TOAST_MESSAGES } from '../constants/toast_messages';

export const useLanguageStore = defineStore('language', () => {
    const currentLanguage = ref(localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'nl');

    const getLabel = (path) => {
        return path.split('.').reduce((obj, key) => obj?.[key], LABELS[currentLanguage.value]);
    };

    const getToastMessage = (path) => {
        return path.split('.').reduce((obj, key) => obj?.[key], TOAST_MESSAGES[currentLanguage.value]);
    };

    const switchLanguage = () => {
        const newLang = currentLanguage.value === 'nl' ? 'en' : 'nl';
        if (['nl', 'en'].includes(newLang)) {
            currentLanguage.value = newLang;
            localStorage.setItem('preferredLanguage', newLang);
            document.documentElement.lang = newLang;
        }
    };

    return {
        currentLanguage,
        getLabel,
        getToastMessage,
        switchLanguage
    };

});