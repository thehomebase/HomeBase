import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

let _messageKey: Buffer | null = null;
let _tokenKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (_messageKey) return _messageKey;
  const secret = process.env.SESSION_SECRET || process.env.DATABASE_URL;
  if (!secret) {
    throw new Error("SESSION_SECRET or DATABASE_URL must be set for message encryption");
  }
  _messageKey = scryptSync(secret, "homebase-messages-salt", 32);
  return _messageKey;
}

function getTokenEncryptionKey(): Buffer {
  if (_tokenKey) return _tokenKey;
  const secret = process.env.SESSION_SECRET || process.env.DATABASE_URL;
  if (!secret) {
    throw new Error("SESSION_SECRET or DATABASE_URL must be set for token encryption");
  }
  _tokenKey = scryptSync(secret, "homebase-tokens-salt", 32);
  return _tokenKey;
}

export function encryptMessage(plaintext: string): { ciphertext: string; iv: string } {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return {
    ciphertext: encrypted + ":" + authTag,
    iv: iv.toString("hex"),
  };
}

export function decryptMessage(ciphertext: string, ivHex: string): string {
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const parts = ciphertext.split(":");
    if (parts.length !== 2) return "[Unable to decrypt]";
    const [encryptedData, authTagHex] = parts;
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "[Unable to decrypt]";
  }
}

export function encryptToken(plaintext: string): string {
  const key = getTokenEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return iv.toString("hex") + ":" + encrypted + ":" + authTag;
}

export function decryptToken(encryptedValue: string): string {
  try {
    const parts = encryptedValue.split(":");
    if (parts.length !== 3) return encryptedValue;
    const [ivHex, encryptedData, authTagHex] = parts;
    const key = getTokenEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[Encryption] Token decryption failed — key mismatch or data corruption");
    return encryptedValue;
  }
}

export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 3 && /^[0-9a-f]{32}$/.test(parts[0]);
}
