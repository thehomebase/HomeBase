import { db } from "./db";
import { sql } from "drizzle-orm";

const LISTINGS_TTL_HOURS = 24;
const PROPERTY_TTL_HOURS = 72;
const MAX_MEMORY_TTL_MS = 2 * 60 * 60 * 1000;

const memoryCache = new Map<string, { data: any; expiresAt: number }>();

export type CacheType = "listings" | "property" | "verified";

function getTtlMs(cacheType: CacheType): number {
  switch (cacheType) {
    case "property":
      return PROPERTY_TTL_HOURS * 60 * 60 * 1000;
    case "listings":
    case "verified":
    default:
      return LISTINGS_TTL_HOURS * 60 * 60 * 1000;
  }
}

export function buildPropertyCacheKey(address: string, city?: string, state?: string, zip?: string): string {
  const parts = [address, city || "", state || "", zip || ""].map(s => s.toLowerCase().trim());
  return `property:${parts.join("|")}`;
}

export function buildListingsCacheKey(params: URLSearchParams): string {
  return `listings:${params.toString()}`;
}

let dbAvailable = true;

async function ensureTable(): Promise<boolean> {
  if (!dbAvailable) return false;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rentcast_cache (
        cache_key TEXT PRIMARY KEY,
        cache_type TEXT NOT NULL DEFAULT 'listings',
        response_data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    return true;
  } catch (e) {
    console.error("[RentCastCache] Table creation failed, falling back to memory-only:", e);
    dbAvailable = false;
    return false;
  }
}

let tableReady: Promise<boolean> | null = null;
function getTableReady(): Promise<boolean> {
  if (!tableReady) tableReady = ensureTable();
  return tableReady;
}

export async function getCached(cacheKey: string): Promise<any | null> {
  const mem = memoryCache.get(cacheKey);
  if (mem && Date.now() < mem.expiresAt) {
    return mem.data;
  }
  memoryCache.delete(cacheKey);

  if (!(await getTableReady())) return null;

  try {
    const result = await db.execute(sql`
      SELECT response_data, expires_at FROM rentcast_cache 
      WHERE cache_key = ${cacheKey} AND expires_at > NOW()
    `);
    if (result.rows.length > 0) {
      const data = result.rows[0].response_data;
      const dbExpiresAt = new Date(result.rows[0].expires_at as string).getTime();
      const remainingMs = dbExpiresAt - Date.now();
      const memTtl = Math.min(remainingMs, MAX_MEMORY_TTL_MS);
      if (memTtl > 0) {
        memoryCache.set(cacheKey, { data, expiresAt: Date.now() + memTtl });
      }
      return data;
    }
  } catch (e) {
    console.error("[RentCastCache] DB read error:", e);
  }
  return null;
}

export async function setCache(cacheKey: string, data: any, cacheType: CacheType = "listings"): Promise<void> {
  const ttlMs = getTtlMs(cacheType);
  const expiresAt = new Date(Date.now() + ttlMs);

  memoryCache.set(cacheKey, { data, expiresAt: Date.now() + Math.min(ttlMs, MAX_MEMORY_TTL_MS) });

  if (!(await getTableReady())) return;

  try {
    await db.execute(sql`
      INSERT INTO rentcast_cache (cache_key, cache_type, response_data, created_at, expires_at)
      VALUES (${cacheKey}, ${cacheType}, ${JSON.stringify(data)}::jsonb, NOW(), ${expiresAt.toISOString()}::timestamptz)
      ON CONFLICT (cache_key) DO UPDATE SET
        response_data = ${JSON.stringify(data)}::jsonb,
        cache_type = ${cacheType},
        created_at = NOW(),
        expires_at = ${expiresAt.toISOString()}::timestamptz
    `);
  } catch (e) {
    console.error("[RentCastCache] DB write error:", e);
  }
}

export function getCacheSize(): number {
  return memoryCache.size;
}

export async function getDbCacheSize(): Promise<number> {
  if (!(await getTableReady())) return 0;
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM rentcast_cache WHERE expires_at > NOW()
    `);
    return Number(result.rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function cleanExpiredCache(): Promise<number> {
  for (const [key, val] of memoryCache.entries()) {
    if (Date.now() >= val.expiresAt) memoryCache.delete(key);
  }

  if (!(await getTableReady())) return 0;

  try {
    const result = await db.execute(sql`
      DELETE FROM rentcast_cache WHERE expires_at <= NOW() RETURNING cache_key
    `);
    return result.rows.length;
  } catch (e) {
    console.error("[RentCastCache] Cleanup error:", e);
    return 0;
  }
}
