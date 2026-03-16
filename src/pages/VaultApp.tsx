import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Plus, Search, Star, Clock, Eye, EyeOff, Settings,
  ExternalLink, Trash2, Edit, ArrowLeft, ChevronDown, LogOut,
  Shield, Globe, Download, Upload, KeyRound, FolderOpen,
  Cloud, CloudOff, Check, Loader2, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      if (pw !== confirmPw) { toast.error('Passwords do not match'); return; }
      if (pw.length < 4) { toast.error('Password too short'); return; }
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

  if (isNew === null) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto vault-glow">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">VaultLink</h1>
          <p className="text-sm text-muted-foreground">{isNew ? t('setup') : t('locked')}</p>
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
            <Label className="text-muted-foreground text-xs">{t('masterPw')}</Label>
            <Input
              type="password" value={pw} onChange={e => setPw(e.target.value)}
              className="bg-secondary border-border mt-1" autoFocus={!biometric.enabled}
            />
          </div>
          {isNew && (
            <div>
              <Label className="text-muted-foreground text-xs">{t('confirmPw')}</Label>
              <Input
                type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                className="bg-secondary border-border mt-1"
              />
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full bg-primary text-primary-foreground">
            {busy ? '...' : isNew ? t('createVault') : t('unlock')}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground font-mono">{t('encrypted')}</p>
      </motion.div>
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
function SettingsPanel({ onBack, vault, biometric, onImportDone }: {
  onBack: () => void;
  vault: ReturnType<typeof useVault>;
  biometric: ReturnType<typeof useBiometric>;
  onImportDone?: (links: VaultLink[]) => void;
}) {
  const { lang, setLang } = useAppStore();
  const { t } = useTranslation(lang);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const handleChangePw = async () => {
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    try {
      await vault.changePassword(newPw);
      // Update biometric stored password if enabled
      if (biometric.enabled) {
        await biometric.updatePassword(newPw);
      }
      toast.success('Password updated');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch {
      toast.error('Failed to change password');
    }
  };

  const handleToggleBiometric = async () => {
    if (biometric.enabled) {
      await biometric.disable();
      toast.success('Biometria disattivata');
    } else {
      // We need the current master password to store it
      if (!currentPw) {
        toast.error('Inserisci la password attuale per attivare la biometria');
        return;
      }
      // Verify the password first
      const res = await vault.unlock(currentPw);
      if (!res.ok) {
        toast.error('Password errata');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
        <h2 className="text-lg font-semibold text-foreground">{t('settingsTitle')}</h2>
      </div>

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

      {/* Biometric */}
      {biometric.available && (
        <>
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
                <Label className="text-xs text-muted-foreground">Password attuale (per attivare)</Label>
                <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                  className="bg-secondary border-border mt-1" placeholder="Inserisci password master" />
              </div>
            )}
          </div>
          <Separator className="bg-border" />
        </>
      )}

      {/* Security */}
      <div className="space-y-3">
        <Label className="text-sm text-muted-foreground flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> {t('changePw')}
        </Label>
        <Input type="password" placeholder={t('currentPw')} value={currentPw}
          onChange={e => setCurrentPw(e.target.value)} className="bg-secondary border-border" />
        <Input type="password" placeholder={t('newPw')} value={newPw}
          onChange={e => setNewPw(e.target.value)} className="bg-secondary border-border" />
        <Input type="password" placeholder={t('confirmNewPw')} value={confirmPw}
          onChange={e => setConfirmPw(e.target.value)} className="bg-secondary border-border" />
        <Button onClick={handleChangePw} className="bg-primary text-primary-foreground">{t('changePwBtn')}</Button>
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
      </div>

      <Separator className="bg-border" />

      {/* About */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>{t('version')}: 10.10.10 (PWA)</p>
        <p>{t('developer')}: VaultLink Software</p>
        <p>{t('builtWith')}: React, Web Crypto API, IndexedDB</p>
        <p className="pt-2">{t('privacyNote')}</p>
      </div>
    </div>
  );
}

// ── Main Vault App ────────────────────────────────────────────────────────────
export default function VaultApp() {
  const vault = useVault();
  const biometric = useBiometric();
  const { lang, setView, cloudUser } = useAppStore();
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

  // Load links when authenticated — pull from cloud first if available
  useEffect(() => {
    if (authenticated && !vault.locked) {
      const load = async () => {
        if (cloudUser) {
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
        if (cloudUser && localLinks.length > 0) {
          vault.pushToCloud()
            .then(() => {
              setSyncStatus('synced');
              setTimeout(() => setSyncStatus('idle'), 3000);
            })
            .catch(() => setSyncStatus('error'));
        }
      };
      load();
    }
  }, [authenticated, vault.locked]);

  

  const persist = useCallback(async (newLinks: VaultLink[]) => {
    setLinks(newLinks);
    await vault.saveLinks(newLinks);
    if (cloudUser) {
      setSyncStatus('syncing');
      vault.syncCloud()
        .then(() => {
          setSyncStatus('synced');
          setTimeout(() => setSyncStatus('idle'), 3000);
        })
        .catch(() => setSyncStatus('error'));
    }
  }, [vault, cloudUser]);

  const handleRetrySync = useCallback(() => {
    if (!cloudUser) return;
    setSyncStatus('syncing');
    vault.syncCloud()
      .then(() => {
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 3000);
      })
      .catch(() => setSyncStatus('error'));
  }, [vault, cloudUser]);

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
      toast.error('Password biometrica non valida. Riprova con la password.');
    }
  }, [vault]);

  if (!authenticated) {
    return <AuthScreen onAuth={handleAuth} vault={vault} biometric={biometric} onBiometricUnlock={handleBiometricUnlock} />;
  }

  if (tab === 'settings') {
    return (
      <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto">
        <SettingsPanel onBack={() => setTab('all')} vault={vault} biometric={biometric} onImportDone={(newLinks) => setLinks(newLinks)} />
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
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2 mr-auto">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-semibold text-foreground text-sm hidden sm:inline">VaultLink</span>
            {cloudUser && <SyncIndicator status={syncStatus} onRetry={handleRetrySync} />}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('search')}
              className="pl-9 bg-secondary border-border h-8 text-sm"
            />
          </div>
          <Button size="sm" onClick={() => { setEditLink(null); setFormOpen(true); }}
            className="bg-primary text-primary-foreground h-8 px-3 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />{t('addLink')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setTab('settings')} className="h-8 w-8 p-0">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button size="sm" variant="ghost" onClick={async () => { vault.lock(); setAuthenticated(false); await supabase.auth.signOut(); setView('landing'); }}
            className="h-8 w-8 p-0">
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
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
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        {link.favorite ? <Star className="w-4 h-4 text-vault-gold fill-vault-gold" /> : <ExternalLink className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary truncate">{link.title}</a>
                          {link.private && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                        </div>
                        <span className="text-xs text-muted-foreground truncate block mt-0.5">{link.url}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditLink(link); setFormOpen(true); }}>
                          <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteTarget(link)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
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
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => { setEditLink(link); setFormOpen(true); }}>
                      <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => setDeleteTarget(link)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
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
    </div>
  );
}
