# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, served as equals (confirmed by Morelz, 27/9/2026): the registry only lives if both grow together.

- **People who put their face in the registry.** Real, identity-verified adults who license their face for AI photos and short silent videos, set their own limits, and are paid a royalty on every licensed shot. They check consent, earnings and their passport, often from a phone.
- **People who create with real faces.** Brands, creators and agencies who need photos (and videos) of real, recognisable people with documented consent, for campaigns, social posts and product pages. They work mostly from a computer, with a scene in mind and a budget per shot.

Secondary: people who only want to **protect** their face (Ward: registered so it is never generated, and searched for online), companies on Semblic for Business, and AI assistants reaching the registry through the public MCP server.

## Product Purpose

Semblic is the consent registry for real human faces in AI imagery. Nobody's face is generated without their permission: every shot is checked live against the person's consent and written limits before anything is spent, carries an invisible watermark and a public certificate, and pays the person. Success is a registry where creating with a real face is easier and safer than faking one, and where people earn from their likeness instead of losing control of it.

## Positioning

The only place where the face in the image has said yes, can prove it, and is paid for it, shot by shot. Concretely: live consent (a revocation stops the engine the same second), limits written in the person's own words and read before every shot, identity measured on the result, certificate and watermark verifiable by anyone (Sigil), and a royalty on every sale.

## Operating Context

- Buyers pay in VOLT, prepaid credit (100 VOLT = 1 euro). Real prices come from the same function that charges the Studio: one shot from 0,21 € (square draft) to 0,81 € (4K print); the person's share is shown next to every price.
- A shot that fails identity or quality checks is not delivered and not charged.
- People join with an identity check (Didit) and an age check; consent is a timeline, revocable at any time, prospective only.
- Surfaces: public site (home, registry/catalogue, passports, prices, Sigil, trust pages, academy), the Studio (create, group scenes, Anima video), the account (consent, earnings, Ward), Semblic for Business, the public MCP endpoint `/api/mcp`.

## Capabilities and Constraints

- Italian is the site language today; product names stay: Semblic, Ward (protection), Sigil (verification), Anima (video), ECHO (the image engine).
- Prices are always real and computed, never written by hand; the person's share is always visible.
- Biometric data is treated to vault standard: original reference photos never leave the server, a person's written limits are never published.
- Every UI change starts from a mockup the owner approves; every change is verified on desktop and phone.
- Stack: Next.js 16 (App Router), React 19, Tailwind, Supabase, Vercel, worker on Railway.

## Brand Commitments

- Name SEMBLIC, existing logo mark, pill-shaped buttons.
- Voice: plain, direct Italian; no long dashes anywhere; no hype words; say what happens.
- The owner's taste: light and luminous, modern sans, calm Apple-like restraint (confirmed again 27/9: home page direction B, "luminosa").

## Evidence on Hand

- Live registry numbers: 11 public faces, 75 paid generations, 2 protected faces (from the database, never typed by hand).
- Real watermarked sample photos of every public face (`/api/sample/<handle>/<n>`), real passports and consent timelines, the hero video (`hero-v3`).
- No customer logos, testimonials, press or case studies exist yet: do not invent them.

## Product Principles

1. Consent is shown, not claimed: every surface points at the proof (status, certificate, timeline).
2. Two doors, one registry: the person who lends the face and the person who creates are equally welcome and each finds their way in one screen.
3. The price is the real price, with the person's share beside it.
4. Nothing important is buried: if it cannot be found in seconds, it does not exist.
5. Refuse before spending: a blocked request costs nothing and says why and how to fix it.

## Accessibility & Inclusion

WCAG 2.2 AA: text contrast at least 4.5:1, nothing under 12px, tap targets at least 44px, visible keyboard focus, reduced motion respected. Italian first; English copy only where a surface speaks to AI assistants or foreign developers.
