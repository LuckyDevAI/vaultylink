import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Product/price mapping
const YEARLY_PRODUCT = "prod_UA4sfi1uPvB1AN";
const LIFETIME_PRODUCT = "prod_UA4sxOEr0mEKOy";

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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ subscribed: false, plan: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check active subscriptions (yearly plan)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    for (const sub of subscriptions.data) {
      const productId = sub.items.data[0]?.price?.product;
      if (productId === YEARLY_PRODUCT) {
        const subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
        logStep("Active yearly subscription found", { subscriptionEnd });
        return new Response(JSON.stringify({
          subscribed: true,
          plan: "yearly",
          product_id: YEARLY_PRODUCT,
          subscription_end: subscriptionEnd,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
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

    logStep("No active plan found");
    return new Response(JSON.stringify({ subscribed: false, plan: null }), {
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
