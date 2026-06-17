import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Button — sistema SEMBLIC: PILLOLE (raggio pieno), UN solo colore d'azione
// riempito (Amber), testo Obsidian sul pieno, niente ombre/gradienti.
// Etichette uppercase con tracking aperto: leggibilità sull'Obsidian.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold uppercase tracking-[0.05em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary:
          "text-[#412402] bg-amber hover:bg-amber-hover active:brightness-95",
        secondary:
          "text-foreground border border-edge hover:border-white/30",
        ghost: "text-muted hover:text-foreground",
        outline:
          "text-amber border border-amber/40 hover:border-amber/70",
      },
      size: {
        sm: "h-9 px-5 text-[0.7rem]",
        md: "h-11 px-7 text-[0.74rem]",
        lg: "h-14 px-9 text-[0.78rem]",
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
