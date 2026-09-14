"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

// "Riduci animazioni" senza rompere l'idratazione.
//
// useReducedMotion di framer-motion vale null sul server e true/false nel
// browser gia' al primo render: un componente che per chi riduce le animazioni
// disegna un'altra struttura (null, un <div> al posto di un motion.div, un
// testo non spezzato in lettere) produce un HTML diverso da quello del server,
// e React butta via e ricostruisce l'intera pagina. Succedeva a ogni apertura
// per chiunque avesse l'opzione attiva sul telefono.
//
// Qui il primo render e' uguale ovunque (false), e la preferenza vera arriva
// subito dopo il montaggio.
export function useReducedMotionSafe(): boolean {
  const preferisce = useReducedMotion();
  const [montato, setMontato] = useState(false);
  useEffect(() => setMontato(true), []);
  return montato ? Boolean(preferisce) : false;
}
