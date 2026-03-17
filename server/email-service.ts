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
