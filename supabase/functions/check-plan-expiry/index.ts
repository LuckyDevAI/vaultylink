import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Get all yearly plans with upcoming expiry
    const { data: expiringPlans } = await supabase
      .from("user_plans")
      .select("user_id, plan, expires_at, auto_renew, notified_expiry")
      .eq("plan", "yearly")
      .not("expires_at", "is", null)
      .lte("expires_at", tenDaysFromNow.toISOString())
      .gt("expires_at", now.toISOString());

    const notified10: string[] = [];
    const notified3: string[] = [];

    if (expiringPlans && expiringPlans.length > 0) {
      const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });

      for (const plan of expiringPlans) {
        const user = allUsers?.find(u => u.id === plan.user_id);
        if (!user?.email) continue;

        const expiryDate = new Date(plan.expires_at!);
        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Determine if we should send 10-day or 3-day notification
        const shouldNotify10 = !plan.notified_expiry && daysLeft <= 10 && daysLeft > 3;
        const shouldNotify3 = daysLeft <= 3;

        if (!shouldNotify10 && !shouldNotify3) continue;

        const formattedDate = expiryDate.toLocaleDateString('it-IT', {
          day: '2-digit', month: 'long', year: 'numeric',
        });

        // Send email via enqueue_email RPC (uses the email queue infrastructure)
        const messageId = `plan-expiry-${plan.user_id}-${daysLeft <= 3 ? '3d' : '10d'}`;
        const emailSubject = daysLeft <= 3
          ? `⚠️ Il tuo piano VaultLink scade tra ${daysLeft} giorni!`
          : `Il tuo piano VaultLink scade tra ${daysLeft} giorni`;
        
        try {
          const { error: enqueueError } = await supabase.rpc('enqueue_email', {
            queue_name: 'transactional_emails',
            payload: {
              to: user.email,
              from: 'VaultLink <noreply@notify.vaultylink.com>',
              sender_domain: 'notify.vaultylink.com',
              subject: emailSubject,
              html: buildExpiryEmailHtml(user.email, daysLeft, formattedDate, plan.auto_renew),
              label: 'plan-expiry',
              message_id: messageId,
              queued_at: new Date().toISOString(),
            },
          });

          if (enqueueError) {
            console.error(`[PLAN-EXPIRY] Enqueue error for ${user.email}:`, enqueueError);
            continue;
          }

          console.log(`[PLAN-EXPIRY] Email accodata: ${user.email} - scade tra ${daysLeft} giorni`);

          if (shouldNotify3) notified3.push(plan.user_id);
          else notified10.push(plan.user_id);
        } catch (emailErr) {
          console.error(`[PLAN-EXPIRY] Email error for ${user.email}:`, emailErr);
        }
      }

      // Mark 10-day notified
      if (notified10.length > 0) {
        await supabase
          .from("user_plans")
          .update({ notified_expiry: true })
          .in("user_id", notified10);
      }
    }

    // Freeze expired yearly plans without auto_renew
    const { data: expiredPlans } = await supabase
      .from("user_plans")
      .select("user_id, plan, expires_at, auto_renew")
      .eq("plan", "yearly")
      .eq("auto_renew", false)
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
            await supabase.rpc('enqueue_email', {
              p_queue_name: 'transactional_emails',
              p_message_id: `plan-frozen-${plan.user_id}`,
              p_template_name: 'plan-frozen',
              p_recipient_email: user.email,
              p_subject: '❄️ Il tuo piano VaultLink è stato sospeso',
              p_html_body: buildFrozenEmailHtml(user.email),
              p_metadata: JSON.stringify({ user_id: plan.user_id }),
            });
          } catch (e) {
            console.error(`[PLAN-EXPIRY] Frozen email error:`, e);
          }
        }

        console.log(`[PLAN-EXPIRY] Frozen: user ${plan.user_id}`);
      }
    }

    return new Response(JSON.stringify({
      notified_10d: notified10.length,
      notified_3d: notified3.length,
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

function buildExpiryEmailHtml(email: string, daysLeft: number, expiryDate: string, autoRenew: boolean): string {
  const urgencyTitle = daysLeft <= 3
    ? '⚠️ Il tuo piano sta per scadere!'
    : 'Il tuo piano sta per scadere';

  const renewInfo = autoRenew
    ? `<p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 25px">
        Il rinnovo automatico è <strong>attivo</strong>. Il tuo piano verrà rinnovato automaticamente.
        Se desideri annullare il rinnovo, puoi farlo entro 7 giorni prima della scadenza.
      </p>
      <a href="https://vaultylink.com" style="display:inline-block;background-color:#0fa968;color:#0f1419;font-size:14px;font-weight:bold;border-radius:12px;padding:12px 24px;text-decoration:none">Gestisci Abbonamento</a>`
    : `<p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 25px">
        Il rinnovo automatico è <strong>disattivato</strong>. Se non rinnovi entro la scadenza,
        il tuo piano passerà allo stato <strong>Frozen</strong> e l'accesso cloud sarà sospeso.
      </p>
      <a href="https://vaultylink.com" style="display:inline-block;background-color:#0fa968;color:#0f1419;font-size:14px;font-weight:bold;border-radius:12px;padding:12px 24px;text-decoration:none">Rinnova Ora</a>`;

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="background-color:#ffffff;font-family:'Space Grotesk',Arial,sans-serif">
<div style="padding:20px 25px">
  <p style="font-size:18px;font-weight:bold;color:#0fa968;margin:0 0 24px">🔐 VaultLink</p>
  <h1 style="font-size:22px;font-weight:bold;color:#111827;margin:0 0 20px">${urgencyTitle}</h1>
  <p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 25px">
    Ciao, il tuo piano <strong>Yearly</strong> su VaultLink scadrà il <strong>${expiryDate}</strong> (tra ${daysLeft} giorni).
  </p>
  ${renewInfo}
  <p style="font-size:12px;color:#9ca3af;margin:30px 0 0">
    Questa email è stata inviata a ${email} perché hai un piano attivo su VaultLink.
  </p>
</div>
</body>
</html>`;
}

function buildFrozenEmailHtml(email: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="background-color:#ffffff;font-family:'Space Grotesk',Arial,sans-serif">
<div style="padding:20px 25px">
  <p style="font-size:18px;font-weight:bold;color:#0fa968;margin:0 0 24px">🔐 VaultLink</p>
  <h1 style="font-size:22px;font-weight:bold;color:#111827;margin:0 0 20px">❄️ Piano sospeso</h1>
  <p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 25px">
    Il tuo piano <strong>Yearly</strong> su VaultLink è scaduto e non è stato rinnovato.
    Il tuo account è ora in stato <strong>Frozen</strong> e l'accesso alla sincronizzazione cloud è sospeso.
  </p>
  <p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 25px">
    Per riattivare il servizio, rinnova il tuo abbonamento.
  </p>
  <a href="https://vaultylink.com" style="display:inline-block;background-color:#0fa968;color:#0f1419;font-size:14px;font-weight:bold;border-radius:12px;padding:12px 24px;text-decoration:none">Rinnova Ora</a>
  <p style="font-size:12px;color:#9ca3af;margin:30px 0 0">
    Questa email è stata inviata a ${email}.
  </p>
</div>
</body>
</html>`;
}
