# Task Plan: Landing Page UI Refresh

## Goal
Improve the SaaS homepage so it represents VibeGSM clearly, feels premium, and explains the product value for phone retail/service operations.

## Phases
- [x] Explore project context
- [ ] Clarify visual direction
- [ ] Propose design approaches
- [ ] Approve homepage design
- [x] Write implementation plan
- [x] Implement approved UI
- [x] Validate build and UI

## Decisions
- Work starts with the public landing page at `app/page.tsx`.
- Current stack is Next.js 14, React 18, Tailwind CSS, and global CSS.
- No implementation until the homepage design direction is approved.

## Errors Encountered
None.

| bash unavailable | Tried visual companion start script | Use Node server directly instead |

## New Phase: Studio Route-Based Sections

## Goal
Convert Studio from a single query-tab workspace into route-level sections so sidebar navigation opens professional, focused pages instead of stacking every selected module under the same global dashboard.

## Phases
- [x] Capture user feedback
- [x] Identify current UX issue
- [x] Approve route-based design
- [x] Write implementation spec
- [x] Create implementation plan
- [x] Refactor Studio routes
- [x] Validate navigation and build

## Proposed Route Map
- `/studio` -> redirect or default to `/studio/portfolio`
- `/studio/portfolio` -> bayi portfolio, KPI and CRM funnel
- `/studio/helpdesk` -> destek masası
- `/studio/infrastructure` -> altyapı and şube analitiği
- `/studio/billing` -> finans and tahsilat
- `/studio/pricing` -> paket and fiyat yönetimi
- `/studio/logs` -> sistem sağlığı and loglar

## Design Decisions To Confirm
- Remove the horizontal tab switcher after sidebar routing exists.
- Move global KPI/funnel blocks only to portfolio or a dedicated dashboard, not every section.
- Keep `app/studio/layout.tsx` as shared shell.
- Split the current large `app/studio/page.tsx` gradually to reduce risk.






