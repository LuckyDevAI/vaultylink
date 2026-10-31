import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

import { LIFETIME_AMOUNT_CENTS } from "../_shared/billing-policy.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendAuditedTemplateEmail } from "../_shared/transactional-email-templates/send-audited-email.ts";

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PURCHASE-EMAIL] ${step}${d}`);
};

// Generate a deterministic license code from a string (Stripe session/sub id)
async function generateLicenseCode(seed: string): Promise<string> {
  const data = new TextEncoder().encode(seed);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  // Convert to base32-ish (uppercase alphanumerics)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
  let out = "";
  for (let i = 0; i < 12; i++) {
    const byte = parseInt(hex.substr(i * 2, 2), 16);
    out += chars[byte % chars.length];
  }
  return `VL-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user?.email) throw new Error("User not authenticated");
    const user = userData.user;
    log("User authenticated", { userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ sent: false, reason: "no_customer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const customerId = customers.data[0].id;

    const trials = await stripe.subscriptions.list({ customer: customerId, status: 'trialing', limit: 100 });
    if (trials.data.some(sub => sub.items.data.some(item => item.price.product === 'prod_UA4sfi1uPvB1AN'))) {
      return new Response(JSON.stringify({ sent: false, reason: 'trial_not_paid' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    // Find most recent paid session OR active subscription
    let identifier = "";
    let planLabel = "";
    let amount = 0;
    let currency = "eur";
    let isYearly = false;
    let nextRenewalDate: string | undefined;

    // Check active subscription first
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    if (subs.data.length > 0) {
      const sub = subs.data[0];
      identifier = sub.id;
      isYearly = true;
      planLabel = "Annuale (Yearly)";
      const price = sub.items.data[0]?.price;
      amount = price?.unit_amount ?? 991;
      currency = price?.currency ?? "eur";
      nextRenewalDate = new Date((sub.items.data[0]?.current_period_end ?? 0) * 1000).toLocaleDateString("it-IT", {
        day: "2-digit", month: "long", year: "numeric",
      });
    } else {
      // Check most recent lifetime payment
      const sessions = await stripe.checkout.sessions.list({
        customer: customerId,
        limit: 5,
      });
      const paidSession = sessions.data.find(
        (s) => s.payment_status === "paid" && s.mode === "payment",
      );
      if (!paidSession) {
        return new Response(JSON.stringify({ sent: false, reason: "no_paid_session" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      identifier = paidSession.id;
      planLabel = "Lifetime";
      amount = paidSession.amount_total ?? LIFETIME_AMOUNT_CENTS;
      currency = paidSession.currency ?? "eur";
    }

    const messageId = `purchase-${identifier}`;

    // Idempotency: skip if already sent
    const { data: existing } = await supabase
      .from("email_send_log")
      .select("id")
      .eq("message_id", messageId)
      .eq("status", "sent")
      .limit(1);
    if (existing && existing.length > 0) {
      log("Already sent", { messageId });
      return new Response(JSON.stringify({ sent: false, reason: "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const licenseCode = await generateLicenseCode(identifier);
    const amountFormatted = formatPrice(amount, currency);
    const result = await sendAuditedTemplateEmail('purchase-confirmation', user.email ?? '', {
      idempotencyKey: messageId,
      templateData: { email: user.email, planLabel, amountFormatted, licenseCode, isYearly, nextRenewalDate },
    });
    if (!result.sent) {
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }
    log("Email sent", { messageId });

    return new Response(
      JSON.stringify({ sent: true, licenseCode, plan: planLabel, amount: amountFormatted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
