import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

let transporter;

function getTransporter() {
  if (!env.SMTP_USER || !env.SMTP_PASSWORD || !env.EMAIL_FROM) {
    throw new AppError(503, 'Email verification is not configured on the server');
  }

  transporter ||= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });

  return transporter;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character]));
}

export async function sendVerificationEmail({ to, code, purpose }) {
  const purposeText = purpose === 'mfa-login'
    ? 'finish signing in'
    : purpose === 'password-change'
      ? 'confirm your password change'
      : 'reset your password';

  const safeCode = escapeHtml(code);
  const html = `
    <div style="margin:0;background:#10131c;padding:28px 12px;font-family:Arial,sans-serif;color:#f8fafc">
      <div style="max-width:560px;margin:auto;border:1px solid #394156;border-radius:22px;overflow:hidden;background:#171d2b">
        <div style="padding:24px 28px;border-bottom:1px solid #394156">
          <div style="font-size:27px;font-weight:800;letter-spacing:-.04em"><span style="display:inline-grid;place-items:center;width:38px;height:38px;margin-right:10px;border-radius:12px;background:#d9ff2f;color:#11152a">P</span> PromptGrid</div>
          <div style="margin-top:6px;color:#a7b0c4;font-size:12px;letter-spacing:.14em;text-transform:uppercase">Security &amp; account verification</div>
        </div>
        <div style="padding:30px 28px">
          <div style="color:#d9ff2f;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">Confidential</div>
          <h1 style="margin:12px 0 10px;font-size:25px">Your verification code</h1>
          <p style="color:#b9c1d1;line-height:1.6">Use this 6-digit code to ${purposeText} on PromptGrid.</p>
          <div style="margin:24px 0;padding:24px;border:1px solid #d9ff2f;border-radius:16px;text-align:center;background:#10151f">
            <div style="color:#a7b0c4;font-size:11px;letter-spacing:.18em;text-transform:uppercase">Your 6-digit verification code</div>
            <div style="margin-top:12px;color:#d9ff2f;font-size:36px;letter-spacing:.28em;font-weight:800">${safeCode}</div>
            <div style="margin-top:12px;color:#a7b0c4;font-size:12px">Select or tap the code to copy it easily.</div>
          </div>
          <p style="color:#b9c1d1;font-size:13px;line-height:1.7">This code expires in 10 minutes. Never share it with anyone. If you did not request this code, you can safely ignore this email.</p>
        </div>
        <div style="padding:18px 28px;border-top:1px solid #394156;color:#7f8aa0;font-size:11px;line-height:1.6">Automated security message from PromptGrid. Please do not reply to this email.</div>
      </div>
    </div>`;

  try {
    await getTransporter().sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: `Your PromptGrid verification code: ${code}`,
      text: `Your PromptGrid verification code is ${code}. It expires in 10 minutes.`,
      html,
    });
  } catch (error) {
    // Log provider metadata only; never log the SMTP password or OTP.
    console.error('PromptGrid email delivery failed', {
      code: error.code,
      responseCode: error.responseCode,
      command: error.command,
    });
    throw new AppError(502, 'Email provider could not send the code. Check the Gmail App Password and SMTP settings.');
  }
}
