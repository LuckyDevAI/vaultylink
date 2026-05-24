import { Download, Chrome, Globe, CheckCircle2, Sparkles, MousePointerClick, Save, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ExtensionsSection() {
  const [downloading, setDownloading] = useState(false);

  const downloadZip = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/vaultylink-extension.zip');
      if (!res.ok) throw new Error(`Download fallito (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'vaultylink-extension.zip';
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('Download completato. Segui le istruzioni qui sotto.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Errore download');
    } finally {
      setDownloading(false);
    }
  };

  const features = [
    { icon: Save, text: 'Salva la pagina corrente con 1 click' },
    { icon: MousePointerClick, text: 'Tasto destro → "Salva in Vaulty Link"' },
    { icon: Bell, text: 'Badge contatore link in coda di sync' },
    { icon: Sparkles, text: 'Login indipendente sincronizzato col vault' },
  ];

  return (
    <section id="extensions" className="py-20 px-6 border-t border-border bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-3 border-primary/40 text-primary">Opzionale · consigliato</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Estensioni browser
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Vaulty Link funziona perfettamente anche <strong>senza estensione</strong>.
            Installarla aggiunge solo comodità: salvi qualsiasi pagina senza aprire l'app.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 gap-3 mb-10 max-w-3xl mx-auto">
          {features.map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-foreground">{text}</span>
            </div>
          ))}
        </div>

        {/* Download card */}
        <div className="max-w-3xl mx-auto rounded-2xl border border-primary/30 bg-card p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-foreground mb-1">
                Vaulty Link Extension v1.0.0
              </h3>
              <p className="text-sm text-muted-foreground">
                Compatibile <strong>Chrome, Edge, Brave, Opera, Arc</strong> (Chromium MV3) e <strong>Firefox 115+</strong>.
                Safari in arrivo.
              </p>
            </div>
            <Button
              onClick={downloadZip}
              disabled={downloading}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full md:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? 'Download…' : 'Scarica .zip'}
            </Button>
          </div>

          {/* Store badges (futuri) */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Prossimamente sugli store ufficiali
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Chrome Web Store', icon: Chrome },
                { name: 'Edge Add-ons', icon: Globe },
                { name: 'Firefox AMO', icon: Globe },
                { name: 'Opera Add-ons', icon: Globe },
              ].map(({ name, icon: Icon }) => (
                <Badge key={name} variant="outline" className="border-border text-muted-foreground gap-1.5 py-1.5">
                  <Icon className="w-3 h-3" /> {name} · in arrivo
                </Badge>
              ))}
            </div>
          </div>

          {/* Install steps */}
          <details className="mt-6 pt-6 border-t border-border">
            <summary className="cursor-pointer text-sm font-semibold text-foreground hover:text-primary">
              Come installare manualmente (developer mode)
            </summary>
            <ol className="mt-4 space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Scarica il file <code className="text-primary">vaultylink-extension.zip</code> e decomprimilo</li>
              <li>Apri <code className="text-primary">chrome://extensions</code> (o <code className="text-primary">edge://extensions</code>, <code className="text-primary">about:addons</code> per Firefox)</li>
              <li>Attiva la <strong>Developer mode</strong> in alto a destra</li>
              <li>Clicca <strong>"Carica estensione non pacchettizzata"</strong> e seleziona la cartella decompressa</li>
              <li>Fissa l'icona Vaulty Link nella barra strumenti e inizia a salvare link!</li>
            </ol>
            <div className="mt-4 p-3 rounded-lg bg-secondary/40 border border-border flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Sicurezza:</strong> l'estensione non legge mai i tuoi link cifrati.
                Aggiunge solo URL nuovi a una coda che la PWA cifra al primo sblocco con la tua master password.
              </p>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
