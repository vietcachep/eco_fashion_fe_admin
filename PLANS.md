# PLANS.md — FITLY Admin Planning Rules

## Purpose

This file defines how implementation plans must be created and maintained for the FITLY admin frontend (fashion_frontend_admin).

Plans are required for large tasks, new feature modules, app shell changes, auth changes, and cross-feature changes.

FITLY Admin là web quản trị của MỘT cửa hàng thời trang (backend `eco_backend`, NestJS, 11 module).

The frontend uses Next.js App Router with a feature-first structure mirroring the backend modules
(identity · catalog · product · order · payment · promotion · review · system · reporting · ai).

---

## When to Create a Plan

Create a plan before coding when the task involves:

- Creating a new feature module under `src/features/`
- Adding or changing many screens/routes
- Changing the app shell (sidebar, header, layouts)
- Changing authentication/authorization or token handling
- Changing the shared API layer (`lib/api.ts`, `ApiResponse` types)
- Changing the shared DataTable or other widely-reused components
- Implementing dashboard/reporting screens
- Anything spanning multiple features

Small bug fixes do not require a plan unless they affect routing structure, auth, the API layer, or cross-feature contracts.

---

## Plan File Location

All task plans must be stored under:

```text
docs/plans/
```

## Plan File Naming

```text
PLAN-0001-admin-skeleton-and-screens.md
PLAN-0002-<viec-tiep-theo>.md
```

Numbering continues sequentially. If a related plan already exists, update that plan instead of creating a duplicate.

## Plan Template

Use `docs/plans/PLANS_TEMPLATE.md` as the starting point for every new plan.

## Workflow

1. Read `AGENTS.md`, `README.md`, and `docs/02_MODULE_MAP.md`.
2. Create or update the plan file under `docs/plans/`.
3. Write the implementation steps as a checklist.
4. Do not edit production code until the plan exists.
5. Tick checklist items and update the progress log as you work.
6. Update "Files Changed" and "Definition of Done" when finishing.
