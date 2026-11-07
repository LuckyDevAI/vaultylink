import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Plus, Search, Star, Clock, Eye, EyeOff, Settings,
  ExternalLink, Trash2, Edit, ArrowLeft, ChevronDown, LogOut,
  Shield, Globe, Download, Upload, KeyRound, FolderOpen,
  Cloud, CloudOff, Check, Loader2, RefreshCw, AlertTriangle, User, UserCog,
  ListChecks, CheckSquare, Square
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useVault, type VaultLink } from '@/hooks/useVault';
import { useBiometric } from '@/hooks/useBiometric';
import { useTranslation } from '@/lib/i18n';
import { LANG_NAMES, type LangCode } from '@/lib/i18n';
import { useAppStore } from '@/stores/appStore';
import { bookmarksToVaultLinks } from '@/lib/bookmarkParser';
import { toast } from 'sonner';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import LegacyResetDialog from '@/components/LegacyResetDialog';
import { canSyncCloud, type VaultPlan } from '@/lib/planAccess';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

type TabId = 'all' | 'favorites' | 'folders' | 'recent' | 'private' | 'topics' | 'settings';

// ── Sync Indicator ────────────────────────────────────────────────────────────
function SyncIndicator({ status, onRetry }: { status: SyncStatus; onRetry?: () => void }) {
  const config = {
    idle: { icon: Cloud, label: 'Cloud', className: 'text-muted-foreground', spinning: false },
    syncing: { icon: Loader2, label: 'Sincronizzazione...', className: 'text-primary', spinning: true },
    synced: { icon: Check, label: 'Sincronizzato', className: 'text-emerald-500', spinning: false },
    error: { icon: CloudOff, label: 'Errore sync', className: 'text-destructive', spinning: false },
    offline: { icon: CloudOff, label: 'Offline', className: 'text-muted-foreground/50', spinning: false },
  };
  const { icon: Icon, label, className, spinning } = config[status];

  return (
    <button
      onClick={status === 'error' ? onRetry : undefined}
      className={`relative flex items-center gap-1.5 h-7 px-2 rounded-md text-xs transition-colors ${
        status === 'error' ? 'hover:bg-destructive/10 cursor-pointer' : 'cursor-default'
      }`}
      title={status === 'error' ? 'Clicca per riprovare' : label}
    >
      <Icon className={`w-3.5 h-3.5 ${className} ${spinning ? 'animate-spin' : ''}`} />
      <span className={`hidden sm:inline ${className}`}>{label}</span>
      {status === 'error' && (
        <RefreshCw className="w-3 h-3 text-destructive hidden sm:inline" />
      )}
    </button>
  );
}

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen({ onAuth, vault, biometric, onBiometricUnlock }: {
  onAuth: (password: string) => void;
  vault: ReturnType<typeof useVault>;
  biometric: ReturnType<typeof useBiometric>;
  onBiometricUnlock: (password: string) => void;
}) {
  const { setup, unlock, hasVault, busy, error } = vault;
  const { lang } = useAppStore();
  const { t } = useTranslation(lang);
  const [isNew, setIsNew] = useState<boolean | null>(null);
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [biometricAttempted, setBiometricAttempted] = useState(false);
  const vaultPrompt = isNew ? 'Crea il tuo PIN' : 'Inserisci il PIN per sbloccare';

  useEffect(() => {
    hasVault().then(exists => setIsNew(!exists));
  }, [hasVault]);

  // Auto-trigger biometric on mount if enabled
  useEffect(() => {
    if (isNew === false && biometric.enabled && !biometric.checking && !biometricAttempted) {
      setBiometricAttempted(true);
      biometric.authenticate().then(password => {
        if (password) {
          onBiometricUnlock(password);
        }
      });
    }
  }, [isNew, biometric.enabled, biometric.checking, biometricAttempted]);

  const isValidPin = (v: string) => /^\d{5,10}$/.test(v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      if (!isValidPin(pw)) { toast.error('Il PIN deve essere composto da 5-10 cifre'); return; }
      if (pw !== confirmPw) { toast.error('I PIN non corrispondono'); return; }
      const res = await setup(pw);
      if (res.ok) onAuth(pw);
    } else {
      const res = await unlock(pw);
      if (res.ok) onAuth(pw);
    }
  };

  const handleBiometricTap = async () => {
    const password = await biometric.authenticate();
    if (password) {
      onBiometricUnlock(password);
    } else {
      toast.error('Autenticazione biometrica fallita');
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const handleResetVault = async () => {
    try {
      // Delete cloud data if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('vault_data').delete().eq('user_id', user.id);
      }
    } catch (e) {
      console.error('Cloud delete error:', e);
    }

    // Clear all IndexedDB data
    const req = indexedDB.open('vaultlink', 1);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('vault', 'readwrite');
      tx.objectStore('vault').clear();
      tx.oncomplete = () => {
        setShowResetConfirm(false);
        setIsNew(true);
        setPw('');
        setConfirmPw('');
        toast.success('Vault resettato (locale + cloud). Crea un nuovo PIN.');
      };
    };
  };

  if (isNew === null) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto vault-glow">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Vaulty Link</h1>
          <p className="text-sm text-muted-foreground">{vaultPrompt}</p>
        </div>

        {/* Biometric button */}
        {!isNew && biometric.enabled && (
          <Button
            variant="outline"
            onClick={handleBiometricTap}
            className="w-full h-12 border-primary/30 text-foreground hover:bg-primary/10 gap-3"
          >
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 10a2 2 0 0 0-2 2c0 1.02.1 2.51.412 4.12M12 10a2 2 0 0 1 2 2c0 1.22-.102 2.62-.412 4.12M12 10V8m-4.706 6.12C7.116 13.076 7 12.06 7 11a5 5 0 0 1 9.478-2.222M6.12 17.12A13 13 0 0 1 5 11a7 7 0 0 1 12.93-3.632M19 11a15 15 0 0 1-.635 5.12M12 4a9 9 0 0 0-9 9c0 .832.033 1.655.122 2.453M12 4a9 9 0 0 1 8.213 5.333"/>
            </svg>
            Sblocca con biometria
          </Button>
        )}

        {!isNew && biometric.enabled && (
          <div className="flex items-center gap-3">
            <Separator className="flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">oppure</span>
            <Separator className="flex-1 bg-border" />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-muted-foreground text-xs">PIN (5-10 cifre)</Label>
            <Input
              type="password"
              inputMode="numeric"
              pattern="\d{5,10}"
              autoComplete="one-time-code"
              value={pw}
              onChange={e => setPw(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="bg-secondary border-border mt-1 tracking-[0.5em] text-center text-lg font-mono"
              autoFocus={!biometric.enabled}
              minLength={5}
              maxLength={10}
              placeholder="•••••"
            />
            {isNew && pw.length > 0 && (
              <div className="mt-2 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {pw.length < 5 ? 'Troppo corto' : 'OK'}
                </span>
                <span className="text-xs text-muted-foreground">{pw.length}/10</span>
              </div>
            )}
          </div>
          {isNew && (
            <div>
              <Label className="text-muted-foreground text-xs">Conferma PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                pattern="\d{5,10}"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="bg-secondary border-border mt-1 tracking-[0.5em] text-center text-lg font-mono"
                maxLength={10}
                placeholder="•••••"
              />
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full bg-primary text-primary-foreground">
            {busy ? '...' : isNew ? t('createVault') : t('unlock')}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground font-mono">{t('encrypted')}</p>
        {isNew && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive">
              Attenzione: non è possibile recuperare il PIN. Memorizzalo bene!
            </p>
          </div>
        )}
        {!isNew && (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-xs text-destructive/70 hover:text-destructive underline mx-auto block transition-colors"
          >
            PIN dimenticato? Resetta il vault
          </button>
        )}

        <AlertDialog open={showResetConfirm} onOpenChange={(open) => { setShowResetConfirm(open); if (!open) setResetConfirmText(''); }}>
          <AlertDialogContent className="bg-background border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Resetta il Vault</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>Tutti i dati locali e cloud verranno eliminati permanentemente. Questa azione non può essere annullata.</p>
                  <p>Digita <span className="font-mono font-bold text-destructive">RESET</span> per confermare:</p>
                  <Input
                    value={resetConfirmText}
                    onChange={e => setResetConfirmText(e.target.value)}
                    placeholder="Digita RESET"
                    className="bg-secondary border-border font-mono"
                    autoComplete="off"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetVault}
                disabled={resetConfirmText !== 'RESET'}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:pointer-events-none"
              >
                Elimina tutto e resetta
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
      </div>

      <SiteFooter />
    </div>
  );
}

// ── Link Form Dialog ──────────────────────────────────────────────────────────
function LinkFormDialog({
  open, onClose, link, links, onSave, t
}: {
  open: boolean; onClose: () => void;
  link: VaultLink | null; links: VaultLink[];
  onSave: (l: VaultLink) => void; t: (k: string) => string;
}) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [siteName, setSiteName] = useState('');
  const [topic, setTopic] = useState('');
  const [type, setType] = useState<'main' | 'sub'>('main');
  const [parentId, setParentId] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (link) {
      setUrl(link.url); setTitle(link.title); setSiteName(link.siteName);
      setTopic(link.topic); setType(link.type); setParentId(link.parentId || '');
      setFavorite(link.favorite); setIsPrivate(link.private);
    } else {
      setUrl(''); setTitle(''); setSiteName(''); setTopic('');
      setType('main'); setParentId(''); setFavorite(false); setIsPrivate(false);
    }
  }, [link, open]);

  const handleSave = () => {
    if (!url.trim()) return;
    onSave({
      id: link?.id || crypto.randomUUID(),
      url: url.trim(),
      title: title.trim() || url.trim(),
      siteName: siteName.trim(),
      topic: topic.trim(),
      type,
      parentId: type === 'sub' ? parentId : undefined,
      favorite,
      private: isPrivate,
      createdAt: link?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
    onClose();
  };

  const mainLinks = links.filter(l => l.type === 'main');
  const topics = [...new Set(links.map(l => l.topic).filter(Boolean))];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">{link ? t('editLink') : t('addLink')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">{t('url')}</Label>
            <Input value={url} onChange={e => setUrl(e.target.value)} className="bg-secondary border-border mt-1" placeholder="https://" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t('title')}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary border-border mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t('siteName')}</Label>
            <Input value={siteName} onChange={e => setSiteName(e.target.value)} className="bg-secondary border-border mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t('argument')}</Label>
            <Input value={topic} onChange={e => setTopic(e.target.value)} className="bg-secondary border-border mt-1"
              list="topics-list" />
            <datalist id="topics-list">
              {topics.map(tp => <option key={tp} value={tp} />)}
            </datalist>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={favorite} onCheckedChange={setFavorite} />
              <Label className="text-xs text-muted-foreground">{t('favorite')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
              <Label className="text-xs text-muted-foreground">{t('private')}</Label>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t('type')}</Label>
            <Select value={type} onValueChange={v => setType(v as 'main' | 'sub')}>
              <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="main">{t('mainLink')}</SelectItem>
                <SelectItem value="sub">{t('sublink')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === 'sub' && (
            <div>
              <Label className="text-xs text-muted-foreground">{t('linkedTo')}</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('none')}</SelectItem>
                  {mainLinks.map(ml => (
                    <SelectItem key={ml.id} value={ml.id}>{ml.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-border">{t('cancel')}</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">
            {link ? t('updateLink') : t('saveLink')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Settings Panel ────────────────────────────────────────────────────────────
function SettingsPanel({ onBack, vault, biometric, onImportDone, scrollToSection }: {
  onBack: () => void;
  vault: ReturnType<typeof useVault>;
  biometric: ReturnType<typeof useBiometric>;
  onImportDone?: (links: VaultLink[]) => void;
  scrollToSection?: string | null;
}) {
  const { lang, setLang, setView } = useAppStore();
  const { t } = useTranslation(lang);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState('');
  const [manualBusy, setManualBusy] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [profilePlan, setProfilePlan] = useState<{ subscribed: boolean; plan: string | null; subscription_end?: string; auto_renew?: boolean; trialing?: boolean } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const passwordRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAccountEmail(user?.email ?? null);
      if (user) {
        supabase.functions.invoke('check-subscription').then(({ data, error }) => {
          if (!error && data) setProfilePlan(data);
        });
      }
    });
  }, []);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
      else throw new Error('URL portale non disponibile');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impossibile aprire il portale');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleLogoutAccount = async () => {
    await supabase.auth.signOut();
    setView('landing');
  };


  useEffect(() => {
    if (!scrollToSection) return;
    const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
      profile: profileRef, password: passwordRef, pin: pinRef,
    };
    const ref = refMap[scrollToSection];
    if (ref?.current) {
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [scrollToSection]);

  const handleChangePw = async () => {
    if (!/^\d{5,10}$/.test(newPw)) {
      toast.error('Il PIN deve essere composto da 5-10 cifre');
      return;
    }
    if (newPw !== confirmPw) { toast.error('I PIN non corrispondono'); return; }
    try {
      await vault.changePassword(newPw);
      if (biometric.enabled) {
        await biometric.updatePassword(newPw);
      }
      toast.success('PIN aggiornato');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch {
      toast.error('Impossibile aggiornare il PIN');
    }
  };

  const handleToggleBiometric = async () => {
    if (biometric.enabled) {
      await biometric.disable();
      toast.success('Biometria disattivata');
    } else {
      // We need the current PIN to store it
      if (!currentPw) {
        toast.error('Inserisci il PIN attuale per attivare la biometria');
        return;
      }
      // Verify the PIN first
      const res = await vault.unlock(currentPw);
      if (!res.ok) {
        toast.error('PIN errato');
        return;
      }
      const ok = await biometric.enroll(currentPw);
      if (ok) {
        toast.success('Biometria attivata!');
      } else {
        toast.error('Registrazione biometrica fallita');
      }
    }
  };

  const handleExport = async () => {
    const blob = await vault.exportBlob();
    if (!blob) return;
    const file = new Blob([blob], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = `vaultlink-backup-${Date.now()}.vlenc`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(t('exportData'));
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.vlenc';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      await vault.importBlob(text);
      toast.success(t('importData'));
    };
    input.click();
  };

  const handleImportBookmarks = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.html,.htm';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const html = await file.text();
      const imported = bookmarksToVaultLinks(html);
      if (imported.length === 0) {
        toast.error('Nessun bookmark trovato nel file');
        return;
      }
      // Merge with existing links, avoiding duplicate URLs
      const existingUrls = new Set((await vault.loadLinks()).map(l => l.url));
      const newLinks = imported.filter(l => !existingUrls.has(l.url));
      if (newLinks.length === 0) {
        toast.info('Tutti i bookmark sono già presenti');
        return;
      }
      const current = await vault.loadLinks();
      const merged = [...current, ...newLinks];
      await vault.saveLinks(merged);
      if (onImportDone) onImportDone(merged);
      toast.success(`Importati ${newLinks.length} bookmark (${imported.length - newLinks.length} duplicati ignorati)`);
    };
    input.click();
  };


  const handleManualImport = async () => {
    const lines = manualText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error('Inserisci almeno un link');
      return;
    }
    setManualBusy(true);
    try {
      const now = Date.now();
      const parsed: VaultLink[] = [];
      for (const line of lines) {
        // Accept "URL", "URL | Title", or "URL | Title | Topic"
        const parts = line.split('|').map(p => p.trim());
        let raw = parts[0];
        if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
        let urlObj: URL;
        try { urlObj = new URL(raw); } catch { continue; }
        const siteName = urlObj.hostname.replace(/^www\./, '');
        parsed.push({
          id: crypto.randomUUID(),
          url: urlObj.toString(),
          title: parts[1] || siteName,
          siteName,
          topic: parts[2] || '',
          type: 'main',
          favorite: false,
          private: false,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (parsed.length === 0) {
        toast.error('Nessun URL valido trovato');
        setManualBusy(false);
        return;
      }
      const current = await vault.loadLinks();
      const existingUrls = new Set(current.map(l => l.url));
      const newLinks = parsed.filter(l => !existingUrls.has(l.url));
      if (newLinks.length === 0) {
        toast.info('Tutti i link sono già presenti');
        setManualBusy(false);
        return;
      }
      const merged = [...current, ...newLinks];
      await vault.saveLinks(merged);
      if (onImportDone) onImportDone(merged);
      toast.success(`Importati ${newLinks.length} link (${parsed.length - newLinks.length} duplicati ignorati)`);
      setManualText('');
      setManualOpen(false);
    } catch (e) {
      toast.error('Errore durante l\'importazione');
    } finally {
      setManualBusy(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Torna indietro"><ArrowLeft className="w-4 h-4" aria-hidden="true" /></Button>
        <h2 className="text-lg font-semibold text-foreground">{t('settingsTitle')}</h2>
      </div>

      {/* Profile */}
      <div ref={profileRef} className="space-y-3">
        <Label className="text-sm text-muted-foreground flex items-center gap-2">
          <User className="w-4 h-4" /> Profilo utente
        </Label>
        <div className="rounded-lg border border-border bg-secondary/40 p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Email account</p>
            <p className="text-sm text-foreground font-mono break-all">{accountEmail ?? '—'}</p>
          </div>
          <Separator className="bg-border" />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Piano attivo</p>
            {profilePlan?.subscribed ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={profilePlan.plan === 'lifetime' ? 'bg-accent text-accent-foreground' : 'bg-primary/20 text-primary border-primary/30'}>
                  {profilePlan.plan === 'lifetime' ? '⭐ Lifetime' : profilePlan.plan === 'yearly' ? (profilePlan.trialing ? 'Cloud Sync · prova gratuita' : '🔄 Cloud Sync annuale') : profilePlan.plan}
                </Badge>
                {profilePlan.plan === 'yearly' && profilePlan.subscription_end && (
                  <span className="text-xs text-muted-foreground">
                    {profilePlan.trialing ? (profilePlan.auto_renew ? 'Primo addebito il' : 'Prova disdetta · fine il') : profilePlan.auto_renew ? 'Rinnovo automatico il' : 'Scade il'}{' '}
                    {new Date(profilePlan.subscription_end).toLocaleDateString('it-IT')}
                  </span>
                )}
              </div>
            ) : (
              <Badge variant="outline" className="border-border text-muted-foreground">Piano gratuito / locale</Badge>
            )}
          </div>
          {profilePlan?.subscribed && profilePlan.plan === 'yearly' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="w-full border-border"
            >
              <Settings className="w-4 h-4 mr-2" />
              {portalLoading ? 'Apertura…' : 'Gestisci abbonamento (Stripe)'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogoutAccount}
            className="w-full border-border text-destructive hover:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </div>


      <Separator className="bg-border" />

      {/* Language */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground flex items-center gap-2">
          <Globe className="w-4 h-4" /> {t('language')}
        </Label>
        <Select value={lang} onValueChange={v => setLang(v as LangCode)}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(LANG_NAMES).map(([code, name]) => (
              <SelectItem key={code} value={code}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator className="bg-border" />

      {/* Biometric / PIN */}
      {biometric.available && (
        <div ref={pinRef}>
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 10a2 2 0 0 0-2 2c0 1.02.1 2.51.412 4.12M12 10a2 2 0 0 1 2 2c0 1.22-.102 2.62-.412 4.12M12 10V8m-4.706 6.12C7.116 13.076 7 12.06 7 11a5 5 0 0 1 9.478-2.222M6.12 17.12A13 13 0 0 1 5 11a7 7 0 0 1 12.93-3.632M19 11a15 15 0 0 1-.635 5.12M12 4a9 9 0 0 0-9 9c0 .832.033 1.655.122 2.453M12 4a9 9 0 0 1 8.213 5.333"/>
              </svg>
              Sblocco biometrico
            </Label>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border">
              <div>
                <p className="text-sm text-foreground">
                  {biometric.enabled ? 'Biometria attiva' : 'Biometria disattivata'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Usa impronta o Face ID per sbloccare il vault
                </p>
              </div>
              <Switch checked={biometric.enabled} onCheckedChange={handleToggleBiometric} />
            </div>
            {!biometric.enabled && (
              <div>
                <Label className="text-xs text-muted-foreground">PIN attuale (per attivare)</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="bg-secondary border-border mt-1 tracking-[0.5em] text-center font-mono"
                  maxLength={10}
                  placeholder="Inserisci il PIN"
                />
              </div>
            )}
          </div>
          <Separator className="bg-border mt-6" />
        </div>
      )}

      {/* Security */}
      <div ref={passwordRef} className="space-y-3">
        <Label className="text-sm text-muted-foreground flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> Cambia PIN
        </Label>
        <p className="text-xs text-muted-foreground -mt-1">
          Da 5 a 10 cifre.<br />
          <span className="text-amber-500">⚠️ Non dimenticarlo: il PIN non è recuperabile.</span>
        </p>
        <Input type="password" inputMode="numeric" placeholder="PIN attuale" value={currentPw}
          onChange={e => setCurrentPw(e.target.value.replace(/\D/g, '').slice(0, 10))}
          maxLength={10}
          className="bg-secondary border-border tracking-[0.5em] text-center font-mono" />
        <Input type="password" inputMode="numeric" placeholder="Nuovo PIN" value={newPw}
          onChange={e => setNewPw(e.target.value.replace(/\D/g, '').slice(0, 10))}
          maxLength={10}
          className="bg-secondary border-border tracking-[0.5em] text-center font-mono" />
        <Input type="password" inputMode="numeric" placeholder="Conferma nuovo PIN" value={confirmPw}
          onChange={e => setConfirmPw(e.target.value.replace(/\D/g, '').slice(0, 10))}
          maxLength={10}
          className="bg-secondary border-border tracking-[0.5em] text-center font-mono" />
        <Button onClick={handleChangePw} className="bg-primary text-primary-foreground">Cambia PIN</Button>
      </div>

      <Separator className="bg-border" />

      {/* Import/Export */}
      <div className="space-y-3">
        <Label className="text-sm text-muted-foreground flex items-center gap-2">
          <Shield className="w-4 h-4" /> Backup
        </Label>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="flex-1 border-border">
            <Download className="w-4 h-4 mr-2" />{t('exportData')}
          </Button>
          <Button variant="outline" onClick={handleImport} className="flex-1 border-border">
            <Upload className="w-4 h-4 mr-2" />{t('importData')}
          </Button>
        </div>
        <Separator className="my-2 bg-border" />
        <Label className="text-sm text-muted-foreground flex items-center gap-2">
          <Globe className="w-4 h-4" /> Importa Bookmark
        </Label>
        <Button variant="outline" onClick={handleImportBookmarks} className="w-full border-border">
          <Upload className="w-4 h-4 mr-2" /> Importa da file .HTML
        </Button>
        <p className="text-xs text-muted-foreground">Importa bookmark esportati da Chrome, Firefox, Edge, Safari, Opera</p>
        <Separator className="my-2 bg-border" />
        <Label className="text-sm text-muted-foreground flex items-center gap-2">
          <Upload className="w-4 h-4" /> Importazione manuale
        </Label>
        <Button variant="outline" onClick={() => setManualOpen(true)} className="w-full border-border">
          <Upload className="w-4 h-4 mr-2" /> Aggiungi link manualmente
        </Button>
        <p className="text-xs text-muted-foreground">Incolla uno o più link (uno per riga). Ideale per prima installazione o nuovi device.</p>
      </div>

      <Dialog open={manualOpen} onOpenChange={(o) => { setManualOpen(o); if (!o) setManualText(''); }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Importazione manuale link</DialogTitle>
            <DialogDescription>
              Incolla un link per riga. Formato opzionale: <code className="text-xs">URL | Titolo | Argomento</code>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={'https://example.com\nhttps://github.com | GitHub | Lavoro\nyoutube.com | YouTube | Svago'}
            className="min-h-[200px] font-mono text-xs bg-secondary border-border"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)} className="border-border">Annulla</Button>
            <Button onClick={handleManualImport} disabled={manualBusy} className="bg-primary text-primary-foreground">
              {manualBusy ? 'Importazione...' : 'Importa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Separator className="bg-border" />

      {/* About */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>{t('version')}: 10.10.10 (PWA)</p>
        <p>{t('developer')}: Vaulty Link Software</p>
        <p>{t('builtWith')}: React, Web Crypto API, IndexedDB</p>
        <p className="pt-2">{t('privacyNote')}</p>
      </div>
    </div>
  );
}

// ── Main Vault App ────────────────────────────────────────────────────────────
export default function VaultApp() {
  const [userPlan, setUserPlan] = useState<VaultPlan | null>(null);
  const cloudEnabled = canSyncCloud(userPlan);
  const vault = useVault(cloudEnabled);
  const biometric = useBiometric();
  const { lang, setView, cloudUser, settingsSection, setSettingsSection } = useAppStore();
  const { t } = useTranslation(lang);

  const [authenticated, setAuthenticated] = useState(false);
  const [lastPassword, setLastPassword] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [links, setLinks] = useState<VaultLink[]>([]);
  const [tab, setTab] = useState<TabId>('all');
  const [search, setSearch] = useState('');
  const [showPrivate, setShowPrivate] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'topic'>('date');
  const [editLink, setEditLink] = useState<VaultLink | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VaultLink | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deleteAllText, setDeleteAllText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteSelected, setShowDeleteSelected] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Migration state for legacy PIN-encrypted data
  const [needsMigration, setNeedsMigration] = useState(false);
  const [migrationPin, setMigrationPin] = useState('');
  const [migrationError, setMigrationError] = useState('');
  const [legacyResetOpen, setLegacyResetOpen] = useState(false);
  const [autoUnlockTried, setAutoUnlockTried] = useState(false);

  // Auto-authenticate if vault session was restored (within 50 min window)
  useEffect(() => {
    if (!vault.locked && !authenticated) setAuthenticated(true);
  }, [vault.locked, authenticated]);

  // No login → send to auth page
  useEffect(() => {
    if (vault.sessionRestored && !cloudUser && !authenticated) {
      setView('auth');
    }
  }, [vault.sessionRestored, cloudUser, authenticated, setView]);

  // Auto-unlock the vault using a key derived from the logged-in account
  useEffect(() => {
    if (!vault.sessionRestored || !cloudUser || !userPlan || !vault.locked || autoUnlockTried) return;
    setAutoUnlockTried(true);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Pull latest cloud blob first so migration uses up-to-date data
      if (cloudEnabled) try { await vault.pullFromCloud(); } catch { /* ignore */ }
      const res = await vault.autoUnlock(user.id);
      if (!res.ok && 'needsMigration' in res && res.needsMigration) {
        setNeedsMigration(true);
      }
    })();
  }, [vault.sessionRestored, cloudUser, userPlan, cloudEnabled, vault.locked, autoUnlockTried, vault]);

  const handleMigration = useCallback(async () => {
    setMigrationError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const res = await vault.migrateFromPin(migrationPin, user.id);
    if (res.ok) {
      setNeedsMigration(false);
      setMigrationPin('');
      if (cloudEnabled) try { await vault.pushToCloud(); } catch { /* ignore */ }
      toast.success('Migrazione completata — il PIN non è più richiesto.');
    } else {
      setMigrationError('PIN errato. Riprova.');
    }
  }, [migrationPin, vault, cloudEnabled]);

  const handleLegacyReset = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const res = await vault.resetLegacy(user.id);
    if (res.ok) {
      setNeedsMigration(false);
      setMigrationPin('');
      setMigrationError('');
      toast.success('Nuovo Vault creato — il PIN non è più richiesto.');
    }
    return res.ok;
  }, [vault]);


  // Auto-switch to settings when settingsSection is set
  useEffect(() => {
    if (settingsSection && authenticated) {
      setTab('settings');
    }
  }, [settingsSection, authenticated]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
          .then(({ data }) => setIsAdmin(!!data));
      }
    });
  }, [cloudUser]);

  // Check subscription status + send purchase confirmation email if redirected from Stripe
  useEffect(() => {
    if (!cloudUser) return;

    const url = new URL(window.location.href);
    const paymentSuccess = url.searchParams.get('payment') === 'success';

    const run = async () => {
      try {
        if (paymentSuccess) {
          // Trigger purchase confirmation email (idempotent server-side)
          try {
            await supabase.functions.invoke('send-purchase-confirmation');
          } catch (e) {
            console.error('Purchase email failed:', e);
          }
          // Clean URL so we don't retrigger on refresh
          url.searchParams.delete('payment');
          window.history.replaceState({}, '', url.pathname + (url.search || '') + url.hash);
        }

        const { data, error } = await supabase.functions.invoke('check-subscription');
        if (!error && data) setUserPlan(data);
      } catch (e) {
        console.error('Subscription check failed:', e);
      }
    };
    run();
    const timer = window.setInterval(() => { void run(); }, 60000);
    const refresh = () => { void run(); };
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [cloudUser]);
  // Load links when authenticated — pull from cloud first if available
  useEffect(() => {
    if (authenticated && !vault.locked) {
      const drainExtensionQueue = async () => {
        if (!cloudUser || !cloudEnabled) return;
        try {
          const { data: rows, error } = await supabase
            .from('extension_queue')
            .select('id,url,title')
            .order('created_at', { ascending: true });
          if (error || !rows || rows.length === 0) return;
          const current = await vault.loadLinks();
          const known = new Set(current.map(l => l.url));
          const now = Date.now();
          const added: VaultLink[] = [];
          for (const r of rows) {
            if (!r.url || known.has(r.url)) continue;
            known.add(r.url);
            let host = r.url;
            try { host = new URL(r.url).hostname.replace(/^www\./, ''); } catch { /* keep raw */ }
            added.push({
              id: crypto.randomUUID(), url: r.url, title: r.title || host, siteName: host,
              topic: '', type: 'main', favorite: false, private: false, createdAt: now, updatedAt: now,
            });
          }
          if (added.length > 0) {
            const merged = [...current, ...added];
            setLinks(merged);
            await vault.saveLinks(merged);
            await vault.syncCloud();
            toast.success(`${added.length} link aggiunti dall'estensione`);
          }
          await supabase.from('extension_queue').delete().in('id', rows.map(r => r.id));
        } catch (e) {
          console.error('Extension queue import failed:', e);
        }
      };
      const load = async () => {
        await loadInner();
        await drainExtensionQueue();
      };
      const loadInner = async () => {
        if (cloudUser && cloudEnabled) {
          setSyncStatus('syncing');
          try {
            const pulled = await vault.pullFromCloud();
            if (pulled) {
              const cloudLinks = await vault.loadLinks();
              if (cloudLinks.length > 0) {
                setLinks(cloudLinks);
                setSyncStatus('synced');
                setTimeout(() => setSyncStatus('idle'), 3000);
                return;
              }
            }
          } catch (e) {
            console.error('Cloud pull failed, using local:', e);
            setSyncStatus('error');
          }
        }
        const localLinks = await vault.loadLinks();
        setLinks(localLinks);
        if (cloudUser && cloudEnabled && localLinks.length > 0) {
          vault.pushToCloud()
            .then(() => {
              setSyncStatus('synced');
              setTimeout(() => setSyncStatus('idle'), 3000);
            })
            .catch(() => setSyncStatus('error'));
        } else if (cloudUser && cloudEnabled) {
          setSyncStatus(s => (s === 'syncing' ? 'synced' : s));
          setTimeout(() => setSyncStatus(s => (s === 'synced' ? 'idle' : s)), 3000);
        }
      };
      load();
    }
  }, [authenticated, vault.locked, cloudUser, cloudEnabled]);

  // Realtime cross-device sync: subscribe while unlocked
  useEffect(() => {
    if (!authenticated || vault.locked || !cloudUser || !cloudEnabled) return;
    const unsubscribe = vault.subscribeRealtime(async () => {
      try {
        setSyncStatus('syncing');
        const remoteLinks = await vault.loadLinks();
        setLinks(remoteLinks);
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } catch (e) {
        console.error('Realtime apply failed:', e);
        setSyncStatus('error');
      }
    });
    return unsubscribe;
  }, [authenticated, vault.locked, cloudUser, cloudEnabled, vault]);

  

  const persist = useCallback(async (newLinks: VaultLink[]) => {
    setLinks(newLinks);
    await vault.saveLinks(newLinks);
    if (cloudUser && cloudEnabled) {
      setSyncStatus('syncing');
      vault.syncCloud()
        .then(() => {
          setSyncStatus('synced');
          setTimeout(() => setSyncStatus('idle'), 3000);
        })
        .catch(() => setSyncStatus('error'));
    }
  }, [vault, cloudUser, cloudEnabled]);

  const handleRetrySync = useCallback(() => {
    if (!cloudUser || !cloudEnabled) return;
    setSyncStatus('syncing');
    vault.syncCloud()
      .then(() => {
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 3000);
      })
      .catch(() => setSyncStatus('error'));
  }, [vault, cloudUser, cloudEnabled]);

  const handleSaveLink = useCallback((link: VaultLink) => {
    const existing = links.find(l => l.id === link.id);
    if (existing) {
      persist(links.map(l => l.id === link.id ? link : l));
    } else {
      persist([...links, link]);
    }
    toast.success(existing ? t('updateLink') : t('saveLink'));
  }, [links, persist, t]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    persist(links.filter(l => l.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success(t('delete'));
  }, [deleteTarget, links, persist, t]);

  const filteredLinks = useMemo(() => {
    let result = links;

    // Tab filter
    if (tab === 'favorites') result = result.filter(l => l.favorite);
    else if (tab === 'recent') {
      const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
      result = result.filter(l => l.createdAt > week);
    }
    else if (tab === 'private') result = result.filter(l => l.private);

    // Hide private unless shown
    if (!showPrivate && tab !== 'private') result = result.filter(l => !l.private);

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.url.toLowerCase().includes(q) ||
        l.title.toLowerCase().includes(q) ||
        l.topic.toLowerCase().includes(q) ||
        l.siteName.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'date') result.sort((a, b) => b.createdAt - a.createdAt);
    else if (sortBy === 'name') result.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'topic') result.sort((a, b) => a.topic.localeCompare(b.topic));

    return result;
  }, [links, tab, showPrivate, search, sortBy]);

  const topics = useMemo(() => [...new Set(links.map(l => l.topic).filter(Boolean))], [links]);

  const groupedByFolder = useMemo(() => {
    let result = links;
    if (!showPrivate) result = result.filter(l => !l.private);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.url.toLowerCase().includes(q) || l.title.toLowerCase().includes(q) ||
        l.topic.toLowerCase().includes(q) || l.siteName.toLowerCase().includes(q)
      );
    }
    const groups: Record<string, VaultLink[]> = {};
    result.forEach(l => {
      const folder = l.topic || t('noResults') === '' ? l.topic || '—' : l.topic || '—';
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(l);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [links, showPrivate, search]);

  const handleAuth = useCallback((password: string) => {
    setAuthenticated(true);
    setLastPassword(password);
    // Offer biometric enrollment if available but not enabled
    if (biometric.available && !biometric.enabled) {
      setTimeout(() => {
        toast('Vuoi attivare lo sblocco biometrico?', {
          action: {
            label: 'Attiva',
            onClick: async () => {
              const ok = await biometric.enroll(password);
              if (ok) toast.success('Biometria attivata!');
            },
          },
          duration: 8000,
        });
      }, 1500);
    }
  }, [biometric]);

  const handleBiometricUnlock = useCallback(async (password: string) => {
    const res = await vault.unlock(password);
    if (res.ok) {
      setAuthenticated(true);
      setLastPassword(password);
    } else {
      toast.error('PIN biometrico non valido. Riprova con il PIN.');
    }
  }, [vault]);

  if (!vault.sessionRestored) {
    return <div className="min-h-screen bg-background" />;
  }

  // Legacy data migration: ask the old PIN one time to re-encrypt with the account key
  if (needsMigration) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Migrazione dati</h1>
            <p className="text-sm text-muted-foreground">
              Inserisci il tuo ultimo PIN per migrare i dati esistenti. Dopo questa operazione il PIN non sarà più richiesto.
            </p>
          </div>
          <div className="space-y-3">
            <Label htmlFor="migration-pin">PIN attuale</Label>
            <Input
              id="migration-pin"
              type="password"
              inputMode="numeric"
              autoFocus
              value={migrationPin}
              onChange={(e) => setMigrationPin(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleMigration(); }}
              placeholder="••••"
            />
            {migrationError && <p className="text-sm text-destructive">{migrationError}</p>}
            <Button className="w-full" onClick={handleMigration} disabled={!migrationPin || vault.busy}>
              {vault.busy ? 'Migrazione...' : 'Migra e continua'}
            </Button>
            <Button variant="ghost" className="w-full h-auto min-h-10 whitespace-normal text-destructive" onClick={() => setLegacyResetOpen(true)} disabled={vault.busy}>
              Non ricordo il PIN — Resetta e inizia da zero
            </Button>
          </div>
        </div>
        <LegacyResetDialog open={legacyResetOpen} onOpenChange={setLegacyResetOpen} onConfirm={handleLegacyReset} />
      </div>
    );
  }

  if (!authenticated) {
    // Auto-unlock in progress (or redirecting to /auth)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }


  if (tab === 'settings') {
    return (
      <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto">
        <SettingsPanel onBack={() => { setTab('all'); setSettingsSection(null); }} vault={vault} biometric={biometric} onImportDone={(newLinks) => { void persist(newLinks); }} scrollToSection={settingsSection} />
      </div>
    );
  }

  const tabs: { id: TabId; icon: typeof Star; label: string }[] = [
    { id: 'all', icon: Globe, label: t('allLinks') },
    { id: 'favorites', icon: Star, label: t('favorites') },
    { id: 'folders', icon: FolderOpen, label: t('folders') },
    { id: 'recent', icon: Clock, label: t('recent') },
    { id: 'private', icon: Lock, label: t('privateLinks') },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2 mr-auto">
            <button onClick={() => { vault.lock(); setAuthenticated(false); setView('landing'); }} aria-label="Vaulty Link home" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Lock className="w-4 h-4 text-primary" aria-hidden="true" />
              </div>
              <h1 className="font-semibold text-foreground text-lg hidden sm:inline">La mia cassaforte Vaulty Link</h1>
              <span className="text-xs text-muted-foreground hidden md:inline ml-1">I tuoi link in cassaforte.</span>
            </button>
            {cloudUser && cloudEnabled && <SyncIndicator status={syncStatus} onRetry={handleRetrySync} />}
            {userPlan?.subscribed && (
              <Badge className={`text-[10px] h-5 px-2 ${userPlan.plan === 'lifetime' ? 'bg-accent text-accent-foreground' : 'bg-primary/20 text-primary border-primary/30'}`}>
                {userPlan.plan === 'lifetime' ? '⭐ Solo Locale Lifetime' : '🔄 Cloud Sync'}
              </Badge>
            )}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            <Label htmlFor="vault-search" className="sr-only">{t('search')}</Label>
            <Input
              id="vault-search"
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('search')}
              className="pl-9 bg-secondary border-border h-8 text-sm"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground h-8 px-3 text-xs">
                <ListChecks className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                Gestisci
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border">
              <DropdownMenuItem
                onClick={() => { setEditLink(null); setFormOpen(true); }}
                className="cursor-pointer gap-2 text-foreground"
              >
                <Plus className="w-4 h-4" />
                {t('addLink')}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => {
                  setSelectionMode(m => {
                    if (m) setSelectedIds(new Set());
                    return !m;
                  });
                }}
                className="cursor-pointer gap-2 text-foreground"
              >
                {selectionMode ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                {selectionMode ? 'Esci da selezione' : 'Seleziona'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const visible = (tab === 'folders'
                    ? groupedByFolder.flatMap(([, ls]) => ls)
                    : filteredLinks).map(l => l.id);
                  setSelectionMode(true);
                  setSelectedIds(new Set(visible));
                }}
                className="cursor-pointer gap-2 text-foreground"
              >
                <CheckSquare className="w-4 h-4" />
                Seleziona tutti
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={selectedIds.size !== 1}
                onClick={() => {
                  const id = Array.from(selectedIds)[0];
                  const link = links.find(l => l.id === id);
                  if (link) { setEditLink(link); setFormOpen(true); }
                }}
                className="cursor-pointer gap-2 text-foreground"
              >
                <Edit className="w-4 h-4" />
                Modifica selezionato
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={selectedIds.size === 0}
                onClick={() => setShowDeleteSelected(true)}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Elimina selezionati ({selectedIds.size})
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                disabled={links.length === 0}
                onClick={() => { setDeleteAllText(''); setShowDeleteAll(true); }}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              >
                <AlertTriangle className="w-4 h-4" />
                Cancella tutti
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {cloudUser && (
            <Button
              size="sm"
              onClick={() => setView('account')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 text-xs font-semibold tracking-wide"
              title="Account"
            >
              <UserCog className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              ACCOUNT
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="ghost" onClick={() => setView('admin')} aria-label="Pannello Admin" className="h-8 w-8 p-0" title="Admin">
              <Shield className="w-4 h-4 text-primary" aria-hidden="true" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setTab('settings')} aria-label="Impostazioni" className="h-8 w-8 p-0">
            <Settings className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          </Button>
          <Button size="sm" variant="ghost" onClick={async () => { vault.lock(); setAuthenticated(false); await supabase.auth.signOut(); setView('landing'); }}
            aria-label="Esci e blocca la cassaforte"
            className="h-8 w-8 p-0">
            <LogOut className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 pb-16 space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {tabs.map(tb => (
            <Button
              key={tb.id}
              size="sm"
              variant={tab === tb.id ? 'default' : 'ghost'}
              onClick={() => setTab(tb.id)}
              className={`h-8 text-xs px-3 shrink-0 ${tab === tb.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              <tb.icon className="w-3.5 h-3.5 mr-1.5" />{tb.label}
            </Button>
          ))}

          {/* Topics dropdown */}
          {topics.length > 0 && (
            <Select onValueChange={(_v) => { setTab('all'); setSearch(_v); }}>
              <SelectTrigger className="h-8 text-xs bg-transparent border-none text-muted-foreground w-auto">
                <span className="flex items-center gap-1.5">
                  <ChevronDown className="w-3.5 h-3.5" />{t('topics')}
                </span>
              </SelectTrigger>
              <SelectContent>
                {topics.map(tp => (
                  <SelectItem key={tp} value={tp}>{tp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowPrivate(!showPrivate)}
              className="h-7 text-xs text-muted-foreground">
              {showPrivate ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
              {showPrivate ? t('hidePrivate') : t('showPrivate')}
            </Button>
            <Select value={sortBy} onValueChange={v => setSortBy(v as 'date' | 'name' | 'topic')}>
              <SelectTrigger className="h-7 text-xs bg-transparent border-none text-muted-foreground w-auto">
                <span>{t('sortBy')} {t(sortBy === 'date' ? 'sortDate' : sortBy === 'name' ? 'sortName' : 'sortTopic')}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">{t('sortDate')}</SelectItem>
                <SelectItem value="name">{t('sortName')}</SelectItem>
                <SelectItem value="topic">{t('sortTopic')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selection bar */}
        {(() => {
          const visibleLinks = tab === 'folders'
            ? groupedByFolder.flatMap(([, ls]) => ls)
            : filteredLinks;
          const visibleIds = visibleLinks.map(l => l.id);
          const selectedCount = visibleIds.filter(id => selectedIds.has(id)).length;
          const allSelected = visibleIds.length > 0 && selectedCount === visibleIds.length;
          if (!selectionMode || visibleLinks.length === 0) return null;
          return (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/40 border border-border">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => {
                  setSelectedIds(prev => {
                    const next = new Set(prev);
                    if (checked) visibleIds.forEach(id => next.add(id));
                    else visibleIds.forEach(id => next.delete(id));
                    return next;
                  });
                }}
                aria-label="Seleziona tutti i link visibili"
              />
              <span className="text-xs text-muted-foreground">
                {selectedCount > 0
                  ? `${selectedCount} selezionati`
                  : `Seleziona tutti (${visibleLinks.length})`}
              </span>
              {selectedCount > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="h-7 text-xs text-muted-foreground">
                    Annulla
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowDeleteSelected(true)} className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3 h-3 mr-1" />
                    Cancella selezionati
                  </Button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Links list */}
        {tab === 'folders' ? (
          <div className="space-y-4">
            {groupedByFolder.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-3">
                <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground">{search ? t('noResults') : t('noLinks')}</p>
              </motion.div>
            ) : (
              groupedByFolder.map(([folder, folderLinks]) => (
                <div key={folder} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <FolderOpen className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{folder}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{folderLinks.length}</Badge>
                  </div>
                  {folderLinks.map((link, i) => (
                    <motion.div
                      key={link.id} layout
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: i * 0.02 }}
                      className="group flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors ml-4"
                    >
                      {selectionMode && (
                        <Checkbox
                          checked={selectedIds.has(link.id)}
                          onCheckedChange={(c) => {
                            setSelectedIds(prev => {
                              const n = new Set(prev);
                              if (c) n.add(link.id); else n.delete(link.id);
                              return n;
                            });
                          }}
                          aria-label={`Seleziona ${link.title}`}
                        />
                      )}
                      <button
                        type="button"
                        aria-label={link.favorite ? `Rimuovi ${link.title} dai preferiti` : `Aggiungi ${link.title} ai preferiti`}
                        aria-pressed={link.favorite}
                        onClick={() => persist(links.map(l => l.id === link.id ? { ...l, favorite: !l.favorite } : l))}
                        className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 hover:bg-secondary/70"
                      >
                        <Star className={link.favorite ? "w-4 h-4 text-vault-gold fill-vault-gold" : "w-4 h-4 text-muted-foreground"} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary truncate">{link.title}</a>
                          {link.private && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                        </div>
                        <span className="text-xs text-muted-foreground truncate block mt-0.5">{link.url}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" aria-label={`Modifica ${link.title}`} className="h-7 w-7" onClick={() => { setEditLink(link); setFormOpen(true); }}>
                          <Edit className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label={`Elimina ${link.title}`} className="h-7 w-7" onClick={() => setDeleteTarget(link)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" aria-hidden="true" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ))
            )}
          </div>
        ) : (
        <AnimatePresence mode="popLayout">
          {filteredLinks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-16 space-y-3"
            >
              <Lock className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground">{search ? t('noResults') : t('noLinks')}</p>
              {!search && (
                <p className="text-xs text-muted-foreground">{t('addFirst')}</p>
              )}
            </motion.div>
          ) : (
            <div className="space-y-2">
              {filteredLinks.map((link, i) => (
                <motion.div
                  key={link.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.02 }}
                  className="group flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors"
                >
                  {selectionMode && (
                    <Checkbox
                      checked={selectedIds.has(link.id)}
                      onCheckedChange={(c) => {
                        setSelectedIds(prev => {
                          const n = new Set(prev);
                          if (c) n.add(link.id); else n.delete(link.id);
                          return n;
                        });
                      }}
                      aria-label={`Seleziona ${link.title}`}
                    />
                  )}
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    {link.favorite ? (
                      <Star className="w-4 h-4 text-vault-gold fill-vault-gold" />
                    ) : (
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a href={link.url} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-foreground hover:text-primary truncate">
                        {link.title}
                      </a>
                      {link.private && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                      {link.type === 'sub' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{t('sublink')}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground truncate">{link.url}</span>
                      {link.topic && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary shrink-0">
                          {link.topic}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" aria-label={`Modifica ${link.title}`} className="h-7 w-7"
                      onClick={() => { setEditLink(link); setFormOpen(true); }}>
                      <Edit className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={`Elimina ${link.title}`} className="h-7 w-7"
                      onClick={() => setDeleteTarget(link)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" aria-hidden="true" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
        )}

        {/* Stats bar */}
        <div className="text-xs text-muted-foreground text-center pt-4">
          {links.length} link{links.length !== 1 ? 's' : ''} · {topics.length} {t('topics').toLowerCase()}
        </div>
      </main>


      {/* Form Dialog */}
      <LinkFormDialog
        open={formOpen} onClose={() => setFormOpen(false)}
        link={editLink} links={links} onSave={handleSaveLink} t={t}
      />

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{t('deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteWarn')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Selected Dialog */}
      <AlertDialog open={showDeleteSelected} onOpenChange={setShowDeleteSelected}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Cancella selezionati</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare <strong className="text-destructive">{selectedIds.size} link</strong>. L'azione è irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                persist(links.filter(l => !selectedIds.has(l.id)));
                toast.success(`${selectedIds.size} link cancellati`);
                setSelectedIds(new Set());
                setShowDeleteSelected(false);
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Cancella
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Dialog */}
      <AlertDialog open={showDeleteAll} onOpenChange={(o) => { setShowDeleteAll(o); if (!o) setDeleteAllText(''); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Cancella tutti i link</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Stai per eliminare <strong className="text-destructive">tutti i {links.length} link</strong> dalla cassaforte. Questa azione è irreversibile.</p>
                <p className="text-xs">Scrivi <strong>ELIMINA</strong> per confermare:</p>
                <Input
                  value={deleteAllText}
                  onChange={(e) => setDeleteAllText(e.target.value)}
                  placeholder="ELIMINA"
                  className="bg-background border-border"
                  autoFocus
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Annulla</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteAllText !== 'ELIMINA'}
              onClick={() => { persist([]); setShowDeleteAll(false); setDeleteAllText(''); toast.success('Tutti i link sono stati cancellati'); }}
              className="bg-destructive text-destructive-foreground disabled:opacity-50"
            >
              Cancella tutti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
