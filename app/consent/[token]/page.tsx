import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import ConsentClient from "./ConsentClient";

interface Props {
  params: Promise<{ token: string }>;
}

// Link personale via token: mai nell'indice dei motori.
export const metadata = {
  robots: { index: false, follow: false },
};

// Pagina pubblica: la persona apre il link e conferma il consenso in prima persona.
export default async function ConsentPage({ params }: Props) {
  const { token } = await params;
  const admin = createServerClient();

  const { data: avatar } = await admin
    .from("avatars")
    .select("alias, gender, age_range, ethnicity, commercial_consent, person_consented_at")
    .eq("consent_token", token)
    .maybeSingle();

  if (!avatar) notFound();

  return (
    <ConsentClient
      token={token}
      alias={avatar.alias}
      identity={[avatar.gender, avatar.age_range, avatar.ethnicity].filter(Boolean).join(" · ")}
      commercialConsent={avatar.commercial_consent ?? true}
      alreadyConsented={!!avatar.person_consented_at}
    />
  );
}
