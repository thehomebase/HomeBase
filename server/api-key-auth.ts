import { Request, Response, NextFunction } from "express";
import { createHash, randomBytes } from "crypto";
import { storage } from "./storage";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): string {
  return "hb_" + randomBytes(30).toString("base64url");
}

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] as string;
  if (!apiKey) {
    return res.status(401).json({ error: "Missing X-API-Key header" });
  }

  const keyHash = hashApiKey(apiKey);
  const keyRecord = await storage.getApiKeyByHash(keyHash);

  if (!keyRecord) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  storage.updateApiKeyLastUsed(keyRecord.id).catch(() => {});

  (req as any).apiKeyUserId = keyRecord.userId;
  (req as any).apiKeyPermissions = keyRecord.permissions;

  next();
}
