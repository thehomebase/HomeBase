import { google } from "googleapis";
import { db } from "./db";
import { sql } from "drizzle-orm";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.settings.basic",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.events",
];

function getOAuth2Client(requestHost?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  let redirectUri: string;
  if (requestHost) {
    const proto = requestHost.includes("localhost") ? "http" : "https";
    redirectUri = `${proto}://${requestHost}/api/gmail/callback`;
  } else {
    const domains = process.env.REPLIT_DOMAINS || "";
    const domain = domains.split(",")[0];
    redirectUri = domain
      ? `https://${domain}/api/gmail/callback`
      : "http://localhost:5000/api/gmail/callback";
  }

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(state: string, requestHost?: string): string {
  const oauth2Client = getOAuth2Client(requestHost);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state,
  });
}

export async function handleCallback(code: string, userId: number, requestHost?: string): Promise<{ email: string }> {
  const oauth2Client = getOAuth2Client(requestHost);
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

async function getGmailSignature(gmail: any, email: string): Promise<string> {
  try {
    const aliases = await gmail.users.settings.sendAs.list({ userId: "me" });
    const sendAs = aliases.data.sendAs || [];
    const primary = sendAs.find((a: any) => a.isPrimary) || sendAs.find((a: any) => a.sendAsEmail === email);
    return primary?.signature || "";
  } catch (error) {
    console.error("Failed to fetch Gmail signature:", error);
    return "";
  }
}

export async function getSignature(userId: number): Promise<{ signature: string; error?: string }> {
  try {
    const auth = await getAuthenticatedClient(userId);
    if (!auth) return { signature: "", error: "Gmail not connected" };
    const gmail = google.gmail({ version: "v1", auth: auth.client });
    const sig = await getGmailSignature(gmail, auth.email);
    return { signature: sig };
  } catch (error: any) {
    return { signature: "", error: error.message };
  }
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  content: Buffer;
}

export async function sendGmailEmail(
  userId: number,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  attachments?: EmailAttachment[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const auth = await getAuthenticatedClient(userId);
    if (!auth) {
      return { success: false, error: "Gmail not connected. Please connect your Google account." };
    }

    const gmail = google.gmail({ version: "v1", auth: auth.client });

    let htmlBody = body;
    const isRichHtml = body.startsWith("<");
    if (!isRichHtml) {
      htmlBody = body.replace(/\n/g, "<br>");
      const signature = await getGmailSignature(gmail, auth.email);
      if (signature) {
        htmlBody += `<br><br>--<br>${signature}`;
      }
    }

    let rawMessage: string;

    if (attachments && attachments.length > 0) {
      const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const headerLines = [
        `From: ${auth.email}`,
        `To: ${to}`,
        ...(cc ? [`Cc: ${cc}`] : []),
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        `Content-Type: text/html; charset=utf-8`,
        `Content-Transfer-Encoding: base64`,
        "",
        Buffer.from(htmlBody).toString("base64"),
      ];

      for (const att of attachments) {
        headerLines.push(
          `--${boundary}`,
          `Content-Type: ${att.mimeType}; name="${att.filename}"`,
          `Content-Disposition: attachment; filename="${att.filename}"`,
          `Content-Transfer-Encoding: base64`,
          "",
          att.content.toString("base64")
        );
      }

      headerLines.push(`--${boundary}--`);

      rawMessage = Buffer.from(headerLines.join("\r\n"))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    } else {
      const messageParts = [
        `From: ${auth.email}`,
        `To: ${to}`,
        ...(cc ? [`Cc: ${cc}`] : []),
        `Subject: ${subject}`,
        `Content-Type: text/html; charset=utf-8`,
        "",
        htmlBody,
      ];
      rawMessage = Buffer.from(messageParts.join("\r\n"))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    }

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

export async function getGmailInbox(
  userId: number,
  options: { maxResults?: number; pageToken?: string; query?: string; label?: string } = {}
): Promise<{ messages: any[]; nextPageToken?: string; resultSizeEstimate?: number; error?: string }> {
  try {
    const auth = await getAuthenticatedClient(userId);
    if (!auth) {
      return { messages: [], error: "Gmail not connected" };
    }

    const gmail = google.gmail({ version: "v1", auth: auth.client });
    const { maxResults = 25, pageToken, query, label } = options;

    const listParams: any = {
      userId: "me",
      maxResults,
    };
    if (pageToken) listParams.pageToken = pageToken;
    if (query) listParams.q = query;
    if (label) {
      listParams.labelIds = [label];
    }

    const listResult = await gmail.users.messages.list(listParams);

    if (!listResult.data.messages || listResult.data.messages.length === 0) {
      return { messages: [], resultSizeEstimate: 0 };
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
          isUnread: (detail.data.labelIds || []).includes("UNREAD"),
        };
      })
    );

    return {
      messages,
      nextPageToken: listResult.data.nextPageToken || undefined,
      resultSizeEstimate: listResult.data.resultSizeEstimate || undefined,
    };
  } catch (error: any) {
    console.error("Gmail inbox fetch error:", error);
    return { messages: [], error: error.message || "Failed to fetch inbox" };
  }
}

export async function getGmailMessageDetail(
  userId: number,
  messageId: string
): Promise<{ message: any | null; error?: string }> {
  try {
    const auth = await getAuthenticatedClient(userId);
    if (!auth) {
      return { message: null, error: "Gmail not connected" };
    }

    const gmail = google.gmail({ version: "v1", auth: auth.client });

    const detail = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const headers = detail.data.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

    function extractBody(payload: any): { html: string; text: string } {
      let html = "";
      let text = "";

      if (payload.mimeType === "text/html" && payload.body?.data) {
        html = Buffer.from(payload.body.data, "base64url").toString("utf-8");
      } else if (payload.mimeType === "text/plain" && payload.body?.data) {
        text = Buffer.from(payload.body.data, "base64url").toString("utf-8");
      }

      if (payload.parts) {
        for (const part of payload.parts) {
          const sub = extractBody(part);
          if (sub.html) html = sub.html;
          if (sub.text && !text) text = sub.text;
        }
      }

      return { html, text };
    }

    const { html, text } = extractBody(detail.data.payload);

    return {
      message: {
        id: detail.data.id,
        threadId: detail.data.threadId,
        from: getHeader("From"),
        to: getHeader("To"),
        cc: getHeader("Cc"),
        subject: getHeader("Subject"),
        date: getHeader("Date"),
        snippet: detail.data.snippet || "",
        labelIds: detail.data.labelIds || [],
        body: html || text.replace(/\n/g, "<br>"),
        isHtml: !!html,
      },
    };
  } catch (error: any) {
    console.error("Gmail message detail error:", error);
    return { message: null, error: error.message || "Failed to fetch message" };
  }
}

export async function batchModifyMessages(
  userId: number,
  messageIds: string[],
  addLabelIds?: string[],
  removeLabelIds?: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthenticatedClient(userId);
    if (!auth) return { success: false, error: "Gmail not connected" };
    const gmail = google.gmail({ version: "v1", auth: auth.client });

    await gmail.users.messages.batchModify({
      userId: "me",
      requestBody: {
        ids: messageIds,
        addLabelIds: addLabelIds || [],
        removeLabelIds: removeLabelIds || [],
      },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Gmail batch modify error:", error);
    return { success: false, error: error.message || "Failed to modify messages" };
  }
}

export async function trashMessages(
  userId: number,
  messageIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthenticatedClient(userId);
    if (!auth) return { success: false, error: "Gmail not connected" };
    const gmail = google.gmail({ version: "v1", auth: auth.client });

    await Promise.all(
      messageIds.map((id) =>
        gmail.users.messages.trash({ userId: "me", id })
      )
    );
    return { success: true };
  } catch (error: any) {
    console.error("Gmail trash error:", error);
    return { success: false, error: error.message || "Failed to trash messages" };
  }
}

export async function getGmailLabels(
  userId: number
): Promise<{ labels: Array<{ id: string; name: string; type: string }>; error?: string }> {
  try {
    const auth = await getAuthenticatedClient(userId);
    if (!auth) return { labels: [], error: "Gmail not connected" };
    const gmail = google.gmail({ version: "v1", auth: auth.client });

    const result = await gmail.users.labels.list({ userId: "me" });
    const labels = (result.data.labels || [])
      .filter((l) => l.type === "user" || ["STARRED", "IMPORTANT"].includes(l.id || ""))
      .map((l) => ({ id: l.id || "", name: l.name || "", type: l.type || "" }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { labels };
  } catch (error: any) {
    console.error("Gmail labels error:", error);
    return { labels: [], error: error.message || "Failed to fetch labels" };
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

export async function syncAllTransactionsToGoogleCalendar(
  userId: number,
  transactions: Array<{
    id: number;
    streetName?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    closingDate?: string | null;
    optionPeriodExpiration?: string | null;
  }>
): Promise<{ synced: number; errors: number; error?: string }> {
  try {
    const auth = await getAuthenticatedClient(userId);
    if (!auth) {
      return { synced: 0, errors: 0, error: "Google account not connected" };
    }

    const calendar = google.calendar({ version: "v3", auth: auth.client });
    let synced = 0;
    let errors = 0;

    for (const transaction of transactions) {
      const address = [transaction.streetName, transaction.city, transaction.state, transaction.zipCode].filter(Boolean).join(", ") || "TBD";
      const txnIdStr = String(transaction.id);
      const toDateStr = (d: string) => new Date(d).toISOString().split("T")[0];

      const upsertEvent = async (rawId: string, event: any) => {
        const safeId = rawId.replace(/[^a-v0-9]/g, "").slice(0, 32).padEnd(5, "0");
        event.id = safeId;
        try {
          await calendar.events.get({ calendarId: "primary", eventId: safeId });
          await calendar.events.update({ calendarId: "primary", eventId: safeId, requestBody: event });
        } catch {
          await calendar.events.insert({ calendarId: "primary", requestBody: event });
        }
      };

      try {
        if (transaction.closingDate) {
          const dateStr = toDateStr(transaction.closingDate);
          await upsertEvent(`homebaseclosing${txnIdStr}`, {
            summary: `Closing - ${address}`,
            description: `Closing for property at ${address}\n\nManaged by HomeBase`,
            location: address,
            start: { date: dateStr },
            end: { date: dateStr },
          });
          synced++;
        }

        if (transaction.optionPeriodExpiration) {
          const dateStr = toDateStr(transaction.optionPeriodExpiration);
          await upsertEvent(`homebaseoption${txnIdStr}`, {
            summary: `Option Expiration - ${address}`,
            description: `Option period expiration for property at ${address}\n\nManaged by HomeBase`,
            location: address,
            start: { date: dateStr },
            end: { date: dateStr },
          });
          synced++;
        }
      } catch (err: any) {
        console.error(`Calendar sync error for transaction ${transaction.id}:`, err?.message);
        errors++;
      }
    }

    console.log(`[Google Calendar] Synced ${synced} events, ${errors} errors for user ${userId}`);
    return { synced, errors };
  } catch (error: any) {
    console.error("Google Calendar bulk sync error:", error?.message);
    return { synced: 0, errors: 0, error: error?.message || "Calendar sync failed" };
  }
}

export async function syncTransactionToGoogleCalendar(
  userId: number,
  transaction: {
    id: number;
    streetName?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    closingDate?: string | null;
    optionPeriodExpiration?: string | null;
  }
): Promise<{ synced: boolean; error?: string }> {
  try {
    const auth = await getAuthenticatedClient(userId);
    if (!auth) {
      return { synced: false, error: "Google account not connected" };
    }

    const calendar = google.calendar({ version: "v3", auth: auth.client });
    const address = [transaction.streetName, transaction.city, transaction.state, transaction.zipCode].filter(Boolean).join(", ") || "TBD";
    const txnIdStr = String(transaction.id);

    const toDateStr = (d: string) => new Date(d).toISOString().split("T")[0];

    const upsertEvent = async (rawId: string, event: any) => {
      const safeId = rawId.replace(/[^a-v0-9]/g, "").slice(0, 32).padEnd(5, "0");
      event.id = safeId;
      try {
        await calendar.events.get({ calendarId: "primary", eventId: safeId });
        await calendar.events.update({ calendarId: "primary", eventId: safeId, requestBody: event });
      } catch {
        await calendar.events.insert({ calendarId: "primary", requestBody: event });
      }
    };

    if (transaction.closingDate) {
      const dateStr = toDateStr(transaction.closingDate);
      await upsertEvent(`homebaseclosing${txnIdStr}`, {
        summary: `Closing - ${address}`,
        description: `Closing for property at ${address}\n\nManaged by HomeBase`,
        location: address,
        start: { date: dateStr },
        end: { date: dateStr },
      });
    }

    if (transaction.optionPeriodExpiration) {
      const dateStr = toDateStr(transaction.optionPeriodExpiration);
      await upsertEvent(`homebaseoption${txnIdStr}`, {
        summary: `Option Expiration - ${address}`,
        description: `Option period expiration for property at ${address}\n\nManaged by HomeBase`,
        location: address,
        start: { date: dateStr },
        end: { date: dateStr },
      });
    }

    return { synced: true };
  } catch (error: any) {
    console.error("Google Calendar sync error:", error?.message);
    return { synced: false, error: error?.message || "Calendar sync failed" };
  }
}

export async function countGmailEmailsForClients(
  userId: number,
  clientEmails: string[]
): Promise<{ total: number; today: number; thisWeek: number; thisMonth: number; error?: string }> {
  const zero = { total: 0, today: 0, thisWeek: 0, thisMonth: 0 };
  try {
    if (!clientEmails.length) {
      console.log(`[GmailCount] No client emails for user ${userId}`);
      return zero;
    }

    console.log(`[GmailCount] Counting emails for user ${userId} with ${clientEmails.length} client emails`);

    const auth = await getAuthenticatedClient(userId);
    if (!auth) {
      console.log(`[GmailCount] Gmail not connected for user ${userId}`);
      return { ...zero, error: "Gmail not connected" };
    }

    const gmail = google.gmail({ version: "v1", auth: auth.client });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const formatDate = (d: Date) =>
      `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;

    const limitedEmails = clientEmails.slice(0, 50);
    const emailParts = limitedEmails.map((e) => `{from:${e} to:${e}}`);

    const countMessages = async (afterDate?: Date): Promise<number> => {
      let q: string;
      if (emailParts.length <= 10) {
        q = emailParts.join(" OR ");
      } else {
        const batches: string[][] = [];
        for (let i = 0; i < emailParts.length; i += 10) {
          batches.push(emailParts.slice(i, i + 10));
        }
        let total = 0;
        for (const batch of batches) {
          let bq = batch.join(" OR ");
          if (afterDate) bq = `(${bq}) after:${formatDate(afterDate)}`;
          try {
            const res = await gmail.users.messages.list({
              userId: "me",
              q: bq,
              maxResults: 1,
            });
            total += res.data.resultSizeEstimate || 0;
          } catch (batchErr: any) {
            console.error(`[GmailCount] Batch query error for user ${userId}:`, batchErr?.message);
          }
        }
        return total;
      }

      if (afterDate) q = `(${q}) after:${formatDate(afterDate)}`;
      try {
        const res = await gmail.users.messages.list({
          userId: "me",
          q,
          maxResults: 1,
        });
        const count = res.data.resultSizeEstimate || 0;
        return count;
      } catch (err: any) {
        console.error(`[GmailCount] Query error for user ${userId}:`, err?.message, "Query:", q?.substring(0, 200));
        return 0;
      }
    };

    const [total, today, thisWeek, thisMonth] = await Promise.all([
      countMessages(),
      countMessages(todayStart),
      countMessages(weekStart),
      countMessages(monthStart),
    ]);

    console.log(`[GmailCount] Results for user ${userId}: total=${total}, today=${today}, week=${thisWeek}, month=${thisMonth}`);
    return { total, today, thisWeek, thisMonth };
  } catch (error: any) {
    console.error("[GmailCount] Fatal error:", error?.message, error?.stack?.substring(0, 300));
    return { ...zero, error: error?.message || "Failed to count emails" };
  }
}
