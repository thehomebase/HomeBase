import { db } from "./db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

const DOCUSIGN_AUTH_SERVER = process.env.DOCUSIGN_BASE_URL?.includes("demo")
  ? "https://account-d.docusign.com"
  : "https://account.docusign.com";

function getRedirectUri(): string {
  const domains = process.env.REPLIT_DOMAINS || "";
  const domain = domains.split(",")[0];
  return domain
    ? `https://${domain}/api/docusign/callback`
    : "http://localhost:5000/api/docusign/callback";
}

function getClientCredentials() {
  const clientId = process.env.DOCUSIGN_INTEGRATION_KEY;
  const clientSecret = process.env.DOCUSIGN_SECRET_KEY;
  if (!clientId || !clientSecret) {
    throw new Error("DocuSign API credentials not configured");
  }
  return { clientId, clientSecret };
}

function getBasicAuth(): string {
  const { clientId, clientSecret } = getClientCredentials();
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function isDocuSignConfigured(): boolean {
  return !!(process.env.DOCUSIGN_INTEGRATION_KEY && process.env.DOCUSIGN_SECRET_KEY);
}

export function getDocuSignAuthUrl(state: string, codeChallenge: string): string {
  const { clientId } = getClientCredentials();
  const redirectUri = encodeURIComponent(getRedirectUri());
  const scopes = encodeURIComponent("signature");
  return `${DOCUSIGN_AUTH_SERVER}/oauth/auth?response_type=code&scope=${scopes}&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
}

export async function handleDocuSignCallback(code: string, userId: number, codeVerifier: string): Promise<{ email: string | null }> {
  const res = await fetch(`${DOCUSIGN_AUTH_SERVER}/oauth/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${getBasicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("DocuSign token exchange error:", err);
    throw new Error("Failed to exchange DocuSign authorization code");
  }

  const tokenData = await res.json();
  const { access_token, refresh_token, expires_in } = tokenData;
  const tokenExpiry = new Date(Date.now() + expires_in * 1000);

  const userInfoRes = await fetch(`${DOCUSIGN_AUTH_SERVER}/oauth/userinfo`, {
    headers: { "Authorization": `Bearer ${access_token}` },
  });

  let email: string | null = null;
  let accountId: string | null = process.env.DOCUSIGN_ACCOUNT_ID || null;
  let baseUri: string | null = process.env.DOCUSIGN_BASE_URL || null;

  if (userInfoRes.ok) {
    const userInfo = await userInfoRes.json();
    email = userInfo.email || null;
    if (userInfo.accounts && userInfo.accounts.length > 0) {
      const defaultAccount = userInfo.accounts.find((a: any) => a.is_default) || userInfo.accounts[0];
      accountId = defaultAccount.account_id;
      baseUri = defaultAccount.base_uri;
    }
  }

  if (!accountId || !baseUri) {
    throw new Error("Failed to retrieve DocuSign account information. Please try connecting again.");
  }

  await db.execute(sql`
    INSERT INTO docusign_tokens (user_id, access_token, refresh_token, token_expiry, email, account_id, base_uri, updated_at)
    VALUES (${userId}, ${access_token}, ${refresh_token}, ${tokenExpiry}, ${email}, ${accountId}, ${baseUri}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      access_token = ${access_token},
      refresh_token = ${refresh_token},
      token_expiry = ${tokenExpiry},
      email = ${email},
      account_id = ${accountId},
      base_uri = ${baseUri},
      updated_at = NOW()
  `);

  return { email };
}

async function getAccessToken(userId: number): Promise<{ token: string; accountId: string; baseUri: string } | null> {
  const rows: any = await db.execute(sql`
    SELECT access_token, refresh_token, token_expiry, account_id, base_uri
    FROM docusign_tokens WHERE user_id = ${userId}
  `);

  const row = rows.rows?.[0] || rows[0];
  if (!row) return null;
  if (!row.account_id || !row.base_uri) return null;

  const expiry = new Date(row.token_expiry);
  if (expiry > new Date(Date.now() + 5 * 60 * 1000)) {
    return { token: row.access_token, accountId: row.account_id, baseUri: row.base_uri };
  }

  try {
    const res = await fetch(`${DOCUSIGN_AUTH_SERVER}/oauth/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${getBasicAuth()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: row.refresh_token,
      }),
    });

    if (!res.ok) {
      console.error("DocuSign token refresh failed:", await res.text());
      await db.execute(sql`DELETE FROM docusign_tokens WHERE user_id = ${userId}`);
      return null;
    }

    const data = await res.json();
    const newExpiry = new Date(Date.now() + data.expires_in * 1000);

    await db.execute(sql`
      UPDATE docusign_tokens
      SET access_token = ${data.access_token},
          refresh_token = ${data.refresh_token || row.refresh_token},
          token_expiry = ${newExpiry},
          updated_at = NOW()
      WHERE user_id = ${userId}
    `);

    return { token: data.access_token, accountId: row.account_id, baseUri: row.base_uri };
  } catch (e) {
    console.error("DocuSign token refresh error:", e);
    return null;
  }
}

export async function getDocuSignStatus(userId: number): Promise<{ connected: boolean; email?: string }> {
  const rows: any = await db.execute(sql`
    SELECT email FROM docusign_tokens WHERE user_id = ${userId}
  `);
  const row = rows.rows?.[0] || rows[0];
  if (!row) return { connected: false };
  return { connected: true, email: row.email || undefined };
}

export async function disconnectDocuSign(userId: number): Promise<void> {
  await db.execute(sql`DELETE FROM docusign_tokens WHERE user_id = ${userId}`);
}

export async function createEnvelope(
  userId: number,
  fileBuffer: Buffer,
  fileName: string,
  signerEmail: string,
  signerName: string,
  emailSubject?: string
): Promise<{ envelopeId: string; status: string }> {
  const auth = await getAccessToken(userId);
  if (!auth) throw new Error("DocuSign not connected");

  const fileBase64 = fileBuffer.toString("base64");

  const ext = fileName.toLowerCase().split('.').pop();
  const fileExtension = ext || 'pdf';

  const envelope = {
    emailSubject: emailSubject || `Please sign: ${fileName}`,
    documents: [{
      documentBase64: fileBase64,
      name: fileName,
      fileExtension,
      documentId: "1",
    }],
    recipients: {
      signers: [{
        email: signerEmail,
        name: signerName,
        recipientId: "1",
        routingOrder: "1",
        tabs: {
          signHereTabs: [{
            documentId: "1",
            pageNumber: "1",
            xPosition: "100",
            yPosition: "700",
          }],
          dateSignedTabs: [{
            documentId: "1",
            pageNumber: "1",
            xPosition: "300",
            yPosition: "700",
          }],
        },
      }],
    },
    status: "sent",
  };

  const res = await fetch(`${auth.baseUri}/restapi/v2.1/accounts/${auth.accountId}/envelopes`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(envelope),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("DocuSign envelope creation error:", err);
    throw new Error("Failed to create DocuSign envelope");
  }

  const data = await res.json();
  return { envelopeId: data.envelopeId, status: data.status };
}

export async function createDraftEnvelope(
  userId: number,
  fileBuffer: Buffer,
  fileName: string,
  signerEmail: string,
  signerName: string,
  emailSubject?: string
): Promise<{ envelopeId: string; status: string }> {
  const auth = await getAccessToken(userId);
  if (!auth) throw new Error("DocuSign not connected");

  const fileBase64 = fileBuffer.toString("base64");
  const ext = fileName.toLowerCase().split('.').pop();
  const fileExtension = ext || 'pdf';

  const envelope = {
    emailSubject: emailSubject || `Please sign: ${fileName}`,
    documents: [{
      documentBase64: fileBase64,
      name: fileName,
      fileExtension,
      documentId: "1",
    }],
    recipients: {
      signers: [{
        email: signerEmail,
        name: signerName,
        recipientId: "1",
        routingOrder: "1",
      }],
    },
    status: "created",
  };

  const res = await fetch(`${auth.baseUri}/restapi/v2.1/accounts/${auth.accountId}/envelopes`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(envelope),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("DocuSign draft envelope creation error:", err);
    throw new Error("Failed to create draft envelope");
  }

  const data = await res.json();
  return { envelopeId: data.envelopeId, status: data.status };
}

export async function createSenderView(
  userId: number,
  envelopeId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const auth = await getAccessToken(userId);
  if (!auth) throw new Error("DocuSign not connected");

  const res = await fetch(
    `${auth.baseUri}/restapi/v2.1/accounts/${auth.accountId}/envelopes/${envelopeId}/views/sender`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        returnUrl,
        viewAccess: "envelope",
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("DocuSign sender view error:", err);
    throw new Error("Failed to create sender view");
  }

  const data = await res.json();
  return { url: data.url };
}

export async function getEnvelopeStatus(userId: number, envelopeId: string): Promise<{
  status: string;
  sentDateTime?: string;
  completedDateTime?: string;
  recipients?: Array<{ name: string; email: string; status: string; signedDateTime?: string }>;
}> {
  const auth = await getAccessToken(userId);
  if (!auth) throw new Error("DocuSign not connected");

  const res = await fetch(`${auth.baseUri}/restapi/v2.1/accounts/${auth.accountId}/envelopes/${envelopeId}?include=recipients`, {
    headers: { "Authorization": `Bearer ${auth.token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("DocuSign envelope status error:", err);
    throw new Error("Failed to get envelope status");
  }

  const data = await res.json();

  const recipients = data.recipients?.signers?.map((s: any) => ({
    name: s.name,
    email: s.email,
    status: s.status,
    signedDateTime: s.signedDateTime,
  })) || [];

  return {
    status: data.status,
    sentDateTime: data.sentDateTime,
    completedDateTime: data.completedDateTime,
    recipients,
  };
}

export async function listEnvelopes(userId: number, fromDate?: string): Promise<Array<{
  envelopeId: string;
  status: string;
  emailSubject: string;
  sentDateTime?: string;
  completedDateTime?: string;
}>> {
  const auth = await getAccessToken(userId);
  if (!auth) throw new Error("DocuSign not connected");

  const from = fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const res = await fetch(
    `${auth.baseUri}/restapi/v2.1/accounts/${auth.accountId}/envelopes?from_date=${encodeURIComponent(from)}&order=desc`,
    { headers: { "Authorization": `Bearer ${auth.token}` } }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("DocuSign list envelopes error:", err);
    throw new Error("Failed to list envelopes");
  }

  const data = await res.json();
  return (data.envelopes || []).map((e: any) => ({
    envelopeId: e.envelopeId,
    status: e.status,
    emailSubject: e.emailSubject,
    sentDateTime: e.sentDateTime,
    completedDateTime: e.completedDateTime,
  }));
}

export async function downloadEnvelopeDocuments(userId: number, envelopeId: string): Promise<Buffer> {
  const auth = await getAccessToken(userId);
  if (!auth) throw new Error("DocuSign not connected");

  const res = await fetch(
    `${auth.baseUri}/restapi/v2.1/accounts/${auth.accountId}/envelopes/${envelopeId}/documents/combined`,
    { headers: { "Authorization": `Bearer ${auth.token}` } }
  );

  if (!res.ok) {
    throw new Error("Failed to download envelope documents");
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function logDocuSignAction(
  userId: number,
  action: string,
  details: {
    envelopeId?: string;
    signerEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO signnow_audit_log (user_id, action, document_id, signer_email, ip_address, user_agent, metadata)
      VALUES (${userId}, ${`docusign_${action}`}, ${details.envelopeId || null}, ${details.signerEmail || null},
              ${details.ipAddress || null}, ${details.userAgent || null},
              ${JSON.stringify(details.metadata || {})}::jsonb)
    `);
  } catch (e) {
    console.error("Failed to log DocuSign action:", e);
  }
}
