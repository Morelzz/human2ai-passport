"use client";

// ──────────────────────────────────────────────────────────────────────────
// AskBar — "Dimmi cosa cambiare": input in linguaggio naturale + chip rapidi.
// Dal prototipo design/anteprima_editor_mobile.html (.askchips/.askbar).
// ──────────────────────────────────────────────────────────────────────────

import { useState } from "react";

const CHIPS = ["più caldo", "schiarisci", "più contrasto", "più nitido", "grana", "vignetta"];

export function AskBar({
  onSubmit,
  busy,
  hint,
}: {
  onSubmit: (text: string) => void;
  busy: boolean;
  hint: string | null;
}) {
  const [text, setText] = useState("");
  const submit = () => {
    const t = text.trim();
    if (t) {
      onSubmit(t);
      setText("");
    }
  };

  return (
    <div className="mt-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1.5">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onSubmit(c)}
            className="shrink-0 whitespace-nowrap rounded-full border border-border bg-elevated px-2.5 py-1 text-[0.7rem] text-muted transition-colors hover:text-foreground"
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Dimmi cosa cambiare…"
          className="flex-1 rounded-full border border-border bg-elevated px-3.5 py-2 text-[0.8rem] text-foreground outline-none focus:border-amber/40"
          aria-label="Dimmi cosa cambiare"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          aria-label="Applica"
          className="grid w-10 shrink-0 place-items-center rounded-full bg-amber text-[0.9rem] font-bold text-[#412402] transition-[filter] hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "…" : "➤"}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-[0.66rem] text-teal">{hint}</p>}
    </div>
  );
}
