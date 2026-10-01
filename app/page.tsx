import Link from "next/link";
import { registroPubblico } from "@/lib/registro-cache";
import { Tier } from "@/lib/types";
import { SiteNav } from "@/components/marketing/SiteNav";
import { DuePorte } from "@/components/marketing/DuePorte";
import { HeroCinema } from "@/components/marketing/HeroCinema";
import { ScenaDivisa } from "@/components/marketing/scene/ScenaDivisa";
import { FraseAccesa } from "@/components/marketing/scene/FraseAccesa";
import { RegistroInCorsa } from "@/components/marketing/scene/RegistroInCorsa";
import { PassiImpilati } from "@/components/marketing/scene/PassiImpilati";
import { LenteCertificato } from "@/components/marketing/scene/LenteCertificato";
import { FORMATI, qualitaPer } from "@/app/match/crea/opzioni";
import { scattoInVetrina } from "@/lib/vetrina";
import { ProvaGratis, type VoltoProva } from "@/components/marketing/ProvaGratis";
import { IlSet } from "@/components/marketing/IlSet";
import { Trust } from "@/components/marketing/Trust";
import type { FeaturedAvatar } from "@/components/marketing/Registry";
import { WardSection } from "@/components/marketing/WardSection";
import { IndicePorte, type Porta } from "@/components/marketing/IndicePorte";
import { fotoPagina, type ChiaveFoto } from "@/lib/foto-pagine";
import { ClosingCTA } from "@/components/marketing/ClosingCTA";
import { Footer } from "@/components/marketing/Footer";
import { galleryFromRow, portraitFor } from "@/lib/sample-galleries";
import { sampleSrc } from "@/lib/sample-size";
import { provaAttiva, voltiPerLaProva } from "@/lib/prova-gratis";


export default async function Home() {
  // Fonte UNICA del registro pubblico, in cache (lib/registro-cache): stessi
  // volti e stessi contatori di catalogo e trasparenza. Le due letture partono
  // insieme: prima erano tre giri sul DB in fila, e la pagina non partiva.
  const [approved, vetrina] = await Promise.all([registroPubblico(), scattoInVetrina()]);
  // L'indice delle porte in fondo: ogni porta con lo scatto vero della sua pagina
  // (gia' filtrato sul consenso vivo), o senza foto se non c'e'.
  const PORTE: { href: string; nome: string; frase: string; foto: ChiaveFoto | null }[] = [
    { href: "/studio", nome: "Semblic Studio", frase: "La campagna la facciamo noi: brief, volto giusto, consegna certificata.", foto: "studio" },
    { href: "/enterprise", nome: "Enterprise", frase: "Un volto riservato al tuo brand, nella tua categoria, per 6 o 12 mesi.", foto: "enterprise" },
    { href: "/sviluppatori", nome: "API e MCP", frase: "Il consenso come risposta di un endpoint, dentro i tuoi sistemi.", foto: "sviluppatori" },
    { href: "/ai-act", nome: "AI Act", frase: "Certificato, filigrana e consenso verificabile: la trasparenza che la legge chiede, già dentro.", foto: null },
    { href: "/academy#aziende", nome: "Formazione", frase: "Per le aziende che devono adeguarsi: percorsi a più livelli, sul serio.", foto: "academy" },
  ];
  const divisa = await fotoPagina("divisa");
  const porte: Porta[] = await Promise.all(
    PORTE.map(async (x) => {
      const c = x.foto ? await fotoPagina(x.foto) : null;
      return { href: x.href, nome: x.nome, frase: x.frase, foto: c ? { src: c.src960, fuoco: c.fuoco, persone: c.persone.map((q) => q.alias).join(" e ") } : null };
    }),
  );

  // La fascia "Provalo adesso": c'e' solo quando l'interruttore e' acceso.
  const voltiProva: VoltoProva[] = provaAttiva()
    ? voltiPerLaProva(approved as unknown as Parameters<typeof voltiPerLaProva>[0], 4).map((a) => {
        const r = a as unknown as { handle: string; alias: string };
        return { handle: r.handle, alias: r.alias, src: sampleSrc(portraitFor(r as never), 480) };
      })
    : [];

  // In evidenza (review B1): solo consensi ATTIVI, ordinati per utilizzi :
  // i volti REALI (con galleria: Mario/Random e gli ambassador) restano in
  // testa. I revocati vivono nel catalogo, in fondo.
  // L'ordine della fila "Persone, non prompt" lo decide Morelz (1/10): per
  // prima Gabriella, poi Chiara, poi gli altri come prima, e Random per ultimo.
  // Random va tolto dal taglio e rimesso in coda, altrimenti con piu' di otto
  // volti uscirebbe dalla fila invece di restare ultimo.
  const IN_TESTA = ["gabriella", "chiara"];
  const IN_CODA = ["random"];
  const attivi = approved
    .filter((a) => !a.revoked_at)
    .sort((a, b) => {
      const ga = galleryFromRow(a.handle, a.gallery_urls).length > 0 ? 1 : 0;
      const gb = galleryFromRow(b.handle, b.gallery_urls).length > 0 ? 1 : 0;
      if (ga !== gb) return gb - ga;
      return (b.usage_count ?? 0) - (a.usage_count ?? 0);
    });
  const posto = (h: string) => (IN_TESTA.includes(h) ? IN_TESTA.indexOf(h) : IN_TESTA.length);
  const inCoda = attivi.filter((a) => IN_CODA.includes(a.handle));
  const featured: FeaturedAvatar[] = [
    ...attivi.filter((a) => !IN_CODA.includes(a.handle)).sort((a, b) => posto(a.handle) - posto(b.handle)).slice(0, 8 - inCoda.length),
    ...inCoda,
  ]
    .map((a) => ({
      handle: a.handle,
      alias: a.alias,
      portrait_url: a.portrait_url,
      tier: a.tier as Tier,
      usage_count: a.usage_count ?? 0,
      revoked_at: a.revoked_at,
      gallery_urls: (a.gallery_urls as string[] | null) ?? null,
      gender: (a as { gender?: string | null }).gender ?? null,
    }));

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <SiteNav />
      <main>
        <HeroCinema vetrina={vetrina} prezzoDaCent={Math.min(...FORMATI.flatMap((f) => qualitaPer(f.v).map((q) => q.volt)))} />
        {/* La foto che si divide sul computer; sul telefono (e con "riduci
            animazioni") le due porte che scorrono di lato. */}
        {divisa && (
          <ScenaDivisa foto={{ nome: divisa.persone[0].alias, prezzoCent: divisa.grossCents, allaPersonaCent: divisa.royaltyCents, src960: divisa.src960, src1600: divisa.src1600 }} />
        )}
        <div className={divisa ? "hidden motion-reduce:block" : ""}>
          <DuePorte vetrina={vetrina} />
        </div>
        <FraseAccesa />
        {vetrina && (
          <LenteCertificato
            vetrina={vetrina}
            foto={{ src760: `/home/scatto-${vetrina.handle}-760.webp`, src1200: `/home/scatto-${vetrina.handle}-1200.webp`, src1536: `/home/scatto-${vetrina.handle}-1536.webp` }}
          />
        )}
        {voltiProva.length > 0 && (
          <div className="px-5 pb-2 sm:px-8">
            <ProvaGratis volti={voltiProva} compatta />
          </div>
        )}
        <RegistroInCorsa
          volti={featured.map((a) => ({ handle: a.handle, alias: a.alias, src: sampleSrc(portraitFor(a as never), 720), utilizzi: a.usage_count }))}
          totale={approved.length}
        />
        <PassiImpilati />
        <IlSet />
        <div className="sv"><WardSection /></div>
        <div className="sv"><Trust /></div>
        <div className="sv"><IndicePorte porte={porte} /></div>
        <ClosingCTA />
      </main>
        <Footer />
    </div>
  );
}
