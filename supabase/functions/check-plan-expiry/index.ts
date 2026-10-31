import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendAuditedTemplateEmail } from "../_shared/transactional-email-templates/send-audited-email.ts";
import { EmailAPIError } from "npm:@lovable.dev/email-js@0.4.0";
import Stripe from "npm:stripe@18.5.0";
import { annualState } from "../_shared/billing-policy.ts";

async function sendWithRateLimitWait(...args: Parameters<typeof sendAuditedTemplateEmail>) {
  try { return await sendAuditedTemplateEmail(...args); }
  catch (error) {
    if (!(error instanceof EmailAPIError) || error.status !== 429) throw error;
    await new Promise(resolve => setTimeout(resolve, (error.retryAfterSeconds ?? 60) * 1000));
    return sendAuditedTemplateEmail(...args);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? '';
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const twentyDaysFromNow = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);

    // Reconcile due annual plans before reminders/freezing: Stripe owns trial transitions.
    const { data: duePlans, error: dueError } = await supabase.from('user_plans')
      .select('user_id, expires_at, notified_expiry').eq('plan', 'yearly')
      .lte('expires_at', twentyDaysFromNow.toISOString());
    if (dueError) throw dueError;
    if (duePlans?.length) {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2025-08-27.basil' });
      for (const plan of duePlans) {
        const { data: userData } = await supabase.auth.admin.getUserById(plan.user_id);
        if (!userData.user?.email) continue;
        const customers = await stripe.customers.list({ email: userData.user.email, limit: 1 });
        if (!customers.data[0]) continue;
        const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: 'all', limit: 100 });
        const states = subs.data.map(sub => annualState(sub));
        const state = states.find(s => s?.subscribed) ?? states.find(s => s);
        if (!state) continue; // Retain manually assigned plans without a Stripe subscription.
        const end = state.subscribed ? state.subscription_end : now.toISOString();
        const { error } = await supabase.from('user_plans').update({
          expires_at: end, auto_renew: state.auto_renew,
          notified_expiry: state.trialing || (plan.expires_at === end && plan.notified_expiry),
          updated_at: now.toISOString(),
        }).eq('user_id', plan.user_id);
        if (error) throw error;
      }
    }

    // Get yearly plans expiring within 20 days that have not been notified yet
    const { data: expiringPlans } = await supabase
      .from("user_plans")
      .select("user_id, plan, expires_at, auto_renew, notified_expiry")
      .eq("plan", "yearly")
      .eq("notified_expiry", false)
      .not("expires_at", "is", null)
      .lte("expires_at", twentyDaysFromNow.toISOString())
      .gt("expires_at", now.toISOString());

    const notified20: string[] = [];

    if (expiringPlans && expiringPlans.length > 0) {
      const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });

      for (const plan of expiringPlans) {
        const user = allUsers?.find(u => u.id === plan.user_id);
        if (!user?.email) continue;

        if (!plan.expires_at) continue;
        const expiryDate = new Date(plan.expires_at);
        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        const formattedDate = expiryDate.toLocaleDateString('it-IT', {
          day: '2-digit', month: 'long', year: 'numeric',
        });

        const messageId = `plan-renewal-20d-${plan.user_id}-${expiryDate.toISOString().slice(0, 10)}`;
        try {
          const result = await sendWithRateLimitWait('plan-renewal-20d', user.email, {
            idempotencyKey: messageId,
            templateData: { email: user.email, daysLeft, expiryDate: formattedDate, autoRenew: plan.auto_renew },
          });
          // Suppression is a terminal outcome, not a reason to retry the reminder.
          notified20.push(plan.user_id);
          console.log('[PLAN-EXPIRY] Reminder completed', { sent: result.sent, userId: plan.user_id });
        } catch (error) {
          console.error('[PLAN-EXPIRY] Reminder failed', { message: error instanceof Error ? error.message : String(error) });
        }
      }

      if (notified20.length > 0) {
        await supabase
          .from("user_plans")
          .update({ notified_expiry: true })
          .in("user_id", notified20);
      }
    }

    // Freeze expired plans:
    //  - 'yearly' with auto_renew = false
    //  - 'free' (always, after the 10-day trial)
    const { data: expiredPlans } = await supabase
      .from("user_plans")
      .select("user_id, plan, expires_at, auto_renew")
      .or("and(plan.eq.yearly,auto_renew.eq.false),plan.eq.free")
      .not("expires_at", "is", null)
      .lte("expires_at", now.toISOString());

    const frozenIds: string[] = [];
    if (expiredPlans && expiredPlans.length > 0) {
      const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });

      for (const plan of expiredPlans) {
        await supabase
          .from("user_plans")
          .update({ plan: "frozen", updated_at: now.toISOString() })
          .eq("user_id", plan.user_id);
        frozenIds.push(plan.user_id);

        // Send frozen notification email
        const user = allUsers?.find(u => u.id === plan.user_id);
        if (user?.email) {
          try {
            await sendWithRateLimitWait('plan-frozen', user.email, {
              idempotencyKey: `plan-frozen-${plan.user_id}`,
              templateData: { email: user.email },
            });
          } catch (e) {
            console.error(`[PLAN-EXPIRY] Frozen email error:`, e);
          }
        }

        console.log(`[PLAN-EXPIRY] Frozen: user ${plan.user_id} (was ${plan.plan})`);
      }
    }


    return new Response(JSON.stringify({
      notified_20d: notified20.length,
      frozen: frozenIds.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[PLAN-EXPIRY] Error: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
