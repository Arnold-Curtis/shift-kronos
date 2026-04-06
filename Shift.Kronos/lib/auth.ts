import { auth } from "@clerk/nextjs/server";

export async function getCurrentUserId() {
  const session = await auth();
  return session.userId;
}
