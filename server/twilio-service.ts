let twilioClient: any = null;

function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  if (phone.startsWith('+')) {
    return phone;
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

    const formattedTo = formatPhoneNumber(to);
    const formattedFrom = formatPhoneNumber(fromNumber);

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
