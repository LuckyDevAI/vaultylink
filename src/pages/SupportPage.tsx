import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import { LifeBuoy, Mail, Send, Square, ShieldCheck } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const ENDPOINT = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/support-chat`;
const QUICK = [
  'Come funziona la crittografia zero-knowledge?',
  'Differenza tra Solo Locale e Cloud Sync?',
  'Come importo i segnalibri da Chrome?',
  'Non ricordo il PIN locale, cosa faccio?',
  'Come scarico l\'app per Android e PC?',
];

export default function SupportPage() {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({
      api: ENDPOINT,
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    }),
  });
  const busy = status === 'submitted' || status === 'streaming';
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, status]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    void sendMessage({ text: t });
    setInput('');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary"><LifeBuoy className="h-6 w-6" /></div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Supporto clienti</h1>
            <p className="text-sm text-muted-foreground">Assistente Vaulty Link, attivo 24/7. Non chiederà mai password o PIN.</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col rounded-xl border border-border bg-card/60">
          <div className="max-h-[60vh] min-h-[320px] flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Ciao! Come posso aiutarti? Scegli una domanda o scrivi la tua.</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK.map((q) => (
                    <button key={q} onClick={() => send(q)} className="rounded-full border border-primary/40 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-primary/15">{q}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => {
              const text = m.parts.map((p) => (p.type === 'text' ? p.text : '')).join('');
              if (!text) return null;
              return m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground">{text}</div>
                </div>
              ) : (
                <div key={m.id} className="flex gap-2">
                  <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-primary" />
                  <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground"><ReactMarkdown>{text}</ReactMarkdown></div>
                </div>
              );
            })}
            {status === 'submitted' && <p className="font-mono text-xs text-muted-foreground animate-pulse">L'assistente sta scrivendo…</p>}
            {error && <p className="text-sm text-destructive">Assistente non disponibile al momento. Scrivi a info@vaultylink.com.</p>}
            <div ref={endRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 border-t border-border p-3">
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Scrivi la tua domanda…" rows={2} className="min-h-[44px] resize-none"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }} />
            {busy ? (
              <Button type="button" size="icon" variant="outline" onClick={() => stop()} aria-label="Ferma"><Square className="h-4 w-4" /></Button>
            ) : (
              <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Invia"><Send className="h-4 w-4" /></Button>
            )}
          </form>
        </div>

        <a href="mailto:info@vaultylink.com" className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <Mail className="h-4 w-4" /> Preferisci una persona? info@vaultylink.com
        </a>
      </main>
      <SiteFooter />
    </div>
  );
}
