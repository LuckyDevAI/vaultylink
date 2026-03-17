import { motion } from 'framer-motion';
import { Users, Database, HardDrive, Clock, TrendingUp, Activity } from 'lucide-react';

interface Stats {
  total_users: number;
  total_vaults: number;
  total_storage_bytes: number;
  latest_activity: string | null;
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

function timeAgo(d: string | null): string {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Adesso';
  if (mins < 60) return `${mins}m fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  return `${days}g fa`;
}

export default function AdminStatsCards({ stats }: { stats: Stats }) {
  const vaultRate = stats.total_users > 0
    ? Math.round((stats.total_vaults / stats.total_users) * 100)
    : 0;

  const cards = [
    {
      icon: Users,
      label: 'Utenti totali',
      value: stats.total_users.toString(),
      subtitle: 'Account registrati',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    },
    {
      icon: Database,
      label: 'Vault attivi',
      value: stats.total_vaults.toString(),
      subtitle: `${vaultRate}% degli utenti`,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      borderColor: 'border-accent/20',
    },
    {
      icon: HardDrive,
      label: 'Spazio utilizzato',
      value: formatBytes(stats.total_storage_bytes),
      subtitle: stats.total_vaults > 0
        ? `~${formatBytes(Math.round(stats.total_storage_bytes / stats.total_vaults))}/vault`
        : 'Nessun vault',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      icon: Activity,
      label: 'Ultima attività',
      value: timeAgo(stats.latest_activity),
      subtitle: formatDate(stats.latest_activity),
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.4 }}
          className={`relative overflow-hidden rounded-xl bg-card border ${card.borderColor} p-4 group hover:border-primary/30 transition-colors`}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
          </div>
          <p className="text-2xl font-bold text-foreground tracking-tight">{card.value}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{card.subtitle}</p>
          {/* Subtle glow effect */}
          <div className={`absolute -top-12 -right-12 w-24 h-24 ${card.bgColor} rounded-full blur-2xl opacity-0 group-hover:opacity-50 transition-opacity`} />
        </motion.div>
      ))}
    </div>
  );
}
