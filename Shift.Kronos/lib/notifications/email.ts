import { Resend } from "resend";
import { getNotificationFromEmail, getResendApiKey } from "@/lib/operations/env";
import { NotificationEmailInput, NotificationEmailResult } from "@/lib/notifications/types";

let resendClient: Resend | null = null;

function getResendClient() {
  if (!resendClient) {
    resendClient = new Resend(getResendApiKey());
  }

  return resendClient;
}

export async function sendNotificationEmail(input: NotificationEmailInput): Promise<NotificationEmailResult> {
  try {
    const resend = getResendClient();
    const response = await resend.emails.send({
      from: getNotificationFromEmail(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    if (response.error) {
      return {
        ok: false,
        messageId: null,
        errorMessage: response.error.message,
      };
    }

    return {
      ok: true,
      messageId: response.data?.id ?? null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      ok: false,
      messageId: null,
      errorMessage: error instanceof Error ? error.message : "Email delivery failed.",
    };
  }
}
