import { useState } from 'react';
import { ChevronDown, ChevronUp, KeyRound, Lock, Mail, MonitorDown, ServerOff, ShieldCheck, Sparkles } from 'lucide-react';
import logoVaulty from '@/assets/logo_vaulty.png';
import { useAppStore } from '@/stores/appStore';

type View = 'landing' | 'vault' | 'auth' | 'privacy' | 'terms' | 'eula' | 'account' | 'sitemap' | 'download';

export default function SiteFooter() {
  const { setView, cloudUser } = useAppStore();
  const [open, setOpen] = useState(false);
  const go = (v: View) => (e: React.MouseEvent) => { e.preventDefault(); setView(v); window.scrollTo(0, 0); };

  const columns = [
    { title: 'Prodotto', items: ['Cassaforte link E2EE', 'Import segnalibri HTML', 'Estensione browser', 'Sync multi-dispositivo'] },
    { title: 'Sicurezza', items: ['AES-256-GCM', 'HKDF-SHA256', 'WebAuthn / biometria', 'Zero-knowledge'] },
    { title: 'Piani', items: ['Solo Locale Lifetime · €49,90', 'Cloud Sync · €9,90/anno', '10 giorni gratis'], view: 'account' as View },
  ];
  const platforms = ['Web', 'Windows', 'macOS', 'Linux', 'Android'];
  const legal: { v: View; label: string }[] = [
    { v: 'terms', label: 'Termini e Condizioni' },
    { v: 'privacy', label: 'Privacy Policy' },
    { v: 'eula', label: 'EULA' },
    { v: 'download', label: 'Download' },
    { v: 'sitemap', label: 'Mappa del sito' },
  ];
  const link = 'inline-flex items-center gap-1.5 transition-colors hover:text-foreground';

  return (
    <footer className="border-t border-border bg-card/60 mt-auto">
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <div className="flex flex-wrap items-center gap-4">
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">
            VAULTY LINK<br />© 2026-2030 ·{' '}
            <a href="https://apprentice.technology" target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">Apprentice.Technology</a>
            <br />all right reserved.
          </p>
          <div className="flex items-center gap-2">
            <img src={logoVaulty} alt="Vaulty Link" className="h-9 w-9" />
            <div>
              <p className="font-semibold text-foreground">Vaulty Link</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Zero-Knowledge · E2EE Link Vault</p>
            </div>
          </div>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? 'Chiudi menu' : 'Apri menu'}
            className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground">
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>

        {open && (
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
            <div>
              <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                La cassaforte cifrata per i tuoi link e preferiti. Solo tu hai le chiavi: nemmeno noi possiamo leggere i tuoi dati.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {[{ icon: ShieldCheck, label: 'E2EE' }, { icon: ServerOff, label: 'Zero-knowledge' }, { icon: KeyRound, label: 'Chiavi locali' }].map((b) => (
                  <li key={b.label} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <b.icon className="size-3 text-primary" /> {b.label}
                  </li>
                ))}
              </ul>
            </div>
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-foreground">{col.title}</h3>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {col.items.map((i) => (
                    <li key={i}>{col.view ? <a href="/account" onClick={go(col.view)} className="hover:text-foreground">{i}</a> : i}</li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-foreground">Piattaforme</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {platforms.map((p) => <li key={p}><a href="/download" onClick={go('download')} className="hover:text-foreground">{p}</a></li>)}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4 text-xs text-muted-foreground md:flex-row md:items-center md:justify-end">
          <div className="flex flex-wrap items-center gap-5">
            <a href="mailto:info@vaultylink.com" className={link}><Mail className="size-4" /> info@vaultylink.com</a>
            <a href="/account" onClick={go('account')} className={link}><Sparkles className="size-4" /> Piani e prezzi</a>
            <a href="/download" onClick={go('download')} className={link}><MonitorDown className="size-4" /> App desktop e Android</a>
            <a href={cloudUser ? '/account' : '/auth'} onClick={go(cloudUser ? 'account' : 'auth')} className={link}>
              <Lock className="size-4" /> {cloudUser ? 'Account' : 'Accedi'}
            </a>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/70">Legale</span>
          <nav aria-label="Legale" className="flex min-w-0 flex-nowrap items-center gap-2.5 overflow-x-auto whitespace-nowrap pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {legal.map((l) => (
              <a key={l.v} href={`/${l.v}`} onClick={go(l.v)} className="shrink-0 underline-offset-2 hover:text-foreground hover:underline">{l.label}</a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
