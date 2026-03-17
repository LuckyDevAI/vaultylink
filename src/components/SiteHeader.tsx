import { User, LogIn, LogOut, KeyRound, Settings, Shield, UserCog, Lock } from 'lucide-react';
import logoVaulty from '@/assets/logo_vaulty.png';
import { Button } from '@/components/ui/button';
import { useAppStore, type SettingsSection } from '@/stores/appStore';
import { useTranslation, LANG_NAMES, type LangCode } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export default function SiteHeader({ showBack, onBack }: { showBack?: boolean; onBack?: () => void }) {
  const { lang, setLang, setView, cloudUser, setSettingsSection } = useAppStore();
  const { t } = useTranslation(lang);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? user?.user_metadata?.full_name ?? null);
      if (user) {
        supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
          .then(({ data }) => setIsAdmin(!!data));
      }
    });
  }, [cloudUser]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('landing');
  };

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
            <img src={logoVaulty} alt="VaultLink" className="w-8 h-8" />
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border text-foreground hover:bg-secondary h-8 text-xs"
                >
                  <User className="w-3.5 h-3.5 mr-1.5" />
                  <span className="hidden sm:inline max-w-[120px] truncate">{userEmail}</span>
                  <span className="sm:hidden">Profilo</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-card border-border">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
                <DropdownMenuItem onClick={() => { setSettingsSection('profile'); setView('vault'); }} className="cursor-pointer gap-2 text-foreground">
                  <UserCog className="w-4 h-4" />
                  Modifica profilo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSettingsSection('password'); setView('vault'); }} className="cursor-pointer gap-2 text-foreground">
                  <KeyRound className="w-4 h-4" />
                  Cambia password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSettingsSection('pin'); setView('vault'); }} className="cursor-pointer gap-2 text-foreground">
                  <Lock className="w-4 h-4" />
                  Cambia PIN
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSettingsSection('general'); setView('vault'); }} className="cursor-pointer gap-2 text-foreground">
                  <Settings className="w-4 h-4" />
                  Impostazioni
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem onClick={() => setView('admin')} className="cursor-pointer gap-2 text-primary">
                      <Shield className="w-4 h-4" />
                      Pannello Admin
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
