import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { EmailAPIError, sendLovableEmail } from "npm:@lovable.dev/email-js@0.4.0";
import { recordEmailOutcome } from "../_shared/email-audit.ts";
import { z } from "npm:zod@3.25.76";

function getStripePeriodEndSeconds(subscription: any): number | null {
  const item = subscription?.items?.data?.[0];
  const value = item?.current_period_end ?? subscription?.current_period_end;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case "list_users": {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
          page: params.page || 1,
          perPage: params.perPage || 50,
        });
        if (error) throw error;

        // Get vault data metadata
        const { data: vaults } = await supabase
          .from("vault_data")
          .select("user_id, updated_at, encrypted_blob");

        // Get roles
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role");

        // Get plans
        const { data: plans } = await supabase
          .from("user_plans")
          .select("user_id, plan, expires_at, auto_renew");

        const enriched = users.map((u) => {
          const vault = vaults?.find((v) => v.user_id === u.id);
          const userRoles = roles?.filter((r) => r.user_id === u.id).map((r) => r.role) || [];
          const userPlan = plans?.find((p) => p.user_id === u.id);
          return {
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            roles: userRoles,
            has_vault: !!vault,
            vault_updated_at: vault?.updated_at || null,
            vault_size: vault?.encrypted_blob?.length || 0,
            plan: userPlan?.plan || null,
            plan_expires_at: userPlan?.expires_at || null,
            auto_renew: userPlan?.auto_renew ?? null,
          };
        });

        return new Response(JSON.stringify({ users: enriched }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        const { error } = await supabase.auth.admin.deleteUser(params.user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_vault": {
        const { error } = await supabase
          .from("vault_data")
          .delete()
          .eq("user_id", params.user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "set_role": {
        if (params.action_type === "add") {
          const { error } = await supabase
            .from("user_roles")
            .upsert({ user_id: params.user_id, role: params.role }, { onConflict: "user_id,role" });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("user_roles")
            .delete()
            .eq("user_id", params.user_id)
            .eq("role", params.role);
          if (error) throw error;
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "stats": {
        const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const { data: vaults } = await supabase
          .from("vault_data")
          .select("encrypted_blob, updated_at");

        const totalSize = vaults?.reduce((sum, v) => sum + (v.encrypted_blob?.length || 0), 0) || 0;

        return new Response(JSON.stringify({
          total_users: users?.length || 0,
          total_vaults: vaults?.length || 0,
          total_storage_bytes: totalSize,
          latest_activity: vaults?.sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )?.[0]?.updated_at || null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "plan_stats": {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
        const StripeMod = (await import("npm:stripe@18.5.0")).default;
        const stripe = new StripeMod(stripeKey, { apiVersion: "2025-08-27.basil" });

        const YEARLY_PRODUCT = "prod_UA4sfi1uPvB1AN";
        const LIFETIME_PRODUCT = "prod_UA4sxOEr0mEKOy";

        // Get all users
        const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const yearlyUsers: { email: string; subscription_end?: string }[] = [];
        const trialUsers: { email: string; subscription_end?: string }[] = [];
        const lifetimeUsers: { email: string }[] = [];

        for (const u of allUsers || []) {
          if (!u.email) continue;
          const customers = await stripe.customers.list({ email: u.email, limit: 1 });
          if (customers.data.length === 0) continue;
          const customerId = customers.data[0].id;

          // Check yearly subscriptions
          const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
          let found = false;
          for (const sub of subs.data) {
            const prodId = sub.items.data[0]?.price?.product;
            if (prodId === YEARLY_PRODUCT && (sub.status === 'active' || sub.status === 'trialing')) {
              const periodEndSec = getStripePeriodEndSeconds(sub);
              (sub.status === 'trialing' ? trialUsers : yearlyUsers).push({
                email: u.email,
                subscription_end: sub.status === 'trialing' && sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : periodEndSec ? new Date(periodEndSec * 1000).toISOString() : undefined,
              });
              found = true;
              break;
            }
          }
          if (found) continue;

          // Check lifetime payments
          const sessions = await stripe.checkout.sessions.list({ customer: customerId, limit: 100 });
          for (const session of sessions.data) {
            if (session.payment_status === "paid" && session.mode === "payment") {
              const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
              for (const item of lineItems.data) {
                if (item.price?.product === LIFETIME_PRODUCT) {
                  lifetimeUsers.push({ email: u.email });
                  found = true;
                  break;
                }
              }
              if (found) break;
            }
          }
        }

        const totalUsers = allUsers?.length || 0;
        const paidCount = yearlyUsers.length + lifetimeUsers.length;

        return new Response(JSON.stringify({
          yearly: { count: yearlyUsers.length, users: yearlyUsers },
          trial: { count: trialUsers.length, users: trialUsers },
          lifetime: { count: lifetimeUsers.length, users: lifetimeUsers },
          free: { count: totalUsers - paidCount - trialUsers.length },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "set_plan": {
        const { user_id, plan, expires_at, auto_renew } = params;
        if (!plan) {
          // Remove plan
          await supabase.from("user_plans").delete().eq("user_id", user_id);
        } else {
          const { error } = await supabase.from("user_plans").upsert(
            {
              user_id,
              plan,
              expires_at: expires_at || null,
              auto_renew: auto_renew ?? true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
          if (error) throw error;
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "send_email": {
        const { template: tpl, recipient: recipientEmail, subject: subj, body: bodyHtml } = params;
        if (!recipientEmail) throw new Error("recipient required");

        let emailSubject = subj || '';
        let emailBody = bodyHtml || '';

        if (tpl === 'plan-expiry-10' || tpl === 'plan-expiry-3') {
          const days = tpl === 'plan-expiry-10' ? 10 : 3;
          emailSubject = emailSubject || (days === 3
            ? `⚠️ Il tuo piano VaultLink scade tra ${days} giorni!`
            : `Il tuo piano VaultLink scade tra ${days} giorni`);
          const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT', {
            day: '2-digit', month: 'long', year: 'numeric',
          });
          emailBody = emailBody || buildExpiryHtml(recipientEmail as string, days, expiryDate, true);
        } else if (tpl === 'plan-frozen') {
          emailSubject = emailSubject || '❄️ Il tuo piano VaultLink è stato sospeso';
          emailBody = emailBody || buildFrozenHtml(recipientEmail as string);
        } else if (tpl === 'custom') {
          if (!emailSubject || !emailBody) throw new Error("subject and body required for custom email");
        }

        const messageId = `admin-send-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const parsed = z.object({
          recipient: z.string().email(),
          subject: z.string().min(1).max(998),
          html: z.string().min(1).max(200000),
          label: z.enum(['plan-expiry-10', 'plan-expiry-3', 'plan-frozen', 'custom']),
        }).parse({ recipient: recipientEmail, subject: emailSubject, html: emailBody, label: tpl || 'custom' });
        const apiKey = Deno.env.get('LOVABLE_API_KEY');
        if (!apiKey) throw new Error('Email configuration missing');
        try {
          await sendLovableEmail({
            to: parsed.recipient,
            from: 'VaultLink <noreply@notify.vaultylink.com>',
            sender_domain: 'notify.vaultylink.com',
            subject: parsed.subject,
            html: parsed.html,
            text: parsed.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
            purpose: 'transactional',
            label: parsed.label,
            idempotency_key: messageId,
          }, { apiKey, sendUrl: Deno.env.get('LOVABLE_SEND_URL') });
          await recordEmailOutcome(messageId, parsed.label, parsed.recipient, 'sent');
        } catch (error) {
          if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
            await recordEmailOutcome(messageId, parsed.label, parsed.recipient, 'suppressed');
            return new Response(JSON.stringify({ success: false, sent: false, reason: 'recipient_suppressed' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          await recordEmailOutcome(messageId, parsed.label, parsed.recipient, 'failed',
            error instanceof Error ? error.message : String(error));
          throw error;
        }

        return new Response(JSON.stringify({ success: true, message_id: messageId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildExpiryHtml(email: string, daysLeft: number, expiryDate: string, autoRenew: boolean): string {
  const title = daysLeft <= 3 ? '⚠️ Il tuo piano sta per scadere!' : 'Il tuo piano sta per scadere';
  const renewInfo = autoRenew
    ? `<p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 25px">Il rinnovo automatico è <strong>attivo</strong>. Il tuo piano verrà rinnovato automaticamente.</p>
       <a href="https://vaultylink.com" style="display:inline-block;background-color:#0fa968;color:#0f1419;font-size:14px;font-weight:bold;border-radius:12px;padding:12px 24px;text-decoration:none">Gestisci Abbonamento</a>`
    : `<p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 25px">Il rinnovo automatico è <strong>disattivato</strong>. Se non rinnovi, il piano sarà <strong>Frozen</strong>.</p>
       <a href="https://vaultylink.com" style="display:inline-block;background-color:#0fa968;color:#0f1419;font-size:14px;font-weight:bold;border-radius:12px;padding:12px 24px;text-decoration:none">Rinnova Ora</a>`;
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"></head>
<body style="background-color:#ffffff;font-family:'Space Grotesk',Arial,sans-serif">
<div style="padding:20px 25px">
  <p style="font-size:18px;font-weight:bold;color:#0fa968;margin:0 0 24px">🔐 VaultLink</p>
  <h1 style="font-size:22px;font-weight:bold;color:#111827;margin:0 0 20px">${title}</h1>
  <p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 25px">Il tuo piano <strong>Yearly</strong> scadrà il <strong>${expiryDate}</strong> (tra ${daysLeft} giorni).</p>
  ${renewInfo}
  <p style="font-size:12px;color:#9ca3af;margin:30px 0 0">Email inviata a ${email}.</p>
</div></body></html>`;
}

function buildFrozenHtml(email: string): string {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"></head>
<body style="background-color:#ffffff;font-family:'Space Grotesk',Arial,sans-serif">
<div style="padding:20px 25px">
  <p style="font-size:18px;font-weight:bold;color:#0fa968;margin:0 0 24px">🔐 VaultLink</p>
  <h1 style="font-size:22px;font-weight:bold;color:#111827;margin:0 0 20px">❄️ Piano sospeso</h1>
  <p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 25px">Il tuo piano <strong>Yearly</strong> è scaduto. L'accesso cloud è sospeso.</p>
  <a href="https://vaultylink.com" style="display:inline-block;background-color:#0fa968;color:#0f1419;font-size:14px;font-weight:bold;border-radius:12px;padding:12px 24px;text-decoration:none">Rinnova Ora</a>
  <p style="font-size:12px;color:#9ca3af;margin:30px 0 0">Email inviata a ${email}.</p>
</div></body></html>`;
}
