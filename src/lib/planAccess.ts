export interface VaultPlan {
  subscribed?: boolean;
  plan?: string | null;
  subscription_end?: string | null;
}

export function canSyncCloud(plan: VaultPlan | null, now = Date.now()): boolean {
  return plan?.plan === 'yearly' && plan.subscribed === true &&
    !!plan.subscription_end && new Date(plan.subscription_end).getTime() > now;
}