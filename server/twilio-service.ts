const BLOCKED_NUMBERS = new Set([
  '911', '112', '999',
  '311', '411', '511', '611', '711', '811',
  '988',
  '18002221222',
  '18003737888',
  '18007997233',
  '18004224453',
]);

const BLOCKED_PATTERNS = [
  /\bkill\s+(you|him|her|them|u)\b/i,
  /\bi('ll|m\s+going\s+to|m\s+gonna)\s+(kill|hurt|harm|murder|shoot|stab|attack)\b/i,
  /\b(death\s+threat|i\s+will\s+end\s+you|you('re|\s+are)\s+dead)\b/i,
  /\b(bomb|explosive|blow\s+(you|it)\s+up)\b/i,
  /\b(shoot|gun|weapon)\s+(you|your|at)\b/i,
  /\byou('re|\s+are)\s+going\s+to\s+(die|regret|pay)\b/i,
  /\bi('ll|\s+will)\s+(find|hunt|track)\s+(you|your)\b/i,
  /\b(rape|sexual\s+assault|molest)\b/i,
  /\b(watch\s+your\s+back|sleep\s+with\s+one\s+eye)\b/i,
  /\b(burn\s+down|set\s+fire|arson)\b/i,
];

export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

export function isBlockedNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  if (BLOCKED_NUMBERS.has(digits)) return true;
  if (digits.length <= 3) return true;
  if (digits.length < 7) return true;
  return false;
}

export function containsThreateningContent(message: string): { flagged: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(message)) {
      return { flagged: true, reason: "Message contains language that may be perceived as threatening or harmful." };
    }
  }
  return { flagged: false };
}

export function isTwilioConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

export function getTwilioPhoneNumber(): string {
  return normalizePhoneNumber(process.env.TWILIO_PHONE_NUMBER || '');
}

let twilioClient: any = null;

async function getClient() {
  if (twilioClient) return twilioClient;
  const twilio = await import('twilio');
  twilioClient = twilio.default(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
  return twilioClient;
}

export async function sendSMSFromNumber(
  fromNumber: string,
  to: string,
  body: string
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  try {
    if (!isTwilioConfigured()) {
      return { success: false, error: "Twilio is not configured." };
    }

    const client = await getClient();
    const formattedTo = normalizePhoneNumber(to);
    const formattedFrom = normalizePhoneNumber(fromNumber);

    console.log(`Sending SMS: from=${formattedFrom} to=${formattedTo} body_length=${body.length}`);

    const message = await client.messages.create({
      body,
      from: formattedFrom,
      to: formattedTo,
    });

    console.log(`SMS sent successfully: SID=${message.sid} status=${message.status}`);
    return { success: true, externalId: message.sid };
  } catch (error: any) {
    console.error('Twilio SMS error:', error.message || error);
    return { success: false, error: error.message || 'Failed to send SMS' };
  }
}

export async function sendSMS(
  to: string,
  body: string
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  if (!process.env.TWILIO_PHONE_NUMBER) {
    return { success: false, error: "No platform phone number configured." };
  }
  return sendSMSFromNumber(process.env.TWILIO_PHONE_NUMBER, to, body);
}

export async function searchAvailableNumbers(areaCode?: string): Promise<{
  success: boolean;
  numbers?: Array<{ phoneNumber: string; friendlyName: string; locality: string; region: string }>;
  error?: string;
}> {
  try {
    if (!isTwilioConfigured()) {
      return { success: false, error: "Twilio is not configured." };
    }

    const client = await getClient();
    const searchParams: any = {
      smsEnabled: true,
      voiceEnabled: true,
      limit: 10,
    };

    if (areaCode) {
      searchParams.areaCode = areaCode;
    }

    const numbers = await client.availablePhoneNumbers('US').local.list(searchParams);

    return {
      success: true,
      numbers: numbers.map((n: any) => ({
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
        locality: n.locality || '',
        region: n.region || '',
      })),
    };
  } catch (error: any) {
    console.error('Error searching available numbers:', error.message);
    return { success: false, error: error.message || 'Failed to search numbers' };
  }
}

export async function purchasePhoneNumber(phoneNumber: string): Promise<{
  success: boolean;
  sid?: string;
  phoneNumber?: string;
  friendlyName?: string;
  error?: string;
}> {
  try {
    if (!isTwilioConfigured()) {
      return { success: false, error: "Twilio is not configured." };
    }

    const client = await getClient();

    const domains = process.env.REPLIT_DOMAINS || '';
    const domain = domains.split(',')[0];
    const webhookUrl = domain ? `https://${domain}/api/twilio/webhook` : undefined;

    const purchaseParams: any = {
      phoneNumber,
      smsMethod: 'POST',
    };

    if (webhookUrl) {
      purchaseParams.smsUrl = webhookUrl;
    }

    const purchased = await client.incomingPhoneNumbers.create(purchaseParams);

    console.log(`Phone number purchased: ${purchased.phoneNumber} (SID: ${purchased.sid})`);
    return {
      success: true,
      sid: purchased.sid,
      phoneNumber: purchased.phoneNumber,
      friendlyName: purchased.friendlyName,
    };
  } catch (error: any) {
    console.error('Error purchasing phone number:', error.message);
    return { success: false, error: error.message || 'Failed to purchase phone number' };
  }
}

export async function releasePhoneNumber(twilioSid: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!isTwilioConfigured()) {
      return { success: false, error: "Twilio is not configured." };
    }

    const client = await getClient();
    await client.incomingPhoneNumbers(twilioSid).remove();

    console.log(`Phone number released: SID ${twilioSid}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error releasing phone number:', error.message);
    return { success: false, error: error.message || 'Failed to release phone number' };
  }
}

export async function validateTwilioWebhook(req: any, url: string): Promise<boolean> {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) return false;

    const signature = req.headers['x-twilio-signature'];
    if (!signature) {
      console.warn('Twilio webhook: missing x-twilio-signature header');
      return false;
    }

    const twilio = await import('twilio');
    const isValid = twilio.validateRequest(authToken, signature, url, req.body || {});
    if (!isValid) {
      console.warn('Twilio webhook: invalid signature');
    }
    return isValid;
  } catch (error) {
    console.error('Twilio webhook validation error:', error);
    return false;
  }
}

export const OPT_OUT_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
export const OPT_IN_KEYWORDS = ['START', 'YES', 'UNSTOP'];

export function isOptOutMessage(body: string): boolean {
  return OPT_OUT_KEYWORDS.includes(body.trim().toUpperCase());
}

export function isOptInMessage(body: string): boolean {
  return OPT_IN_KEYWORDS.includes(body.trim().toUpperCase());
}
