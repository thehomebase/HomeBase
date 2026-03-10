import { createHmac } from "crypto";
import { storage } from "./storage";

export async function fireWebhook(event: string, data: Record<string, any>) {
  try {
    const webhooks = await storage.getWebhooksByEvent(event);
    if (webhooks.length === 0) return;

    const payload = JSON.stringify({ event, data, timestamp: Date.now() });

    for (const webhook of webhooks) {
      const signature = createHmac("sha256", webhook.secret)
        .update(payload)
        .digest("hex");

      fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-HomeBase-Signature": signature,
          "X-HomeBase-Event": event,
        },
        body: payload,
      }).catch((err) => {
        console.error(`Webhook delivery failed for ${webhook.url}:`, err.message);
      });
    }
  } catch (err) {
    console.error("Error firing webhooks:", err);
  }
}
