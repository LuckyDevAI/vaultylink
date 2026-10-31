import { describe, expect, it } from 'vitest';
import { annualState, checkoutPolicy, YEARLY_PRICE, YEARLY_PRODUCT, LIFETIME_PRICE } from '../../supabase/functions/_shared/billing-policy';

const now = Date.UTC(2026, 9, 31);
const end = now / 1000 + 10 * 86400;
const subscription = (status: string, canceled = false) => ({
  status, cancel_at_period_end: canceled, trial_end: end,
  items: { data: [{ current_period_end: end, price: { product: YEARLY_PRODUCT } }] },
});

describe('Cloud Sync annuale', () => {
  it('avvia esattamente 10 giorni gratuiti', () => {
    expect(checkoutPolicy(YEARLY_PRICE).subscription_data?.trial_period_days).toBe(10);
  });
  it('raccoglie il metodo di pagamento per l’addebito successivo', () => {
    expect(checkoutPolicy(YEARLY_PRICE).payment_method_collection).toBe('always');
    expect(checkoutPolicy(YEARLY_PRICE).mode).toBe('subscription');
  });
  it('consente Cloud Sync durante la prova', () => {
    expect(annualState(subscription('trialing'), now)).toMatchObject({ subscribed: true, trialing: true, plan: 'yearly', auto_renew: true });
  });
  it('la disdetta elimina il rinnovo ma mantiene accesso fino alla fine dei 10 giorni', () => {
    expect(annualState(subscription('trialing', true), now)).toMatchObject({ subscribed: true, auto_renew: false });
    expect(annualState(subscription('trialing', true), end * 1000)?.subscribed).toBe(false);
  });
  it('non concede accesso dopo cancellazione o pagamento fallito', () => {
    expect(annualState(subscription('canceled'), now)?.subscribed).toBe(false);
    expect(annualState(subscription('past_due'), now)?.subscribed).toBe(false);
  });
  it('non modifica il pagamento lifetime', () => {
    expect(checkoutPolicy(LIFETIME_PRICE)).toEqual({ mode: 'payment' });
  });
  it('rifiuta prezzi non autorizzati', () => {
    expect(() => checkoutPolicy('price_other')).toThrow();
  });
});