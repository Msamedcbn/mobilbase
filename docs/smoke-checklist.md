# Staging / Production Smoke Checklist

## Preflight

1. `GET /api/health/liveness` -> `200`
2. `GET /api/health/readiness` -> `200`
3. `GET /api/admin/system/config` (admin) -> bootstrap `ok=true`

## Auth

1. Login with `admin@vibegsm.local`
2. `GET /api/auth/me` -> `200`
3. Logout -> protected page redirects to `/login`

## Core Flows

1. POS:
   - Product list loads
   - Checkout works
2. Buyback:
   - Wizard submit works
   - Deal list loads
   - Reconciliation create/decision works
3. ERP/CSV:
   - JSON sync returns success or row-level errors
   - CSV import returns inserted/updated/errors

## Degrade Test

1. Stop DB temporarily.
2. Critical APIs return controlled error (`503`), no process crash.
3. Restore DB and readiness returns to `200`.
