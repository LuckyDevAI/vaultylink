import { create } from 'zustand';
import type { LangCode } from '@/lib/i18n';

interface AppState {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  view: 'landing' | 'vault';
  setView: (view: 'landing' | 'vault') => void;
}

const stored = localStorage.getItem('vaultlink-lang') as LangCode | null;
const browserLang = navigator.language.split('-')[0] as LangCode;
const defaultLang: LangCode = stored || (['it','en','fr','de','es','pt','ja','zh','ru','ar','tr','ko'].includes(browserLang) ? browserLang : 'it');

export const useAppStore = create<AppState>((set) => ({
  lang: defaultLang,
  setLang: (lang) => {
    localStorage.setItem('vaultlink-lang', lang);
    set({ lang });
  },
  view: 'landing',
  setView: (view) => set({ view }),
}));
