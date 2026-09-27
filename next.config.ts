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
    // Anima: i fotogrammi dei video si estraggono con ffmpeg sul worker.
    "ffmpeg-static",
    // Il misuratore serio del volto (lib/arcface): gira sul worker.
    "onnxruntime-node",
  ],
  // Gate identità (anti-impersonazione): le route che confrontano il volto
  // caricato col volto verificato (KYC Didit) embeddano i volti SERVER-side con
  // face-api (WASM). Su Vercel la funzione serverless NON vede public/ ne i .wasm
  // (caricati da path su disco), quindi senza questi include i modelli mancano,
  // embed() lancia e il gate va in fail-open SILENZIOSO. Forziamo l'inclusione
  // dei modelli e del backend WASM nelle SOLE lambda che ne hanno bisogno.
  // Il misuratore serio del volto gira solo sul worker (Railway, next start con
  // tutto node_modules). Nelle funzioni di Vercel non serve e peserebbe decine
  // di MB: lo si lascia fuori, e se qualcuno lo chiedesse li' resta face-api.
  outputFileTracingExcludes: {
    "*": ["node_modules/onnxruntime-node/**", "node_modules/onnxruntime-common/**"],
  },
  outputFileTracingIncludes: {
    "/api/avatar/create": [
      "./public/models/**",
      "./node_modules/@tensorflow/tfjs-backend-wasm/dist/*.wasm",
    ],
    "/api/veto/register": [
      "./public/models/**",
      "./node_modules/@tensorflow/tfjs-backend-wasm/dist/*.wasm",
    ],
    // Scan Ward live (bottone /ward): embedda i candidati con face-api (WASM) sul
    // serverless Vercel, quindi serve gli stessi modelli + i .wasm nella lambda.
    "/api/ward/scan": [
      "./public/models/**",
      "./node_modules/@tensorflow/tfjs-backend-wasm/dist/*.wasm",
    ],
  },
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
