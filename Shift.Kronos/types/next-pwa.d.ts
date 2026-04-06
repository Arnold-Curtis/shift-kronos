declare module "next-pwa" {
  import type { NextConfig } from "next";

  type WithPWAOptions = {
    dest: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    buildExcludes?: RegExp[];
    runtimeCaching?: Array<Record<string, unknown>>;
  };

  export default function withPWAInit(options: WithPWAOptions): (config: NextConfig) => NextConfig;
}
