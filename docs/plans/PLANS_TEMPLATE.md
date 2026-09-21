# PLAN-XXXX — Task Name

> Status: Draft / In Progress / Blocked / Done
> Owner: Developer / Agent
> Related Phase: GĐX — Name
> Related Docs: `docs/02_MODULE_MAP.md`, `docs/04_ROADMAP_REF.md`

---

## 1. Goal

Describe the goal of this task.

This task should achieve:

* ...
* ...

---

## 2. Context

FITLY Admin frontend is:

* Web quản trị MỘT cửa hàng thời trang, nhiều vai nhân viên, chỉ tiếng Việt / VND
* Feature-first Next.js App Router, mirroring 11 backend modules (eco_backend, NestJS)
* TanStack Query + Axios + Orval, Zustand, RHF + Zod, TanStack Table

Reference documents:

* `AGENTS.md`
* `README.md`
* `docs/01_ARCHITECTURE.md`
* `docs/03_API_STATE_RULES.md`
* Backend API: Swagger at `http://localhost:4000/docs` (JSON `/docs/openapi.json`)

---

## 3. Scope

### In Scope

* ...

### Out of Scope

* ...

---

## 4. Affected Features / Areas

* features/...
* components/...
* lib/ stores/ types/ ...

---

## 5. Routes & Screens

List routes to add or modify.

```text
(dashboard)/module/resource          # list screen
(dashboard)/module/resource/[id]     # detail screen
```

Notes:

* Routes declared in `src/lib/constants.ts`.
* Pages only render feature components.

---

## 6. API Integration

List backend endpoints consumed.

```text
GET    /api/v1/...
POST   /api/v1/...
```

Notes:

* All calls through `src/lib/api.ts` + TanStack Query hooks.
* Query keys: `[module, resource, params]`.
* DTO types in `features/<module>/types/` matching backend DTOs.

---

## 7. State & Forms

* Query hooks: ...
* Zustand stores (if any): ...
* Zod schemas: ...

---

## 8. Implementation Steps

* [ ] Step 1: ...
* [ ] Step 2: ...
* [ ] Step 3: ...

---

## 9. Validation / Test Plan

* [ ] `npm run lint` passes.
* [ ] `npm run build` passes.
* [ ] Screens render with backend running.
* [ ] Screens degrade gracefully with backend offline.
* [ ] Mobile width (390px) usable.
* [ ] No cross-feature imports introduced.
* [ ] No hardcoded URL/route/Business Unit.

---

## 10. Risks / Notes

* Risk:
* Assumption:
* Open question:
* Blocker:

---

## 11. Progress Log

| Date       | Progress     | Notes         |
| ---------- | ------------ | ------------- |
| YYYY-MM-DD | Created plan | Initial draft |

---

## 12. Files Changed

Update after coding.

```text
src/...
docs/...
```

---

## 13. Follow-up Tasks

* [ ] ...

---

## 14. Definition of Done

* [ ] Build + lint pass.
* [ ] Feature-first structure respected.
* [ ] API via shared Axios + TanStack Query.
* [ ] Plan checklist updated.
* [ ] Progress log updated.
* [ ] Follow-up tasks documented.
