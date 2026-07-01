# OptiScript

E-prescription writing app for ophthalmologists, covering the full clinical encounter — from VA assessment to spectacle correction.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Mobile: Expo (React Native), AsyncStorage for local persistence

## Where things live

- `artifacts/mobile/` — Expo mobile app
  - `app/(tabs)/` — main tabs: Prescriptions, Patients, Profile
  - `app/new-rx.tsx` — full prescription form (modal)
  - `app/prescription/[id].tsx` — prescription detail view
  - `app/patient/[id].tsx` — patient detail view
  - `context/DataContext.tsx` — all local state (AsyncStorage)
  - `types/index.ts` — shared TypeScript types

## Architecture decisions

- All data stored locally via AsyncStorage — no server round-trips needed for writing prescriptions
- Prescription form mirrors the physical pad: VA → history → examination → GAT → spectacle Rx → lens options → advice
- Doctor profile (Bengali + English bilingual fields) stored separately; shown as header on each Rx
- EyeSpectacleRx has separate Distance (D) and Near (N) entries per eye to match the pad format

## Product

Full ophthalmology e-prescriber covering:
- Patient management (search/create)
- Visual Acuity (UA, WA, PH, BCVA per eye)
- Chief Complaints + Past History (DM, HTN, IHD, CKD, BA, Thyroid, Uromax)
- Examination (Adnexa, Anterior Segment, Posterior Segment)
- GAT/IOP (RE + LE)
- Spectacle Correction: Distance & Near Rx (SPH, CYL, AXIS, VA) + IPD
- Lens Options: usage, type (mono/bifocal/progressive), coating (blue-cut/photosun/AR), material
- Advice (উপদেশ) + Follow-up
- Doctor profile: bilingual (Bengali/English) name, qualifications, designation, institution, BMDC reg, chamber details

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `EyeInputGroup.tsx` is an old component no longer used in the main form; can be removed
- The `surface` color key must exist in colors.ts or components referencing it will fail

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
