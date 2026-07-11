# Studio Route Sections Design

## Goal
Make `/studio` feel like a professional multi-page admin application by replacing query-tab navigation with route-level sections.

## Problem
The Studio sidebar visually suggests separate sections, but each sidebar item currently drives the same page with `?tab=...`. Global header, KPI cards, sales funnel, and a horizontal tab bar remain above every selected module. This makes sections feel stacked instead of independent.

## Design
- Use sidebar as the only primary navigation.
- Route each Studio section to its own URL:
  - `/studio/portfolio`
  - `/studio/helpdesk`
  - `/studio/infrastructure`
  - `/studio/billing`
  - `/studio/pricing`
  - `/studio/logs`
- Keep `/studio` as a compatibility entry that renders portfolio or navigates to portfolio.
- Remove the horizontal tab switcher.
- Show global portfolio summary blocks only on portfolio.
- On non-portfolio sections, show a compact section header and only the selected section content.

## Implementation Strategy
Avoid a risky full extraction of the 5,000+ line Studio page in the first pass. Keep the existing `StudioPageContent` component, but make it route-aware:
- Read `usePathname()`.
- Map `/studio/<section>` to `mainTab`.
- Create small route files that reuse the existing Studio page component.
- Update layout sidebar hrefs from `?tab=` URLs to real routes.
- Hide portfolio-only summary content when route is not `portfolio`.

## Scope
In scope:
- Route files.
- Sidebar href/active state.
- Route-aware tab selection.
- Remove duplicate horizontal tab bar.
- Hide global KPI/funnel blocks outside portfolio.

Out of scope:
- Full component extraction per section.
- API changes.
- Data model changes.
- Rewriting finance/helpdesk/pricing internals.

## Validation
- `npm run lint`
- `npm run build`
- `npm test`
- Browser check `/studio/portfolio`, `/studio/pricing`, and `/studio/helpdesk`.
