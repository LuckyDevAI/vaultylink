import { useAppStore } from '@/stores/appStore';
import SiteHeader from '@/components/SiteHeader';
import Seo from '@/components/Seo';
import { Home, Shield, FileText, ScrollText, LogIn, Lock, User, Map, Languages } from 'lucide-react';
import { LANG_NAMES, type LangCode } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Entry = { path: string; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; view?: string };

const publicEntries: Entry[] = [
  { path: '/', label: 'Home', desc: 'Pagina principale di VaultyLink', icon: Home, view: 'landing' },
  { path: '/privacy', label: 'Privacy Policy', desc: 'Come proteggiamo i tuoi dati', icon: Shield, view: 'privacy' },
  { path: '/terms', label: 'Termini di servizio', desc: 'Condizioni di utilizzo', icon: FileText, view: 'terms' },
  { path: '/eula', label: 'EULA', desc: 'Contratto di licenza utente finale', icon: ScrollText, view: 'eula' },
];

const appEntries: Entry[] = [
  { path: '/auth', label: 'Accesso', desc: 'Login e registrazione', icon: LogIn, view: 'auth' },
  { path: '/vault', label: 'Vault', desc: 'Il tuo vault cifrato (richiede accesso)', icon: Lock, view: 'vault' },
  { path: '/account', label: 'Account', desc: 'Gestione account e abbonamento', icon: User, view: 'account' },
];

export default function SitemapPage() {
  const { setView, lang, setLang } = useAppStore();

  const go = (e: Entry) => {
    if (e.view) setView(e.view as never);
    else window.location.assign(e.path);
  };

  const Section = ({ title, items }: { title: string; items: Entry[] }) => (
    <section className="space-y-4">
      <h2 className="text-sm font-mono uppercase tracking-widest text-primary">{title}</h2>
      <ul className="grid sm:grid-cols-2 gap-3">
        {items.map((e) => (
          <li key={e.path}>
            <button
              onClick={() => go(e)}
              className="w-full text-left group flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:border-primary/60 hover:bg-card/80 transition-colors"
            >
              <e.icon className="w-5 h-5 mt-0.5 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {e.label}
                </div>
                <div className="text-xs font-mono text-muted-foreground mt-0.5 truncate">{e.path}</div>
                <div className="text-sm text-muted-foreground mt-1">{e.desc}</div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Sitemap · VaultyLink"
        description="Tutte le pagine di VaultyLink: home, privacy, termini, EULA, accesso, vault e account."
        path="/sitemap"
      />
      <SiteHeader showBack onBack={() => setView('landing')} />

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <Map className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Sitemap</h1>
          </div>
          <p className="text-muted-foreground">
            Panoramica delle pagine di VaultyLink.{' '}
            <a href="/sitemap.xml" className="text-primary hover:underline font-mono text-sm">
              sitemap.xml
            </a>{' '}
            per i motori di ricerca.
          </p>
        </header>

        <Section title="Pagine pubbliche" items={publicEntries} />
        <Section title="Area applicazione" items={appEntries} />

        <section className="space-y-3 max-w-sm">
          <h2 className="text-sm font-mono uppercase tracking-widest text-primary flex items-center gap-2">
            <Languages className="w-4 h-4" /> Scegli lingua
          </h2>
          <Select value={lang} onValueChange={(v) => setLang(v as LangCode)}>
            <SelectTrigger className="w-full bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(LANG_NAMES) as [LangCode, string][]).map(([code, name]) => (
                <SelectItem key={code} value={code}>
                  <span className="flex items-center gap-2">
                    <span>{name}</span>
                    <span className="font-mono text-xs text-muted-foreground uppercase">{code}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>
      </main>
    </div>
  );
}
