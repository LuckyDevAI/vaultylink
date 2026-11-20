import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Download, ShieldCheck, AlertTriangle, ArrowUpRight } from 'lucide-react';
import content from '@/content/security.json';

export default function SecurityPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo title="Sicurezza e crittografia · Vaulty Link" description="Cifratura, gestione delle chiavi, sincronizzazione e limiti verificati dell’implementazione Vaulty Link." path="/security" />
      <SiteHeader />
      <main lang="it" dir="ltr" className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 md:px-8">
        <header className="border-b border-border pb-8">
          <p className="mb-3 flex items-center gap-2 font-mono text-xs text-primary"><ShieldCheck className="h-4 w-4" /> {content.subtitle}</p>
          <h1 className="font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">{content.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <p className="text-sm text-muted-foreground">Versione {content.version} · {content.date} · Italiano</p>
            <Button asChild><a href="/documents/VaultyLink_Sicurezza_v1_2026-11-20.pdf" download><Download /> Scarica PDF</a></Button>
          </div>
        </header>
        <aside className="my-8 flex gap-3 border-l-2 border-accent bg-accent/5 p-4" aria-label="Limiti della verifica">
          <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-accent" />
          <p className="text-sm leading-7 text-foreground">{content.notice}</p>
        </aside>
        <div className="grid items-start gap-10 md:grid-cols-[210px_minmax(0,1fr)]">
          <nav aria-label="Indice sicurezza" className="space-y-3 border-b border-border pb-6 md:sticky md:top-24 md:border-b-0">
            <h2 className="font-mono text-xs uppercase text-primary">In questo documento</h2>
            {content.sections.map(section => <a key={section.id} href={`#${section.id}`} className="block text-sm leading-6 text-muted-foreground hover:text-primary">{section.title}</a>)}
          </nav>
          <article className="min-w-0 space-y-8">
            {content.sections.map(section => (
              <section key={section.id} id={section.id} className="scroll-mt-24 border-b border-border pb-8">
                <h2 className="mb-4 text-xl font-semibold leading-7 text-foreground">{section.title}</h2>
                <div className="space-y-4">{section.paragraphs.map((paragraph, index) => <p key={index} className="break-words text-sm leading-7 text-muted-foreground">{paragraph}</p>)}</div>
              </section>
            ))}
            <div className="flex flex-wrap gap-4 pb-6">
              <Button variant="outline" asChild><a href="mailto:support@vaultylink.com">Segnala un problema <ArrowUpRight /></a></Button>
              <Button variant="link" asChild><a href="https://github.com/LuckyDevAI/vaultylink" target="_blank" rel="noopener noreferrer">Sorgenti GitHub <ArrowUpRight /></a></Button>
            </div>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}