import type { NextConfig } from "next";

const enableHsts = process.env.NODE_ENV === "production"
  && (!process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL.startsWith("https://"));

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
