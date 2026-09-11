interface SendInviteEmailParams {
  toEmail: string;
  orgName: string;
  inviterName: string;
  inviteLink: string;
  role: string;
}

export async function sendInvitationEmail({
  toEmail,
  orgName,
  inviterName,
  inviteLink,
  role,
}: SendInviteEmailParams) {
  // Always log invite link in development console for easy manual testing
  console.log("=================================================");
  console.log("✉️ [EMAIL DISPATCH - ORGANIZATION INVITATION]");
  console.log(`To: ${toEmail}`);
  console.log(`Organization: ${orgName}`);
  console.log(`Invited by: ${inviterName} as ${role}`);
  console.log(`Accept Invite Link: ${inviteLink}`);
  console.log("=================================================");

  // If RESEND_API_KEY is configured, dispatch real email
  if (process.env.RESEND_API_KEY) {
    try {
      // In production, integrate Resend SDK here
      // const resend = new Resend(process.env.RESEND_API_KEY);
      // await resend.emails.send(...)
    } catch (err) {
      console.error("Failed to send invite email via Resend:", err);
    }
  }

  return { success: true };
}
