import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { YEARLY_PRODUCT } from '../_shared/billing-policy.ts';

Deno.serve(async req => {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return reply(null);
  if (req.method !== 'POST') return reply({ error: 'Metodo non consentito' }, 405);
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return reply({ error: 'Accesso richiesto' }, 401);
  const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
  const { data, error } = await client.auth.getUser(header.slice(7));
  if (error || !data.user?.email) return reply({ error: 'Accesso richiesto' }, 401);
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2025-08-27.basil' });
    const customers = await stripe.customers.list({ email: data.user.email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) return reply({ error: 'Prova non trovata' }, 404);
    const subscriptions = await stripe.subscriptions.list({ customer: customer.id, status: 'trialing', limit: 100 });
    const trial = subscriptions.data.find(sub => sub.items.data.some(i => i.price.product === YEARLY_PRODUCT));
    if (!trial) return reply({ error: 'Nessuna prova attiva da disdire' }, 409);
    // Scheduling cancellation preserves the remaining free days and prevents the first charge.
    await stripe.subscriptions.update(trial.id, { cancel_at_period_end: true });
    return reply({ canceled: true, trial_end: trial.trial_end });
  } catch (error) {
    console.error('[CANCEL-TRIAL]', error instanceof Error ? error.message : 'Errore');
    return reply({ error: 'Impossibile completare la disdetta' }, 500);
  }
});