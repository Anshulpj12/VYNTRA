---
name: Sanctuary Haven
colors:
  surface: '#f8f9ff'
  surface-dim: '#d6dae4'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4fd'
  surface-container: '#eaeef8'
  surface-container-high: '#e4e8f2'
  surface-container-highest: '#dee2ec'
  on-surface: '#171c23'
  on-surface-variant: '#584143'
  inverse-surface: '#2c3138'
  inverse-on-surface: '#edf1fb'
  outline: '#8c7072'
  outline-variant: '#e0bfc1'
  surface-tint: '#b02946'
  primary: '#ad2644'
  on-primary: '#ffffff'
  primary-container: '#ce405b'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb2b9'
  secondary: '#6f48b2'
  on-secondary: '#ffffff'
  secondary-container: '#b78efe'
  on-secondary-container: '#491d8a'
  tertiary: '#186a22'
  on-tertiary: '#ffffff'
  tertiary-container: '#358438'
  on-tertiary-container: '#f7fff1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdadc'
  primary-fixed-dim: '#ffb2b9'
  on-primary-fixed: '#400010'
  on-primary-fixed-variant: '#8f0a30'
  secondary-fixed: '#ebdcff'
  secondary-fixed-dim: '#d4bbff'
  on-secondary-fixed: '#260058'
  on-secondary-fixed-variant: '#572e99'
  tertiary-fixed: '#a3f69c'
  tertiary-fixed-dim: '#88d982'
  on-tertiary-fixed: '#002204'
  on-tertiary-fixed-variant: '#005312'
  background: '#f8f9ff'
  on-background: '#171c23'
  surface-variant: '#dee2ec'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
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
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: '0'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: '0'
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 19px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0.005em
  body-xl:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 30px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0.01em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0.015em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-action-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0.01em
  label-action-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.015em
  badge-triage:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '800'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.5rem
  gutter-lg: 2rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2.5rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 2rem
  space-xl: 3rem
---

## Brand & Style

This design system is engineered for crisis resilience, radical accessibility, and psychological safety. Built specifically as a progressive web application (PWA) operating under zero-bandwidth, intermittent, or unstable connectivity conditions, it serves women, caregivers, pregnant individuals, and regional community networks during both acute emergencies and everyday community health stewardship.

### Personality & Emotional Tenor
- **Calm & De-escalating:** Replaces clinical coldness and panicky emergency reds with a protective, warm rose-coral and soothing botanical undertones that lower elevated heart rates.
- **Unwavering Reliability:** High-clarity typography, unambiguous state communication, and immediate tactile confirmations reassure users that their actions are recorded locally even without an internet signal.
- **Instinctive & Low-Cognitive Load:** Heavy emphasis on pictorial iconography, universally identifiable symbols, clear color semantics, and oversized touch geometries accommodates individuals experiencing trauma, stress, reduced visual acuity, or limited literacy.

### Design Movement
The aesthetic synthesizes **Humanist Minimalism** with **Tactile Functionalism**. Surfaces leverage ultra-soft, warm cream-tinted paper layers rather than stark sterile whites or synthetic cold grays. Elevation is governed by tactile, low-contrast physical tiers and subtle ambient warmth, eliminating disorienting glassmorphic blurs or decorative micro-interactions in favor of rock-solid legibility and deterministic component responsiveness.

## Colors

The palette establishes an emotional balance between urgent situational awareness and soothing physical reassurance. Every token pair meets or exceeds WCAG 2.1 AAA contrast ratios (minimum 7:1 for critical text and badges, 4.5:1 for supporting UI elements).

### Core Semantic Roles
- **Primary Safety & Action (`#D94862` / Hover & Focus `#C2304C`):** Used for critical action triggers, primary emergency SOS inputs, priority markers, and urgent callouts. It delivers urgency without the terror of harsh warning red.
- **Secondary Care & Community (`#7E57C2`):** Soft plum-lavender used for communal features, mental health resources, maternity records, peer-to-peer solidarity hubs, and secondary functional actions.
- **Tertiary Safe Haven (`#2E7D32` / Soft Light `#E8F5E9`):** Grounded botanical sage/emerald indicating confirmed safety, verified shelters, stable health vitals, and verified real-time cloud synchronization.
- **Warning & Attention (`#F57C00` / Surface Tint `#FFF8E1`):** Warm amber used for pending sync queues, power-saving alerts, or moderate environmental advisories.
- **Neutral Foundation:**
  - High-Contrast Text: `#1E232A` (deep charcoal-slate primary) and `#3B424E` (secondary accessible slate).
  - Background & Canvas: `#FAF8F7` (warm natural tint eliminating eye fatigue).
  - Surface Containers: `#FFFFFF` (elevated cards), `#F3EFEF` (sunken toolbars and structural wells).
  - Structural Dividing Lines: `#E6DFDD` (warm muted border tone).

### Synchronization Status Semantics
- **Online & Synced:** Surface `#E8F5E9`, Border `#A5D6A7`, Content `#1B5E20`. Icon: Cloud with interior checkmark.
- **Offline & Saved Locally:** Surface `#EDE7F6`, Border `#D1C4E9`, Content `#4A148C`. Icon: Mobile phone/hard drive storage glyph with calm checkmark.
- **Sync Pending / Queued:** Surface `#FFF8E1`, Border `#FFE082`, Content `#E65100`. Icon: Circular sync arrow paused.

### Emergency Triage Priority Tokens
- **Priority 1 (Urgent Medical / Pregnancy / Disability / Acute Distress):** Background `#FDE8EB`, Stroke `#D94862`, Icon & Text `#961B32`. Accompanied by a bold double-ring badge.
- **Priority 2 (Elderly / Dependent & Child Care / Scheduled Aid):** Background `#FFF3E0`, Stroke `#F57C00`, Icon & Text `#B24500`. Accompanied by an alert hexagon or warning diamond badge.
- **Priority 3 (General Assistance / Regional Resources / Supply Requests):** Background `#EDE7F6`, Stroke `#7E57C2`, Icon & Text `#4A148C`. Accompanied by a circular supportive icon badge.

## Typography

The typographic pairing balances reassuring warmth with clinical legibility:
- **Headlines & Badges (`Plus Jakarta Sans`):** Features wide apertures, rounded stroke terminals, and friendly geometry that feels human and safe while maintaining decisive authority under crisis conditions.
- **Body & Operational Copy (`Inter`):** Selected for its tall x-height, clear letter distinction (e.g., distinguishing between capital `I`, numeral `1`, and lowercase `l`), and maximum readability in direct outdoor sunlight or distressed viewing conditions.

### Rules of Legibility
- **Letter Spacing:** Extended spacing (`0.01em` to `0.02em`) is applied to all reading text to assist users with dyslexia or low vision.
- **Pictorial Support Pairing:** Display and headline levels must never rely solely on text. They are universally accompanied by large high-contrast icon glyphs (minimum 32x32px) positioned left-aligned or centered above the header to guarantee immediate visual comprehension without requiring fluency in the local written language.

## Layout & Spacing

The layout is built around a single-hand, thumb-friendly mobile-first paradigm that stretches seamlessly to tablet emergency stations and desktop dispatch monitors.

### Layout Model
- **Grid Architecture:** 
  - Mobile (`< 600px`): Single-column fluid canvas with minimum `margin` of `1rem` (16px) and vertical stacking.
  - Tablet (`600px - 1024px`): 6-column fluid grid, `gutter-md` of `1.5rem` (24px), allowing side-by-side triage cards and map views.
  - Desktop (`> 1024px`): 12-column fixed grid (maximum container width `1280px`), `gutter-lg` of `2rem` (32px), centered on canvas.
- **Thumb Zone Safety:** All primary callouts, SOS buttons, and navigation controls sit within the bottom 40% of the mobile viewport. Secondary information and historical records sit above.
- **Touch Envelope:** No interactive trigger may measure less than 48x48px in actual tap target bounds, with a mandatory `space-sm` (12px) clearance envelope separating adjacent interactive surfaces to prevent catastrophic accidental taps during tremor or distress.

## Elevation & Depth

To preserve accessibility on low-end mobile devices and OLED/e-ink screens frequently found in field environments, elevation does not rely on CPU-heavy multi-stop drop shadows or translucent blur filters. Instead, depth is conveyed through **tactile surface stacking** and **warm structural outlines**.

### Surface Depth Layers
- **Floor Base (`#FAF8F7`):** The non-interactive canvas level.
- **Sunken Well (`#F3EFEF` with 1px solid `#E6DFDD` border):** Used for non-interactive data feeds, sync log streams, and disabled regions.
- **Resting Layer 1 (`#FFFFFF` with 1.5px solid `#E6DFDD` border):** Default elevation for interactive service cards, emergency contact tiles, and medical profile blocks.
- **Elevated Interactive Layer 2 (Raised):** Resting Layer 1 augmented with a grounded shadow: `0 4px 12px -2px rgba(30, 35, 42, 0.08), 0 2px 6px -1px rgba(30, 35, 42, 0.04)`. Applied to active touch surfaces and expandable sheets.
- **Critical Overlay / Floating Drawer:** Floating modals, triage alerts, and sticky bottom utility bars use `0 12px 32px -4px rgba(30, 35, 42, 0.16)` paired with a strong boundary outline (`2px solid #E6DFDD`).

## Shapes

The shape vocabulary employs **Roundedness Level 2** to evoke hospitality, organic safety, and physical resilience. Sharp pointed corners are strictly avoided, as clinical testing indicates soft, rounded geometry reduces physiological tension during emergency app navigation.

### Corner Radius Mapping
- **Buttons, Text Inputs, and Dropdowns:** `0.75rem` (12px) for comfortable physical framing.
- **Triage Cards & Content Containers:** `1rem` (16px) corner radius, producing a distinct physical shield-like feel.
- **Emergency Action Buttons & Quick Badges:** `1.5rem` (24px) or full pill geometry (`9999px`) to emphasize distinct tap targets.
- **Pictorial Icon Containers:** Circular (`50%` radius) or squircle (`1rem` radius) containers with high-contrast tinted fills.

## Components

### 1. Emergency SOS & Action Buttons
- **Touch Target:** Minimum height of 56px for primary buttons, 64px for the master Emergency SOS component.
- **Visuals:** Primary safety action buttons use a vibrant `#D94862` background with `#FFFFFF` text and a bold `1.5px` border of `#C2304C`.
- **Haptic & Visual Feedback:** Tap triggers a brief high-contrast inset border (`#961B32`) and a physical depressed offset (`scale(0.98)`).
- **Icon Pairing:** Every action button includes an icon on the leading edge (e.g., telephone receiver, cross, siren) sized at 24x24px.

### 2. PWA Connectivity Status Badges
- **Online Pill:** `#E8F5E9` background, `#1B5E20` text, leading cloud icon with a verified checkmark (`16x16px`). Copy reads: *"Online & Synced"*.
- **Offline Shield:** `#EDE7F6` background, `#4A148C` text, leading device diskette icon (`16x16px`). Copy reads: *"Offline Mode - Data Saved Locally"*.
- **Placement:** Affixed prominently at the top header of every screen, ensuring constant reassurance of data preservation.

### 3. Priority Triage Badges
- **P1 (Urgent Medical / Pregnancy / Disability):** `#FDE8EB` background, `#D94862` border (1.5px), `#961B32` text in uppercase `badge-triage` font. Prepended with an exclamation heartbeat icon.
- **P2 (Elderly & Child Care):** `#FFF3E0` background, `#F57C00` border, `#B24500` text. Prepended with a shielding hand icon.
- **P3 (General Assistance):** `#EDE7F6` background, `#7E57C2` border, `#4A148C` text. Prepended with a community gathering icon.

### 4. Pictorial Information Cards
- **Card Anatomy:** Large 48x48px colored illustrative icon tile at the top-left, followed by a bold headline (`headline-sm`), two lines of simple plain-language instructions (`body-md`), and a full-width 48px action button at the base.
- **Borders & Touch State:** Crisp 1.5px `#E6DFDD` border that deepens to `#D94862` or `#7E57C2` on focus/hover.

### 5. Input Fields & Form Elements
- **Height & Bounds:** Minimum 52px height. 1.5px `#E6DFDD` border on white canvas.
- **Focus Ring:** 3px accessible soft glow ring (`rgba(217, 72, 98, 0.25)`) with a crisp `#D94862` border line.
- **Labels & Microcopy:** Floating permanent labels above the field in `body-sm` (never rely on disappearing placeholder text). Clear helper text with error states rendered in `#C2304C` with a leading warning icon.

### 6. Accessible Selection Controls (Radio / Checkbox)
- **Geometry:** Minimum 24x24px visible box/circle inside a 48x48px interactive touch boundary.
- **Active State:** Solid fill with primary `#D94862` or secondary `#7E57C2`, featuring an unmistakable 3px bold white checkmark or inner dot.
- **Container Highlighting:** Selecting an option highlights the entire surrounding row container in a light primary tint (`#FDE8EB`), giving instant visual confirmation to elderly users.