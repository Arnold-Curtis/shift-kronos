import { auth, currentUser } from "@clerk/nextjs/server";
import { User } from "@prisma/client";
import { db } from "@/lib/db";

const DEFAULT_TIMEZONE = "Africa/Lagos";

function getPreferredDisplayName(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) {
    return null;
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return fullName || user.username || user.primaryEmailAddress?.emailAddress || null;
}

export async function requireCurrentUser(): Promise<User> {
  const session = await auth();

  if (!session.userId) {
    throw new Error("Authenticated user is required.");
  }

  const existingUser = await db.user.findUnique({
    where: {
      clerkUserId: session.userId,
    },
  });

  if (existingUser) {
    return existingUser;
  }

  const clerkUser = await currentUser();

  return db.user.create({
    data: {
      clerkUserId: session.userId,
      displayName: getPreferredDisplayName(clerkUser),
      timezone: DEFAULT_TIMEZONE,
    },
  });
}

export async function getCurrentUser() {
  const session = await auth();

  if (!session.userId) {
    return null;
  }

  return db.user.findUnique({
    where: {
      clerkUserId: session.userId,
    },
  });
}

export { DEFAULT_TIMEZONE };
