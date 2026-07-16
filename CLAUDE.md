# Kolekto Admin (`kolekto-admin-control-panel-1`) — Engineering Rules

Vite + React admin console. Full reference: `../kolekto-fe-old/KOLEKTO_ENGINEERING_STANDARDS.md`.

## Data-access rule (enforced)

- **The admin client is read-only for financial/privileged data.** Do **not** call `supabase.from(...).insert/update/delete/upsert` on `kyc_*`, `collections`, `campaigns`, `profiles`, or any financial table directly from the browser.
- **Admin mutations go through the Express admin API** (`/api/adminurlabdkole/*`) → a backend service. Examples being introduced in Phase 1:
  - KYC decision → `POST /adminurlabdkole/kyc/:id/decision` → `KycService.decide`
  - Collection status → `PATCH /adminurlabdkole/collections/:id/status` → `CollectionService.setStatus`
- Reads may use RLS-guarded `supabase.from().select()`; admin identity is the `admin_users` table + `current_admin_user` RPC (the obscured URL prefix is **not** authorization).

## Phase 1 constraints

- No behavior changes; no Workspace concepts. Backwards compatible.
- Today `stores/kycStore.ts` and `stores/fundraisingStore.ts` write these tables directly — this is the exact anti-pattern Phase 1 (Wave 5) removes. Do not add new direct financial writes.
