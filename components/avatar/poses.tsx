// Le 8 pose canoniche del set fotografico di un volto (usate sia nella
// creazione avatar che nel KYC). Ogni box ha un'icona-posa stilizzata che
// mostra inquadratura e orientamento dello scatto.

export type Pose = {
  key: string;
  label: string;
  tip: string;
  crop: "head" | "bust" | "full";
  facing: "front" | "right" | "left" | "back" | "tq";
};

export const POSES: Pose[] = [
  { key: "face-front", label: "Volto frontale", tip: "Primo piano, sguardo in camera", crop: "head", facing: "front" },
  { key: "face-right", label: "Profilo destro", tip: "Volto di lato, lato destro", crop: "head", facing: "right" },
  { key: "face-left", label: "Profilo sinistro", tip: "Volto di lato, lato sinistro", crop: "head", facing: "left" },
  { key: "face-tq", label: "Volto 3/4", tip: "Leggermente girato (tre quarti)", crop: "head", facing: "tq" },
  { key: "bust-front", label: "Mezzo busto", tip: "Testa e spalle, frontale", crop: "bust", facing: "front" },
  { key: "bust-back", label: "Busto di spalle", tip: "Testa e spalle, di spalle", crop: "bust", facing: "back" },
  { key: "full-front", label: "Corpo intero", tip: "Tutta la figura, frontale", crop: "full", facing: "front" },
  { key: "full-back", label: "Corpo di spalle", tip: "Tutta la figura, di spalle", crop: "full", facing: "back" },
];

// Icona-posa stilizzata (SVG minimale): testa per crop, tratti viso per orientamento.
export function PoseGlyph({ pose }: { pose: Pose }) {
  const c = "#F2A93B";
  const cx = 24;
  const r = pose.crop === "head" ? 11 : pose.crop === "bust" ? 8 : 6;
  const cy = pose.crop === "head" ? 20 : pose.crop === "bust" ? 15 : 11;
  const f = pose.facing;
  return (
    <svg viewBox="0 0 48 60" width="38" height="48" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx={cx} cy={cy} r={r} fill={f === "back" ? c : "none"} fillOpacity={f === "back" ? 0.18 : 0} />
      {f === "front" && (<>
        <circle cx={cx - r / 2.4} cy={cy} r="0.9" fill={c} stroke="none" />
        <circle cx={cx + r / 2.4} cy={cy} r="0.9" fill={c} stroke="none" />
      </>)}
      {f === "tq" && (<>
        <circle cx={cx + r / 4} cy={cy} r="0.9" fill={c} stroke="none" />
        <circle cx={cx + r / 1.3} cy={cy} r="0.9" fill={c} stroke="none" />
      </>)}
      {f === "right" && <path d={`M${cx + r} ${cy - 2} l4 2 l-4 2`} />}
      {f === "left" && <path d={`M${cx - r} ${cy - 2} l-4 2 l4 2`} />}
      {pose.crop === "head" && <path d="M12 58 q12 -13 24 0" />}
      {pose.crop === "bust" && <path d="M10 58 q0 -18 14 -18 q14 0 14 18" />}
      {pose.crop === "full" && (<>
        <line x1={cx} y1={cy + r} x2={cx} y2="40" />
        <line x1={cx} y1="27" x2={cx - 8} y2="34" />
        <line x1={cx} y1="27" x2={cx + 8} y2="34" />
        <line x1={cx} y1="40" x2={cx - 7} y2="55" />
        <line x1={cx} y1="40" x2={cx + 7} y2="55" />
      </>)}
    </svg>
  );
}
