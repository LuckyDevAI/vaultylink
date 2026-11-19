import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { convertToModelMessages, type UIMessage } from "npm:ai";
import { createResponsesCall } from "../_shared/responses.ts";

const SYSTEM = `Sei l'assistente clienti ufficiale di Vaulty Link, una cassaforte di link e segnalibri cifrata end-to-end.
Rispondi nella lingua dell'utente, in modo breve, chiaro e cordiale, con markdown semplice.
Fatti certi:
- Crittografia AES-256-GCM lato dispositivo, zero-knowledge: nessuno, nemmeno lo staff, può leggere i link.
- Sblocco con Master Password, PIN locale o biometria (WebAuthn). La Master Password non è recuperabile.
- Piano "Solo Locale Lifetime": €49,90 una tantum, dati solo sul dispositivo, nessun cloud.
- Piano "Cloud Sync": 10 giorni gratis, poi €9,90/anno salvo disdetta; nessun addebito se disdici durante la prova. Alla scadenza l'account va in stato "Frozen" (dati conservati, sync sospesa).
- Gestione abbonamento dalla pagina Account.
- Import segnalibri HTML da Chrome/Firefox/Edge/Safari (le cartelle diventano argomenti), export .vlenc cifrato o HTML.
- Estensione browser per salvare link. App web/PWA, Windows, macOS, Linux, Android: pagina Download.
- PIN legacy dimenticato nella schermata "Migrazione dati": usa "Non ricordo il PIN — Resetta" e digita RESET (cancella solo i dati locali vecchi).
- 12 lingue disponibili. Contatto umano: info@vaultylink.com.
Se non sai qualcosa, non inventare: invita a scrivere a info@vaultylink.com. Non chiedere mai password o PIN.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("AI non configurata");
    const body = await req.json();
    const messages = body?.messages as UIMessage[];
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) {
      return new Response(JSON.stringify({ error: "Messaggi non validi" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const call = createResponsesCall(req, { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, model: "openai/gpt-6.1-sol" }, await convertToModelMessages(messages), SYSTEM);
    const res = await call.response();
    const headers = new Headers(res.headers);
    Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
    return new Response(res.body, { status: res.status, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
