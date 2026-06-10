-- E1 — PUBLIC FIGURE: predisposizione DB (BRIEF_POST_REVIEW, blocco E).
-- SOLO modello dati, nessun flusso attivo: lo scudo per le figure pubbliche
-- ("registro il mio volto per BLOCCARLO") e il futuro marketplace PF si
-- costruiscono DOPO il parere legale di base. Campi dormienti, additivi.
-- Idempotente.

-- Flag figura pubblica: quando il flusso sarà vivo, il passport dichiarerà
-- "questo volto non è generabile; ogni contenuto senza certificato è non
-- autorizzato". Oggi nessun codice lo legge.
alter table avatars add column if not exists is_public_figure boolean not null default false;

-- Moltiplicatore di prezzo del profilo (1 = prezzi standard del listino).
-- Vive sull'avatar perché è l'entità prezzata (un seller = un avatar): nel
-- marketplace PF il prezzo per categoria verrà moltiplicato per questo
-- valore, impostato dal seller. Oggi nessun flusso lo applica.
alter table avatars add column if not exists price_multiplier numeric not null default 1
  check (price_multiplier > 0);

-- Tipo account 'manager' (agenzia/procuratore di una figura pubblica).
-- Distinto da 'enterprise' (che onboarda volti propri): il manager AGISCE PER
-- la persona, ma revoca e kill switch restano SEMPRE della persona. Inattivo:
-- nessun signup lo assegna, nessuna UI lo offre.
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('buyer','seller','admin','enterprise','manager'));
