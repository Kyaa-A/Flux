import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || "onboarding@resend.dev";
const APP_URL = process.env.AUTH_URL || "http://localhost:3000";
const LOGO_URL = `${APP_URL}/flux.png`;

function emailLayout(content: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #18181b; border-radius: 16px; overflow: hidden; border: 1px solid #27272a;">
              <!-- Header with logo -->
              <tr>
                <td style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid #27272a;">
                  <img src="${LOGO_URL}" alt="Flux" width="48" height="48" style="display: block; margin: 0 auto 12px; border-radius: 12px;" />
                  <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #fafafa; letter-spacing: -0.5px;">Flux</h1>
                  <p style="margin: 4px 0 0; font-size: 13px; color: #71717a;">Personal Finance Tracker</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 32px 40px;">
                  ${content}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 40px; border-top: 1px solid #27272a; text-align: center;">
                  <p style="margin: 0 0 8px; font-size: 12px; color: #52525b;">
                    &copy; ${new Date().getFullYear()} Flux. All rights reserved.
                  </p>
                  <p style="margin: 0; font-size: 11px; color: #3f3f46;">
                    <a href="${APP_URL}" style="color: #71717a; text-decoration: none;">fluxph.vercel.app</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${APP_URL}/reset-password/${token}`;

  const content = `
    <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #fafafa;">Reset your password</h2>
    <p style="margin: 0 0 24px; font-size: 14px; color: #a1a1aa; line-height: 1.6;">
      We received a request to reset your password. Click the button below to choose a new password.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding: 4px 0 28px;">
          <a href="${resetLink}" style="background: linear-gradient(135deg, #10b981, #06b6d4); color: #18181b; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1c1c1f; border-radius: 8px; border: 1px solid #27272a;">
      <tr>
        <td style="padding: 14px 16px;">
          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Expires in</p>
          <p style="margin: 0; font-size: 13px; color: #a1a1aa;">1 hour</p>
        </td>
      </tr>
    </table>
    <p style="margin: 20px 0 0; font-size: 12px; color: #52525b; line-height: 1.5;">
      If you didn't request this, you can safely ignore this email. Your password will not be changed.
    </p>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your Flux password",
    html: emailLayout(content),
  });
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyLink = `${APP_URL}/verify-email/${token}`;

  const content = `
    <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #fafafa;">Verify your email</h2>
    <p style="margin: 0 0 24px; font-size: 14px; color: #a1a1aa; line-height: 1.6;">
      Thanks for signing up for Flux! Please verify your email address to get started with tracking your finances.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding: 4px 0 28px;">
          <a href="${verifyLink}" style="background: linear-gradient(135deg, #10b981, #06b6d4); color: #18181b; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
            Verify Email
          </a>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1c1c1f; border-radius: 8px; border: 1px solid #27272a;">
      <tr>
        <td style="padding: 14px 16px;">
          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Expires in</p>
          <p style="margin: 0; font-size: 13px; color: #a1a1aa;">24 hours</p>
        </td>
      </tr>
    </table>
    <p style="margin: 20px 0 0; font-size: 12px; color: #52525b; line-height: 1.5;">
      If you didn't create an account, you can safely ignore this email.
    </p>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Verify your Flux email",
    html: emailLayout(content),
  });
}
