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

    // 1. Find yearly plans expiring within 10 days that haven't been notified
    const { data: expiringPlans } = await supabase
      .from("user_plans")
      .select("user_id, plan, expires_at, auto_renew, notified_expiry")
      .eq("plan", "yearly")
      .eq("notified_expiry", false)
      .not("expires_at", "is", null)
      .lte("expires_at", tenDaysFromNow.toISOString());

    const notifiedIds: string[] = [];

    if (expiringPlans && expiringPlans.length > 0) {
      // Get user emails
      const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });

      for (const plan of expiringPlans) {
        const user = allUsers?.find(u => u.id === plan.user_id);
        if (!user?.email) continue;

        const expiryDate = new Date(plan.expires_at!);
        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Send notification email via Lovable AI
        const lovableKey = Deno.env.get("LOVABLE_API_KEY");
        if (lovableKey) {
          // For now, log the notification - email sending can be added later
          console.log(`[PLAN-EXPIRY] Notifica: ${user.email} - piano yearly scade tra ${daysLeft} giorni (${expiryDate.toISOString()}), auto_renew: ${plan.auto_renew}`);
        }

        notifiedIds.push(plan.user_id);
      }

      // Mark as notified
      if (notifiedIds.length > 0) {
        await supabase
          .from("user_plans")
          .update({ notified_expiry: true })
          .in("user_id", notifiedIds);
      }
    }

    // 2. Freeze expired yearly plans without auto_renew
    const { data: expiredPlans } = await supabase
      .from("user_plans")
      .select("user_id, plan, expires_at, auto_renew")
      .eq("plan", "yearly")
      .eq("auto_renew", false)
      .not("expires_at", "is", null)
      .lte("expires_at", now.toISOString());

    const frozenIds: string[] = [];
    if (expiredPlans && expiredPlans.length > 0) {
      for (const plan of expiredPlans) {
        await supabase
          .from("user_plans")
          .update({ plan: "frozen", updated_at: now.toISOString() })
          .eq("user_id", plan.user_id);
        frozenIds.push(plan.user_id);
        console.log(`[PLAN-EXPIRY] Frozen: user ${plan.user_id} - piano scaduto senza rinnovo`);
      }
    }

    return new Response(JSON.stringify({
      notified: notifiedIds.length,
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
