import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, RefreshCw, AlertTriangle, LayoutDashboard, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/appStore';
import SiteHeader from '@/components/SiteHeader';
import AdminStatsCards from '@/components/admin/AdminStatsCards';
import AdminPlansTab from '@/components/admin/AdminPlansTab';
import AdminUserTable, { type AdminUser } from '@/components/admin/AdminUserTable';
import { toast } from 'sonner';

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

export default function AdminPage() {
  const { setView } = useAppStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const handleAction = async (action: string, params: Record<string, unknown>) => {
    await adminCall(action, params);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader showBack onBack={() => setView('vault')} />

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Gestione utenti, vault e statistiche</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="border-border text-foreground gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Aggiorna</span>
          </Button>
        </motion.div>

        {error && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}

        {loading && !stats ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Caricamento dashboard...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-5">
            <TabsList className="bg-secondary border border-border">
              <TabsTrigger value="overview" className="gap-1.5 text-xs data-[state=active]:bg-card">
                <LayoutDashboard className="w-3.5 h-3.5" />
                Panoramica
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5 text-xs data-[state=active]:bg-card">
                <Shield className="w-3.5 h-3.5" />
                Gestione utenti
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-5">
              {stats && <AdminStatsCards stats={stats} />}

              {/* Quick summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <h3 className="text-sm font-semibold text-foreground mb-3">Ultimi utenti registrati</h3>
                  <div className="space-y-2.5">
                    {users.slice(0, 5).map(u => (
                      <div key={u.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                            {u.email[0].toUpperCase()}
                          </div>
                          <span className="text-foreground truncate">{u.email}</span>
                        </div>
                        <span className="text-muted-foreground shrink-0 ml-2">
                          {new Date(u.created_at).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    ))}
                    {users.length === 0 && (
                      <p className="text-muted-foreground text-xs">Nessun utente</p>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-xl border border-primary/10 bg-primary/5 p-5"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground space-y-1.5">
                      <p className="font-semibold text-foreground">Crittografia End-to-End</p>
                      <p>I dati dei vault sono crittografati con AES-256-GCM lato client. Non è possibile leggere i link degli utenti.</p>
                      <p>Puoi solo visualizzare metadati (dimensione, data aggiornamento) o eliminare i vault.</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="users">
              <AdminUserTable users={users} onAction={handleAction} onRefresh={loadData} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
