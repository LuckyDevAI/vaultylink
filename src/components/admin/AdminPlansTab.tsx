import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Users, Crown, Infinity, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdminUser } from './AdminUserTable';

interface PlanStats {
  yearly: { count: number; users: { email: string; subscription_end?: string }[] };
  trial: { count: number; users: { email: string; subscription_end?: string }[] };
  lifetime: { count: number; users: { email: string }[] };
  free: { count: number };
}

async function adminCall(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('admin', {
    body: { action, ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function AdminPlansTab({ users }: { users: AdminUser[] }) {
  const [planStats, setPlanStats] = useState<PlanStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await adminCall('plan_stats');
      setPlanStats(data);
    } catch (e) {
      toast.error('Errore caricamento piani');
      // Fallback: show just user count as free
      setPlanStats({
        yearly: { count: 0, users: [] },
        trial: { count: 0, users: [] },
        lifetime: { count: 0, users: [] },
        free: { count: users.length },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  if (!planStats) return null;

  const totalPaid = planStats.yearly.count + planStats.lifetime.count;

  const plans = [
    {
      name: 'Cloud Sync annuale',
      icon: '🔄',
      count: planStats.yearly.count,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
      price: '€9,91/anno',
      users: planStats.yearly.users,
    },
    {
      name: 'Cloud Sync in prova',
      icon: '⏳',
      count: planStats.trial?.count ?? 0,
      color: 'text-primary', bgColor: 'bg-primary/10', borderColor: 'border-primary/20',
      price: '10 giorni gratis', users: planStats.trial?.users ?? [],
    },
    {
      name: 'Lifetime',
      icon: '⭐',
      count: planStats.lifetime.count,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      borderColor: 'border-accent/20',
      price: '€49,90 una tantum',
      users: planStats.lifetime.users,
    },
    {
      name: 'Free',
      icon: '👤',
      count: planStats.free.count,
      color: 'text-muted-foreground',
      bgColor: 'bg-secondary',
      borderColor: 'border-border',
      price: 'Gratuito',
      users: [],
    },
  ];

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`rounded-xl border ${plan.borderColor} bg-card p-5 relative overflow-hidden`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{plan.icon}</span>
                <span className="text-sm font-semibold text-foreground">{plan.name}</span>
              </div>
              <Badge variant="secondary" className="text-[10px] h-5">{plan.price}</Badge>
            </div>
            <p className="text-3xl font-bold text-foreground">{plan.count}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {plan.count === 1 ? 'utente' : 'utenti'}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Revenue estimate */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-primary/20 bg-primary/5 p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Riepilogo revenue</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
          <div>
            <p className="text-xs text-muted-foreground">Utenti paganti</p>
            <p className="text-lg font-bold text-foreground">{totalPaid}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tasso conversione</p>
            <p className="text-lg font-bold text-foreground">
              {users.length > 0 ? Math.round((totalPaid / users.length) * 100) : 0}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">MRR stimato</p>
            <p className="text-lg font-bold text-primary">
              €{((planStats.yearly.count * 9.91) / 12).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Revenue lifetime</p>
            <p className="text-lg font-bold text-accent">
              €{(planStats.lifetime.count * 49.90).toFixed(2)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Paid users list */}
      {(planStats.yearly.users.length > 0 || planStats.lifetime.users.length > 0 || (planStats.trial?.count ?? 0) > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Crown className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Utenti con piano attivo</span>
            <Badge variant="secondary" className="text-[10px] h-5">{totalPaid}</Badge>
          </div>
          <div className="divide-y divide-border">
            {(planStats.trial?.users ?? []).map(u => (
              <div key={u.email} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-foreground break-all">{u.email}</span>
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant="secondary">Prova gratuita</Badge>
                  {u.subscription_end && <span className="text-xs text-muted-foreground">fine {new Date(u.subscription_end).toLocaleDateString('it-IT')}</span>}
                </div>
              </div>
            ))}
            {planStats.yearly.users.map(u => (
              <div key={u.email} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                    {u.email[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-foreground truncate">{u.email}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="bg-primary/15 text-primary text-[10px] border-0">🔄 Yearly</Badge>
                  {u.subscription_end && (
                    <span className="text-[10px] text-muted-foreground">
                      scade {new Date(u.subscription_end).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {planStats.lifetime.users.map(u => (
              <div key={u.email} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent shrink-0">
                    {u.email[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-foreground truncate">{u.email}</span>
                </div>
                <Badge className="bg-accent/15 text-accent text-[10px] border-0">⭐ Lifetime</Badge>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={loadPlans} className="border-border text-foreground gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
          Aggiorna piani
        </Button>
      </div>
    </div>
  );
}
