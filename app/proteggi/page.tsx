import { redirect } from "next/navigation";

// /proteggi e' un alias storico (modulo VETO). Il flusso protetto canonico ora
// vive in /signup/avatar/protected (KYC -> foto del volto -> consenso Ward); la
// logica utile di cattura volto e' stata riusata in FaceCapture. Qualunque
// vecchio link a /proteggi atterra sul flusso giusto. Spec: /proteggi rivisto,
// non riusato. (ProteggiClient resta nel repo come riferimento, non instradato.)
export default function ProteggiPage() {
  redirect("/signup/avatar/protected");
}
