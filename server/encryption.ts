import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET || process.env.DATABASE_URL || "homebase-default-encryption-key";
  return scryptSync(secret, "homebase-messages-salt", 32);
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
