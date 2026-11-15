import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VaultApp from '@/pages/VaultApp';

const mocks = vi.hoisted(() => ({
  autoUnlock: vi.fn(),
  pullFromCloud: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  invoke: vi.fn(),
  useVault: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: mocks.getSession, getUser: mocks.getUser }, functions: { invoke: mocks.invoke } },
}));
vi.mock('@/hooks/useVault', () => ({ useVault: mocks.useVault }));
vi.mock('@/hooks/useBiometric', () => ({ useBiometric: () => ({}) }));
vi.mock('@/stores/appStore', () => ({ useAppStore: () => ({ lang: 'it', cloudUser: true, setView: vi.fn() }) }));

describe('Sblocco locale indipendente dal piano', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'local-account' } } } });
    // The remote user lookup cannot authenticate while offline.
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    mocks.autoUnlock.mockResolvedValue({ ok: true });
    mocks.useVault.mockReturnValue({
      sessionRestored: true, locked: true,
      autoUnlock: mocks.autoUnlock, pullFromCloud: mocks.pullFromCloud,
    });
  });
  afterEach(cleanup);

  it.each([
    ['errore della verifica', () => Promise.resolve({ data: null, error: new Error('500') })],
    ['rete assente', () => Promise.reject(new Error('offline'))],
    ['verifica ancora in attesa', () => new Promise(() => {})],
  ])('sblocca con %s senza concedere cloud', async (_label, check) => {
    mocks.invoke.mockImplementation(check);
    render(<VaultApp />);
    await waitFor(() => expect(mocks.autoUnlock).toHaveBeenCalledWith('local-account'));
    expect(mocks.autoUnlock).toHaveBeenCalledTimes(1);
    expect(mocks.pullFromCloud).not.toHaveBeenCalled();
    expect(mocks.useVault).toHaveBeenCalledWith(false);
  });
});