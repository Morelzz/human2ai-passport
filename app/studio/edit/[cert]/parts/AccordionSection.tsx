"use client";

// ──────────────────────────────────────────────────────────────────────────
// AccordionSection — guscio accordion (stessa resa di SliderSection) per le
// sezioni con contenuto custom: Mixer HSL e Curve. Una aperta alla volta
// (gestita dal padre). Dal prototipo design/anteprima_editor_mobile.html (.acc).
// ──────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

export function AccordionSection({
  title,
  badge,
  open,
  onToggle,
  children,
}: {
  title: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <span className="text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-amber">{title}</span>
        {badge && <span className="font-mono text-[0.55rem] tracking-normal text-faint">{badge}</span>}
        <span className={`ml-auto text-faint transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>▾</span>
      </button>
      {open && <div className="border-t border-border/50 px-4 pb-3 pt-2">{children}</div>}
    </div>
  );
}
