"use client";

// ──────────────────────────────────────────────────────────────────────────
// useDictation — hook di dettatura vocale push-to-talk sopra la Web Speech API.
// Modello: tocca per iniziare, ritocca per fermare. Le PAUSE non chiudono la
// sessione: alla fine naturale del riconoscimento (onend) riavviamo finche'
// l'utente non ferma esplicitamente (guard su una ref, niente race con lo
// stato). Ogni segmento "consolidato" (final) viene appeso UNA volta sola via
// onFinal; l'interim e' solo anteprima dal vivo.
// Logica pura (unione testo, errori) delegata a @/lib/voice/dictation.
// NB testi italiani senza trattini lunghi (regola di Morelz).
// ──────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { collectResults, dictationError } from "@/lib/voice/dictation";

// Tipi minimi della Web Speech API (non standard in lib.dom: la dichiariamo
// quanto basta per usarla in sicurezza). Volutamente parziale.
interface SpeechAlt { readonly transcript: string }
interface SpeechResult { readonly isFinal: boolean; readonly length: number; [i: number]: SpeechAlt }
interface SpeechResultList { readonly length: number; [i: number]: SpeechResult }
interface SpeechEvent { readonly resultIndex: number; readonly results: SpeechResultList }
interface SpeechErrEvent { readonly error: string }
interface SpeechRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: SpeechErrEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecCtor = new () => SpeechRec;

export interface Dictation {
  supported: boolean;
  listening: boolean;
  interim: string;
  error: string;
  toggle: () => void;
  stop: () => void;
}

export function useDictation(onFinal: (chunk: string) => void, lang = "it-IT"): Dictation {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");

  const recRef = useRef<SpeechRec | null>(null);
  // "vogliamo restare in ascolto": guida il riavvio su onend (push-to-talk).
  const wantRef = useRef(false);
  // onFinal sempre fresca senza ricreare il riconoscimento.
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e: SpeechEvent) => {
      const slice: Array<{ transcript: string; isFinal: boolean }> = [];
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        slice.push({ transcript: r[0]?.transcript ?? "", isFinal: r.isFinal });
      }
      const { final, interim: live } = collectResults(slice);
      if (final) onFinalRef.current(final);
      setInterim(live);
    };

    rec.onerror = (e: SpeechErrEvent) => {
      const msg = dictationError(e.error);
      if (msg) setError(msg);
      // Errori "duri" sul permesso o sull'hardware: non riavviare in loop.
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
        wantRef.current = false;
        setListening(false);
      }
    };

    rec.onend = () => {
      setInterim("");
      // Le pause non chiudono: se vogliamo ancora ascoltare, riparti.
      if (wantRef.current) {
        try {
          rec.start();
        } catch {
          // gia' avviato: ignora
        }
      } else {
        setListening(false);
      }
    };

    recRef.current = rec;
    return () => {
      wantRef.current = false;
      try {
        rec.abort();
      } catch {
        // gia' fermo
      }
      recRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    setError("");
    wantRef.current = true;
    setListening(true);
    try {
      rec.start();
    } catch {
      // gia' in ascolto: ignora
    }
  }, []);

  const stop = useCallback(() => {
    wantRef.current = false;
    setListening(false);
    setInterim("");
    try {
      recRef.current?.stop();
    } catch {
      // gia' fermo
    }
  }, []);

  const toggle = useCallback(() => {
    if (wantRef.current) stop();
    else start();
  }, [start, stop]);

  return { supported, listening, interim, error, toggle, stop };
}
