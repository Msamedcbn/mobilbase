# Studio Corporate Shell and Portfolio Design

## Goal
Improve `/studio` so it feels like a corporate SaaS control room for MobiBase platform administrators, with a stronger first impression and a clearer bayi portfolio workspace.

## Scope
- Improve `app/studio/layout.tsx` shell/sidebar branding, navigation, telemetry, and mobile drawer.
- Improve the first `/studio` portfolio workspace in `app/studio/page.tsx`.
- Clean visible Turkish copy in the shell, top KPI area, funnel, filters, and portfolio table headers.
- Preserve all existing API calls, data calculations, routes, filters, and tenant actions.

## Visual Thesis
A calm enterprise control room: light workspace, dark/navy sidebar, indigo accent, dense but readable operational data.

## Content Plan
- Shell: MobiBase Studio brand, operator identity, live infrastructure summary, clear module navigation.
- Header: SaaS operating center title, concise explanation, primary action for new firm/tenant.
- KPI Area: registered tenants, MRR, receivables, open tickets, API quota, lead conversion.
- Funnel: clean CRM pipeline labels.
- Portfolio: better filter labels, clear table title, view toggle, readable table headers.

## Interaction Thesis
- Keep interactions stable: no new data model or behavior.
- Use hover/active states for navigation and portfolio controls.
- Preserve responsive mobile navigation while making labels more professional.

## Architecture
This is a targeted UI pass. `app/studio/layout.tsx` owns the shell and is safe to reshape because it does not own tenant data. `app/studio/page.tsx` remains the main operational component; changes are limited to visible JSX, class names, and Turkish copy in the first workspace area.

## Validation
- Run `npm run lint`, `npm run build`, and `npm test`.
- Open `/studio` locally and verify the shell, header, KPI area, funnel, filters, and portfolio table render.
