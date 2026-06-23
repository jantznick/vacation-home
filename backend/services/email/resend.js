const RESEND_API_URL = 'https://api.resend.com/emails';

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendInviteEmail({ to, searchName, inviteUrl, inviterEmail }) {
  if (!isResendConfigured()) {
    console.warn('Resend not configured — invite email skipped for', to);
    return { skipped: true };
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [to],
      subject: `You're invited to collaborate on "${searchName}"`,
      html: `
        <p>${inviterEmail} invited you to collaborate on <strong>${searchName}</strong> on My Vacation Home Search.</p>
        <p><a href="${inviteUrl}">Accept invitation</a></p>
        <p>This link expires in 7 days. If you don't have an account yet, you'll be asked to register first.</p>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error: ${body}`);
  }

  return response.json();
}

export async function sendMagicLinkEmail({ to, loginUrl, code, expiresMinutes = 15 }) {
  if (!isResendConfigured()) {
    console.warn('Resend not configured — magic link email skipped for', to);
    return { skipped: true };
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [to],
      subject: 'Your sign-in link for My Vacation Home Search',
      html: `
        <p>Use this link to sign in to My Vacation Home Search:</p>
        <p><a href="${loginUrl}">Sign in</a></p>
        <p>Or enter this code on the sign-in page: <strong>${code}</strong></p>
        <p>This expires in ${expiresMinutes} minutes. If you didn't request this, you can ignore this email.</p>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error: ${body}`);
  }

  return response.json();
}
