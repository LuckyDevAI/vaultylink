import { Lock, User, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import { useTranslation, LANG_NAMES, type LangCode } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export default function SiteHeader({ showBack, onBack }: { showBack?: boolean; onBack?: () => void }) {
  const { lang, setLang, setView, cloudUser } = useAppStore();
  const { t } = useTranslation(lang);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? user?.user_metadata?.full_name ?? null);
    });
  }, [cloudUser]);

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {showBack && onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 mr-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            </Button>
          )}
          <button onClick={() => setView('landing')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Lock className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-lg text-foreground">VaultLink</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Select value={lang} onValueChange={(v) => setLang(v as LangCode)}>
            <SelectTrigger className="w-[120px] bg-secondary border-border h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LANG_NAMES).map(([code, name]) => (
                <SelectItem key={code} value={code}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {cloudUser && userEmail ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setView('vault')}
              className="border-border text-foreground hover:bg-secondary h-8 text-xs"
            >
              <User className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline max-w-[120px] truncate">{userEmail}</span>
              <span className="sm:hidden">Profilo</span>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setView('auth')}
              className="border-border text-foreground hover:bg-secondary h-8 text-xs"
            >
              <LogIn className="w-3.5 h-3.5 mr-1.5" />
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
