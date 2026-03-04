export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  fromEmail?: string,
  fromName?: string
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    return { success: false, error: "SendGrid not configured. Please connect SendGrid integration." };
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: {
          email: fromEmail || process.env.SENDGRID_FROM_EMAIL || 'noreply@homebase.app',
          name: fromName || 'Home-Base',
        },
        subject,
        content: [{ type: 'text/plain', value: body }],
      }),
    });

    if (response.ok || response.status === 202) {
      const messageId = response.headers.get('x-message-id') || undefined;
      return { success: true, externalId: messageId };
    }

    const errorText = await response.text();
    console.error('SendGrid API error:', response.status, errorText);
    return { success: false, error: `SendGrid error: ${response.statusText}` };
  } catch (error: any) {
    console.error('SendGrid error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export async function isSendGridConfigured(): Promise<boolean> {
  return !!(process.env.SENDGRID_API_KEY);
}
