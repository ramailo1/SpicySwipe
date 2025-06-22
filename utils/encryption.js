// utils/encryption.js
// Encrypt/decrypt settings with a passphrase using Web Crypto API

async function getKey(passphrase) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
}

async function deriveAesKey(passphrase, salt) {
  const key = await getKey(passphrase);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

window.encryptSettings = async function(data, passphrase) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveAesKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    enc.encode(JSON.stringify(data))
  );
  return {
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ciphertext))
  };
};

window.decryptSettings = async function(encData, passphrase) {
  const dec = new TextDecoder();
  const salt = new Uint8Array(encData.salt);
  const iv = new Uint8Array(encData.iv);
  const aesKey = await deriveAesKey(passphrase, salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new Uint8Array(encData.ciphertext)
  );
  return JSON.parse(dec.decode(plaintext));
}; 