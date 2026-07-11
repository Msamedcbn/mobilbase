# Studio Corporate Shell and Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `/studio` with a more corporate shell and clearer bayi portfolio first screen while preserving existing behavior.

**Architecture:** Replace the Studio layout shell markup in `app/studio/layout.tsx` with a polished MobiBase Studio sidebar and mobile drawer. Patch the visible first workspace sections in `app/studio/page.tsx`: header, KPI cards, funnel, tab labels, portfolio filters, portfolio table wrapper, and table headers. Do not change APIs, state shape, or tenant mutation logic.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, TypeScript.

---

## File Structure
- Modify: `app/studio/layout.tsx` — Studio shell, navigation, telemetry, mobile drawer.
- Modify: `app/studio/page.tsx` — First portfolio workspace UI and copy.
- Reference: `docs/superpowers/specs/2026-06-02-studio-corporate-shell-portfolio-design.md`.

### Task 1: Upgrade Studio Shell

**Files:**
- Modify: `app/studio/layout.tsx`

- [ ] **Step 1: Preserve routing behavior**

Keep `pathname === "/studio/login"` returning children, `currentTab` from search params, and the same tab hrefs.

- [ ] **Step 2: Update branding and nav labels**

Use `MobiBase Studio`, `Platform Yönetimi`, and professional Turkish labels.

- [ ] **Step 3: Improve telemetry card**

Keep telemetry state and displayed values, but make the copy clearer and remove broken class names.

- [ ] **Step 4: Keep mobile drawer functional**

Preserve `mobileOpen` state, click handlers, and all navigation links.

### Task 2: Upgrade Portfolio First Screen

**Files:**
- Modify: `app/studio/page.tsx`

- [ ] **Step 1: Improve page header**

Replace the top title/subtitle/action copy with a corporate SaaS operations header.

- [ ] **Step 2: Improve KPI cards**

Keep KPI calculations but clean visible labels and helper copy.

- [ ] **Step 3: Improve funnel and tab labels**

Clean Turkish labels and remove corrupted placeholder characters.

- [ ] **Step 4: Improve filter and table shell**

Clean filter labels, placeholder copy, view toggle labels, loading/empty states, and table headers.

### Task 3: Validate

**Files:**
- Test: `app/studio/layout.tsx`
- Test: `app/studio/page.tsx`

- [ ] **Step 1: Run lint**

Run: `npm run lint`

Expected: no new lint errors. Existing unrelated hook warnings may remain.

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: build exits 0.

- [ ] **Step 3: Run tests**

Run: `npm test`

Expected: all existing tests pass.

- [ ] **Step 4: Browser check**

Run local dev server, open `/studio`, and verify the page renders or redirects according to auth state without layout/runtime crashes.
