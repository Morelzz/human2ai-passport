import { createServerClient } from "@/lib/supabase";
import type { EvidenceStorage, EvidenceRecordRepo, WhoisSummary } from "./evidence";

// Implementazioni reali su Supabase per l'evidence capture. Bucket privato
// ward-evidence (solo service role) + tabella evidence_records.
const BUCKET = "ward-evidence";

export class SupabaseEvidenceStorage implements EvidenceStorage {
  async put(path: string, bytes: Uint8Array, contentType: string): Promise<string> {
    const admin = createServerClient();
    const { error } = await admin.storage.from(BUCKET).upload(path, Buffer.from(bytes), {
      contentType,
      upsert: true,
    });
    if (error) throw new Error(`evidence put: ${error.message}`);
    return `${BUCKET}/${path}`;
  }
}

export class SupabaseEvidenceRepo implements EvidenceRecordRepo {
  async insert(rec: {
    scanMatchId: string;
    screenshotPath: string;
    htmlPath: string;
    whois: WhoisSummary;
    hash: string;
  }): Promise<string> {
    const admin = createServerClient();
    const { data, error } = await admin
      .from("evidence_records")
      .insert({
        scan_match_id: rec.scanMatchId,
        screenshot_path: rec.screenshotPath,
        html_path: rec.htmlPath,
        whois: rec.whois,
        hash: rec.hash,
      })
      .select("id")
      .single();
    if (error) throw new Error(`evidence insert: ${error.message}`);
    return data.id as string;
  }
}
