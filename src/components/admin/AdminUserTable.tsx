import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Crown, Database, UserX, Search, Filter, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  has_vault: boolean;
  vault_updated_at: string | null;
  vault_size: number;
}

type SortKey = 'email' | 'created_at' | 'last_sign_in_at' | 'vault_size';

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

interface Props {
  users: AdminUser[];
  onAction: (action: string, params: Record<string, unknown>) => Promise<void>;
  onRefresh: () => void;
}

export default function AdminUserTable({ users, onAction, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'with_vault' | 'no_vault'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteVaultTarget, setDeleteVaultTarget] = useState<AdminUser | null>(null);

  const filtered = useMemo(() => {
    let list = users;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => u.email.toLowerCase().includes(q));
    }
    if (filter === 'admin') list = list.filter(u => u.roles.includes('admin'));
    if (filter === 'with_vault') list = list.filter(u => u.has_vault);
    if (filter === 'no_vault') list = list.filter(u => !u.has_vault);

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'email') cmp = a.email.localeCompare(b.email);
      else if (sortKey === 'vault_size') cmp = a.vault_size - b.vault_size;
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
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[1fr_140px_140px_90px_100px] gap-2 px-4 py-2 bg-secondary/50 text-[11px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
          <button onClick={() => toggleSort('email')} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">
            Email <SortIcon col="email" />
          </button>
          <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-foreground transition-colors">
            Registrato <SortIcon col="created_at" />
          </button>
          <button onClick={() => toggleSort('last_sign_in_at')} className="flex items-center gap-1 hover:text-foreground transition-colors">
            Ultimo accesso <SortIcon col="last_sign_in_at" />
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
          {filtered.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px_90px_100px] gap-1 sm:gap-2 px-4 py-3 items-center hover:bg-secondary/30 transition-colors group"
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
          ))}
        </div>
      </div>

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
