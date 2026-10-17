# Provider integrations

## MUST / ShineMonitor

Official API documentation: [ShineMonitor Open Platform](https://api.shinemonitor.com/en/chapter1/quickstart.html)

### Server configuration

For **MUST / SolarMust** (`solarmust.shinemonitor.com`), the server uses built-in API defaults (manufacturer key from the portal). In **Settings**, sign in with the same **username and password** as the ShineMonitor web app.

Optional overrides in `.env` / Vercel:

| Variable | Purpose |
| --- | --- |
| `SHINEMONITOR_COMPANY_KEY` | Override manufacturer key (rare) |
| `SHINEMONITOR_APP_ID` | Override web client id (default: `solarmust.shinemonitor.com`) |
| `SHINEMONITOR_SOURCE` | `1` energy storage, `0` PV (default `1`) |
| `SHINEMONITOR_I18N` / `SHINEMONITOR_LANG` | e.g. `en_US` for English field titles |
| `SHINEMONITOR_BASE_URL` | Default `https://web.shinemonitor.com/public/` (SolarMust web portal) |

### Authentication flow (server-side)

1. `action=auth` with signed request (`SHA-1` per [API help](https://api.shinemonitor.com/en/chapter1/apiHelp.html)).
2. Discover the user’s inverter via `queryDevices`, or `queryPlants` → `queryCollectors` → `queryCollectorDevices` (per [quick start](https://api.shinemonitor.com/chapter1/quickstart.html)).
3. Store `secret`, `token`, and the chosen device (`pn`, `devcode`, `devaddr`, `sn`) in encrypted `provider_connections` credentials. Disconnect clears them; signing in again re-runs discovery.
4. Renew by re-authenticating with the user password (encrypted at rest) before expiry; device ids are refreshed when the token is renewed if discovery still succeeds.
5. Latest and historical readings use `queryDeviceDataOneDayPaging` (same action as the web portal) for the stored device.

### Field mapping (provisional)

| ShineMonitor field | Dashboard metric |
| --- | --- |
| Charger Power | Solar generation (W) |
| PLoad | Home consumption (W) |
| PGrid | Grid power (W) — import/export sign not verified |
| work state | Battery charge direction hint only (not from batt current sign) |

Battery **percentage** is not shown until a verified SoC source exists.

## Batali battery

Batali documents consumer onboarding via [LOGON / dgrid.top](https://www.abatterys.com/LOGON.html). A documented third-party REST API for this dashboard has **not** been verified.

The Settings UI shows the integration boundary. `POST /api/providers/batali/connect` returns `501` until a verified API is implemented.
