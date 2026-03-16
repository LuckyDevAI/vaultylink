/**
 * VaultLink — Biometric unlock via WebAuthn
 * Stores master password encrypted with AES-256-GCM using HKDF-derived key
 * The encryption key is derived from the credential ID + a random salt via HKDF,
 * so the raw credential ID alone cannot decrypt the password.
 */

import { useState, useCallback, useEffect } from 'react';

const DB_NAME = 'vaultlink';
const CREDENTIAL_KEY = 'biometric_credential';
const PW_KEY = 'biometric_pw';
const HKDF_SALT_KEY = 'biometric_hkdf_salt';

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
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

// ── Crypto helpers ────────────────────────────────────────────────────────────
function bufToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

/** Derive an AES-256-GCM key from credential ID using HKDF with a random salt */
async function deriveKeyFromCredential(credentialId: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(credentialId),
    'HKDF',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt.buffer as ArrayBuffer,
      info: new TextEncoder().encode('vaultlink-biometric-v1'),
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Encrypt plaintext with AES-256-GCM, returns JSON string with iv + ciphertext */
async function aesEncrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return JSON.stringify({
    iv: [...iv],
    d: [...new Uint8Array(ciphertext)],
  });
}

/** Decrypt AES-256-GCM ciphertext */
async function aesDecrypt(encrypted: string, key: CryptoKey): Promise<string> {
  const { iv, d } = JSON.parse(encrypted);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    new Uint8Array(d)
  );
  return new TextDecoder().decode(plainBuf);
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useBiometric() {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [checking, setChecking] = useState(true);

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

  // Enroll biometric: create credential and store AES-encrypted password
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
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
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

      // Generate random HKDF salt
      const hkdfSalt = crypto.getRandomValues(new Uint8Array(32));
      await dbSet(HKDF_SALT_KEY, JSON.stringify([...hkdfSalt]));

      // Store credential ID
      await dbSet(CREDENTIAL_KEY, JSON.stringify({ id: credId, rawId: credId }));

      // Derive key and encrypt master password with AES-256-GCM
      const derivedKey = await deriveKeyFromCredential(credId, hkdfSalt);
      const encryptedPw = await aesEncrypt(masterPassword, derivedKey);
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

      // Retrieve HKDF salt and derive key
      const saltStr = await dbGet(HKDF_SALT_KEY);
      if (!saltStr) return null;
      const hkdfSalt = new Uint8Array(JSON.parse(saltStr));

      const derivedKey = await deriveKeyFromCredential(rawId, hkdfSalt);

      // Decrypt password
      const encryptedPw = await dbGet(PW_KEY);
      if (!encryptedPw) return null;

      return await aesDecrypt(encryptedPw, derivedKey);
    } catch (e) {
      console.error('Biometric auth failed:', e);
      return null;
    }
  }, []);

  // Remove biometric enrollment
  const disable = useCallback(async () => {
    await dbDelete(CREDENTIAL_KEY);
    await dbDelete(PW_KEY);
    await dbDelete(HKDF_SALT_KEY);
    setEnabled(false);
  }, []);

  // Update stored password (e.g. after password change)
  const updatePassword = useCallback(async (newPassword: string) => {
    const storedCred = await dbGet(CREDENTIAL_KEY);
    if (!storedCred) return;
    const { rawId } = JSON.parse(storedCred);

    const saltStr = await dbGet(HKDF_SALT_KEY);
    if (!saltStr) return;
    const hkdfSalt = new Uint8Array(JSON.parse(saltStr));

    const derivedKey = await deriveKeyFromCredential(rawId, hkdfSalt);
    const encryptedPw = await aesEncrypt(newPassword, derivedKey);
    await dbSet(PW_KEY, encryptedPw);
  }, []);

  return {
    available,
    enabled,
    checking,
    enroll,
    authenticate,
    disable,
    updatePassword,
  };
}
