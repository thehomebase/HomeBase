import { db } from "./db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY || "";
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET || "";

export async function initDropboxSchema() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS dropbox_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_expiry TIMESTAMP,
      account_id TEXT,
      display_name TEXT,
      email TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

export function isDropboxConfigured(): boolean {
  return !!(DROPBOX_APP_KEY && DROPBOX_APP_SECRET);
}

export function generateDropboxState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getDropboxAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: DROPBOX_APP_KEY,
    redirect_uri: redirectUri,
    response_type: "code",
    token_access_type: "offline",
    state,
  });
  return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
}

export async function handleDropboxCallback(code: string, redirectUri: string, userId: number): Promise<{ email?: string; displayName?: string }> {
  const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: DROPBOX_APP_KEY,
      client_secret: DROPBOX_APP_SECRET,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("Dropbox token exchange error:", err);
    throw new Error("Failed to exchange Dropbox authorization code");
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  const expiresIn = tokenData.expires_in;
  const accountId = tokenData.account_id;
  const tokenExpiry = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

  let email: string | undefined;
  let displayName: string | undefined;

  try {
    const accountRes = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    if (accountRes.ok) {
      const accountData = await accountRes.json();
      email = accountData.email;
      displayName = accountData.name?.display_name;
    }
  } catch (e) {
    console.error("Failed to fetch Dropbox account info:", e);
  }

  await db.execute(sql`
    INSERT INTO dropbox_tokens (user_id, access_token, refresh_token, token_expiry, account_id, display_name, email, updated_at)
    VALUES (${userId}, ${accessToken}, ${refreshToken}, ${tokenExpiry}, ${accountId}, ${displayName || null}, ${email || null}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      access_token = ${accessToken},
      refresh_token = ${refreshToken},
      token_expiry = ${tokenExpiry},
      account_id = ${accountId},
      display_name = ${displayName || null},
      email = ${email || null},
      updated_at = NOW()
  `);

  return { email, displayName };
}

async function getAccessToken(userId: number): Promise<string | null> {
  const result = await db.execute(sql`
    SELECT access_token, refresh_token, token_expiry FROM dropbox_tokens WHERE user_id = ${userId}
  `);

  if (!result.rows.length) return null;

  const row = result.rows[0];
  const expiry = row.token_expiry ? new Date(row.token_expiry as string) : null;

  if (expiry && expiry < new Date() && row.refresh_token) {
    try {
      const refreshRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: row.refresh_token as string,
          client_id: DROPBOX_APP_KEY,
          client_secret: DROPBOX_APP_SECRET,
        }),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        const newExpiry = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
        await db.execute(sql`
          UPDATE dropbox_tokens SET access_token = ${data.access_token}, token_expiry = ${newExpiry}, updated_at = NOW()
          WHERE user_id = ${userId}
        `);
        return data.access_token;
      } else {
        await db.execute(sql`DELETE FROM dropbox_tokens WHERE user_id = ${userId}`);
        return null;
      }
    } catch (e) {
      console.error("Dropbox token refresh error:", e);
      return null;
    }
  }

  return row.access_token as string;
}

export async function getDropboxConnectionStatus(userId: number): Promise<{ connected: boolean; email?: string; displayName?: string }> {
  const result = await db.execute(sql`
    SELECT email, display_name FROM dropbox_tokens WHERE user_id = ${userId}
  `);
  if (!result.rows.length) return { connected: false };
  return {
    connected: true,
    email: result.rows[0].email as string | undefined,
    displayName: result.rows[0].display_name as string | undefined,
  };
}

export async function disconnectDropbox(userId: number): Promise<void> {
  const token = await getAccessToken(userId);
  if (token) {
    try {
      await fetch("https://api.dropboxapi.com/2/auth/token/revoke", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
    } catch (e) {
      console.error("Failed to revoke Dropbox token:", e);
    }
  }
  await db.execute(sql`DELETE FROM dropbox_tokens WHERE user_id = ${userId}`);
}

export async function listDropboxFiles(userId: number, path: string = ""): Promise<{
  entries: Array<{
    name: string;
    path: string;
    isFolder: boolean;
    size?: number;
    modified?: string;
    id?: string;
  }>;
  hasMore: boolean;
  cursor?: string;
}> {
  const token = await getAccessToken(userId);
  if (!token) throw new Error("Dropbox not connected");

  const res = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: path || "",
      include_non_downloadable_files: false,
      limit: 100,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Dropbox list folder error:", err);
    throw new Error("Failed to list Dropbox files");
  }

  const data = await res.json();

  return {
    entries: data.entries.map((entry: any) => ({
      name: entry.name,
      path: entry.path_display || entry.path_lower,
      isFolder: entry[".tag"] === "folder",
      size: entry.size,
      modified: entry.server_modified,
      id: entry.id,
    })),
    hasMore: data.has_more,
    cursor: data.cursor,
  };
}

const MAX_DOWNLOAD_SIZE = 50 * 1024 * 1024;

export async function downloadDropboxFile(userId: number, path: string): Promise<{ buffer: Buffer; name: string; mimeType: string }> {
  const token = await getAccessToken(userId);
  if (!token) throw new Error("Dropbox not connected");

  const res = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({ path }),
    },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Dropbox download error:", err);
    throw new Error("Failed to download file from Dropbox");
  }

  const apiResult = res.headers.get("Dropbox-API-Result");
  let name = "document";
  if (apiResult) {
    try {
      const parsed = JSON.parse(apiResult);
      name = parsed.name || name;
    } catch (e) {}
  }

  const contentLength = res.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > MAX_DOWNLOAD_SIZE) {
    throw new Error("File too large (max 50MB)");
  }

  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_DOWNLOAD_SIZE) {
    throw new Error("File too large (max 50MB)");
  }
  const buffer = Buffer.from(arrayBuffer);

  const ext = name.split(".").pop()?.toLowerCase() || "";
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
  };

  return { buffer, name, mimeType: mimeTypes[ext] || "application/octet-stream" };
}

export async function searchDropboxFiles(userId: number, query: string): Promise<Array<{
  name: string;
  path: string;
  isFolder: boolean;
  size?: number;
  modified?: string;
}>> {
  const token = await getAccessToken(userId);
  if (!token) throw new Error("Dropbox not connected");

  const res = await fetch("https://api.dropboxapi.com/2/files/search_v2", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      options: {
        max_results: 20,
        file_extensions: ["pdf", "doc", "docx"],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Dropbox search error:", err);
    throw new Error("Failed to search Dropbox files");
  }

  const data = await res.json();

  return data.matches.map((match: any) => {
    const metadata = match.metadata?.metadata || match.metadata;
    return {
      name: metadata.name,
      path: metadata.path_display || metadata.path_lower,
      isFolder: metadata[".tag"] === "folder",
      size: metadata.size,
      modified: metadata.server_modified,
    };
  });
}
