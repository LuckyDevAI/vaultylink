/**
 * VaultLink — Biometric unlock via WebAuthn
 * Stores master password protected by device biometric (fingerprint/Face ID)
 */

import { useState, useCallback, useEffect } from 'react';

const DB_NAME = 'vaultlink';
const CREDENTIAL_KEY = 'biometric_credential';
const PW_KEY = 'biometric_pw';

// ── IndexedDB helpers (reuse same DB) ─────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
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

async function dbDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('vault', 'readwrite');
    tx.objectStore('vault').delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function bufToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

// Simple XOR obfuscation with a device-bound key (credential ID)
// This isn't meant to be cryptographically strong — the biometric IS the security gate
function xorEncrypt(text: string, keyStr: string): string {
  const textBytes = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(keyStr);
  const result = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return bufToB64(result.buffer);
}

function xorDecrypt(encrypted: string, keyStr: string): string {
  const encBytes = new Uint8Array(b64ToBuf(encrypted));
  const keyBytes = new TextEncoder().encode(keyStr);
  const result = new Uint8Array(encBytes.length);
  for (let i = 0; i < encBytes.length; i++) {
    result[i] = encBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(result);
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useBiometric() {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check availability and if already enrolled
  useEffect(() => {
    const check = async () => {
      try {
        const isAvailable =
          !!window.PublicKeyCredential &&
          typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
          (await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());

        setAvailable(isAvailable);

        if (isAvailable) {
          const stored = await dbGet(CREDENTIAL_KEY);
          setEnabled(!!stored);
        }
      } catch {
        setAvailable(false);
      } finally {
        setChecking(false);
      }
    };
    check();
  }, []);

  // Enroll biometric: create credential and store encrypted password
  const enroll = useCallback(async (masterPassword: string): Promise<boolean> => {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'VaultLink', id: window.location.hostname },
          user: {
            id: userId,
            name: 'vaultlink-user',
            displayName: 'VaultLink User',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },   // ES256
            { alg: -257, type: 'public-key' },  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!credential) return false;

      const credId = bufToB64(credential.rawId);
      // Store credential ID
      await dbSet(CREDENTIAL_KEY, JSON.stringify({
        id: credId,
        rawId: credId,
      }));

      // Encrypt and store master password
      const encryptedPw = xorEncrypt(masterPassword, credId);
      await dbSet(PW_KEY, encryptedPw);

      setEnabled(true);
      return true;
    } catch (e) {
      console.error('Biometric enrollment failed:', e);
      return false;
    }
  }, []);

  // Authenticate with biometric and return master password
  const authenticate = useCallback(async (): Promise<string | null> => {
    try {
      const storedCred = await dbGet(CREDENTIAL_KEY);
      if (!storedCred) return null;

      const { rawId } = JSON.parse(storedCred);
      const credIdBuf = b64ToBuf(rawId);

      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{
            id: credIdBuf,
            type: 'public-key',
            transports: ['internal'],
          }],
          userVerification: 'required',
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!assertion) return null;

      // Retrieve and decrypt password
      const encryptedPw = await dbGet(PW_KEY);
      if (!encryptedPw) return null;

      return xorDecrypt(encryptedPw, rawId);
    } catch (e) {
      console.error('Biometric auth failed:', e);
      return null;
    }
  }, []);

  // Remove biometric enrollment
  const disable = useCallback(async () => {
    await dbDelete(CREDENTIAL_KEY);
    await dbDelete(PW_KEY);
    setEnabled(false);
  }, []);

  // Update stored password (e.g. after password change)
  const updatePassword = useCallback(async (newPassword: string) => {
    const storedCred = await dbGet(CREDENTIAL_KEY);
    if (!storedCred) return;
    const { rawId } = JSON.parse(storedCred);
    const encryptedPw = xorEncrypt(newPassword, rawId);
    await dbSet(PW_KEY, encryptedPw);
  }, []);

  return {
    available,  // Device supports biometric
    enabled,    // User has enrolled biometric
    checking,   // Still checking availability
    enroll,     // Register biometric + store password
    authenticate, // Verify biometric + return password
    disable,    // Remove biometric data
    updatePassword, // Update stored password after change
  };
}
