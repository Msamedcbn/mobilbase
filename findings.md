# Findings: Landing Page UI Refresh

## Project Context
- Repository is a Next.js 14 app named `telefoncupro`.
- Public homepage lives in `app/page.tsx`.
- Global styling lives in `app/globals.css`; Tailwind scans `app/**/*` and `components/**/*`.
- Root layout metadata currently says `MobiBase | Telefon Bayi Otomasyonu`.
- Recent work is focused on Turkish text, tenant isolation, and buyback/second-hand flows.

## Current Homepage Observations
- Existing homepage already has a dark premium theme, sticky header, hero, module section, package pricing, and contact CTA.
- Page copy positions MobiBase as a cloud platform for phone retail, service, stock, finance, POS, and buyback operations.
- Hero relies on gradients and synthetic dashboard cards rather than a strong narrative visual anchor.
- Some Turkish copy has encoding/diacritic issues such as `Canliya`, `Tasima`, `Ihtiyaciniza`.
- Pricing is dynamic from `readLocalStore`, so redesign must preserve pricing data flow.

## Constraints
- Keep changes focused on the public landing page unless approved otherwise.
- Preserve existing package/pricing data behavior.
- Prefer a strong first viewport, sparse copy, clear product positioning, and limited accent colors.

## Clarification
- Primary homepage goal: introduce MobiBase and convince phone bayis that this is the system they need.
- Primary audience: phone bayi owners/managers evaluating operational software.

## Visual Direction Decision
- User selected the middle concept: Problem-Çözüm Hikayesi.
- Homepage should name current bayi pain directly: Excel, WhatsApp, defter, daðýnýk servis/stok/tahsilat süreçleri.
- Design must stay premium and not become a generic complaint page.

## Design Approval
- Approved direction: Problem-Çözüm Hikayesi.
- Proceed to write a focused design spec, then implement the homepage refresh.

## Studio Context
- /studio uses pp/studio/layout.tsx for the reseller studio shell/sidebar and pp/studio/page.tsx for the main operational workspace.
- Current studio page is a large client component with portfolio, helpdesk, infrastructure, billing, pricing, logs, CRM tasks, reports, expenses, tenant detail modal, role permissions, and tenant admin actions.
- Studio has several Turkish encoding/copy issues in existing canned messages and city/category strings.
- The work is broad enough to require choosing a focused first area before implementation.

## Studio Direction Approval
- User approved the recommended first phase: Studio shell + bayi portfolio improvements.
- Browser/local validation is allowed.
- Scope: improve corporate look, visible Turkish copy, first portfolio workspace, without changing APIs or data model.

## Failed Fetch Investigation
- /studio/login and /login call /api/auth/me before the user is authenticated.
- Middleware did not include /api/auth/me in PUBLIC_PATHS, so unauthenticated calls redirected to login HTML instead of returning API JSON.
- Fix: add /api/auth/me to public middleware paths so auth-check fetches receive the route's intended JSON response.

## Studio Navigation Feedback
- User observed that selecting a left sidebar item still renders content below the same top KPI/funnel/tab stack.
- User suggested separate pages for each Studio section may feel more professional.
- Screenshot shows duplicate navigation: left sidebar selection plus horizontal tab switcher, with global summary blocks staying above all sections.
- Likely root design issue: /studio?tab=... is still a single-page tab workspace, not route-level section pages.
