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

interface VendorLeadNotificationData {
  zipCode: string;
  category: string;
  firstName?: string;
  lastName?: string;
  urgency?: string;
  description?: string | null;
}

export async function notifyVendorOfNewLead(
  vendor: AgentData,
  lead: VendorLeadNotificationData,
  pushSubscriptions: PushSubscriptionRecord[],
  onExpiredSub?: (subId: number) => Promise<void>
): Promise<{ sms: boolean; push: { sent: number; failed: number } }> {
  const categoryLabel = lead.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const leadName = lead.firstName && lead.lastName
    ? `${lead.firstName} ${lead.lastName}`
    : 'A homeowner';

  const urgencyText = lead.urgency === 'emergency' ? ' (URGENT)' : lead.urgency === 'high' ? ' (High Priority)' : '';

  const smsBody = `🔧 HomeBase: New ${categoryLabel} service request in ${lead.zipCode}${urgencyText}! ${leadName} needs your help. Log in to view details and accept.`;

  const pushPayload: PushPayload = {
    title: `New ${categoryLabel} request in ${lead.zipCode}${urgencyText}`,
    body: `${leadName} is looking for a ${categoryLabel.toLowerCase()}.${lead.description ? ` "${lead.description.substring(0, 80)}..."` : ''}`,
    url: '/vendor',
  };

  let smsSent = false;
  const vendorPhone = vendor.mobilePhone || vendor.phone;
  if (vendorPhone) {
    try {
      await sendSMS(vendorPhone, smsBody);
      smsSent = true;
      console.log(`[Notifications] SMS sent to vendor ${vendor.id} for lead in ${lead.zipCode}`);
    } catch (err: any) {
      console.error(`[Notifications] SMS failed for vendor ${vendor.id}:`, err.message);
    }
  }

  const pushResult = await sendPushNotification(
    pushSubscriptions,
    pushPayload,
    onExpiredSub
  );

  if (pushResult.sent > 0) {
    console.log(`[Notifications] Push sent to ${pushResult.sent} device(s) for vendor ${vendor.id}`);
  }

  return { sms: smsSent, push: pushResult };
}
