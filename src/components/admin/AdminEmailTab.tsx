import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Send, RefreshCw, FileText, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdminUser } from './AdminUserTable';

const EMAIL_TEMPLATES = [
  { id: 'plan-expiry-10', name: 'Avviso scadenza (10 giorni)', emoji: '📩' },
  { id: 'plan-expiry-3', name: 'Avviso urgente (3 giorni)', emoji: '⚠️' },
  { id: 'plan-frozen', name: 'Piano sospeso (Frozen)', emoji: '❄️' },
  { id: 'custom', name: 'Email personalizzata', emoji: '✍️' },
];

async function adminCall(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('admin', {
    body: { action, ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function AdminEmailTab({ users }: { users: AdminUser[] }) {
  const [template, setTemplate] = useState('plan-expiry-10');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [checkingExpiry, setCheckingExpiry] = useState(false);

  const handleSendEmail = async () => {
    if (!recipient) {
      toast.error('Inserisci un destinatario');
      return;
    }
    setSending(true);
    try {
      await adminCall('send_email', {
        template,
        recipient,
        subject: subject || undefined,
        body: body || undefined,
      });
      toast.success(`Email inviata a ${recipient}`);
      setRecipient('');
      setSubject('');
      setBody('');
    } catch (e) {
      toast.error(`Errore invio email: ${e instanceof Error ? e.message : 'Errore'}`);
    } finally {
      setSending(false);
    }
  };

  const handleCheckExpiry = async () => {
    setCheckingExpiry(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-plan-expiry', {
        body: {},
      });
      if (error) throw error;
      const result = data;
      toast.success(
        `Controllo completato: ${result.notified_10d || 0} notifiche 10gg, ${result.notified_3d || 0} notifiche 3gg, ${result.frozen || 0} congelati`
      );
    } catch (e) {
      toast.error(`Errore: ${e instanceof Error ? e.message : 'Errore'}`);
    } finally {
      setCheckingExpiry(false);
    }
  };

  const usersWithEmail = users.filter(u => u.email);
  const isCustom = template === 'custom';

  return (
    <div className="space-y-5">
      {/* Template overview */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Template email disponibili</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EMAIL_TEMPLATES.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                template === t.id
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border bg-secondary/30 hover:bg-secondary/50'
              }`}
              onClick={() => setTemplate(t.id)}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{t.emoji}</span>
                <span className="text-sm font-medium text-foreground">{t.name}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Send email form */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Invia email</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground text-xs">Destinatario</Label>
            <Select value={recipient} onValueChange={setRecipient}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Seleziona utente..." />
              </SelectTrigger>
              <SelectContent>
                {usersWithEmail.map(u => (
                  <SelectItem key={u.id} value={u.email}>
                    {u.email} {u.plan ? `(${u.plan})` : '(free)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder="oppure inserisci email manualmente..."
              className="bg-secondary border-border text-xs"
            />
          </div>

          {isCustom && (
            <>
              <div className="space-y-2">
                <Label className="text-foreground text-xs">Oggetto</Label>
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Oggetto email..."
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground text-xs">Corpo email (HTML o testo)</Label>
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Scrivi il contenuto dell'email..."
                  className="bg-secondary border-border min-h-[120px]"
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={handleSendEmail} disabled={sending || !recipient} className="gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {sending ? 'Invio...' : 'Invia email'}
            </Button>
            <Badge variant="secondary" className="text-[10px]">
              {EMAIL_TEMPLATES.find(t => t.id === template)?.emoji}{' '}
              {EMAIL_TEMPLATES.find(t => t.id === template)?.name}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Cron actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-primary/20 bg-primary/5 p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Controllo scadenze manuali</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Esegui manualmente il controllo delle scadenze dei piani. Invierà email di avviso (10 e 3 giorni prima) 
          e congelerà i piani scaduti senza rinnovo automatico.
        </p>
        <Button
          onClick={handleCheckExpiry}
          disabled={checkingExpiry}
          variant="outline"
          className="border-primary/30 text-foreground gap-1.5 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checkingExpiry ? 'animate-spin' : ''}`} />
          {checkingExpiry ? 'Controllo in corso...' : 'Esegui controllo scadenze'}
        </Button>
      </motion.div>
    </div>
  );
}
