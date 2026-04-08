import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/",
  "/dashboard(.*)",
  "/reminders(.*)",
  "/timetable(.*)",
  "/notes(.*)",
  "/files(.*)",
  "/settings(.*)",
]);

const shouldBypassClerk =
  process.env.VERCEL_ENV === "preview" || !process.env.CLERK_SECRET_KEY;

const clerkProxy = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export default shouldBypassClerk
  ? function proxy() {
      return NextResponse.next();
    }
  : clerkProxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
