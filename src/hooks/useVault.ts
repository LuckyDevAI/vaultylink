/**
 * VaultLink — useVault hook (Web Crypto API)
 * AES-256-GCM encryption, PBKDF2 key derivation
 * Uses IndexedDB for persistent storage
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
const DB_NAME = 'vaultlink';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('vault')) db.createObjectStore('vault');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(key: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('vault', 'readonly');
    const req = tx.objectStore('vault').get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function dbSet(key: string, value: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('vault', 'readwrite');
    tx.objectStore('vault').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Crypto helpers ────────────────────────────────────────────────────────────
async function getSalt(): Promise<Uint8Array<ArrayBuffer>> {
  const stored = await dbGet('salt');
  if (stored) return new Uint8Array(JSON.parse(stored)) as Uint8Array<ArrayBuffer>;
  const s = crypto.getRandomValues(new Uint8Array(16));
  await dbSet('salt', JSON.stringify([...s]));
  return s as Uint8Array<ArrayBuffer>;
}

async function deriveKey(password: string, salt: BufferSource): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(data: unknown, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(data))
  );
  return JSON.stringify({ iv: [...iv], d: [...new Uint8Array(buf)] });
}

async function decrypt(ciphertext: string, key: CryptoKey): Promise<unknown> {
  const { iv, d } = JSON.parse(ciphertext);
  const buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    new Uint8Array(d)
  );
  return JSON.parse(new TextDecoder().decode(buf));
}

// ── Link type ─────────────────────────────────────────────────────────────────
export interface VaultLink {
  id: string;
  url: string;
  title: string;
  siteName: string;
  topic: string;
  type: 'main' | 'sub';
  parentId?: string;
  favorite: boolean;
  private: boolean;
  createdAt: number;
  updatedAt: number;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useVault() {
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [locked, setLocked] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const hasSalt = useCallback(async (): Promise<boolean> => {
    const stored = await dbGet('salt');
    return !!stored;
  }, []);

  const hasVault = useCallback(async (): Promise<boolean> => {
    const blob = await dbGet('vaultData');
    return !!blob;
  }, []);

  const setup = useCallback(async (password: string) => {
    setBusy(true); setError('');
    try {
      const salt = await getSalt();
      const k = await deriveKey(password, salt);
      await dbSet('vaultData', await encrypt([], k));
      setKey(k);
      setLocked(false);
      return { ok: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      return { ok: false, error: msg };
    } finally { setBusy(false); }
  }, []);

  const unlock = useCallback(async (password: string) => {
    setBusy(true); setError('');
    try {
      const salt = await getSalt();
      const k = await deriveKey(password, salt);
      const blob = await dbGet('vaultData');
      if (blob) await decrypt(blob, k);
      setKey(k);
      setLocked(false);
      return { ok: true };
    } catch {
      const msg = 'Password errata / Wrong password';
      setError(msg);
      return { ok: false, error: msg };
    } finally { setBusy(false); }
  }, []);

  const lock = useCallback(() => {
    setKey(null);
    setLocked(true);
  }, []);

  const saveLinks = useCallback(async (links: VaultLink[]) => {
    if (!key) throw new Error('Vault is locked');
    await dbSet('vaultData', await encrypt(links, key));
  }, [key]);

  const loadLinks = useCallback(async (): Promise<VaultLink[]> => {
    if (!key) return [];
    try {
      const blob = await dbGet('vaultData');
      if (!blob) return [];
      return (await decrypt(blob, key)) as VaultLink[];
    } catch { return []; }
  }, [key]);

  const changePassword = useCallback(async (newPassword: string) => {
    if (!key) throw new Error('Vault is locked');
    const salt = await getSalt();
    const newKey = await deriveKey(newPassword, salt);
    const links = await loadLinks();
    await dbSet('vaultData', await encrypt(links, newKey));
    setKey(newKey);
  }, [key, loadLinks]);

  const exportBlob = useCallback(async (): Promise<string | null> => {
    return dbGet('vaultData');
  }, []);

  const importBlob = useCallback(async (ciphertext: string) => {
    await dbSet('vaultData', ciphertext);
  }, []);

  // ── Cloud sync ────────────────────────────────────────────────────────────
  const pushToCloud = useCallback(async () => {
    const blob = await dbGet('vaultData');
    if (!blob) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: err } = await supabase
      .from('vault_data')
      .upsert({ user_id: user.id, encrypted_blob: blob, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (err) throw err;
  }, []);

  const pullFromCloud = useCallback(async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error: err } = await supabase
      .from('vault_data')
      .select('encrypted_blob')
      .eq('user_id', user.id)
      .maybeSingle();
    if (err) throw err;
    if (data?.encrypted_blob) {
      await dbSet('vaultData', data.encrypted_blob);
      return true;
    }
    return false;
  }, []);

  const syncCloud = useCallback(async () => {
    if (!key) return;
    try {
      // Push local data to cloud after every save
      await pushToCloud();
    } catch (e) {
      console.error('Cloud sync error:', e);
      throw e;
    }
  }, [key, pushToCloud]);

  return {
    key, locked, error, busy,
    hasSalt, hasVault, setup, unlock, lock,
    saveLinks, loadLinks, changePassword,
    exportBlob, importBlob,
    pushToCloud, pullFromCloud, syncCloud,
  };
}
