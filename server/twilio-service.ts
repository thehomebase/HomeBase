let twilioClient: any = null;

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

async function getTwilioClient() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      return null;
    }
    if (!twilioClient) {
      const twilio = await import('twilio');
      twilioClient = twilio.default(accountSid, authToken);
    }
    return twilioClient;
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error);
    return null;
  }
}

export async function sendSMS(to: string, body: string): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const client = await getTwilioClient();
  if (!client) {
    return { success: false, error: "Twilio not configured. Please connect Twilio integration." };
  }

  try {
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      return { success: false, error: "Twilio phone number not configured (TWILIO_PHONE_NUMBER)." };
    }

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

export async function isTwilioConfigured(): Promise<boolean> {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
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
