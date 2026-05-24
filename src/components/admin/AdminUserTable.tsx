import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Crown, Database, UserX, Search, Filter, ChevronDown, ChevronUp, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export type PlanType = 'free' | 'yearly' | 'lifetime' | 'frozen' | null;

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  has_vault: boolean;
  vault_updated_at: string | null;
  vault_size: number;
  plan: PlanType;
  plan_expires_at: string | null;
  auto_renew: boolean | null;
}

type SortKey = 'email' | 'created_at' | 'last_sign_in_at' | 'vault_size' | 'plan';

const PLAN_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  free: { label: 'Free', emoji: '🆓', color: 'bg-muted/40 text-muted-foreground' },
  yearly: { label: 'Yearly', emoji: '🔄', color: 'bg-primary/15 text-primary' },
  lifetime: { label: 'Lifetime', emoji: '⭐', color: 'bg-accent/15 text-accent' },
  frozen: { label: 'Frozen', emoji: '❄️', color: 'bg-blue-500/15 text-blue-400' },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

interface Props {
  users: AdminUser[];
  onAction: (action: string, params: Record<string, unknown>) => Promise<void>;
  onRefresh: () => void;
}

export default function AdminUserTable({ users, onAction, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'with_vault' | 'no_vault' | 'yearly' | 'lifetime' | 'frozen' | 'free'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteVaultTarget, setDeleteVaultTarget] = useState<AdminUser | null>(null);
  const [editPlanUser, setEditPlanUser] = useState<AdminUser | null>(null);
  const [editPlan, setEditPlan] = useState<string>('none');
  const [editExpires, setEditExpires] = useState('');
  const [editAutoRenew, setEditAutoRenew] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);

  const openPlanEditor = (user: AdminUser) => {
    setEditPlanUser(user);
    setEditPlan(user.plan || 'none');
    setEditExpires(user.plan_expires_at ? new Date(user.plan_expires_at).toISOString().slice(0, 10) : '');
    setEditAutoRenew(user.auto_renew ?? true);
  };

  const handleSavePlan = async () => {
    if (!editPlanUser) return;
    setSavingPlan(true);
    try {
      await onAction('set_plan', {
        user_id: editPlanUser.id,
        plan: editPlan === 'none' ? null : editPlan,
        expires_at: editExpires ? new Date(editExpires + 'T23:59:59Z').toISOString() : null,
        auto_renew: editAutoRenew,
      });
      toast.success(`Piano aggiornato per ${editPlanUser.email}`);
      setEditPlanUser(null);
      onRefresh();
    } catch {
      toast.error('Errore aggiornamento piano');
    } finally {
      setSavingPlan(false);
    }
  };

  const filtered = useMemo(() => {
    let list = users;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => u.email.toLowerCase().includes(q));
    }
    if (filter === 'admin') list = list.filter(u => u.roles.includes('admin'));
    if (filter === 'with_vault') list = list.filter(u => u.has_vault);
    if (filter === 'no_vault') list = list.filter(u => !u.has_vault);
    if (filter === 'yearly') list = list.filter(u => u.plan === 'yearly');
    if (filter === 'lifetime') list = list.filter(u => u.plan === 'lifetime');
    if (filter === 'frozen') list = list.filter(u => u.plan === 'frozen');
    if (filter === 'free') list = list.filter(u => !u.plan || u.plan === 'free');

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'email') cmp = a.email.localeCompare(b.email);
      else if (sortKey === 'vault_size') cmp = a.vault_size - b.vault_size;
      else if (sortKey === 'plan') cmp = (a.plan || '').localeCompare(b.plan || '');
      else {
        const aVal = a[sortKey] || '';
        const bVal = b[sortKey] || '';
        cmp = aVal.localeCompare(bVal);
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [users, search, filter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await onAction('delete_user', { user_id: deleteTarget.id });
      toast.success(`Utente ${deleteTarget.email} eliminato`);
      setDeleteTarget(null);
      onRefresh();
    } catch { toast.error('Errore eliminazione utente'); }
  };

  const handleDeleteVault = async () => {
    if (!deleteVaultTarget) return;
    try {
      await onAction('delete_vault', { user_id: deleteVaultTarget.id });
      toast.success(`Vault di ${deleteVaultTarget.email} eliminato`);
      setDeleteVaultTarget(null);
      onRefresh();
    } catch { toast.error('Errore eliminazione vault'); }
  };

  const handleToggleAdmin = async (user: AdminUser) => {
    const isAdmin = user.roles.includes('admin');
    try {
      await onAction('set_role', {
        user_id: user.id,
        role: 'admin',
        action_type: isAdmin ? 'remove' : 'add',
      });
      toast.success(isAdmin ? 'Ruolo admin rimosso' : 'Ruolo admin assegnato');
      onRefresh();
    } catch { toast.error('Errore modifica ruolo'); }
  };

  return (
    <>
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Users className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground">Utenti</span>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{filtered.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cerca email..."
                className="pl-8 h-8 w-48 text-xs bg-secondary border-border"
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="h-8 w-32 text-xs bg-secondary border-border">
                <Filter className="w-3 h-3 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="with_vault">Con vault</SelectItem>
                <SelectItem value="no_vault">Senza vault</SelectItem>
                <SelectItem value="yearly">🔄 Yearly</SelectItem>
                <SelectItem value="lifetime">⭐ Lifetime</SelectItem>
                <SelectItem value="frozen">❄️ Frozen</SelectItem>
                <SelectItem value="free">Free</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[1fr_100px_120px_120px_70px_110px] gap-2 px-4 py-2 bg-secondary/50 text-[11px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
          <button onClick={() => toggleSort('email')} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">
            Email <SortIcon col="email" />
          </button>
          <button onClick={() => toggleSort('plan')} className="flex items-center gap-1 hover:text-foreground transition-colors">
            Piano <SortIcon col="plan" />
          </button>
          <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-foreground transition-colors">
            Registrato <SortIcon col="created_at" />
          </button>
          <button onClick={() => toggleSort('last_sign_in_at')} className="flex items-center gap-1 hover:text-foreground transition-colors">
            Ultimo acc. <SortIcon col="last_sign_in_at" />
          </button>
          <button onClick={() => toggleSort('vault_size')} className="flex items-center gap-1 hover:text-foreground transition-colors">
            Vault <SortIcon col="vault_size" />
          </button>
          <span className="text-right">Azioni</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">Nessun utente trovato</div>
          )}
          {filtered.map((user, i) => {
            const planInfo = user.plan ? PLAN_LABELS[user.plan] : null;
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_120px_70px_110px] gap-1 sm:gap-2 px-4 py-3 items-center hover:bg-secondary/30 transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    user.roles.includes('admin') ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {user.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">{user.email}</span>
                    {user.roles.includes('admin') && (
                      <Badge className="bg-primary/15 text-primary text-[9px] px-1.5 py-0 h-3.5 border-0 mt-0.5">
                        <Crown className="w-2.5 h-2.5 mr-0.5" />Admin
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Plan column */}
                <div className="hidden sm:flex items-center gap-1">
                  {planInfo ? (
                    <div className="flex flex-col gap-0.5">
                      <Badge className={`${planInfo.color} text-[10px] border-0 px-1.5`}>
                        {planInfo.emoji} {planInfo.label}
                      </Badge>
                      {user.plan_expires_at && (
                        <span className="text-[9px] text-muted-foreground">
                          {formatDateShort(user.plan_expires_at)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/40">Free</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground hidden sm:block">{formatDate(user.created_at)}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">{formatDate(user.last_sign_in_at)}</span>
                <span className="text-xs hidden sm:block">
                  {user.has_vault ? (
                    <span className="text-foreground">{formatBytes(user.vault_size)}</span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </span>
                <div className="flex items-center gap-1 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" onClick={() => openPlanEditor(user)}
                    className="h-7 w-7" title="Modifica piano">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleToggleAdmin(user)}
                    className="h-7 w-7" title={user.roles.includes('admin') ? 'Rimuovi admin' : 'Rendi admin'}>
                    <Crown className={`w-3.5 h-3.5 ${user.roles.includes('admin') ? 'text-primary' : 'text-muted-foreground'}`} />
                  </Button>
                  {user.has_vault && (
                    <Button size="icon" variant="ghost" onClick={() => setDeleteVaultTarget(user)}
                      className="h-7 w-7" title="Elimina vault">
                      <Database className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(user)}
                    className="h-7 w-7" title="Elimina utente">
                    <UserX className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Edit plan dialog */}
      <Dialog open={!!editPlanUser} onOpenChange={() => setEditPlanUser(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Modifica piano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground">{editPlanUser?.email}</div>

            <div className="space-y-2">
              <Label className="text-foreground text-xs">Tipo piano</Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno (Free)</SelectItem>
                  <SelectItem value="yearly">🔄 Yearly — €9,91/anno</SelectItem>
                  <SelectItem value="lifetime">⭐ Lifetime — €19,90</SelectItem>
                  <SelectItem value="frozen">❄️ Frozen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(editPlan === 'yearly' || editPlan === 'frozen') && (
              <>
                <div className="space-y-2">
                  <Label className="text-foreground text-xs">Data scadenza</Label>
                  <Input
                    type="date"
                    value={editExpires}
                    onChange={e => setEditExpires(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
                {editPlan === 'yearly' && (
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground text-xs">Rinnovo automatico</Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Disdicibile entro 7 giorni dalla scadenza</p>
                    </div>
                    <Switch checked={editAutoRenew} onCheckedChange={setEditAutoRenew} />
                  </div>
                )}
              </>
            )}

            {editPlan === 'frozen' && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                ❄️ Piano Frozen: il rinnovo annuale non è stato effettuato. L'accesso cloud è sospeso.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlanUser(null)} className="border-border">
              Annulla
            </Button>
            <Button onClick={handleSavePlan} disabled={savingPlan}>
              {savingPlan ? 'Salvataggio...' : 'Salva piano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete user dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Elimina utente</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare <strong>{deleteTarget?.email}</strong> e tutti i suoi dati. Questa azione è irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground">
              Elimina utente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete vault dialog */}
      <AlertDialog open={!!deleteVaultTarget} onOpenChange={() => setDeleteVaultTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Elimina vault</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare il vault cloud di <strong>{deleteVaultTarget?.email}</strong>. I dati locali dell'utente non saranno intaccati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVault} className="bg-destructive text-destructive-foreground">
              Elimina vault
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
