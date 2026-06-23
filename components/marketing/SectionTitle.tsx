import type { ReactNode } from "react";
import { GradientFlowText } from "@/components/marketing/GradientFlowText";

// Titolo GRANDE di sezione (capitolo): MAIUSCOLO, col gradiente animato, una
// hairline tramonto e un sottotitolo. Apre ogni sezione della home con
// un'intestazione ricca (non piatta), nello stile di "Come funziona".
export function SectionTitle({ children, subtitle, className }: { children: ReactNode; subtitle?: string; className?: string }) {
  return (
    <div className={`mb-12 text-center sm:mb-16${className ? ` ${className}` : ""}`}>
      <h2 className="text-4xl font-extrabold uppercase tracking-[-0.02em] sm:text-6xl">
        <GradientFlowText>{children}</GradientFlowText>
      </h2>
      <div aria-hidden className="mx-auto mt-5 h-px w-12 bg-[linear-gradient(90deg,transparent,#F2A93B,transparent)] opacity-70" />
      {subtitle && (
        <p className="mx-auto mt-4 max-w-md text-balance text-sm leading-relaxed text-muted sm:text-base">
          {subtitle}
        </p>
      )}
    </div>
  );
}
