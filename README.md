# Precious Petals CRM

Bespoke CRM monorepo built around PocketBase with a Vite/React frontend. Each app (`frontend`, `pb`) owns its own `package.json` and can be run independently, while the root workspace drives shared scripts via pnpm.

## Repo layout

- `apps/frontend`: React + Vite client, talks to PocketBase.
- `apps/pb`: PocketBase backend (Go app) with hooks/views.
- `pnpm-workspace.yaml`: pnpm workspace definition.

## Requirements

- Node.js + pnpm (see `packageManager` in `package.json`).
- Go (for building the PocketBase binary in `apps/pb`).

## Getting started

Install workspace deps:

```bash
pnpm install
```

Run everything in dev mode (parallel):

```bash
pnpm dev
```

Run apps individually:

```bash
pnpm --filter frontend dev
pnpm --filter pb-crm dev
```

Build all apps:

```bash
pnpm build
```

## PocketBase app

The PocketBase server is in `apps/pb` and is built as a Go binary:

```bash
pnpm --filter pb-crm build
```

## Collections and relationships

System auth collections:

- `_superusers`: PocketBase superuser auth collection.
- `users`: app user auth collection (email/password, optional name/avatar).
- `_authOrigins`, `_externalAuths`, `_mfas`, `_otps`: standard PocketBase auth support tables.

Domain collections:

- `customers`: customer details (name, email, phone, recommendation source). Each customer optionally links to an order.
- `orders`: order header (orderNo, occasion date, billing/delivery fields, status, payment status, pricing options, notes).
- `order_frame_items`: line items for framed preservation (frame type, layout, sizes, extras, etc.).
- `order_paperweight_items`: line items for paperweights (quantity, price, received flag).

Relationships (PocketBase relations):

- `customers.orderId -> orders` (0..1). Each customer can be linked to a single order.
- `orders.frameOrderId -> order_frame_items` (0..many). An order can have multiple frame items.
- `orders.paperweightOrderId -> order_paperweight_items` (0..1). An order can include a single paperweight item.

## Scripts

Root scripts:

- `pnpm dev`: runs all apps in parallel.
- `pnpm build`: builds all apps.

Frontend scripts are in `apps/frontend/package.json` (`dev`, `build`, `lint`, `test`, `preview`).

PocketBase scripts are in `apps/pb/package.json` (`dev`, `build`).
