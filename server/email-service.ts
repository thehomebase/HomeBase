import sgMail from "@sendgrid/mail";

let initialized = false;

function ensureInitialized() {
  if (initialized) return true;
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn("SendGrid API key not configured — emails will be skipped");
    return false;
  }
  sgMail.setApiKey(apiKey);
  initialized = true;
  return true;
}

function getFromEmail(): string {
  return process.env.SENDGRID_FROM_EMAIL || "noreply@homebase.com";
}

export async function sendVerificationEmail(
  to: string,
  firstName: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  if (!ensureInitialized()) {
    return { success: false, error: "Email service not configured" };
  }

  const msg = {
    to,
    from: { email: getFromEmail(), name: "HomeBase" },
    subject: `Your HomeBase verification code: ${code}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">HomeBase</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;text-align:center;">
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">Verify your email, ${firstName}</h2>
              <p style="margin:0 0 24px;color:#4a4a68;font-size:15px;line-height:1.6;">
                Enter the code below to verify your HomeBase account.
              </p>
              <div style="background-color:#f0f0ff;border-radius:12px;padding:24px;margin:0 auto 24px;max-width:280px;">
                <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:8px;color:#1a1a2e;font-family:'Courier New',monospace;">${code}</p>
              </div>
              <p style="margin:0;color:#8e8ea0;font-size:13px;">
                This code expires in 24 hours. If you didn't create a HomeBase account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background-color:#f9f9fb;border-top:1px solid #e5e5ea;text-align:center;">
              <p style="margin:0;color:#8e8ea0;font-size:12px;">
                &copy; ${new Date().getFullYear()} HomeBase. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };

  try {
    await sgMail.send(msg);
    console.log(`Verification email sent to ${to}`);
    return { success: true };
  } catch (error: any) {
    console.error("SendGrid verification email error:", error?.response?.body || error.message);
    return { success: false, error: error.message || "Failed to send verification email" };
  }
}

export async function sendWelcomeEmail(
  to: string,
  firstName: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  if (!ensureInitialized()) {
    return { success: false, error: "Email service not configured" };
  }

  const roleLabel =
    role === "agent"
      ? "Agent"
      : role === "broker"
        ? "Broker"
        : role === "client"
          ? "Client"
          : role === "vendor"
            ? "Vendor"
            : role === "lender"
              ? "Lender"
              : "User";

  const msg = {
    to,
    from: { email: getFromEmail(), name: "HomeBase" },
    subject: `Welcome to HomeBase, ${firstName}!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">HomeBase</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">Welcome aboard, ${firstName}!</h2>
              <p style="margin:0 0 16px;color:#4a4a68;font-size:15px;line-height:1.6;">
                Your ${roleLabel} account has been verified and is ready to go. HomeBase is your all-in-one platform for managing real estate transactions, documents, and client relationships.
              </p>
              <p style="margin:0 0 24px;color:#4a4a68;font-size:15px;line-height:1.6;">
                Here are a few things you can do right away:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f0f0ff;border-radius:8px;margin-bottom:8px;">
                    <p style="margin:0;color:#1a1a2e;font-size:14px;">
                      <strong style="color:#4338ca;">1.</strong> Complete your profile with a photo and bio
                    </p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f0f0ff;border-radius:8px;">
                    <p style="margin:0;color:#1a1a2e;font-size:14px;">
                      <strong style="color:#4338ca;">2.</strong> Create your first transaction
                    </p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f0f0ff;border-radius:8px;">
                    <p style="margin:0;color:#1a1a2e;font-size:14px;">
                      <strong style="color:#4338ca;">3.</strong> Explore the dashboard and tools
                    </p>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#4338ca;border-radius:8px;">
                    <a href="${getDomain()}/dashboard" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background-color:#f9f9fb;border-top:1px solid #e5e5ea;text-align:center;">
              <p style="margin:0;color:#8e8ea0;font-size:13px;">
                Questions? Reply to this email or reach out through the app.
              </p>
              <p style="margin:8px 0 0;color:#8e8ea0;font-size:12px;">
                &copy; ${new Date().getFullYear()} HomeBase. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };

  try {
    await sgMail.send(msg);
    console.log(`Welcome email sent to ${to}`);
    return { success: true };
  } catch (error: any) {
    console.error("SendGrid welcome email error:", error?.response?.body || error.message);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

function getDomain(): string {
  const domains = process.env.REPLIT_DOMAINS || "";
  const domain = domains.split(",")[0];
  return domain ? `https://${domain}` : "http://localhost:5000";
}

export async function sendReviewRequestEmail(
  to: string,
  clientName: string,
  agentName: string,
  address: string,
  feedbackUrl: string,
  signupUrl: string,
  isExistingMember: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!ensureInitialized()) {
    return { success: false, error: "Email service not configured" };
  }

  const signupSection = !isExistingMember ? `
    <tr><td style="height:16px;"></td></tr>
    <tr>
      <td style="padding:20px 32px;background-color:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
        <p style="margin:0 0 8px;color:#166534;font-size:14px;font-weight:600;">New to HomeBase?</p>
        <p style="margin:0 0 12px;color:#15803d;font-size:13px;line-height:1.5;">
          Create a free account to track your home details, access your closing documents, find trusted contractors, and more.
        </p>
        <a href="${signupUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">Create Your Free Account</a>
      </td>
    </tr>` : '';

  const msg = {
    to,
    from: { email: getFromEmail(), name: "HomeBase" },
    subject: `How was your experience? — ${address}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">HomeBase</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">Congratulations on your closing!</h2>
              <p style="margin:0 0 16px;color:#4a4a68;font-size:15px;line-height:1.6;">
                Hi ${clientName},
              </p>
              <p style="margin:0 0 24px;color:#4a4a68;font-size:15px;line-height:1.6;">
                <strong>${agentName}</strong> would love to hear about your experience with the transaction at <strong>${address}</strong>. Your review helps other buyers and sellers find great agents.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="background-color:#4338ca;border-radius:8px;">
                    <a href="${feedbackUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                      Leave a Review
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#8e8ea0;font-size:13px;text-align:center;">
                Or copy this link: ${feedbackUrl}
              </p>
              ${signupSection}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background-color:#f9f9fb;border-top:1px solid #e5e5ea;text-align:center;">
              <p style="margin:0;color:#8e8ea0;font-size:12px;">
                &copy; ${new Date().getFullYear()} HomeBase. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };

  try {
    await sgMail.send(msg);
    console.log(`Review request email sent to ${to} for ${address}`);
    return { success: true };
  } catch (error: any) {
    console.error("SendGrid review request email error:", error?.response?.body || error.message);
    return { success: false, error: error.message || "Failed to send review request email" };
  }
}

export async function sendSigningEmail(
  to: string,
  recipientName: string,
  documentTitle: string,
  senderName: string,
  signingLink: string
): Promise<{ success: boolean; error?: string }> {
  if (!ensureInitialized()) {
    return { success: false, error: "Email service not configured" };
  }

  const msg = {
    to,
    from: { email: getFromEmail(), name: "HomeBase Signatures" },
    subject: `${senderName} has sent you a document to sign: ${documentTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #7c3aed; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">📝 Document Ready to Sign</h1>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #374151;">Hi ${recipientName},</p>
          <p style="font-size: 16px; color: #374151;"><strong>${senderName}</strong> has sent you <strong>"${documentTitle}"</strong> for your signature.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${signingLink}" style="background: #7c3aed; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">Review & Sign Document</a>
          </div>
          <p style="font-size: 14px; color: #6b7280; text-align: center;">Powered by HomeBase</p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Signing email sent to ${to} for "${documentTitle}"`);
    return { success: true };
  } catch (error: any) {
    console.error("SendGrid signing email error:", error?.response?.body || error.message);
    return { success: false, error: error.message || "Failed to send signing email" };
  }
}

export async function sendTransactionStatusEmail(
  to: string,
  clientName: string,
  propertyAddress: string,
  newStatus: string,
  agentName?: string
): Promise<{ success: boolean; error?: string }> {
  if (!ensureInitialized()) {
    return { success: false, error: "SendGrid not configured" };
  }

  const msg = {
    to,
    from: {
      email: getFromEmail(),
      name: "HomeBase",
    },
    subject: `Transaction Update: ${propertyAddress}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 24px;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #1f2937; margin: 0;">Transaction Update</h2>
          </div>
          <p style="color: #374151; font-size: 16px;">Hi ${clientName},</p>
          <p style="color: #374151; font-size: 16px;">Your transaction for <strong>${propertyAddress}</strong> has been updated to a new stage:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="background: #7c3aed; color: white; padding: 12px 28px; border-radius: 24px; font-size: 18px; font-weight: 600; display: inline-block;">${newStatus}</span>
          </div>
          ${agentName ? `<p style="color: #6b7280; font-size: 14px;">Updated by: ${agentName}</p>` : ""}
          <p style="color: #374151; font-size: 14px;">Log in to your client portal for more details.</p>
          <p style="font-size: 14px; color: #9ca3af; text-align: center; margin-top: 32px;">Powered by HomeBase</p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Transaction status email sent to ${to} for "${propertyAddress}"`);
    return { success: true };
  } catch (error: any) {
    console.error("SendGrid transaction status email error:", error?.response?.body || error.message);
    return { success: false, error: error.message || "Failed to send transaction status email" };
  }
}
