import type { NextConfig } from "next";
import { STATIC_SECURITY_HEADERS } from "./lib/security-headers";

const nextConfig: NextConfig = {
  // Pacchetti pesanti del motore Ward (scan): face-api + tfjs + backend WASM +
  // sharp NON vanno bundlati, girano da node_modules nel server Node (Railway,
  // next start). Lo scan e' pensato per l'host worker, non per il serverless.
  serverExternalPackages: [
    "@vladmandic/face-api",
    "@tensorflow/tfjs",
    "@tensorflow/tfjs-backend-wasm",
    "sharp",
    "playwright",
  ],
  images: {
    // Copertine del blog generate con Higgsfield (CDN della libreria utente).
    // Next/Image le ottimizza e le serve in locale: il client non parla mai col CDN.
    remotePatterns: [
      { protocol: "https", hostname: "d8j0ntlcm91z4.cloudfront.net" },
    ],
  },
  // Header di sicurezza statici su tutte le rotte (la CSP dinamica e' nel proxy).
  async headers() {
    return [{ source: "/:path*", headers: STATIC_SECURITY_HEADERS }];
  },
};

export default nextConfig;
