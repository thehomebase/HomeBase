import { db } from "./db";
import { sql } from "drizzle-orm";
import { encryptToken, decryptToken, isEncrypted } from "./encryption";

const SIGNNOW_API_BASE = "https://api.signnow.com";
const SIGNNOW_AUTH_URL = "https://app.signnow.com/authorize";

function getRedirectUri(): string {
  const domains = process.env.REPLIT_DOMAINS || "";
  const domain = domains.split(",")[0];
  return domain
    ? `https://${domain}/api/signnow/callback`
    : "http://localhost:5000/api/signnow/callback";
}

function getClientCredentials() {
  const clientId = process.env.SIGNNOW_CLIENT_ID;
  const clientSecret = process.env.SIGNNOW_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SignNow API credentials not configured");
  }
  return { clientId, clientSecret };
}

function getBasicAuth(): string {
  const { clientId, clientSecret } = getClientCredentials();
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export function getSignNowAuthUrl(state: string): string {
  const { clientId } = getClientCredentials();
  const redirectUri = getRedirectUri();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "*",
  });
  return `${SIGNNOW_AUTH_URL}?${params.toString()}`;
}

export async function handleSignNowCallback(code: string, userId: number): Promise<{ email: string | null }> {
  const redirectUri = getRedirectUri();

  const tokenRes = await fetch(`${SIGNNOW_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${getBasicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("SignNow token exchange error:", err);
    throw new Error("Failed to exchange SignNow authorization code");
  }

  const tokens = await tokenRes.json();
  const accessToken = tokens.access_token;
  const refreshToken = tokens.refresh_token;
  const expiresIn = tokens.expires_in || 3600;
  const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

  let email: string | null = null;
  try {
    const userRes = await fetch(`${SIGNNOW_API_BASE}/user`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      email = userData.primary_email || userData.email || null;
    }
  } catch (e) {
    console.error("Failed to fetch SignNow user info:", e);
  }

  const encAccessToken = encryptToken(accessToken);
  const encRefreshToken = refreshToken ? encryptToken(refreshToken) : null;
  await db.execute(sql`
    INSERT INTO signnow_tokens (user_id, access_token, refresh_token, token_expiry, email, updated_at)
    VALUES (${userId}, ${encAccessToken}, ${encRefreshToken || ''}, ${tokenExpiry}, ${email}, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      access_token = ${encAccessToken},
      refresh_token = COALESCE(${encRefreshToken}, signnow_tokens.refresh_token),
      token_expiry = ${tokenExpiry},
      email = ${email},
      updated_at = NOW()
  `);

  return { email };
}

async function getAccessToken(userId: number): Promise<string | null> {
  const result = await db.execute(sql`
    SELECT access_token, refresh_token, token_expiry
    FROM signnow_tokens WHERE user_id = ${userId}
  `);

  if (result.rows.length === 0) return null;

  const row = result.rows[0] as any;
  const rawAccessToken = (row.access_token as string) || "";
  const rawRefreshToken = (row.refresh_token as string) || "";
  const accessTokenDecrypted = rawAccessToken && isEncrypted(rawAccessToken) ? decryptToken(rawAccessToken) : rawAccessToken;
  const refreshTokenDecrypted = rawRefreshToken && isEncrypted(rawRefreshToken) ? decryptToken(rawRefreshToken) : rawRefreshToken;
  const expiry = new Date(row.token_expiry);

  if (expiry > new Date(Date.now() + 60_000)) {
    return accessTokenDecrypted;
  }

  try {
    const tokenRes = await fetch(`${SIGNNOW_API_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${getBasicAuth()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshTokenDecrypted,
      }),
    });

    if (!tokenRes.ok) {
      console.error("SignNow token refresh failed:", await tokenRes.text());
      return null;
    }

    const tokens = await tokenRes.json();
    const newExpiry = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    const encNewAccess = encryptToken(tokens.access_token);
    const encNewRefresh = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;
    await db.execute(sql`
      UPDATE signnow_tokens
      SET access_token = ${encNewAccess},
          refresh_token = COALESCE(${encNewRefresh}, refresh_token),
          token_expiry = ${newExpiry},
          updated_at = NOW()
      WHERE user_id = ${userId}
    `);

    return tokens.access_token;
  } catch (e) {
    console.error("SignNow token refresh error:", e);
    return null;
  }
}

export async function getSignNowStatus(userId: number): Promise<{ connected: boolean; email?: string }> {
  const result = await db.execute(sql`
    SELECT email FROM signnow_tokens WHERE user_id = ${userId}
  `);
  if (result.rows.length === 0) return { connected: false };
  return { connected: true, email: (result.rows[0] as any).email || undefined };
}

export async function disconnectSignNow(userId: number): Promise<void> {
  await db.execute(sql`DELETE FROM signnow_tokens WHERE user_id = ${userId}`);
}

function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default: return 'application/octet-stream';
  }
}

export async function uploadDocument(userId: number, fileBuffer: Buffer, fileName: string): Promise<{ id: string; name: string }> {
  const token = await getAccessToken(userId);
  if (!token) throw new Error("SignNow not connected");

  const allowedExts = ['pdf', 'doc', 'docx'];
  const ext = fileName.toLowerCase().split('.').pop();
  if (!ext || !allowedExts.includes(ext)) {
    throw new Error("Only PDF, DOC, and DOCX files are supported");
  }

  const mimeType = getMimeType(fileName);
  const boundary = `----FormBoundary${Date.now()}`;
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(header),
    fileBuffer,
    Buffer.from(footer),
  ]);

  const res = await fetch(`${SIGNNOW_API_BASE}/document`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("SignNow upload error:", err);
    throw new Error("Failed to upload document to SignNow");
  }

  const data = await res.json();
  return { id: data.id, name: fileName };
}

export async function sendSigningInvite(
  userId: number,
  documentId: string,
  signerEmail: string,
  signerRole?: string
): Promise<{ inviteId: string; signingUrl: string }> {
  const token = await getAccessToken(userId);
  if (!token) throw new Error("SignNow not connected");

  const inviteRes = await fetch(`${SIGNNOW_API_BASE}/document/${documentId}/invite`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: [{
        email: signerEmail,
        role: signerRole || "Signer",
        order: 1,
      }],
      from: undefined,
      subject: "Please sign this document",
      message: "You have been invited to sign a document. Please review and sign at your earliest convenience.",
    }),
  });

  if (!inviteRes.ok) {
    const err = await inviteRes.text();
    console.error("SignNow invite error:", err);
    throw new Error("Failed to send signing invite");
  }

  const data = await inviteRes.json();
  const signingUrl = `https://app.signnow.com/webapp/document/${documentId}`;

  return { inviteId: data.id || data.data?.[0]?.id || "sent", signingUrl };
}

export async function getDocumentStatus(userId: number, documentId: string): Promise<{
  id: string;
  name: string;
  status: string;
  signatures: Array<{ email: string; status: string; signedAt?: string }>;
}> {
  const token = await getAccessToken(userId);
  if (!token) throw new Error("SignNow not connected");

  const res = await fetch(`${SIGNNOW_API_BASE}/document/${documentId}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("SignNow document status error:", err);
    throw new Error("Failed to get document status");
  }

  const data = await res.json();

  const signatures = (data.signatures || []).map((sig: any) => ({
    email: sig.email || "unknown",
    status: sig.data ? "signed" : "pending",
    signedAt: sig.created || undefined,
  }));

  const allSigned = data.field_invites?.length > 0 &&
    data.field_invites.every((inv: any) => inv.status === "fulfilled");

  return {
    id: data.id,
    name: data.document_name || data.original_filename || "Document",
    status: allSigned ? "signed" : signatures.length > 0 ? "partially_signed" : "pending",
    signatures,
  };
}

export async function getDocuments(userId: number): Promise<Array<{
  id: string;
  name: string;
  created: string;
  updated: string;
}>> {
  const token = await getAccessToken(userId);
  if (!token) throw new Error("SignNow not connected");

  const res = await fetch(`${SIGNNOW_API_BASE}/user/documentsv2`, {
    headers: { "Authorization": `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("SignNow list documents error:", err);
    throw new Error("Failed to list SignNow documents");
  }

  const data = await res.json();
  return (data || []).map((doc: any) => ({
    id: doc.id,
    name: doc.document_name || doc.original_filename || "Untitled",
    created: doc.created,
    updated: doc.updated,
  }));
}

export async function downloadDocument(userId: number, documentId: string): Promise<Buffer> {
  const token = await getAccessToken(userId);
  if (!token) throw new Error("SignNow not connected");

  const res = await fetch(`${SIGNNOW_API_BASE}/document/${documentId}/download?type=collapsed`, {
    headers: { "Authorization": `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to download document from SignNow");
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function isSignNowConfigured(): boolean {
  return !!(process.env.SIGNNOW_CLIENT_ID && process.env.SIGNNOW_CLIENT_SECRET);
}

export async function logSignNowAction(
  userId: number,
  action: string,
  details: {
    documentId?: string;
    signerEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO signnow_audit_log (user_id, action, document_id, signer_email, ip_address, user_agent, metadata)
      VALUES (${userId}, ${action}, ${details.documentId || null}, ${details.signerEmail || null}, 
              ${details.ipAddress || null}, ${details.userAgent || null}, 
              ${JSON.stringify(details.metadata || {})}::jsonb)
    `);
  } catch (e) {
    console.error("Failed to log SignNow action:", e);
  }
}
