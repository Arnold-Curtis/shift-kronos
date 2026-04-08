import { ClerkProvider } from "@clerk/nextjs";
import { ToastProvider } from "@/components/ui/toast";
import { AppLayout } from "@/components/layout/app-layout";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const inner = (
    <ToastProvider>
      <AppLayout>{children}</AppLayout>
    </ToastProvider>
  );

  if (!publishableKey) {
    return inner;
  }

  return <ClerkProvider publishableKey={publishableKey}>{inner}</ClerkProvider>;
}
