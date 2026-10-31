import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { checkoutPolicy, YEARLY_PRODUCT } from "../_shared/billing-policy.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Accesso richiesto" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const parsed = z.object({ priceId: z.string().min(1).max(100), mode: z.enum(["payment", "subscription"]).optional() }).safeParse(await req.json());
    if (!parsed.success) return new Response(JSON.stringify({ error: "Piano non valido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    let policy;
    try { policy = checkoutPolicy(parsed.data.priceId); }
    catch { return new Response(JSON.stringify({ error: "Piano non valido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
    const { priceId } = parsed.data;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    if (customerId && policy.mode === "subscription") {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
      if (subs.data.some(sub => ["active", "trialing"].includes(sub.status) && sub.items.data.some(item => item.price.product === YEARLY_PRODUCT))) {
        return new Response(JSON.stringify({ error: "Cloud Sync è già attivo: gestisci l’abbonamento dal tuo account." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    const origin = req.headers.get("origin");
    if (!origin || !/^https?:\/\//.test(origin)) throw new Error("Missing origin");
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      ...policy,
      client_reference_id: user.id,
      success_url: `${origin}/account?payment=success`,
      cancel_url: `${origin}/account?payment=canceled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CREATE-CHECKOUT] ERROR:", (error as Error).message);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
