import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const transporters = new Map();

async function sendWithResend(message) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const providerError = await response.json().catch(() => ({}));
      const error = new Error(providerError.message || 'Resend rejected the email');
      error.code = 'RESEND_REJECTED';
      error.responseCode = response.status;
      throw error;
    }
  } finally {
    clearTimeout(timeout);
  }
}

function getTransporter(port = env.SMTP_PORT, secure = env.SMTP_SECURE) {
  if (!env.SMTP_USER || !env.SMTP_PASSWORD || !env.EMAIL_FROM) {
    throw new AppError(503, 'Email verification is not configured on the server');
  }

  const key = `${port}:${secure}`;
  if (transporters.has(key)) return transporters.get(key);

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });

  transporters.set(key, transporter);
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

  const message = {
    from: env.RESEND_API_KEY
      ? env.RESEND_FROM
      : (env.EMAIL_FROM || env.SMTP_USER),
    to,
    subject: `Your PromptGrid verification code: ${code}`,
    text: `Your PromptGrid verification code is ${code}. It expires in 10 minutes.`,
    html,
  };

  // Render Free blocks outbound SMTP ports. Prefer the HTTPS email API there
  // while keeping Gmail SMTP available for local development or paid hosts.
  if (env.RESEND_API_KEY) {
    try {
      await sendWithResend(message);
      return;
    } catch (error) {
      console.error('PromptGrid Resend delivery failed', {
        code: error.code,
        responseCode: error.responseCode,
      });
      throw new AppError(502, 'Email provider could not send the code. Check the Resend API key and sender address.');
    }
  }

  try {
    await getTransporter().sendMail(message);
  } catch (error) {
    let deliveryError = error;
    const canTryStartTls = (
      env.SMTP_PORT !== 587
      && ['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'ENOTFOUND', 'EAI_AGAIN'].includes(error.code)
    );

    if (canTryStartTls) {
      try {
        await getTransporter(587, false).sendMail(message);
        return;
      } catch (fallbackError) {
        deliveryError = fallbackError;
      }
    }

    // Log provider metadata only; never log the SMTP password or OTP.
    console.error('PromptGrid email delivery failed', {
      code: deliveryError.code,
      responseCode: deliveryError.responseCode,
      command: deliveryError.command,
    });
    throw new AppError(502, 'Email provider could not send the code. Check the Gmail App Password and SMTP settings.');
  }
}
