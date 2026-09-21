// Sorgenti dell'hero su Supabase Storage pubblico (CDN), niente peso nel repo.
// Modulo NEUTRO apposta: il poster e' l'LCP della home, e il <link rel=preload>
// lo scrive il SERVER (app/page.tsx). Importare una costante da un file
// "use client" in un componente server NON restituisce la stringa ma un
// riferimento al client: il link usciva senza href e il browser non precaricava
// piu' niente (21/9/2026).
const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets`;

// Casa nuova (2026-09-14): il video dell'hero e' QUADRATO (Seedance 2.5, 720p):
// un solo file che sta bene sia nel riquadro desktop sia sopra il titolo sul telefono.
export const HERO_POSTER = `${BASE}/hero-v3-poster.jpg`;
export const HERO_VIDEO = `${BASE}/hero-v3.mp4`;
