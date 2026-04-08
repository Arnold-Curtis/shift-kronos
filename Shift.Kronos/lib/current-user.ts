import { auth, currentUser } from "@clerk/nextjs/server";
import { User } from "@prisma/client";
import { db } from "@/lib/db";

const DEFAULT_TIMEZONE = "Africa/Nairobi";
const PREVIEW_DEMO_CLERK_ID = "preview-demo-user";

function shouldBypassClerk() {
  if (process.env.VERCEL_ENV === "preview") {
    return true;
  }

  return !process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

function getPreferredDisplayName(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) {
    return null;
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return fullName || user.username || user.primaryEmailAddress?.emailAddress || null;
}

export async function requireCurrentUser(): Promise<User> {
  if (shouldBypassClerk()) {
    return db.user.upsert({
      where: {
        clerkUserId: PREVIEW_DEMO_CLERK_ID,
      },
      update: {
        timezone: DEFAULT_TIMEZONE,
      },
      create: {
        clerkUserId: PREVIEW_DEMO_CLERK_ID,
        displayName: "Preview User",
        timezone: DEFAULT_TIMEZONE,
      },
    });
  }

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
    if (existingUser.timezone === "Africa/Lagos") {
      return db.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          timezone: DEFAULT_TIMEZONE,
        },
      });
    }

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
  if (shouldBypassClerk()) {
    return db.user.findUnique({
      where: {
        clerkUserId: PREVIEW_DEMO_CLERK_ID,
      },
    });
  }

  const session = await auth();

  if (!session.userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: {
      clerkUserId: session.userId,
    },
  });

  if (user?.timezone === "Africa/Lagos") {
    return db.user.update({
      where: {
        id: user.id,
      },
      data: {
        timezone: DEFAULT_TIMEZONE,
      },
    });
  }

  return user;
}

export { DEFAULT_TIMEZONE };
