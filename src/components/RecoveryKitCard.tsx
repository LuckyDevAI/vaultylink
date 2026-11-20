import { ShieldCheck, Printer, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  onExportBackup: () => void;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function buildRecoveryKitHtml(email: string, date: string): string {
  const e = escapeHtml(email || '—');
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Vaulty Link — Kit di emergenza</title>
<style>body{font-family:Arial,sans-serif;max-width:720px;margin:32px auto;color:#111;line-height:1.5}
h1{color:#0fa968;margin:0}.box{border:2px solid #0fa968;border-radius:8px;padding:16px;margin:16px 0}
.line{border-bottom:1px solid #999;height:32px;margin:8px 0 16px}small{color:#555}</style></head><body>
<h1>Vaulty Link — Kit di emergenza</h1><small>Creato il ${escapeHtml(date)} · Conserva questo foglio in un luogo sicuro (cassaforte, cassetto chiuso).</small>
<div class="box"><b>Account:</b> ${e}<br><b>Sito:</b> https://vaultylink.com</div>
<div class="box"><b>Il tuo PIN (scrivilo a mano, mai al computer):</b><div class="line"></div>
<b>Dove hai salvato il file di backup .vlenc:</b><div class="line"></div></div>
<h3>Perché nessuno può recuperare il tuo PIN</h3>
<p>Vaulty Link cifra i tuoi link sul tuo dispositivo. Non conosciamo il tuo PIN e non lo salviamo: per questo nessun hacker e nessun dipendente può leggere i tuoi dati. Se perdi il PIN, non possiamo reimpostarlo.</p>
<h3>Cosa fare se dimentichi il PIN</h3>
<ol><li>Recupera il PIN da questo foglio.</li><li>Se non c'è, accedi al tuo account e reimposta la cassaforte: i link andranno persi.</li>
<li>Poi importa il backup .vlenc più recente (serve il PIN con cui era stato creato).</li></ol>
<p><small>Consiglio: scarica un nuovo backup ogni mese o dopo modifiche importanti.</small></p>
</body></html>`;
}

export function RecoveryKitCard({ onExportBackup }: Props) {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => { void supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null)); }, []);
  const handlePrint = () => {
    const html = buildRecoveryKitHtml(email ?? '', new Date().toLocaleDateString('it-IT'));
    const w = window.open('', '_blank');
    if (!w) {
      const blob = new Blob([html], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'vaultylink-kit-emergenza.html'; a.click();
      return;
    }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border border-primary/40 bg-primary/5">
      <div className="flex items-center gap-2 text-foreground font-semibold">
        <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" /> Kit di emergenza
      </div>
      <p className="text-sm text-muted-foreground">
        Non conosciamo il tuo PIN: per questo nessuno, nemmeno noi, può leggere i tuoi link.
        Proprio per questo non possiamo recuperarlo. Stampa il kit, scrivi il PIN a mano e conserva un backup.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" aria-hidden="true" />Stampa kit di emergenza</Button>
        <Button size="sm" variant="outline" onClick={onExportBackup}><Download className="w-4 h-4 mr-2" aria-hidden="true" />Scarica backup cifrato</Button>
      </div>
    </div>
  );
}
