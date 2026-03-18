import { db } from "./db";
import { sql } from "drizzle-orm";

const FIRMA_API_BASE = "https://api.firma.dev/functions/v1/signing-request-api";
const FIRMA_EMBED_EDITOR_JS = "https://api.firma.dev/functions/v1/embed-proxy/signing-request-editor.js";

function getApiKey(): string {
  const key = process.env.FIRMA_API_KEY;
  if (!key) throw new Error("FIRMA_API_KEY not configured");
  return key;
}

export function isFirmaConfigured(): boolean {
  return !!process.env.FIRMA_API_KEY;
}

async function firmaFetch(path: string, options: RequestInit = {}): Promise<any> {
  const apiKey = getApiKey();
  const url = path.startsWith("http") ? path : `${FIRMA_API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Firma API error [${res.status}]:`, text);
    throw new Error(`Firma API error: ${res.status} ${text}`);
  }
  return res.json();
}

export async function createSigningRequest(data: {
  title: string;
  message?: string;
  document?: string;
}): Promise<any> {
  const payload: any = {
    name: data.title,
    message: data.message || "",
  };
  if (data.document) {
    payload.document = data.document;
  }
  return firmaFetch("/signing-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSigningRequest(signingRequestId: string): Promise<any> {
  return firmaFetch(`/signing-requests/${signingRequestId}`);
}

export async function listSigningRequests(): Promise<any> {
  return firmaFetch("/signing-requests");
}

export async function sendSigningRequest(signingRequestId: string): Promise<any> {
  return firmaFetch(`/signing-requests/${signingRequestId}/send`, {
    method: "POST",
  });
}

export async function cancelSigningRequest(signingRequestId: string): Promise<any> {
  return firmaFetch(`/signing-requests/${signingRequestId}/cancel`, {
    method: "POST",
  });
}

export async function updateSigningRequest(signingRequestId: string, data: any): Promise<any> {
  return firmaFetch(`/signing-requests/${signingRequestId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function generateSigningRequestJWT(signingRequestId: string): Promise<{ token: string }> {
  return firmaFetch("/jwt/generate-signing-request", {
    method: "POST",
    body: JSON.stringify({
      companies_workspaces_signing_requests_id: signingRequestId,
    }),
  });
}

export async function revokeSigningRequestJWT(signingRequestId: string): Promise<any> {
  return firmaFetch("/jwt/revoke-signing-request", {
    method: "POST",
    body: JSON.stringify({
      companies_workspaces_signing_requests_id: signingRequestId,
    }),
  });
}

export async function getSigningRequestFields(signingRequestId: string): Promise<any> {
  return firmaFetch(`/signing-requests/${signingRequestId}/fields`);
}

export async function getSigningRequestUsers(signingRequestId: string): Promise<any> {
  return firmaFetch(`/signing-requests/${signingRequestId}/users`);
}

export async function addSigningRequestField(signingRequestId: string, field: any): Promise<any> {
  return firmaFetch(`/signing-requests/${signingRequestId}/fields`, {
    method: "POST",
    body: JSON.stringify(field),
  });
}

export async function updateSigningRequestField(signingRequestId: string, fieldId: string, field: any): Promise<any> {
  return firmaFetch(`/signing-requests/${signingRequestId}/fields/${fieldId}`, {
    method: "PUT",
    body: JSON.stringify(field),
  });
}

export async function deleteSigningRequestField(signingRequestId: string, fieldId: string): Promise<any> {
  return firmaFetch(`/signing-requests/${signingRequestId}/fields/${fieldId}`, {
    method: "DELETE",
  });
}

export async function addSigningRequestUser(signingRequestId: string, user: { name: string; email: string }): Promise<any> {
  return firmaFetch(`/signing-requests/${signingRequestId}/users`, {
    method: "POST",
    body: JSON.stringify(user),
  });
}

export async function deleteSigningRequestUser(signingRequestId: string, usrId: string): Promise<any> {
  return firmaFetch(`/signing-requests/${signingRequestId}/users/${usrId}`, {
    method: "DELETE",
  });
}

export function getEditorScriptUrl(): string {
  return FIRMA_EMBED_EDITOR_JS;
}

export async function recreateSigningRequestWithRecipients(
  originalSrId: string,
  mobileData: any,
  title: string
): Promise<{ newSrId: string | null; error?: string }> {
  if (!mobileData?.signers?.length) {
    return { newSrId: null, error: "No signers to sync" };
  }

  try {
    const originalSr = await getSigningRequest(originalSrId);
    if (!originalSr?.document_url) {
      return { newSrId: null, error: "Original signing request has no document" };
    }

    const docRes = await fetch(originalSr.document_url);
    if (!docRes.ok) {
      return { newSrId: null, error: "Failed to fetch original document" };
    }
    const docBuffer = Buffer.from(await docRes.arrayBuffer());
    const documentBase64 = docBuffer.toString("base64");

    const tempSignerIds: Record<string, string> = {};
    const recipients = mobileData.signers.map((signer: any, idx: number) => {
      const tempId = `temp_${idx + 1}`;
      tempSignerIds[signer.name] = tempId;
      return {
        id: tempId,
        name: signer.name,
        email: signer.email,
        designation: "Signer",
        order: idx + 1,
      };
    });

    const fields = (mobileData.fields || []).map((field: any) => {
      const assignedName = field.assignedTo || field.signerId;
      const recipientId = assignedName ? tempSignerIds[assignedName] : recipients[0]?.id;
      return {
        type: field.type || "signature",
        recipient_id: recipientId,
        page_number: field.page || 1,
        x_position: Math.round(field.x),
        y_position: Math.round(field.y),
        width: Math.round(field.width || 200),
        height: Math.round(field.height || 50),
        required: field.required !== false,
      };
    });

    const payload: any = {
      name: title,
      document: documentBase64,
      recipients,
      fields,
    };

    console.log(`[Firma Recreate] Creating new SR with ${recipients.length} recipients and ${fields.length} fields`);
    const result = await firmaFetch("/signing-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const newId = result?.id || result?.signing_request_id;
    if (!newId) {
      return { newSrId: null, error: "Firma returned no ID for new signing request" };
    }

    console.log(`[Firma Recreate] New SR created: ${newId}`);
    return { newSrId: newId };
  } catch (err: any) {
    console.error("[Firma Recreate] Error:", err?.message);
    return { newSrId: null, error: err?.message || "Failed to recreate signing request" };
  }
}

export async function logFirmaAction(userId: number, action: string, details: Record<string, any> = {}): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO esignature_log (user_id, provider, action, details, created_at)
      VALUES (${userId}, 'firma', ${action}, ${JSON.stringify(details)}::jsonb, NOW())
    `);
  } catch (e) {
    console.error("Failed to log Firma action:", e);
  }
}

export async function saveFirmaSigningRequest(data: {
  userId: number;
  transactionId?: number;
  firmaSigningRequestId: string;
  title: string;
  status: string;
}): Promise<void> {
  await db.execute(sql`
    INSERT INTO firma_signing_requests (user_id, transaction_id, firma_signing_request_id, title, status, created_at, updated_at)
    VALUES (${data.userId}, ${data.transactionId || null}, ${data.firmaSigningRequestId}, ${data.title}, ${data.status}, NOW(), NOW())
    ON CONFLICT (firma_signing_request_id) DO UPDATE SET
      status = ${data.status},
      updated_at = NOW()
  `);
}

export async function verifySigningRequestOwnership(firmaSigningRequestId: string, userId: number): Promise<boolean> {
  const rows: any = await db.execute(sql`
    SELECT id FROM firma_signing_requests
    WHERE firma_signing_request_id = ${firmaSigningRequestId} AND user_id = ${userId}
  `);
  const arr = rows.rows || rows;
  return arr.length > 0;
}

export async function getSigningRequestRecord(firmaSigningRequestId: string): Promise<any | null> {
  const rows: any = await db.execute(sql`
    SELECT * FROM firma_signing_requests
    WHERE firma_signing_request_id = ${firmaSigningRequestId}
    LIMIT 1
  `);
  const arr = rows.rows || rows;
  return arr.length > 0 ? arr[0] : null;
}

export async function getUserSigningRequests(userId: number): Promise<any[]> {
  const rows: any = await db.execute(sql`
    SELECT * FROM firma_signing_requests
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `);
  return rows.rows || rows;
}

export async function getTransactionSigningRequests(transactionId: number): Promise<any[]> {
  const rows: any = await db.execute(sql`
    SELECT * FROM firma_signing_requests
    WHERE transaction_id = ${transactionId}
    ORDER BY updated_at DESC
  `);
  return rows.rows || rows;
}

export async function updateSigningRequestStatus(firmaSigningRequestId: string, status: string): Promise<void> {
  await db.execute(sql`
    UPDATE firma_signing_requests
    SET status = ${status}, updated_at = NOW()
    WHERE firma_signing_request_id = ${firmaSigningRequestId}
  `);
}
