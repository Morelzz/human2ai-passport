import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Helper shadcn: unisce classi Tailwind risolvendo i conflitti.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
