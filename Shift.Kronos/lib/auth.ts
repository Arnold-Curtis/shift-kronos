import { auth } from "@clerk/nextjs/server";

function shouldBypassClerk() {
  if (process.env.VERCEL_ENV === "preview") {
    return true;
  }

  return !process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

export async function getCurrentUserId() {
  if (shouldBypassClerk()) {
    return "preview-demo-user";
  }

  const session = await auth();
  return session.userId;
}
