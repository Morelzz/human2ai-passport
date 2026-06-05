// Client Supabase lato SERVER legato ai cookie della richiesta (chiave anon).
// Usato nei Server Component / route per leggere la sessione utente autenticato.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chiamato da un Server Component: il refresh dei cookie
            // viene gestito dal middleware, qui si può ignorare.
          }
        },
      },
    }
  );
}
