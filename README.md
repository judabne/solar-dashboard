# solar-dashboard

Mobile-first PWA for monitoring a home solar system (MUST PV18-5248 PRO via ShineMonitor; Batali battery integration pending verified API).

## Stack

- Nuxt 4 + TypeScript + Nuxt UI + Tailwind CSS
- Server API routes (Vercel)
- Neon PostgreSQL
- Chart.js + vue-chartjs + zoom plugin
- Installable PWA (app shell offline; live readings require network)

## Local development

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Fill in `DATABASE_URL`, `CREDENTIAL_ENCRYPTION_KEY`, and ShineMonitor server keys (see [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md)).

3. Apply the database schema:

   ```bash
   npm run db:migrate
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Open the app, complete device pairing (automatic on first load), then connect ShineMonitor under **Settings**.

## Device pairing

The browser generates a device ID and secret, stores the secret locally, and registers a hash on the server. Protected API routes require both values. Clearing site data requires pairing again. This is lightweight device pairing, not a full user account system.

## Deploy (Vercel + Neon)

1. Create a Neon project and set `DATABASE_URL` in Vercel.
2. Set `CREDENTIAL_ENCRYPTION_KEY` (32 random bytes, base64-encoded).
3. Set ShineMonitor variables from `.env.example`.
4. Run `npm run db:migrate` against the production database (locally with production `DATABASE_URL`, or via CI).
5. Deploy the repository to Vercel (Nuxt preset is auto-detected).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | Vue/TS type check |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply `db/schema.sql` to Neon |

## Limitations

- Batali: no verified API; UI and server boundary only.
- Battery %: “Coming soon” until SoC is available.
- Grid import/export labels depend on confirming `PGrid` sign convention.
- History is loaded from ShineMonitor per-day APIs (no local readings warehouse unless added later).
