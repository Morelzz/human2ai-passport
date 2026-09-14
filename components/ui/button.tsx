import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Button — casa nuova (2026-09-14): PILLOLE, UN solo colore d'azione riempito
// (l'ambra), etichette in sentence case. Tutto su token di tema, cosi' lo
// stesso bottone funziona sul corpo chiaro e dentro le isole scure.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-[0.01em] transition-[background-color,border-color,color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-amber text-on-amber hover:bg-amber-hover",
        secondary: "border border-edge bg-transparent text-foreground hover:border-amber/70",
        ghost: "text-muted hover:text-foreground",
        outline: "border border-amber/50 bg-transparent text-amber-ink hover:border-amber",
        ink: "bg-foreground text-[var(--bg)] hover:opacity-90",
      },
      size: {
        sm: "h-9 px-4 text-[0.82rem]",
        md: "h-11 px-6 text-[0.92rem]",
        lg: "h-[3.25rem] px-8 text-[0.98rem]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
