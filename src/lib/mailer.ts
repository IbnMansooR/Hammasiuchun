// Transactional email via Resend's REST API (resend.com). Like the other
// integrations, the feature hides itself until RESEND_API_KEY and MAIL_FROM are set.
export const mailEnabled = !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!mailEnabled) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
