import { getPrimaryEmailAddressForClerkUser } from "@/lib/current-user";
import { getOptionalNotificationToEmail } from "@/lib/operations/env";

export async function resolveNotificationRecipientEmail(clerkUserId: string | null | undefined) {
  const accountEmail = await getPrimaryEmailAddressForClerkUser(clerkUserId);
  return accountEmail ?? getOptionalNotificationToEmail();
}
