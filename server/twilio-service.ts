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

const agentClients = new Map<string, any>();

async function getAgentTwilioClient(accountSid: string, authToken: string) {
  const key = accountSid;
  if (agentClients.has(key)) {
    return agentClients.get(key);
  }
  const twilio = await import('twilio');
  const client = twilio.default(accountSid, authToken);
  agentClients.set(key, client);
  return client;
}

export async function sendSMSWithCredentials(
  accountSid: string,
  authToken: string,
  fromNumber: string,
  to: string,
  body: string
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  try {
    const client = await getAgentTwilioClient(accountSid, authToken);

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

export async function verifyTwilioCredentials(
  accountSid: string,
  authToken: string,
  phoneNumber: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const twilio = await import('twilio');
    const client = twilio.default(accountSid, authToken);
    await client.api.accounts(accountSid).fetch();

    const formatted = normalizePhoneNumber(phoneNumber);
    const numbers = await client.incomingPhoneNumbers.list({ phoneNumber: formatted, limit: 1 });
    if (numbers.length === 0) {
      return { valid: false, error: "The phone number was not found in your Twilio account. Make sure you've purchased this number." };
    }

    return { valid: true };
  } catch (error: any) {
    if (error.code === 20003) {
      return { valid: false, error: "Invalid Account SID or Auth Token. Please double-check your Twilio credentials." };
    }
    return { valid: false, error: error.message || "Failed to verify Twilio credentials." };
  }
}

export async function validateTwilioWebhook(req: any, url: string, authToken: string): Promise<boolean> {
  try {
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
