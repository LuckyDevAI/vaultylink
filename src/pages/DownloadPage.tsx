import { useEffect, useState } from 'react';
import { ArrowUpRight, Download, Globe, Monitor, Apple, Laptop, Check, Puzzle } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import logoVaulty from '@/assets/logo_vaulty.png';
import { useAppStore } from '@/stores/appStore';

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function DownloadPage() {
  const { lang } = useAppStore();
  const it = lang === 'it';
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const ua = navigator.userAgent;
  const platform = /Windows/i.test(ua) ? 'Windows' : /Macintosh/i.test(ua) ? 'macOS' : /Linux/i.test(ua) && !/Android/i.test(ua) ? 'Linux' : null;

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const handleInstalled = () => { setInstalled(true); setInstallPrompt(null); };
    setInstalled(window.matchMedia('(display-mode: standalone)').matches);
    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) { setHelpOpen(true); return; }
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch { setHelpOpen(true); }
  };

  const downloadExtension = () => {
    fetch('/vaultylink-extension.zip')
      .then((res) => { if (!res.ok) throw new Error(String(res.status)); return res.blob(); })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'vaultylink-extension.zip';
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => alert(it ? 'Download non riuscito, riprova.' : 'Download failed, try again.'));
  };

  const platforms = [
    { name: 'Windows', icon: Monitor, detail: 'Windows 10 / 11 · x64' },
    { name: 'macOS', icon: Apple, detail: 'Intel / Apple Silicon' },
    { name: 'Linux', icon: Laptop, detail: 'Linux · x64' },
  ].sort((a, b) => Number(b.name === platform) - Number(a.name === platform));

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <SiteHeader />
      <main className="w-full max-w-6xl mx-auto px-6 py-10 sm:py-16 flex-1">
        <div className="flex items-center gap-4 mb-5">
          <img src={logoVaulty} alt="Vaulty Link" className="w-16 h-16 object-contain" />
          <p className="text-primary font-mono text-sm">DOWNLOAD</p>
        </div>
        <h1 className="text-4xl sm:text-5xl font-semibold">Vaulty Link</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">{it ? 'La tua cassaforte, anche sul desktop.' : 'Your vault, on your desktop too.'}</p>

        <section className="mt-10 border-y border-border py-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="flex items-center gap-3"><Globe className="w-6 h-6 text-primary" /><h2 className="text-2xl font-semibold">{it ? 'Versione web' : 'Web app'}</h2><span className="text-xs text-primary font-mono">{it ? 'DISPONIBILE' : 'AVAILABLE'}</span></div>
            <p className="text-muted-foreground mt-3">Windows · macOS · Linux</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild><a href="https://vaultylink.com/vault"><ArrowUpRight />{it ? 'Apri Vaulty Link' : 'Open Vaulty Link'}</a></Button>
            <Button variant="outline" onClick={install} disabled={installed}>{installed ? <Check /> : <Download />}{installed ? (it ? 'Già installata' : 'Installed') : (it ? 'Installa dal browser' : 'Install from browser')}</Button>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="desktop-heading">
          <h2 id="desktop-heading" className="text-2xl font-semibold">{it ? 'App desktop' : 'Desktop apps'}</h2>
          <div className="grid md:grid-cols-3 gap-5 mt-5">
            {platforms.map(({ name, icon: Icon, detail }) => (
              <article key={name} className={`border rounded-lg p-6 flex flex-col gap-5 ${name === platform ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                <div className="flex items-center justify-between gap-2"><Icon className="w-8 h-8 text-muted-foreground" />{name === platform && <span className="text-xs text-primary">{it ? 'Il tuo sistema' : 'Your system'}</span>}</div>
                <div><h3 className="text-xl font-semibold">{name}</h3><p className="text-sm text-muted-foreground mt-2">{detail}</p></div>
                <p className="text-sm text-muted-foreground">{it ? 'Pacchetto non ancora disponibile.' : 'Package not yet available.'}</p>
                <Button disabled variant="secondary" className="w-full"><Download />{it ? 'Prossimamente' : 'Coming soon'}</Button>
              </article>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-5">{it ? 'Microsoft Store: pubblicazione non ancora disponibile.' : 'Microsoft Store: listing not yet available.'}</p>
        </section>
        <section className="mt-10 pt-8 border-t border-border" aria-labelledby="ext-heading">
          <div className="flex items-center gap-3"><Puzzle className="w-6 h-6 text-primary" /><h2 id="ext-heading" className="text-2xl font-semibold">{it ? 'Estensione browser' : 'Browser extension'}</h2><span className="text-xs text-primary font-mono">{it ? 'OPZIONALE' : 'OPTIONAL'}</span></div>
          <p className="text-muted-foreground mt-3">Chrome · Edge · Brave · Opera · Arc</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{it ? 'Salva la pagina aperta con 1 clic o dal tasto destro. I link vengono cifrati appena sblocchi la cassaforte.' : 'Save the current page in 1 click or from the right-click menu. Links are encrypted when you unlock your vault.'}</p>
          <Button className="mt-5" onClick={downloadExtension}><Download />{it ? 'Scarica estensione (.zip)' : 'Download extension (.zip)'}</Button>
          <ol className="mt-6 space-y-2 text-sm text-muted-foreground list-decimal ps-5">
            <li>{it ? 'Estrai il file .zip in una cartella.' : 'Unzip the file into a folder.'}</li>
            <li>{it ? 'Apri chrome://extensions (o edge://extensions).' : 'Open chrome://extensions (or edge://extensions).'}</li>
            <li>{it ? 'Attiva «Modalità sviluppatore» in alto a destra.' : 'Enable “Developer mode” at the top right.'}</li>
            <li>{it ? 'Clicca «Carica estensione non pacchettizzata» e scegli la cartella estratta.' : 'Click “Load unpacked” and select the unzipped folder.'}</li>
          </ol>
        </section>
        <section className="mt-10 pt-8 border-t border-border">
          <h2 className="text-xl font-semibold">{it ? 'Versioni e note di rilascio' : 'Versions & release notes'}</h2>
          <p className="text-muted-foreground text-sm mt-3">{it ? 'Le versioni e le note saranno pubblicate insieme ai pacchetti desktop.' : 'Versions and release notes will be published with the desktop packages.'}</p>
        </section>
      </main>
      <SiteFooter />
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg rounded-lg">
          <DialogHeader><DialogTitle>{it ? 'Installa Vaulty Link' : 'Install Vaulty Link'}</DialogTitle><DialogDescription>{it ? 'L’installazione è disponibile sul sito pubblico, nei browser compatibili.' : 'Installation is available on the public website in compatible browsers.'}</DialogDescription></DialogHeader>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>{it ? 'Chrome / Edge: apri il menu del browser e scegli «Installa Vaulty Link» o «Installa questa pagina come app».' : 'Chrome / Edge: open the browser menu and choose “Install Vaulty Link” or “Install this page as an app”.'}</li>
            <li>{it ? 'Safari su Mac: dal menu File scegli «Aggiungi al Dock».' : 'Safari on Mac: choose “Add to Dock” from the File menu.'}</li>
            <li>{it ? 'Se il browser non propone l’installazione, puoi continuare a usare il sito web.' : 'If your browser does not offer installation, continue using the website.'}</li>
          </ul>
          <Button asChild><a href="https://vaultylink.com/download"><ArrowUpRight />{it ? 'Apri il sito pubblico' : 'Open public website'}</a></Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}