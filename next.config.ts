import type { NextConfig } from "next";
import { OPTIMIZED_IMAGE_HOSTS } from "./src/lib/image-hosts";

const enableHsts = process.env.NODE_ENV === "production"
  && (!process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL.startsWith("https://"));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: OPTIMIZED_IMAGE_HOSTS.map((hostname) => ({ protocol: "https" as const, hostname })),
    qualities: [75],
    // Recipe photos rarely change; cache resized copies for 30 days to spare the source hosts.
    minimumCacheTTL: 2_592_000,
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ...(enableHsts
          ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
          : []),
      ],
    }];
  },
};

export default nextConfig;
