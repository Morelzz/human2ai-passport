import type { ReactNode } from "react";

// Testata di sezione, casa nuova: kicker mono ambra + titolo pesante e stretto,
// allineato a sinistra (al centro solo dove la sezione e' simmetrica). Il
// figlio e' il titolo; `kicker` e' l'etichetta sopra; `subtitle` la riga sotto.
export function SectionTitle({
  children,
  kicker,
  subtitle,
  className,
  align = "left",
}: {
  children: ReactNode;
  kicker?: string;
  subtitle?: string;
  className?: string;
  align?: "left" | "center";
}) {
  const centered = align === "center";
  return (
    <div className={`mb-8 flex flex-col gap-3 sm:mb-10${centered ? " items-center text-center" : ""}${className ? ` ${className}` : ""}`}>
      {kicker && <span className="kicker">{kicker}</span>}
      <h2 className="text-balance text-[2.1rem] font-bold leading-[1] tracking-[-0.035em] sm:text-[3.25rem]">{children}</h2>
      {subtitle && (
        <p className={`max-w-[54ch] text-pretty text-[1.05rem] leading-relaxed text-muted${centered ? " mx-auto" : ""}`}>{subtitle}</p>
      )}
    </div>
  );
}
