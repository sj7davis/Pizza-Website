/** Sends a welcome email via Resend if RESEND_API_KEY is set; otherwise a no-op. */
export async function sendWelcomeEmail(to: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM // e.g. "PBB <hello@yourdomain.com>"
  if (!key || !from) return
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(key)
    await resend.emails.send({
      from,
      to,
      subject: 'Welcome to PBB — Pizza by Backhaus',
      html: '<p>Thanks for joining the list — we\'ll let you know about specials and new drops. 🍕</p>',
    })
  } catch {
    // Never let email delivery break signup.
  }
}

/** Sends a password reset email via Resend if configured; otherwise a no-op (logs a warning). */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM // e.g. "PBB <hello@yourdomain.com>"
  if (!key || !from) {
    console.warn('[reset] email not configured; link not sent')
    return
  }
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(key)
    await resend.emails.send({
      from,
      to,
      subject: 'Reset your PBB admin password',
      html: `<p>We received a request to reset your PBB admin password.</p>
<p><a href="${resetUrl}" style="display:inline-block;padding:10px 18px;background:#15140f;color:#f6f5f1;text-decoration:none;border-radius:4px;">Reset password</a></p>
<p>Or copy this link into your browser: ${resetUrl}</p>
<p>This link expires in 60 minutes. If you didn't request this, you can safely ignore this email.</p>`,
    })
  } catch {
    // Never let email delivery failures leak whether an account exists.
  }
}
