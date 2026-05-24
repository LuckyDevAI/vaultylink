import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

function buildEmailHtml(opts: {
  email: string;
  planLabel: string;
  amountFormatted: string;
  licenseCode: string;
  isYearly: boolean;
  nextRenewalDate?: string;
}): string {
  const renewalBlock = opts.isYearly && opts.nextRenewalDate
    ? `<p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 25px">
        Il tuo piano si rinnoverà automaticamente il <strong>${opts.nextRenewalDate}</strong>.
        Riceverai una email di promemoria 20 giorni prima del rinnovo.
      </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="background-color:#ffffff;font-family:'Space Grotesk',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <p style="font-size:18px;font-weight:bold;color:#0fa968;margin:0 0 24px">🔐 VaultLink</p>
  <h1 style="font-size:24px;font-weight:bold;color:#111827;margin:0 0 16px">Grazie per il tuo acquisto!</h1>
  <p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 24px">
    Il tuo piano <strong>${opts.planLabel}</strong> è ora attivo.
  </p>

  <div style="background:#f8faf9;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:0 0 24px">
    <p style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px">Codice di licenza</p>
    <p style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:bold;color:#0fa968;letter-spacing:.05em;margin:0 0 16px">${opts.licenseCode}</p>
    <p style="font-size:12px;color:#6b7280;margin:0 0 12px">Importo pagato</p>
    <p style="font-size:18px;font-weight:bold;color:#111827;margin:0">${opts.amountFormatted}</p>
  </div>

  ${renewalBlock}

  <a href="https://vaultylink.com" style="display:inline-block;background-color:#0fa968;color:#0f1419;font-size:14px;font-weight:bold;border-radius:12px;padding:12px 24px;text-decoration:none">Apri VaultLink</a>

  <p style="font-size:12px;color:#9ca3af;margin:32px 0 0">
    Conserva questo codice come ricevuta del tuo acquisto. Email inviata a ${opts.email}.
  </p>
</div>
</body>
</html>`;
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
      nextRenewalDate = new Date(sub.current_period_end * 1000).toLocaleDateString("it-IT", {
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
      amount = paidSession.amount_total ?? 1990;
      currency = paidSession.currency ?? "eur";
    }

    const messageId = `purchase-${identifier}`;

    // Idempotency: skip if already sent
    const { data: existing } = await supabase
      .from("email_send_log")
      .select("id")
      .eq("message_id", messageId)
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
    const html = buildEmailHtml({
      email: user.email,
      planLabel,
      amountFormatted,
      licenseCode,
      isYearly,
      nextRenewalDate,
    });

    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: user.email,
        from: "VaultLink <noreply@notify.vaultylink.com>",
        sender_domain: "notify.vaultylink.com",
        subject: `✅ Acquisto confermato — Piano ${planLabel} (${amountFormatted})`,
        html,
        label: "purchase-confirmation",
        message_id: messageId,
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      log("Enqueue error", enqueueError);
      throw new Error(`Enqueue failed: ${enqueueError.message}`);
    }

    log("Email enqueued", { messageId, licenseCode });

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
