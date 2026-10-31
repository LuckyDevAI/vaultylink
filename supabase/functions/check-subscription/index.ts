import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { annualState } from "../_shared/billing-policy.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Product/price mapping
const YEARLY_PRODUCT = "prod_UA4sfi1uPvB1AN";
const LIFETIME_PRODUCT = "prod_UA4sxOEr0mEKOy";

const planPayload = (planRow: any) => ({
  subscribed: planRow?.plan === "lifetime" || (planRow?.plan === "yearly" && !!planRow.expires_at && new Date(planRow.expires_at).getTime() > Date.now()),
  plan: planRow?.plan ?? null,
  subscription_end: planRow?.expires_at ?? null,
  auto_renew: planRow?.auto_renew ?? null,
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    const { data: existingPlan } = await supabaseClient
      .from("user_plans")
      .select("plan, expires_at, auto_renew, notified_expiry")
      .eq("user_id", user.id)
      .maybeSingle();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found, using stored plan fallback");
      return new Response(JSON.stringify(planPayload(existingPlan)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check active subscriptions (yearly plan)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });

    const annual = subscriptions.data.map(sub => ({ sub, state: annualState(sub) }));
    const current = annual.find(({ state }) => state?.subscribed);
    if (current?.state) {
      const state = current.state;
      const { error: syncError } = await supabaseClient.from("user_plans").upsert({
        user_id: user.id, plan: state.plan, expires_at: state.subscription_end,
        auto_renew: state.auto_renew,
        notified_expiry: state.trialing || (existingPlan?.expires_at === state.subscription_end && existingPlan?.notified_expiry === true),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (syncError) throw syncError;
      return new Response(JSON.stringify({ ...state, product_id: YEARLY_PRODUCT }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // Check one-time payments (lifetime plan)
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 100,
    });

    for (const session of sessions.data) {
      if (session.payment_status === "paid" && session.mode === "payment") {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
        for (const item of lineItems.data) {
          if (item.price?.product === LIFETIME_PRODUCT) {
            logStep("Lifetime purchase found");
            await supabaseClient.from("user_plans").upsert({
              user_id: user.id,
              plan: "lifetime",
              expires_at: null,
              auto_renew: false,
              notified_expiry: false,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
            return new Response(JSON.stringify({
              subscribed: true,
              plan: "lifetime",
              product_id: LIFETIME_PRODUCT,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
        }
      }
    }


    // A canceled or unpaid Stripe annual plan must not fall back to stale yearly access.
    if (annual.some(({ state }) => state) && existingPlan?.plan === "yearly") {
      const { error } = await supabaseClient.from("user_plans").update({ plan: "frozen", auto_renew: false, updated_at: new Date().toISOString() }).eq("user_id", user.id);
      if (error) throw error;
      return new Response(JSON.stringify({ subscribed: false, plan: "frozen", auto_renew: false, trialing: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    logStep("No active Stripe plan found, using stored plan fallback");
    return new Response(JSON.stringify(planPayload(existingPlan)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CHECK-SUBSCRIPTION] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
