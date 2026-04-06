import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { appMetadata } from "@/lib/app-config";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: appMetadata.name,
  description: appMetadata.description,
  manifest: "/manifest.webmanifest",
  applicationName: appMetadata.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: appMetadata.shortName,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: appMetadata.themeColor,
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppProviders>
      <html lang="en" className={`${inter.variable} h-full`}>
        <body className="min-h-full font-[var(--font-inter)] text-text-primary">
          {children}
        </body>
      </html>
    </AppProviders>
  );
}
