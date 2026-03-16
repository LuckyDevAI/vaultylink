import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Shield, Trash2, Database, BarChart3, ArrowLeft,
  Crown, RefreshCw, AlertTriangle, HardDrive, Clock, UserX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/appStore';
import SiteHeader from '@/components/SiteHeader';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  has_vault: boolean;
  vault_updated_at: string | null;
  vault_size: number;
}

interface Stats {
  total_users: number;
  total_vaults: number;
  total_storage_bytes: number;
  latest_activity: string | null;
}

async function adminCall(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('admin', {
    body: { action, ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

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

export default function AdminPage() {
  const { setView } = useAppStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteVaultTarget, setDeleteVaultTarget] = useState<AdminUser | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, statsRes] = await Promise.all([
        adminCall('list_users'),
        adminCall('stats'),
      ]);
      setUsers(usersRes.users);
      setStats(statsRes);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Errore';
      setError(msg);
      if (msg === 'Forbidden') {
        toast.error('Accesso negato: non sei admin');
        setView('vault');
      }
    } finally {
      setLoading(false);
    }
  }, [setView]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await adminCall('delete_user', { user_id: deleteTarget.id });
      toast.success(`Utente ${deleteTarget.email} eliminato`);
      setDeleteTarget(null);
      loadData();
    } catch { toast.error('Errore eliminazione utente'); }
  };

  const handleDeleteVault = async () => {
    if (!deleteVaultTarget) return;
    try {
      await adminCall('delete_vault', { user_id: deleteVaultTarget.id });
      toast.success(`Vault di ${deleteVaultTarget.email} eliminato`);
      setDeleteVaultTarget(null);
      loadData();
    } catch { toast.error('Errore eliminazione vault'); }
  };

  const handleToggleAdmin = async (user: AdminUser) => {
    const isAdmin = user.roles.includes('admin');
    try {
      await adminCall('set_role', {
        user_id: user.id,
        role: 'admin',
        action_type: isAdmin ? 'remove' : 'add',
      });
      toast.success(isAdmin ? 'Ruolo admin rimosso' : 'Ruolo admin assegnato');
      loadData();
    } catch { toast.error('Errore modifica ruolo'); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader showBack onBack={() => setView('vault')} />

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Pannello Admin</h1>
              <p className="text-xs text-muted-foreground">Gestione utenti e vault</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={loadData} disabled={loading}
            className="border-border text-foreground">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>

        {error && !loading && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Users, label: 'Utenti', value: stats.total_users },
              { icon: Database, label: 'Vault attivi', value: stats.total_vaults },
              { icon: HardDrive, label: 'Spazio totale', value: formatBytes(stats.total_storage_bytes) },
              { icon: Clock, label: 'Ultima attività', value: stats.latest_activity ? formatDate(stats.latest_activity) : '—' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl bg-card border border-border"
              >
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Users table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="bg-card/50 px-4 py-3 border-b border-border flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Utenti registrati</span>
            <Badge variant="secondary" className="text-[10px] ml-1">{users.length}</Badge>
          </div>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Caricamento...</div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {user.email}
                      </span>
                      {user.roles.includes('admin') && (
                        <Badge className="bg-primary/20 text-primary text-[10px] px-1.5 py-0 h-4">
                          <Crown className="w-2.5 h-2.5 mr-0.5" />Admin
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span>Registrato: {formatDate(user.created_at)}</span>
                      <span>Ultimo accesso: {formatDate(user.last_sign_in_at)}</span>
                      {user.has_vault && (
                        <>
                          <span>Vault: {formatBytes(user.vault_size)}</span>
                          <span>Aggiornato: {formatDate(user.vault_updated_at)}</span>
                        </>
                      )}
                      {!user.has_vault && <span className="text-muted-foreground/50">Nessun vault</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => handleToggleAdmin(user)}
                      className="h-7 text-xs text-muted-foreground" title={user.roles.includes('admin') ? 'Rimuovi admin' : 'Rendi admin'}>
                      <Crown className={`w-3.5 h-3.5 ${user.roles.includes('admin') ? 'text-primary' : ''}`} />
                    </Button>
                    {user.has_vault && (
                      <Button size="sm" variant="ghost" onClick={() => setDeleteVaultTarget(user)}
                        className="h-7 text-xs text-muted-foreground" title="Elimina vault">
                        <Database className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(user)}
                      className="h-7 text-xs text-destructive" title="Elimina utente">
                      <UserX className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Info E2EE */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
          <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Crittografia End-to-End</p>
            <p>I dati dei vault sono crittografati con AES-256-GCM. Non è possibile leggere i link degli utenti. Puoi solo visualizzare metadati (dimensione, data aggiornamento) o eliminare i vault.</p>
          </div>
        </div>
      </main>

      {/* Delete user dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-background border-border">
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
        <AlertDialogContent className="bg-background border-border">
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
    </div>
  );
}
