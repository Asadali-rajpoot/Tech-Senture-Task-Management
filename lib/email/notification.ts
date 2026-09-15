interface SendNotificationEmailParams {
  toEmail: string;
  userName?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
}

export async function sendNotificationEmail({
  toEmail,
  userName,
  type,
  title,
  message,
  link,
}: SendNotificationEmailParams) {
  // Always log notification email in console for transparent debugging and manual test verification
  console.log("=================================================");
  console.log(`✉️ [EMAIL DISPATCH - ${type.toUpperCase()}]`);
  console.log(`To: ${userName ? `${userName} <${toEmail}>` : toEmail}`);
  console.log(`Subject: [PROXima] ${title}`);
  console.log(`Message: ${message}`);
  if (link) {
    console.log(`Action Link: ${link}`);
  }
  console.log("=================================================");

  if (process.env.RESEND_API_KEY) {
    try {
      // In production, dispatch via Resend
      // const resend = new Resend(process.env.RESEND_API_KEY);
      // await resend.emails.send(...)
    } catch (err) {
      console.error("Failed to send notification email via Resend:", err);
    }
  }

  return { success: true };
}
