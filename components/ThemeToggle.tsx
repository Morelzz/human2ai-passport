"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

// Interruttore tema chiaro/scuro. Lo stato vero vive su
// document.documentElement.dataset.theme (impostato prima del paint dallo
// script anti-lampo in layout.tsx). Qui leggiamo quello e lo cambiamo,
// salvando la scelta in localStorage. Scuro e il default (brand-first).
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(t);
    setReady(true);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.add("theme-anim");
    root.dataset.theme = next;
    try { localStorage.setItem("semblic-theme", next); } catch { /* storage off */ }
    setTheme(next);
    window.setTimeout(() => root.classList.remove("theme-anim"), 420);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro"}
      title={theme === "dark" ? "Tema chiaro" : "Tema scuro"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:text-amber focus-ring ${className}`}
    >
      {/* Mostra l'icona della destinazione: sole quando sei al buio, luna quando sei in chiaro */}
      {ready && theme === "dark" ? <Sun className="h-[1.15rem] w-[1.15rem]" /> : <Moon className="h-[1.15rem] w-[1.15rem]" />}
    </button>
  );
}
