import { google } from "googleapis";
import { db } from "./db";
import { sql } from "drizzle-orm";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const domains = process.env.REPLIT_DOMAINS || "";
  const domain = domains.split(",")[0];
  const redirectUri = domain
    ? `https://${domain}/api/gmail/callback`
    : "http://localhost:5000/api/gmail/callback";

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state,
  });
}

export async function handleCallback(code: string, userId: number): Promise<{ email: string }> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error("No refresh token received. Please try connecting again.");
  }

  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email || "unknown";

  const tokenExpiry = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  await db.execute(sql`
    INSERT INTO google_tokens (user_id, access_token, refresh_token, token_expiry, email, updated_at)
    VALUES (${userId}, ${tokens.access_token!}, ${tokens.refresh_token}, ${tokenExpiry}, ${email}, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      access_token = ${tokens.access_token!},
      refresh_token = ${tokens.refresh_token},
      token_expiry = ${tokenExpiry},
      email = ${email},
      updated_at = NOW()
  `);

  return { email };
}

async function getAuthenticatedClient(userId: number) {
  const result = await db.execute(sql`
    SELECT access_token, refresh_token, token_expiry, email
    FROM google_tokens WHERE user_id = ${userId}
  `);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: row.access_token as string,
    refresh_token: row.refresh_token as string,
    expiry_date: new Date(row.token_expiry as string).getTime(),
  });

  const now = Date.now();
  const expiry = new Date(row.token_expiry as string).getTime();
  if (now >= expiry - 60000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      const newExpiry = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

      await db.execute(sql`
        UPDATE google_tokens
        SET access_token = ${credentials.access_token!},
            token_expiry = ${newExpiry},
            updated_at = NOW()
        WHERE user_id = ${userId}
      `);
    } catch (error) {
      console.error("Failed to refresh Google token:", error);
      throw new Error("Gmail connection expired. Please reconnect your Google account.");
    }
  }

  return { client: oauth2Client, email: row.email as string };
}

export async function getGmailStatus(userId: number): Promise<{ connected: boolean; email?: string }> {
  const result = await db.execute(sql`
    SELECT email FROM google_tokens WHERE user_id = ${userId}
  `);
  if (result.rows.length === 0) {
    return { connected: false };
  }
  return { connected: true, email: result.rows[0].email as string };
}

export async function disconnectGmail(userId: number): Promise<void> {
  await db.execute(sql`DELETE FROM google_tokens WHERE user_id = ${userId}`);
}

export async function sendGmailEmail(
  userId: number,
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const auth = await getAuthenticatedClient(userId);
    if (!auth) {
      return { success: false, error: "Gmail not connected. Please connect your Google account." };
    }

    const gmail = google.gmail({ version: "v1", auth: auth.client });

    const messageParts = [
      `From: ${auth.email}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      "",
      body,
    ];
    const rawMessage = Buffer.from(messageParts.join("\r\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: rawMessage },
    });

    return { success: true, messageId: result.data.id || undefined };
  } catch (error: any) {
    console.error("Gmail send error:", error);
    return { success: false, error: error.message || "Failed to send email via Gmail" };
  }
}

export async function getGmailMessages(
  userId: number,
  clientEmail: string,
  maxResults: number = 20
): Promise<{ messages: any[]; error?: string }> {
  try {
    const auth = await getAuthenticatedClient(userId);
    if (!auth) {
      return { messages: [], error: "Gmail not connected" };
    }

    const gmail = google.gmail({ version: "v1", auth: auth.client });

    const query = `from:${clientEmail} OR to:${clientEmail}`;
    const listResult = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults,
    });

    if (!listResult.data.messages || listResult.data.messages.length === 0) {
      return { messages: [] };
    }

    const messages = await Promise.all(
      listResult.data.messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "metadata",
          metadataHeaders: ["From", "To", "Subject", "Date"],
        });

        const headers = detail.data.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

        return {
          id: detail.data.id,
          threadId: detail.data.threadId,
          from: getHeader("From"),
          to: getHeader("To"),
          subject: getHeader("Subject"),
          date: getHeader("Date"),
          snippet: detail.data.snippet || "",
          labelIds: detail.data.labelIds || [],
        };
      })
    );

    return { messages };
  } catch (error: any) {
    console.error("Gmail fetch error:", error);
    return { messages: [], error: error.message || "Failed to fetch Gmail messages" };
  }
}
