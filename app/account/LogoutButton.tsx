"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: "0.6rem 1.1rem",
        borderRadius: 10,
        background: "transparent",
        border: "1px solid rgba(238,122,112,0.4)",
        color: "var(--blocked-c)",
        fontSize: "0.82rem",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Esci
    </button>
  );
}
