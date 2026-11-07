import { describe, expect, it } from 'vitest';
import { canSyncCloud } from '@/lib/planAccess';

const now = Date.UTC(2026, 10, 7);
const future = new Date(now + 10 * 86400000).toISOString();

describe('Accesso cloud dei piani', () => {
  it('Lifetime è solo locale anche quando acquistato', () => {
    expect(canSyncCloud({ plan: 'lifetime', subscribed: true, subscription_end: future }, now)).toBe(false);
  });
  it('Cloud Sync annuale è disponibile durante i 10 giorni gratuiti', () => {
    expect(canSyncCloud({ plan: 'yearly', subscribed: true, subscription_end: future }, now)).toBe(true);
  });
  it('non concede cloud senza piano verificato', () => {
    expect(canSyncCloud(null, now)).toBe(false);
  });
  it('non concede cloud dopo la scadenza', () => {
    expect(canSyncCloud({ plan: 'yearly', subscribed: true, subscription_end: new Date(now).toISOString() }, now)).toBe(false);
  });
});