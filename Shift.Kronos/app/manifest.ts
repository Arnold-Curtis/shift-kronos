import type { MetadataRoute } from "next";
import { appMetadata } from "@/lib/app-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appMetadata.name,
    short_name: appMetadata.shortName,
    description: appMetadata.description,
    start_url: "/dashboard",
    display: "standalone",
    background_color: appMetadata.backgroundColor,
    theme_color: appMetadata.themeColor,
    orientation: "portrait",
    scope: "/",
    categories: ["productivity", "utilities", "education"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/maskable-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
