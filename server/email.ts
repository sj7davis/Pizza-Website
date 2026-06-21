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
