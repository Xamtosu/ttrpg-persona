import en from './locales/en.js';
import ru from './locales/ru.js';

export const dictionaries = { en, ru };
export function translator(state) {
    return key => {
        if (!Object.hasOwn(dictionaries[state.locale], key)) throw new Error(`Missing translation: ${key}`);
        return dictionaries[state.locale][key];
    };
}

export function translate(root, state, t) {
    document.documentElement.lang = state.locale;
    root.querySelectorAll('[data-i]').forEach(node => { node.textContent = t(node.dataset.i); });
    root.querySelectorAll('[data-label]').forEach(node => { node.setAttribute('aria-label', t(node.dataset.label)); });
    root.querySelectorAll('[data-lang]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.lang === state.locale)));
}

export function formatNumber(state, value, options = {}) {
    return value == null ? '—' : new Intl.NumberFormat(state.locale === 'ru' ? 'ru-RU' : 'en-US', options).format(value);
}
