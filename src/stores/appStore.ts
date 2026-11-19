import { create } from 'zustand';
import type { LangCode } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

type AppView = 'landing' | 'vault' | 'auth' | 'privacy' | 'terms' | 'eula' | 'admin' | 'account' | 'sitemap' | 'download' | 'support';
export type SettingsSection = 'profile' | 'password' | 'pin' | 'general' | null;

interface AppState {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  view: AppView;
  setView: (view: AppView) => void;
  cloudUser: boolean;
  setCloudUser: (v: boolean) => void;
  settingsSection: SettingsSection;
  setSettingsSection: (s: SettingsSection) => void;
  loadRemoteLang: () => Promise<void>;
}

const SUPPORTED: LangCode[] = ['it','en','fr','de','es','pt','ja','zh','ru','ar','tr','ko'];

const stored = localStorage.getItem('vaultlink-lang') as LangCode | null;
const browserLang = navigator.language.split('-')[0] as LangCode;
const defaultLang: LangCode = stored || (SUPPORTED.includes(browserLang) ? browserLang : 'it');

async function persistRemoteLang(lang: LangCode) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('user_preferences')
      .upsert({ user_id: user.id, lang, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  } catch (e) {
    console.warn('[lang] remote persist failed', e);
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  lang: defaultLang,
  setLang: (lang) => {
    localStorage.setItem('vaultlink-lang', lang);
    set({ lang });
    void persistRemoteLang(lang);
  },
  view: 'landing',
  setView: (view) => set({ view }),
  cloudUser: false,
  setCloudUser: (v) => set({ cloudUser: v }),
  settingsSection: null,
  setSettingsSection: (s) => set({ settingsSection: s }),
  loadRemoteLang: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_preferences')
        .select('lang')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.lang && SUPPORTED.includes(data.lang as LangCode)) {
        const remote = data.lang as LangCode;
        if (remote !== get().lang) {
          localStorage.setItem('vaultlink-lang', remote);
          set({ lang: remote });
        }
      } else {
        // First time: push current local choice to server
        void persistRemoteLang(get().lang);
      }
    } catch (e) {
      console.warn('[lang] remote load failed', e);
    }
  },
}));
