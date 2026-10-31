export const YEARLY_PRICE = 'price_1TBkipCRiYFDB9U6JvyCLg2K';
export const YEARLY_PRODUCT = 'prod_UA4sfi1uPvB1AN';
export const LIFETIME_PRICE = 'price_1UWb2ACRiYFDB9U6iXitz0Xn';
export const TRIAL_DAYS = 10;

export function checkoutPolicy(priceId: string) {
  if (priceId === YEARLY_PRICE) return {
    mode: 'subscription' as const,
    payment_method_collection: 'always' as const,
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' as const } },
    },
  };
  if (priceId === LIFETIME_PRICE) return { mode: 'payment' as const };
  throw new Error('Piano non valido');
}

type Subscription = {
  status: string;
  trial_end?: number | null;
  cancel_at_period_end: boolean;
  items: { data: { current_period_end?: number; price: { product: string | { id: string } } }[] };
};

export function annualState(sub: Subscription, now = Date.now()) {
  const item = sub.items.data.find(i =>
    (typeof i.price.product === 'string' ? i.price.product : i.price.product.id) === YEARLY_PRODUCT);
  if (!item) return null;
  const trialing = sub.status === 'trialing';
  const end = trialing ? sub.trial_end : item.current_period_end;
  const subscribed = (trialing || sub.status === 'active') && !!end && end * 1000 > now;
  return {
    subscribed,
    plan: subscribed ? 'yearly' : 'frozen',
    subscription_end: end ? new Date(end * 1000).toISOString() : null,
    auto_renew: subscribed && !sub.cancel_at_period_end,
    trialing: subscribed && trialing,
    trial_end: trialing && end ? new Date(end * 1000).toISOString() : null,
  };
}