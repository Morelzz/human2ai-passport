import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Copertine del blog generate con Higgsfield (CDN della libreria utente).
    // Next/Image le ottimizza e le serve in locale: il client non parla mai col CDN.
    remotePatterns: [
      { protocol: "https", hostname: "d8j0ntlcm91z4.cloudfront.net" },
    ],
  },
};

export default nextConfig;
