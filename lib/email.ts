import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || "onboarding@resend.dev";
const APP_URL = process.env.AUTH_URL || "http://localhost:3000";

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${APP_URL}/reset-password/${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your Flux password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #18181b; color: #fafafa; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #34d399; margin: 0; font-size: 28px;">Flux</h1>
          <p style="color: #a1a1aa; margin-top: 4px;">Personal Finance Tracker</p>
        </div>
        <h2 style="color: #fafafa; font-size: 20px; margin-bottom: 12px;">Reset your password</h2>
        <p style="color: #a1a1aa; line-height: 1.6;">
          We received a request to reset your password. Click the button below to choose a new password. This link expires in 1 hour.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetLink}" style="background: linear-gradient(135deg, #10b981, #06b6d4); color: #18181b; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #71717a; font-size: 13px; line-height: 1.5;">
          If you didn't request this, you can safely ignore this email. Your password will not be changed.
        </p>
        <hr style="border: none; border-top: 1px solid #27272a; margin: 24px 0;" />
        <p style="color: #52525b; font-size: 12px; text-align: center;">
          &copy; ${new Date().getFullYear()} Flux. All rights reserved.
        </p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyLink = `${APP_URL}/verify-email/${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Verify your Flux email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #18181b; color: #fafafa; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #34d399; margin: 0; font-size: 28px;">Flux</h1>
          <p style="color: #a1a1aa; margin-top: 4px;">Personal Finance Tracker</p>
        </div>
        <h2 style="color: #fafafa; font-size: 20px; margin-bottom: 12px;">Verify your email</h2>
        <p style="color: #a1a1aa; line-height: 1.6;">
          Thanks for signing up! Please verify your email address by clicking the button below. This link expires in 24 hours.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${verifyLink}" style="background: linear-gradient(135deg, #10b981, #06b6d4); color: #18181b; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p style="color: #71717a; font-size: 13px; line-height: 1.5;">
          If you didn't create an account, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #27272a; margin: 24px 0;" />
        <p style="color: #52525b; font-size: 12px; text-align: center;">
          &copy; ${new Date().getFullYear()} Flux. All rights reserved.
        </p>
      </div>
    `,
  });
}
