"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// Cornice "scanner" HUD: quattro staffe angolari + linea di scansione che
// percorre il contenuto + leggera griglia di profondità. Comunica "verifica
// biometrica in corso" — il linguaggio visivo del registro. Statica (solo
// staffe) sotto reduced-motion.
export function ScannerFrame({
  children,
  className,
  color = "#00A896",
  active = true,
}: {
  children: ReactNode;
  className?: string;
  color?: string;
  active?: boolean;
}) {
  const reduce = useReducedMotion();
  const b = `2px solid ${color}`;

  return (
    <div className={`relative ${className ?? ""}`}>
      {children}

      {/* Griglia di profondità, appena percettibile */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* Staffe angolari */}
      {([["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]] as const).map(([v, h]) => (
        <span
          key={v + h}
          aria-hidden
          className="pointer-events-none absolute h-4 w-4"
          style={{
            [v]: 6, [h]: 6,
            [`border${v[0].toUpperCase() + v.slice(1)}`]: b,
            [`border${h[0].toUpperCase() + h.slice(1)}`]: b,
            filter: `drop-shadow(0 0 4px ${color}aa)`,
          } as React.CSSProperties}
        />
      ))}

      {/* Linea di scansione */}
      {active && !reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-1.5 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, boxShadow: `0 0 10px ${color}` }}
          animate={{ top: ["8%", "92%", "8%"], opacity: [0, 0.9, 0.9, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", times: [0, 0.48, 0.52, 1] }}
        />
      )}
    </div>
  );
}
