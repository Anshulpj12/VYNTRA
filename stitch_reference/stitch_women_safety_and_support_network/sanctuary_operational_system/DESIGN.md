---
name: Sanctuary Operational System
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#584142'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#8b7072'
  outline-variant: '#dfbfc0'
  surface-tint: '#ae2d45'
  primary: '#aa2a43'
  on-primary: '#ffffff'
  primary-container: '#cc4459'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb2b8'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#006947'
  on-tertiary: '#ffffff'
  tertiary-container: '#00855b'
  on-tertiary-container: '#f5fff6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdadb'
  primary-fixed-dim: '#ffb2b8'
  on-primary-fixed: '#40000f'
  on-primary-fixed-variant: '#8d112f'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  counter-number:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 40px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system is engineered for crisis intervention shelter staff, intake coordinators, and vulnerable individuals seeking emergency refuge. The core narrative is defined by **reassurance, absolute clarity, psychological safety, and operational dignity**. 

The design direction merges **Modern Functionalism** with **Calming Human-Centered Tactility**. It strips away clinical coldness and chaotic urgency, replacing panic-inducing patterns with steady, grounded layouts. The system delivers an immediate sense of control, structural integrity, and gentle hospitality under extreme pressure. Every screen maintains ultra-high legibility for users operating under emotional stress, sleep deprivation, or visual impairment, paired with warm physical metaphors that convey stability and protection.

## Colors

The palette establishes an emotional landscape of security, clinical precision, and trauma-informed warmth:

- **Primary (`#E05368` / Tint `#FFE8EC`):** The shelter's signature warm rose-coral safety anchor. Used for primary intake actions, emergency intake pathways, active focus cues, and protective badges. Avoid using standard alarm reds; this rose hue signifies rapid human care rather than error or danger.
- **Secondary (`#0F172A` & `#1E293B`):** Deep grounding slate and midnight navy. Serves as the bedrock for headers, high-priority operational panels, data-heavy bed grids, and high-contrast text. It communicates institutional permanence and confidentiality.
- **Tertiary (`#10B981`):** Calming emerald green. Strictly reserved for affirmative availability, secure spaces, active beds, and live operational sync indicators.
- **Alert Accent (`#F59E0B`):** Warm amber for low supply thresholds, capacity warnings, and pending intake reviews.
- **Neutrals (`#F8FAFC` base, `#F1F5F9` surface, `#334155` muted slate):** Clean, glare-free canvas surfaces that preserve eye comfort across long intake shifts. High text-to-background contrast ratios strictly meet WCAG 2.1 AAA standards (minimum 7:1 for body copy).

## Typography

The pairing combines **Plus Jakarta Sans** for structural hierarchy with **Atkinson Hyperlegible Next** for maximum communicative efficiency:

- **Headlines (Plus Jakarta Sans):** Provides an approachable, warm geometry without decorative distractions. The balanced rounded letterforms project empathy while holding firm architectural balance across dashboards and triage lists.
- **Body & Labels (Atkinson Hyperlegible Next):** Specifically designed for rapid differentiation between ambiguous glyphs (e.g., distinguishing 'I', '1', and 'l', or '0' and 'O'). This is vital when cross-checking medical needs, room numbers, medication dosages, and identity documentation in stressful environments.
- **Numerical Hierarchy:** Large, tabular figures are standardized across room counters, occupancy meters, and supply inventory units to ensure instant glanceability from across a desk or tablet stand.

## Layout & Spacing

The layout is built on an adaptive fluid-grid framework designed for tablet-first command desks, mobile triage, and desktop logistics:

- **Desktop (>= 1024px):** 12-column grid with `margin: 2rem` and `gutter: 1.5rem`. Split-screen paradigms isolate live capacity maps from triage intake lists, preventing context switching during critical admissions.
- **Tablet (768px - 1023px):** 8-column layout accommodating horizontal tablet stands common at intake desks. Bed visualizers reflow into clean 2-column or 4-column matrix blocks.
- **Mobile (< 768px):** 4-column layout with `margin-mobile: 1rem` and `gutter-mobile: 1rem`. Controls prioritize thumb zones with primary action buttons pinned to comfortable reach areas.
- **Touch Target Integrity:** Every interactive zone guarantees a minimum target size of 48×48px with generous spacing (`space-md`) to eliminate accidental touches during fast-paced crisis scenarios.

## Elevation & Depth

Visual depth is conveyed through **Tonal Surface Layering** paired with **Low-Contrast Crisp Outlines**, avoiding disorienting blur effects or heavy drop shadows:

- **Base Floor (Canvas):** Tinted neutral `#F8FAFC`, setting a calm, clean, matte baseline.
- **Surface Level 1 (Primary Cards & Structural Panels):** Pure `#FFFFFF` resting on a 1px border of `#E2E8F0`. Elevation is anchored with an ultra-subtle, warm ambient tint: `0px 2px 4px rgba(15, 23, 42, 0.04)`.
- **Surface Level 2 (Selected Beds, Active Drawers & Flyouts):** `#FFFFFF` paired with an elevated ambient shadow `0px 8px 24px rgba(15, 23, 42, 0.08)` and a distinctive structural hairline border (`#CBD5E1`).
- **Surface Level 3 (Emergency Modals & Critical Verification Overlays):** `#FFFFFF` bordered with an inset 2px rose boundary (`#E05368`), backed by a high-opacity protective scrim (`rgba(15, 23, 42, 0.65)`).
- **Offline / Sync Banners:** Surface tone shifts to slate `#1E293B` floating with high visual contrast directly beneath the status header to immediately indicate cached offline states.

## Shapes

The design system implements a **Rounded (Level 2)** shape standard (0.5rem / 8px baseline) to evoke safety, friendliness, and security:

- **Interactive Buttons & Form Fields:** 8px (`0.5rem`) corner radius, creating a comfortable, approachable tactile feel without feeling childish.
- **Bed Visualizer Tiles & Triage Cards:** 16px (`1rem` / `rounded-lg`) corner radius, cleanly enclosing complex multi-line data and pictograms into distinct, humanized modules.
- **Pill Elements (Status Badges, Sync Flags, Availability Chips):** Full round (`9999px`), instantly distinguishing status metadata from clickable structural cards.

## Components

### Buttons
- **Primary Safety Button:** Solid `#E05368` fill, `#FFFFFF` Atkinson Hyperlegible Next semi-bold text, min-height 52px, horizontal padding `space-lg`. Hover/Active: `#C93F54`.
- **Secondary Grounding Button:** Outlined `#0F172A` (1.5px border) on `#FFFFFF`, text `#0F172A`. Provides a solid alternative for standard navigation and non-urgent records.
- **Quiet Action / Cancel:** Transparent background, text `#475569`, underlined on hover.
- **Emergency Action:** Inverted deep navy `#0F172A` with `#FFE8EC` accent label and distinct shield icon.

### Pictorial Room & Bed Allocation Cards
- **Structure:** Modular tiles with 16px radius, containing high-visibility universal icons (e.g., single bed, cradle/infant, accessibility ramp, medical support).
- **Available Bed:** `#FFFFFF` background, left border 6px `#10B981`, emerald pill badge "Ready for Intake".
- **Occupied Bed:** `#F1F5F9` background, muted slate details, quiet lock icon to guarantee resident privacy.
- **Reserved / Sanitizing:** Subtle amber hashed border (`#F59E0B`), display alert text indicating turnaround time.

### Live Occupancy & Inventory Gauges
- **Occupancy Counter Block:** Deep slate `#0F172A` surface, pure white display numbers (`counter-number` style), and active progress rails displaying total capacity versus available beds.
- **Inventory Threshold Indicator:** High-density list item featuring direct reorder threshold flags. Items dropping below minimum safe counts display a persistent `#F59E0B` alert chip and one-touch reorder trigger.

### Offline-First PWA Synchronization Badge
- **Online & Synchronized:** Pill badge with `#10B981` dot, quiet slate text "Live Cloud Sync Active".
- **Offline Mode:** Prominent slate banner `#1E293B` at top canvas with `#F59E0B` pulse dot, reading "Offline Mode — Changes Saved Locally (Syncs when connected)".

### Form Inputs & Selectors
- **Input Fields:** 52px height, 1.5px border `#CBD5E1`, internal padding `space-md`, Atkinson Hyperlegible 16px. Active/focused state: 2px `#E05368` ring with `#FFE8EC` 4px outer glow.
- **Checkboxes & Radios:** 24×24px minimum hit targets with thick visual borders (2px `#475569`), checking to `#E05368` with crisp white SVG checkmarks to accommodate tremor or low motor control.

### Universal Category Chips
- Filter chips (e.g., "Ground Floor", "Wheelchair Accessible", "Pet Friendly", "Trauma-Informed Private Room") feature paired monochrome icons with Atkinson Hyperlegible labels, active with `#FFE8EC` background and `#E05368` border.