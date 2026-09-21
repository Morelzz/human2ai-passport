// Test della validazione scheda ambassador (vedi onboard-ambassador.mjs).
// Esegui con:  node --test scripts/validate-scheda.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkEthnicity } from "./validate-scheda.mjs";

// Il bug reale: per 'asia' e 'gabriella' la scheda riportava il GRUPPO
// etnico 'caucasico' al posto della nazionalità ('italiana').
test("rifiuta 'caucasico' (gruppo etnico, non nazionalità)", () => {
  const r = checkEthnicity("caucasico");
  assert.equal(r.ok, false);
  assert.match(r.error, /nazionalit/i);
});

test("rifiuta i gruppi etnici a prescindere da genere e maiuscole", () => {
  for (const gruppo of [
    "Caucasica", "asiatico", "Asiatica", "mediterraneo", "mediterranea",
    "europea", "europeo", "mediorientale", "latino", "latina",
    "africano", "africana", "afroamericano", "sud-asiatico", "araba", "misto",
  ]) {
    const r = checkEthnicity(gruppo);
    assert.equal(r.ok, false, `'${gruppo}' doveva essere rifiutato`);
    assert.match(r.error, /nazionalit/i);
  }
});

test("accetta le nazionalità note senza warning", () => {
  for (const naz of ["italiana", "spagnola", "giapponese", "marocchina", "brasiliana"]) {
    const r = checkEthnicity(naz);
    assert.equal(r.ok, true, `'${naz}' doveva essere accettata`);
    assert.equal(r.warning, undefined, `'${naz}' non doveva produrre warning`);
  }
});

test("accetta una nazionalità non mappata in ETHNIC_GROUPS, ma con warning", () => {
  const r = checkEthnicity("olandese");
  assert.equal(r.ok, true);
  assert.match(r.warning, /ETHNIC_GROUPS/);
});

test("rifiuta ethnicity mancante o vuota", () => {
  for (const v of [undefined, null, "", "   "]) {
    const r = checkEthnicity(v);
    assert.equal(r.ok, false, `'${v}' doveva essere rifiutato`);
  }
});
