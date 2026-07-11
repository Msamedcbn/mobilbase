# Studio Route Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Studio sidebar navigation from query-tab behavior into route-level sections so each module feels like a separate professional page.

**Architecture:** Keep `app/studio/page.tsx` as the shared route-aware Studio workspace for this phase. Add thin route pages under `app/studio/<section>/page.tsx` that reuse the existing component. Update `app/studio/layout.tsx` to link to real routes and compute active state from `usePathname()`.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS.

---

## File Structure
- Modify: `app/studio/layout.tsx` — sidebar hrefs and active route detection.
- Modify: `app/studio/page.tsx` — route-aware tab selection, portfolio-only summary, no horizontal tab bar.
- Create: `app/studio/portfolio/page.tsx`
- Create: `app/studio/helpdesk/page.tsx`
- Create: `app/studio/infrastructure/page.tsx`
- Create: `app/studio/billing/page.tsx`
- Create: `app/studio/pricing/page.tsx`
- Create: `app/studio/logs/page.tsx`

### Task 1: Route-Aware Sidebar

**Files:**
- Modify: `app/studio/layout.tsx`

- [ ] **Step 1: Change nav hrefs**

Change sidebar hrefs from `/studio?tab=<section>` to `/studio/<section>`.

- [ ] **Step 2: Compute active tab from pathname**

Use `pathname.split("/")[2] || "portfolio"` instead of `searchParams.get("tab")`.

### Task 2: Route-Aware Studio Workspace

**Files:**
- Modify: `app/studio/page.tsx`

- [ ] **Step 1: Import pathname hook**

Add `usePathname` to the `next/navigation` import.

- [ ] **Step 2: Map route to `mainTab`**

Create a `getStudioSectionFromPath(pathname)` helper that returns `portfolio`, `helpdesk`, `infrastructure`, `billing`, `pricing`, or `logs`.

- [ ] **Step 3: Sync state from route**

Use pathname first, then fallback to `?tab=` for compatibility.

- [ ] **Step 4: Remove horizontal tab bar**

Delete the tab switcher block so the sidebar becomes the only primary navigation.

- [ ] **Step 5: Make summary portfolio-only**

Wrap page header, KPI grid, and sales funnel with `mainTab === "portfolio"`.

### Task 3: Add Thin Route Pages

**Files:**
- Create: `app/studio/portfolio/page.tsx`
- Create: `app/studio/helpdesk/page.tsx`
- Create: `app/studio/infrastructure/page.tsx`
- Create: `app/studio/billing/page.tsx`
- Create: `app/studio/pricing/page.tsx`
- Create: `app/studio/logs/page.tsx`

- [ ] **Step 1: Reuse Studio page component**

Each route page imports and exports the default component from `../page`.

### Task 4: Validate

**Files:**
- Test: Studio route files and workspace.

- [ ] **Step 1: Run lint**

Run `npm run lint`.

- [ ] **Step 2: Run build**

Run `npm run build`.

- [ ] **Step 3: Run tests**

Run `npm test`.

- [ ] **Step 4: Browser smoke**

Open `/studio/portfolio`, `/studio/pricing`, and `/studio/helpdesk`. Auth redirect is acceptable when unauthenticated, but there must be no route or runtime crash.
