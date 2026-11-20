# Driver Earnings 🛵💷

A mobile-first earnings tracker for multi-app delivery drivers
(Uber Eats, Deliveroo, Just Eat, Stuart, Amazon Flex, plus any others you add yourself).

- **Working day prompt**: the first time you open the app each calendar day, it asks
  *"Start a new day"* or *"🌙 Still working yesterday"*, so night shifts stay on the right day.
- **Running totals**: tap an app and type the figure the app is showing right now. Each
  update **replaces** the last one. It never adds up the updates.
- **Finish day**: closes the day and keeps it in the database forever.
- **Week view** (Mon–Sun): week total, split by app, every day, and a comparison with last week.
- **Your own apps**: ⚙ Apps → *Add your own app*. Give it a name and a colour, and pick **Priority**
  (always on screen) or **As needed** (a "+" button). You can rename, recolour, or delete it if it has no earnings yet.
- **Weekly target**: each new week asks how much you want to earn, then shows how much is still to make
  (and roughly how much a day over the days left). Change it any time.
- **History**: every month with totals. Tap a month to see its days, then tap a day to edit it.
  You get a warning before you change a past day.
- PIN login. Data is stored in **Cloudflare D1** (free tier).

Tech: Next.js 16 (App Router) · OpenNext Cloudflare adapter · Cloudflare Workers + D1.

---

## 1. Put the code on GitHub

```bash
git remote add origin https://github.com/<you>/driver-earnings.git
git push -u origin main
```

## 2. Create the database (one time)

```bash
npm install
npx wrangler login
npx wrangler d1 create driver-earnings
```

Copy the `database_id` that it prints into `wrangler.jsonc`, then create the tables:

```bash
npm run db:migrate:remote
```

Commit and push the updated `wrangler.jsonc`.

## 3. Deploy on Cloudflare (free)

**Option A: auto-deploy from GitHub (recommended)**

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Import a repository** and pick the repo.
2. Build command: `npx opennextjs-cloudflare build`
3. Deploy command: `npx opennextjs-cloudflare deploy`
4. After the first deploy, open **Settings → Variables and Secrets** and add these two **Secrets**:
   - `APP_PIN`: the PIN you will log in with
   - `AUTH_SECRET`: any long random string (e.g. 40+ random characters)
5. Redeploy. From then on, every push to `main` deploys automatically.

**Option B: deploy from your PC**

```bash
npx wrangler secret put APP_PIN
npx wrangler secret put AUTH_SECRET
npm run deploy
```

## 4. Put it on your phone's home screen

Open the site on your phone and log in.
- **iPhone (Safari)**: Share → *Add to Home Screen*
- **Android (Chrome)**: ⋮ → *Add to Home screen / Install app*

It then opens full-screen like an app.

---

## Local development

```bash
cp .dev.vars.example .dev.vars   # PIN 1234 locally
npm run db:migrate:local
npm run dev
```

> If `wrangler` crashes on Windows with *"access violation"* or *"overflowed its stack"*,
> install the latest **Microsoft Visual C++ Redistributable (x64)**:
> https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist

## Data model

| table      | columns                                                    |
|------------|------------------------------------------------------------|
| `days`     | `date` (PK, YYYY-MM-DD), `status` open/closed, `started_at`, `closed_at` |
| `earnings` | `date`, `platform`, `amount_pence`, `updated_at` (PK date+platform) |
| `platforms` | `id` (PK, `c_…`), `name`, `color`, `created_at`: apps added by the driver |
| `week_targets` | `monday` (PK, YYYY-MM-DD), `target_pence`, `updated_at` |

Money is stored as whole pence, so there are no rounding errors.

## Updating

The app creates any database tables it needs by itself (see `src/lib/schema.ts`), so updates
work as soon as they deploy, with nothing to run by hand. `npm run db:migrate:remote` still works
if you want to apply `migrations/` yourself.

## Backup

```bash
npx wrangler d1 export driver-earnings --remote --output backup.sql
```
