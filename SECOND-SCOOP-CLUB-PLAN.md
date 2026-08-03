# The Second Scoop Club — Architecture & Build Plan

*Because one was never enough.*

This is the plan to approve **before** any code is written. It covers the audit, the recommended
architecture, the full database, security, the phased roadmap, how it hides until launch, testing,
and setup. Version 1 (MVP) scope is defined precisely; later phases are mapped so the V1 build
doesn't have to be rebuilt to add them.

---

## 1. Audit of the current stack

| Area | What you have today |
|---|---|
| Front-end | Static site — plain HTML/CSS/JS, no framework, no build step |
| Hosting | Netlify (with Netlify DNS, and Netlify Functions available) |
| "Backend" | Google Apps Script web app + a Google Sheet (orders, signups, reviews, mailing) |
| Payments | Bank transfer, confirmed **manually** — admin marks an order **Paid** in the Sheet |
| Email | Brevo (domain-authenticated sender `hello@second-scoop.com`) |
| Customers | **None as accounts.** Orders are rows in the Sheet keyed loosely by email/phone; no login, no passwords |
| Admin | A single client-side page gated by a passcode that ships in the public JS |

**Implication:** everything you've built so far fits a static site. A real customer-account system
does **not** — passwords, sessions, email verification, and "don't expose customer data in the
front-end" require a private server + database. That's why we're adding one purpose-built service
rather than faking auth in browser JavaScript.

---

## 2. Recommended architecture (decided: Supabase)

```
        ┌─────────────────────────────┐
        │  second-scoop.com (Netlify) │  static site — unchanged store
        │  + new Club pages           │
        └───────────┬─────────────────┘
                    │ supabase-js (anon key, RLS-protected)
                    ▼
        ┌─────────────────────────────┐        ┌──────────────────────────┐
        │  SUPABASE                   │        │  Netlify Functions        │
        │  • Auth (bcrypt, verify,    │◄───────│  award-scoops.js          │
        │    reset, JWT sessions)     │ service│  redeem-reward.js         │
        │  • Postgres DB + RLS        │  role  │  admin-api.js             │
        │  • row-level security       │  key   │  (hold the secret key)    │
        └───────────▲─────────────────┘        └──────────▲───────────────┘
                    │                                     │ shared secret
                    │                        ┌────────────┴───────────────┐
                    │                        │  Apps Script (existing)     │
                    └────────────────────────│  on order → Paid, POST to   │
                        (reads for UI)        │  award-scoops (idempotent)  │
                                              │  + Brevo emails as today    │
                                              └─────────────────────────────┘
```

**Why Supabase (over Firebase or DIY):** it's Postgres, so the Scoops **ledger** and its
integrity rules are first-class SQL; Auth is built in (bcrypt hashing, email verification,
password-reset tokens, rate-limited logins, JWT sessions); **Row-Level Security** means a logged-in
customer can only ever read their own data, enforced by the database, not by front-end code. Free
tier is comfortable for your scale. It layers onto the static site with a single CDN script — no
rebuild of the store.

**Roles of each piece**
- **Supabase Auth + DB** — accounts, sessions, and the source-of-truth loyalty ledger.
- **Front-end (new static pages)** — Club landing, register/login, dashboard, and checkout hooks.
  Reads via the public **anon key**, always filtered by RLS.
- **Netlify Functions** — the only place the **service-role key** lives. All *writes to the ledger*
  (award/reverse Scoops, redeem a reward, admin adjustments) go through here so balances can never
  be changed from the browser.
- **Apps Script (existing)** — already detects when you mark an order **Paid** (we built that for the
  confirmation email). It will also POST to `award-scoops` with the order number + amount, so Scoops
  are awarded exactly when payment is confirmed — no new payment integration needed.

**No existing feature is rebuilt.** Catalogue, cart, checkout, order records, reviews, Vault, and
Brevo all stay. The Club reads/writes alongside them.

---

## 3. How it integrates with what exists

- **Orders / payment status:** your manual "Paid" flip in the Sheet is the trigger. Apps Script →
  `award-scoops` (idempotent on order number). Marking an order **Refunded/Cancelled** reverses the
  Scoops the same way.
- **Connecting past orders:** on sign-up, a function matches existing Sheet orders by email/phone and
  links them + optionally back-credits Scoops (admin-configurable).
- **Cart/checkout:** logged-in customers see balance, Scoops-to-earn, and can apply one reward
  (a reward becomes a normal discount/line the checkout already understands). Guests see the
  "create an account and collect Scoops" prompt.
- **Reviews:** when a verified review is approved, award review Scoops (once per product).
- **Vault / early access:** the Vault product's visibility checks the logged-in member's tier;
  non-qualifying members see a branded locked state instead of the product vanishing.
- **Email:** Supabase sends verification/reset via SMTP configured to your Brevo account; loyalty
  emails (earned, redeemed, tier up, birthday) send through the same Brevo path you just set up.

---

## 4. Hide-until-launch (you asked for this)

A single flag controls the entire Club's visibility on the **public** site:

- `club.enabled` (default **false**) and `club.previewForAdmin` (default true).
- When **off**: every entry point is hidden — header "Join" button, nav link, checkout prompts,
  landing-page link — and the Club pages show a branded "Coming soon" state (or redirect home) for
  the public. You, while logged in as admin/preview, still see everything so you can test.
- Flip it **on** from the admin dashboard when you're ready to launch. No redeploy needed.

This means I can build the whole thing now and it stays invisible to customers until you say go.

---

## 5. Database schema (Supabase / Postgres)

Source of truth is the **ledger**; a stored balance is only a cache that's validated against it.
Every ledger row has a unique `idempotency_key`, so the same order can never award Scoops twice.

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | 1:1 with auth user | `id`(=auth uid), `full_name`, `phone`, `birthday`, `marketing_consent`, `created_at` |
| `loyalty_accounts` | member's cached state | `profile_id`, `tier_id`, `lifetime_scoops`, `balance_cache`, `updated_at` |
| `loyalty_transactions` | **the ledger** | `id`, `profile_id`, `delta`(+/‑), `reason_code`, `description`, `order_ref`, `source`, `admin_id`, `balance_after`, `idempotency_key`(unique), `created_at` |
| `tiers` | membership tiers | `id`, `name`, `threshold_type`(scoops/spend/orders), `threshold_value`, `benefits`(jsonb), `sort` |
| `earning_rules` | editable rates/bonuses | `key`, `value`, `enabled` (e.g. `earn_per_100=10`, `welcome=100`, `review=100`, `birthday=…`) |
| `rewards` | catalogue | `id`, `name`, `description`, `image`, `scoops_cost`, `active`, `expiry`, `rules`(jsonb), `per_customer_limit`, `total_qty` |
| `reward_redemptions` | issued rewards | `id`, `profile_id`, `reward_id`, `code`(unique), `status`, `order_ref`, `redeemed_at`, `used_at` |
| `order_links` | external order ↔ member | `order_ref`, `profile_id`, `amount`, `awarded`(bool), `created_at` |
| `admin_audit_logs` | every manual change | `id`, `admin_id`, `action`, `target_profile`, `before`, `after`, `reason`, `created_at` |
| `referrals` *(schema only in V1)* | forward-compat | `id`, `referrer_id`, `referred_id`, `code`, `status`, `reward_txn_id` |
| `streaks` *(schema only in V1)* | forward-compat | `id`, `profile_id`, `current`, `longest`, `last_month` |
| `milestones` / `milestone_awards` *(schema only)* | forward-compat | definitions + per-member completion |
| `campaigns` *(schema only)* | forward-compat | double-Scoop events etc. |

**Integrity rules baked in:** ledger `idempotency_key` unique constraint; `balance_after` written
per row; a nightly (or on-read) check that `balance_cache == sum(delta)`; RLS so customers read only
their own rows and **cannot** insert/adjust ledger rows (only the service-role functions can);
admin role required for cross-customer reads and manual adjustments (each logged).

Tables marked *schema only* are created now (empty, unused) so Phase 2+ features drop in without a
migration that touches live data.

---

## 6. Migrations & seed

- SQL migration files under `/supabase/migrations/` — `001_init.sql` (tables + RLS policies),
  `002_seed.sql` (3 tiers, starter rewards, default earning rules as **editable placeholders**).
- Run via the Supabase SQL editor (copy-paste) or the Supabase CLI. Reversible down-migrations included.
- Your existing Google Sheet is untouched and remains your order system — nothing to back up or risk there.

---

## 7. Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `SUPABASE_URL` | front-end + functions | project URL |
| `SUPABASE_ANON_KEY` | front-end (public, safe with RLS) | customer reads/auth |
| `SUPABASE_SERVICE_ROLE_KEY` | **Netlify env only** | privileged ledger writes |
| `AWARD_WEBHOOK_SECRET` | Netlify env + Apps Script | authenticates the Paid→award call |
| `BREVO_API_KEY` | already set (Apps Script) | loyalty emails |
| `SITE_URL` | functions | building verify/reset/redeem links |

No secret ever ships in the static front-end; only the anon key (which is meant to be public and is
useless without RLS-permitted access).

---

## 8. Security model

- **Passwords:** handled entirely by Supabase Auth (bcrypt/scrypt) — we never see or store them.
- **Email verification + password reset:** Supabase tokens with expiry; emails via your Brevo SMTP.
- **Sessions:** Supabase JWT + refresh tokens, stored/rotated by the SDK; auto-expire.
- **Brute force:** Supabase Auth rate-limits login attempts.
- **RLS:** database-enforced per-row access — the front-end literally cannot read another customer.
- **Ledger writes:** only through Netlify Functions with the service key; the browser can never
  change a balance. Awards are idempotent (unique key), so retries/double-clicks can't double-credit.
- **Admin:** role-based (an `is_admin` claim/table) checked server-side; every manual Scoop change
  writes an `admin_audit_logs` row (who, when, before, after, reason).
- **Privacy:** marketing consent stored separately and revocable without deleting the account;
  account-deletion flow supported; no PII or admin functions exposed in front-end code.

---

## 9. Phased roadmap

**Phase 1 — V1 MVP (this build).** Everything needed for a real, launchable Club:
- Accounts: register, email verify, login, logout, password reset, edit profile.
- Connect past orders by email/phone on signup.
- Scoops ledger; earn on **Paid** orders (idempotent) + reverse on refund.
- Welcome bonus, admin manual adjust (with reason + audit), verified-review reward, birthday reward — all values editable.
- 3 tiers (First Scoop / Second Scoop / Never Enough) with editable thresholds + progress UI.
- Rewards catalogue + redemption (unique single-use codes), admin-editable.
- Customer dashboard: balance, tier, progress, available + locked rewards, Scoop history, order history.
- Loyalty landing page (`/second-scoop-club`) with how-it-works, tiers, rewards preview, FAQ, join/login.
- Checkout hooks: balance + Scoops-to-earn + apply-a-reward (logged in); join prompt (guest).
- Vault/early-access tier gating with branded locked state.
- Admin loyalty area: search members, view/adjust balances, history, edit rates/rewards/tiers, redemptions, export CSV, audit log.
- Branded, mobile-first design using your kit (Barber Chop, cherry/vanilla/pink, Scoop/cookie motifs, progress circles, tier + treat cards, playful locked states).
- **Hide-until-launch flag.**
- Core emails: welcome, verify, reset, Scoops earned, reward redeemed, tier upgraded, birthday.

**Phase 2** — Referral system + monthly ordering streaks (tables already exist).
**Phase 3** — Milestones + collectible badges; double-Scoop promo events/campaigns.
**Phase 4** — Push notifications, VIP tasting-event invites, loyalty analytics (repeat-purchase rate,
redemption rate, loyalty-driven revenue), monthly Scoop-summary emails.

The V1 schema already contains the tables for all of the above, so none of this requires a rebuild.

---

## 10. Files created / changed (V1)

**New — customer pages:** `second-scoop-club.html`, `account.html`, `account-login.html`,
`account-register.html`, plus verify/reset landing handling.
**New — modular JS:** `assets/js/club/supabase-client.js`, `auth.js`, `dashboard.js`, `rewards.js`,
`tiers.js`, `checkout-club.js` (kept separate/modular per your requirement).
**New — server:** `netlify/functions/award-scoops.js`, `redeem-reward.js`, `admin-api.js`;
`/supabase/migrations/001_init.sql`, `002_seed.sql`.
**Edited (surgically):** header/nav (Join button + flag), `checkout.js` (balance/earn/apply + guest
prompt), product/Vault gating, `content.js`/`settings.js` (club flag + editable copy),
`backend.js` (admin loyalty tab), Apps Script `Code.gs` (Paid → award webhook).
**Guides:** `CLUB-SETUP.md`, `CLUB-ADMIN-GUIDE.md`.

---

## 11. Testing plan (maps your cases)

Automated where possible (function unit tests with a Supabase test project) + a manual checklist:
new signup → welcome Scoops; existing login; guest→account after order; Paid order earns; pending
earns nothing; cancelled earns nothing; refund deducts; **same order can't earn twice**; redeem a
reward; **reward can't be redeemed twice**; tier promotion at threshold; tier-locked Vault product
shows locked state; mobile dashboard; email verify + reset; account deletion + marketing
unsubscribe. Results reported at the end of the build.

---

## 12. Setup you'll do once (I'll guide each click)

1. Create a free **Supabase** project (I'll give exact steps + the SQL to paste).
2. Add **Brevo SMTP** creds to Supabase Auth (so verification emails come from your brand).
3. Put the env vars into **Netlify**.
4. Deploy the site + functions (your normal push).
5. Flip the Club **on** in admin when you're ready to launch.

---

## 13. Open placeholders (all editable in admin, nothing hard-coded)

Earning rate (10 Scoops / Rs.100), welcome bonus (100), review reward (100), birthday reward,
tier thresholds, and every reward's Scoops cost are shipped as **editable defaults** — change them
anytime without code.

---

## 14. What I need from you to start Phase 1

- A green light on this plan.
- A free Supabase project (5 min — I'll walk you through it), OR tell me to proceed and I'll build
  everything against placeholder config so it's ready the moment you create the project.

Once approved, I'll build Phase 1 behind the hidden flag, module by module, testing as I go, and
deliver the schema, migrations, env vars, changed-files list, test results, setup guide, and admin
guide as promised.
