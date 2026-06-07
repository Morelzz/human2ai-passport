-- FASE 5 (seme) — Proprietà del volto / ancoraggio on-chain.
-- Il token unico dell'avatar (token_hash, già esistente) è il "atto di proprietà".
-- Qui prepariamo SOLO i campi per il futuro ancoraggio on-chain (Base, identità
-- soulbound + licenze EIP-2981). Tutto nullable: nessun effetto finché non si ancora.
-- Modello: l'IDENTITÀ è soulbound (non vendibile); le licenze d'uso saranno separate.
-- Idempotente.

alter table avatars add column if not exists owner_wallet      text;        -- wallet self-custody collegato (opzionale, es. Phantom)
alter table avatars add column if not exists chain             text;        -- es. 'base'
alter table avatars add column if not exists onchain_token_id  text;        -- id del token soulbound on-chain
alter table avatars add column if not exists onchain_tx        text;        -- hash della transazione di ancoraggio
alter table avatars add column if not exists anchored_at       timestamptz; -- quando è stato ancorato
alter table avatars add column if not exists soulbound         boolean not null default true; -- identità non trasferibile

create index if not exists avatars_onchain_tx_idx on avatars(onchain_tx) where onchain_tx is not null;
