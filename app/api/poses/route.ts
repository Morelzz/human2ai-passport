import { NextResponse } from "next/server";
import { listPoses } from "@/lib/poses";

export const runtime = "nodejs";

// GET /api/poses — libreria pubblica delle pose (manichini) per ECHO.
// Cache CDN 5 minuti: aggiungere una posa = caricare un file, compare da sola.
export async function GET() {
  try {
    const poses = await listPoses();
    return NextResponse.json(
      { poses },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch {
    // Difensiva: storage irraggiungibile → libreria vuota, mai 500 al client.
    return NextResponse.json({ poses: [] });
  }
}
