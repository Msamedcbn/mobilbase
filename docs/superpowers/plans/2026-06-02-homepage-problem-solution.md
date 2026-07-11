# Homepage Problem-Solution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current homepage with a premium problem-solution landing page that convinces phone bayis MobiBase solves their daily operational chaos.

**Architecture:** Keep the implementation in `app/page.tsx` and preserve the existing dynamic pricing flow from `readLocalStore()`. Use typed local arrays for pain points, modules, workflow steps, and plan metadata. Keep CSS scoped through JSX style tags to avoid disturbing app screens.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, TypeScript.

---

## File Structure
- Modify: `app/page.tsx` — Replace homepage content, preserve pricing data loading, add typed content arrays and scoped landing CSS.
- Reference: `docs/superpowers/specs/2026-06-02-homepage-problem-solution-design.md` — Approved design spec.

### Task 1: Preserve Pricing Data Contract

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Keep the existing async page and fallback pricing**

Retain `export const dynamic = "force-dynamic";`, `readLocalStore()`, `PlanKey`, `pricing`, `addons`, plan price reads, `pricing.features`, and `featureNames`.

- [ ] **Step 2: Add typed content arrays**

Add arrays for pain points, platform modules, workflow steps, and trust statements above the return block so JSX stays readable.

- [ ] **Step 3: Verify TypeScript names**

Ensure `PlanKey`, plan metadata, and feature keys match the existing pricing object keys exactly.

### Task 2: Replace Landing Structure

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Build a problem-first hero**

Hero headline: `Excel, WhatsApp ve defter karmaşasını tek bayi sisteminde bitirin.`

Hero body: `MobiBase; satış, teknik servis, stok, ikinci el ve tahsilatı aynı akışta toplayan telefon bayi otomasyonudur.`

- [ ] **Step 2: Add a before-after hero visual**

Create a visual showing scattered channels on the left and MobiBase control flow on the right without using external images.

- [ ] **Step 3: Add proof strip**

Include short proof statements for service tracking, stock visibility, collection risk, and branch control.

- [ ] **Step 4: Add solution sections**

Add sections for the unified platform, messy-to-controlled workflow, dynamic packages, and final CTA.

### Task 3: Add Scoped Visual Polish

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add scoped landing CSS**

Use `.landing-root`, `.landing-hero`, `.noise-layer`, `.signal-card`, `.module-row`, `.workflow-line`, and pricing hover classes inside the existing JSX `<style>` tag.

- [ ] **Step 2: Add motion with reduced-motion support**

Add subtle `@keyframes` for hero entrance and signal drift, then disable animation under `prefers-reduced-motion: reduce`.

- [ ] **Step 3: Keep mobile layout readable**

Use Tailwind responsive classes so hero, proof strip, modules, workflow, and pricing cards stack cleanly under tablet widths.

### Task 4: Validate

**Files:**
- Test: `app/page.tsx`

- [ ] **Step 1: Run lint**

Run: `npm run lint`

Expected: no homepage-related lint errors.

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: Next.js build completes or only reports unrelated pre-existing issues.

- [ ] **Step 3: Open local homepage**

Run: `npm run dev`, open `http://localhost:3000`, and check the homepage visually.

- [ ] **Step 4: Browser checklist**

Confirm first viewport message, CTA visibility, mobile stacking, Turkish text, package pricing, and reduced-motion behavior are acceptable.
