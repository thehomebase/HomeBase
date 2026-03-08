import webpush from 'web-push';
import { sendSMS } from './twilio-service';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@homebase.app';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
  id: number;
}

export async function sendPushNotification(
  subscriptions: PushSubscriptionRecord[],
  payload: PushPayload,
  onExpired?: (subId: number) => Promise<void>
): Promise<{ sent: number; failed: number }> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log('[Notifications] VAPID keys not configured, skipping push');
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err: any) {
      failed++;
      if (err.statusCode === 410 || err.statusCode === 404) {
        if (onExpired) {
          await onExpired(sub.id);
        }
      } else {
        console.error('[Notifications] Push send error:', err.statusCode || err.message);
      }
    }
  }

  return { sent, failed };
}

interface LeadNotificationData {
  zipCode: string;
  type: string;
  firstName?: string;
  lastName?: string;
  budget?: string | null;
  timeframe?: string | null;
  message?: string | null;
}

interface AgentData {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string | null;
  mobilePhone?: string | null;
  email: string;
}

export async function notifyAgentOfNewLead(
  agent: AgentData,
  lead: LeadNotificationData,
  pushSubscriptions: PushSubscriptionRecord[],
  onExpiredSub?: (subId: number) => Promise<void>
): Promise<{ sms: boolean; push: { sent: number; failed: number } }> {
  const leadType = lead.type === 'both' ? 'buyer/seller' : lead.type;
  const leadName = lead.firstName && lead.lastName 
    ? `${lead.firstName} ${lead.lastName}` 
    : 'A potential client';
  
  const smsBody = `🏠 HomeBase: New ${leadType} lead in ${lead.zipCode}! ${leadName} is looking for an agent.${lead.budget ? ` Budget: ${lead.budget}.` : ''}${lead.timeframe ? ` Timeframe: ${lead.timeframe}.` : ''} Log in to view details.`;

  const pushPayload: PushPayload = {
    title: `New ${leadType} lead in ${lead.zipCode}`,
    body: `${leadName} is looking for a real estate agent.${lead.budget ? ` Budget: ${lead.budget}.` : ''}`,
    url: '/lead-generation',
  };

  let smsSent = false;
  const agentPhone = agent.mobilePhone || agent.phone;
  if (agentPhone) {
    try {
      await sendSMS(agentPhone, smsBody);
      smsSent = true;
      console.log(`[Notifications] SMS sent to agent ${agent.id} for lead in ${lead.zipCode}`);
    } catch (err: any) {
      console.error(`[Notifications] SMS failed for agent ${agent.id}:`, err.message);
    }
  }

  const pushResult = await sendPushNotification(
    pushSubscriptions,
    pushPayload,
    onExpiredSub
  );
  
  if (pushResult.sent > 0) {
    console.log(`[Notifications] Push sent to ${pushResult.sent} device(s) for agent ${agent.id}`);
  }

  return { sms: smsSent, push: pushResult };
}
