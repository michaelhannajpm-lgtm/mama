// ============================================================================
// useAdminTheme — light / dark / system theme control for the admin console.
//
// Stores the user's PREFERENCE ('light' | 'dark' | 'system') in localStorage,
// resolves 'system' against `prefers-color-scheme`, and applies the result by
// setting `data-ac-theme="light|dark"` on <html>. The `AC` tokens are CSS
// variables keyed off that attribute (see admin-theme.js), so flipping it
// re-themes the entire console with no component changes or re-renders.
//
// The variable definitions (AC_THEME_CSS) are injected once into <head>.
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { AC_THEMES, AC_THEME_CSS } from '../admin-theme';

const STORE_KEY = 'gm_admin_theme';
const STYLE_ID = 'gm-admin-theme-vars';

const readPref = () => {
  try {
    const v = localStorage.getItem(STORE_KEY);
    return AC_THEMES.includes(v) ? v : 'system';
  } catch {
    return 'system';
  }
};

const systemPrefersDark = () => {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
};

const resolve = (pref) => (pref === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : pref);

// Inject the variable definitions once, and set the active attribute on <html>.
const apply = (pref) => {
  if (typeof document === 'undefined') return;
  if (!document.getElementById(STYLE_ID)) {
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = AC_THEME_CSS;
    document.head.appendChild(el);
  }
  document.documentElement.setAttribute('data-ac-theme', resolve(pref));
};

export const useAdminTheme = () => {
  const [pref, setPref] = useState(readPref);

  // Apply on mount + whenever the preference changes; persist the choice.
  useEffect(() => {
    apply(pref);
    try { localStorage.setItem(STORE_KEY, pref); } catch { /* ignore */ }
  }, [pref]);

  // While following the system, react live to OS light/dark changes.
  useEffect(() => {
    if (pref !== 'system') return undefined;
    let mq;
    try { mq = window.matchMedia('(prefers-color-scheme: dark)'); } catch { return undefined; }
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  const setTheme = useCallback((next) => {
    if (AC_THEMES.includes(next)) setPref(next);
  }, []);

  return { theme: pref, resolved: resolve(pref), setTheme };
};
