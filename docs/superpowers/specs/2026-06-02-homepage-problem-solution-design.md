# Homepage Problem-Solution Design

## Goal
Refresh the public VibeGSM homepage so phone bayi owners quickly understand the product, recognize their operational pain, and feel that VibeGSM is the system they need.

## Audience
The primary audience is phone bayi owners and managers. They are likely dealing with mixed workflows across Excel, WhatsApp, notebooks, POS records, service forms, stock tracking, and delayed collections.

## Visual Thesis
A premium dark SaaS landing page that starts with messy real-world bayi operations and turns them into one calm command system.

## Content Plan
- Hero: Name the pain directly: Excel, WhatsApp, notebook, service, stock, and collection chaos.
- Proof Strip: Show concrete pain points that VibeGSM centralizes.
- Solution: Present VibeGSM as one operating system for sales, service, stock, finance, buyback, and branches.
- Workflow: Show the before-to-after transformation from scattered records to controlled operations.
- Packages: Preserve the current dynamic package/pricing data.
- Final CTA: Ask users to request a demo and transition plan.

## Interaction Thesis
- Hero content enters with a restrained staggered animation.
- The messy-to-controlled visual uses soft movement and hover states to make the transformation feel tangible.
- Feature rows and pricing cards have subtle elevation and border transitions, with reduced-motion support.

## Architecture
The implementation stays focused on `app/page.tsx`. It preserves the existing async `readLocalStore()` pricing flow and replaces the visual/content structure with a stronger problem-solution landing page. Global CSS remains untouched unless a build or layout issue requires it.

## Components and Data Flow
- `LandingPage` continues to read reseller pricing from `readLocalStore()`.
- Static arrays define pain points, platform modules, workflow steps, and plan metadata.
- Pricing cards continue to use `pricing.features`, plan prices, add-ons, branch surcharge, and annual discount.
- Existing `/login`, `mailto:`, and `tel:` links remain available.

## Copy Requirements
- Use correct Turkish characters.
- Avoid generic startup copy.
- Use direct buyer language: bayi kontrolü, servis takibi, stok, tahsilat, kâr, şube.
- Keep the first viewport short and decisive.

## Validation
- Run lint/build checks after implementation.
- Open the local homepage in a browser and check the first viewport, responsive layout, Turkish copy, and pricing rendering.
