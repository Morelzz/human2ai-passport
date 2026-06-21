import { WardApp } from "../WardApp";
import { DEMO_WARD } from "../demo";

// /ward/demo (spec PARTE D): tutta l'app Ward simulata, pubblica e senza auth.
// Badge DEMO + fascia + filigrana + scan finta; una sola CTA reale verso il
// flusso protetto. Nessuna chiamata di rete, nessun input.
export const metadata = { title: "Ward, demo" };

export default function WardDemoPage() {
  return <WardApp data={DEMO_WARD} demo demoCtaHref="/signup/avatar/protected" />;
}
