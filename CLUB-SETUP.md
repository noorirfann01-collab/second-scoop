# The Second Scoop Club — Setup (Part 1: the backend)

This gets your secure customer-account database live. It's a one-time setup and
the Club stays **hidden from customers** (`enabled: false`) until you flip it on.
Nothing here touches your existing store, orders, or checkout.

## 1. Create a free Supabase project (~5 min)

1. Go to **supabase.com** → sign up (GitHub or email) → **New project**.
2. Name it `second-scoop-club`, choose a strong database password (save it), pick the region
   closest to you, and create. Wait ~2 minutes for it to provision.

## 2. Create the database

1. In your project, open **SQL Editor → New query**.
2. Open `supabase/migrations/001_init.sql` (in this project), copy **all** of it, paste, and **Run**.
   You should see "Success". This builds every table, the security rules, and the integrity triggers.
3. New query again → paste **all** of `supabase/migrations/002_seed.sql` → **Run**. This adds your 3
   tiers, the editable earning rules, and starter rewards.

## 3. Get your keys

1. Go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open `assets/js/config/club.js` in this project and paste them in:
   ```js
   supabaseUrl: "https://YOURPROJECT.supabase.co",
   supabaseAnonKey: "eyJ...the anon public key...",
   ```
   Leave `enabled: false` for now. (The anon key is safe in the site — Row-Level Security means it
   can only ever read a customer's own data. The **service_role** key is secret; it never goes in the
   website — it'll go into Netlify later in Part 4.)

## 4. Send Club emails from your brand (verification + reset)

So account emails come from `hello@second-scoop.com` instead of Supabase's default:

1. Supabase → **Project Settings → Authentication → SMTP Settings** → enable custom SMTP.
2. Enter your **Brevo SMTP** credentials (Brevo → SMTP & API → **SMTP** tab gives you host
   `smtp-relay.brevo.com`, port `587`, login, and an SMTP key). Sender = `hello@second-scoop.com`.
3. Under **Authentication → URL Configuration**, set the Site URL to `https://second-scoop.com`.

## 5. Make yourself an admin (after you first sign up in Part 2)

Once the customer pages exist (Part 2) and you've created your own account, run this once in the SQL
editor to give yourself admin access (replace the email):
```sql
insert into public.app_admins (profile_id)
select id from auth.users where email = 'you@example.com'
on conflict do nothing;
```

## 6. Deploy

Deploy the site as usual (the new `assets/js/config/club.js`, `assets/js/club/*`, and the updated
`_headers` for the security policy). Because `enabled: false`, customers see nothing yet.

---

### What Part 1 gives you
- A production-grade Postgres database with your tiers, rewards, and editable earning rules.
- Real auth (bcrypt passwords, email verification, reset, sessions) — via Supabase.
- Row-Level Security so a customer can only ever read **their own** balance, history, and profile.
- A tamper-proof **Scoops ledger**: every transaction has a unique key, so an order can never award
  Scoops twice, and balances are maintained by a database trigger — not by browser code.
- Auto-provisioning: signing up creates the profile + loyalty account + welcome bonus automatically.

### What's next
- **Part 2** — the customer pages (register, login, verify/reset, and the dashboard).
- **Part 3** — the loyalty landing page, header "Join" button, and checkout hooks.
- **Part 4** — the Netlify functions that award Scoops when you mark an order Paid, and redeem rewards.
- **Part 5** — the admin loyalty area, branded emails, and full testing.

All loyalty values (earning rate, bonuses, tier thresholds, reward costs) are **editable** — in the DB
now, and from the admin dashboard once Part 5 ships. Nothing is hard-coded.
