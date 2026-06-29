"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { colors, radius, buttonPrimary } from "@/lib/ui";
import {
  isStandalone,
  isIOS,
  isPushSupported,
  registerServiceWorker,
  enablePush,
} from "@/lib/pwa/client";

// Orchestratore PWA: vive globale ma agisce solo nell'area di valore (Ward, il
// radar loggato). Tre momenti, uno alla volta, mai invadenti:
//   1) mini-tutorial (prima visita)  2) install prompt  3) opt-in avvisi.
// Le scelte si ricordano in localStorage; "Non ora" silenzia, non insiste.

const TUTORIAL_KEY = "semblic-ward-tutorial-v1";
const INSTALL_KEY = "semblic-install-dismissed";
const PUSH_KEY = "semblic-push-decided";
const INSTALL_SNOOZE_DAYS = 14;

type Overlay = "tutorial" | "install" | "optin" | null;

function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage non disponibile: il momento riapparira' */
  }
}

// beforeinstallprompt non e' tipizzato in lib.dom.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaManager() {
  const pathname = usePathname();
  const onWard = pathname?.startsWith("/ward") ?? false;

  const [overlay, setOverlay] = useState<Overlay>(null);
  const [installAvailable, setInstallAvailable] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  // SW + cattura dell'evento di installabilita' (una volta sola).
  useEffect(() => {
    registerServiceWorker();
    const onBip = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setInstallAvailable(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  // Decide il prossimo momento da mostrare, in ordine di priorita'.
  function pickNext(): Overlay {
    if (!lsGet(TUTORIAL_KEY)) return "tutorial";

    const installDismissedAt = Number(lsGet(INSTALL_KEY) || 0);
    const snoozed = Date.now() - installDismissedAt < INSTALL_SNOOZE_DAYS * 864e5;
    const canInstall = !isStandalone() && (installAvailable || isIOS());
    if (canInstall && !snoozed) return "install";

    const pushUndecided = !lsGet(PUSH_KEY);
    const canPush =
      isPushSupported() &&
      Notification.permission === "default" &&
      // Su iOS il push esiste solo da installata: non chiederlo nel browser.
      (isStandalone() || !isIOS());
    if (pushUndecided && canPush) return "optin";

    return null;
  }

  // Sull'ingresso in Ward, dopo che la pagina si e' posata, valuta il momento.
  useEffect(() => {
    if (!onWard) {
      setOverlay(null);
      return;
    }
    const t = setTimeout(() => setOverlay(pickNext()), 1400);
    return () => clearTimeout(t);
    // installAvailable rientra: se l'evento arriva dopo, rivaluta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onWard, installAvailable]);

  if (!onWard || !overlay) return null;

  function closeAndAdvance() {
    // Dopo aver chiuso un momento, valuta subito il successivo.
    setOverlay(null);
    setTimeout(() => setOverlay(pickNext()), 350);
  }

  if (overlay === "tutorial") {
    return (
      <Tutorial
        onDone={() => {
          lsSet(TUTORIAL_KEY, String(Date.now()));
          closeAndAdvance();
        }}
      />
    );
  }

  if (overlay === "install") {
    return (
      <InstallPrompt
        ios={isIOS()}
        canPrompt={installAvailable}
        onInstall={async () => {
          const p = deferredPrompt.current;
          if (p) {
            await p.prompt();
            await p.userChoice.catch(() => {});
            deferredPrompt.current = null;
            setInstallAvailable(false);
          }
          lsSet(INSTALL_KEY, String(Date.now()));
          closeAndAdvance();
        }}
        onDismiss={() => {
          lsSet(INSTALL_KEY, String(Date.now()));
          closeAndAdvance();
        }}
      />
    );
  }

  // opt-in
  return (
    <PushOptIn
      onEnable={async () => {
        lsSet(PUSH_KEY, String(Date.now()));
        await enablePush();
        closeAndAdvance();
      }}
      onDismiss={() => {
        lsSet(PUSH_KEY, String(Date.now()));
        closeAndAdvance();
      }}
    />
  );
}

// ── Primitive condivise ─────────────────────────────────────────────────────

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  background: "rgba(6,8,12,0.72)",
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
  display: "flex",
  padding: "1rem",
};

const sheet: CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border2}`,
  borderRadius: radius.xl,
  padding: "1.5rem",
  width: "100%",
  maxWidth: 380,
  boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
};

const ghostBtn: CSSProperties = {
  background: "transparent",
  border: "none",
  color: colors.faint,
  fontSize: "0.85rem",
  cursor: "pointer",
  padding: "0.6rem",
  width: "100%",
};

// ── Install prompt ──────────────────────────────────────────────────────────

function InstallPrompt({
  ios,
  canPrompt,
  onInstall,
  onDismiss,
}: {
  ios: boolean;
  canPrompt: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  return (
    <div style={{ ...backdrop, alignItems: "flex-end", justifyContent: "center" }}>
      <div style={sheet}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "0.9rem" }}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              background: colors.amber,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldGlyph color={colors.onAmber} />
          </span>
          <span style={{ fontSize: "1.05rem", color: colors.text, fontWeight: 300, letterSpacing: "-0.02em" }}>
            Installa Semblic
          </span>
        </div>
        <p style={{ fontSize: "0.85rem", color: colors.muted, lineHeight: 1.6, margin: "0 0 1.2rem" }}>
          A schermata Home, a tutto schermo. Cosi' gli avvisi Ward ti arrivano anche ad app chiusa.
        </p>

        {ios && !canPrompt ? (
          <div
            style={{
              background: colors.raised,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              padding: "0.8rem 0.9rem",
              fontSize: "0.82rem",
              color: colors.text,
              lineHeight: 1.6,
              marginBottom: "0.6rem",
            }}
          >
            Su iPhone: tocca <strong>Condividi</strong>, poi <strong>Aggiungi a Home</strong>.
            <button style={{ ...buttonPrimary, width: "100%", marginTop: "0.9rem" }} onClick={onInstall}>
              Ho capito
            </button>
          </div>
        ) : (
          <button style={{ ...buttonPrimary, width: "100%" }} onClick={onInstall}>
            Installa l&apos;app
          </button>
        )}
        <button style={ghostBtn} onClick={onDismiss}>
          Non ora
        </button>
      </div>
    </div>
  );
}

// ── Opt-in avvisi ───────────────────────────────────────────────────────────

function PushOptIn({ onEnable, onDismiss }: { onEnable: () => void; onDismiss: () => void }) {
  return (
    <div style={{ ...backdrop, alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...sheet, textAlign: "center" }}>
        <span
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            background: "rgba(242,169,59,0.12)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1rem",
          }}
        >
          <BellGlyph color={colors.amber} />
        </span>
        <h3
          style={{
            fontSize: "1.3rem",
            color: colors.text,
            fontWeight: 200,
            letterSpacing: "-0.04em",
            margin: "0 0 0.6rem",
            lineHeight: 1.2,
          }}
        >
          Ti avviso quando ti trovo
        </h3>
        <p style={{ fontSize: "0.85rem", color: colors.muted, lineHeight: 1.6, margin: "0 0 1.3rem" }}>
          Quando Ward scova una copia del tuo volto in giro, ricevi una notifica. Tu decidi se colpire con
          Nemesis.
        </p>
        <button style={{ ...buttonPrimary, width: "100%" }} onClick={onEnable}>
          Attiva gli avvisi
        </button>
        <button style={ghostBtn} onClick={onDismiss}>
          Non ora
        </button>
      </div>
    </div>
  );
}

// ── Mini-tutorial ───────────────────────────────────────────────────────────

const STEPS = [
  { chip: "Avatar", title: "Il tuo avatar", body: "Il volto che registri e rivendichi come tuo. Tutto parte da qui." },
  { chip: "Genera", title: "Genera col tuo consenso", body: "Crei contenuti dal tuo avatar, sempre alle tue condizioni." },
  { chip: "Proteggi", title: "Ward, il tuo radar", body: "Trova dove appare il tuo volto e con Nemesis lo fa rimuovere." },
  { chip: "Fiducia", title: "Verifica e fiducia", body: "Chiunque puo' controllare che il tuo consenso sia reale." },
];

function Tutorial({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const s = STEPS[step];

  return (
    <div style={{ ...backdrop, alignItems: "flex-end", justifyContent: "center" }}>
      <div style={sheet}>
        {/* Riga dei 4 macro-intenti: si accende quello corrente. */}
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.2rem" }}>
          {STEPS.map((it, i) => (
            <div
              key={it.chip}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "0.5rem 0.2rem",
                borderRadius: radius.sm,
                fontSize: "0.66rem",
                letterSpacing: "0.02em",
                background: i === step ? "rgba(242,169,59,0.12)" : colors.raised,
                border: `1px solid ${i === step ? colors.amber : colors.border}`,
                color: i === step ? colors.amber : colors.faint,
                transition: "all 0.25s",
              }}
            >
              {it.chip}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.7rem", color: colors.amber, letterSpacing: "0.08em" }}>
            PASSO {step + 1} / {STEPS.length}
          </span>
          <button onClick={onDone} style={{ background: "none", border: "none", color: colors.faint, fontSize: "0.78rem", cursor: "pointer" }}>
            Salta
          </button>
        </div>

        <h3 style={{ fontSize: "1.15rem", color: colors.text, fontWeight: 300, letterSpacing: "-0.02em", margin: "0 0 0.5rem" }}>
          {s.title}
        </h3>
        <p style={{ fontSize: "0.85rem", color: colors.muted, lineHeight: 1.6, margin: "0 0 1.3rem" }}>{s.body}</p>

        <button
          style={{ ...buttonPrimary, width: "100%" }}
          onClick={() => (last ? onDone() : setStep((n) => n + 1))}
        >
          {last ? "Inizia" : "Avanti"}
        </button>
      </div>
    </div>
  );
}

// ── Glifi (inline SVG, niente dipendenze) ───────────────────────────────────

function ShieldGlyph({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function BellGlyph({ color }: { color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9a6 6 0 1112 0c0 5 1.5 6 2 7H4c.5-1 2-2 2-7z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 004 0" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
