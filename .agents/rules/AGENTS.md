# VYNTRA — AI Agent Rules & Guidelines

> **Project:** VYNTRA — Offline-First Women Emergency Response & Displacement Support PWA
> **Team Size:** 3 Members (Part 1, Part 2, Part 3)
> **Architecture:** Progressive Web App (PWA) · Firebase Backend · Offline-First

---

## ⚠️ CRITICAL: Part Isolation Rules

Every AI agent working on this project **MUST** operate within its assigned part folder only. Violating part boundaries will cause merge conflicts and break the team workflow.

### Folder Ownership

| Part | Folder | Owner Responsibility |
|------|--------|---------------------|
| **Part 1** | `src/part1-user-system/` | User-facing modules: Auth, Profile, Menstrual Tracker, World Chat, SOS Interface |
| **Part 2** | `src/part2-shelter-provider/` | Shelter Provider modules: Registration, Dashboard, Beds, Facilities, Inventory, Metadata |
| **Part 3** | `src/part3-service-provider/` | Service Provider modules: Orders, Dispatch, Delivery, Shelter Scoring, Emergency Decode & Navigation |

### Shared Resources (READ-ONLY during development)

| Folder | Purpose |
|--------|---------|
| `src/shared/` | Shared types, interfaces, constants, Firebase config, design tokens, utility functions |
| `src/shared/types/` | TypeScript interfaces for cross-part data contracts (User, Shelter, ServiceProvider, Order, SOSCode) |
| `src/shared/constants/` | State codes, category lists, SOS condition codes, scoring weights |
| `src/shared/firebase/` | Firebase initialization, auth helpers, Firestore path constants |
| `src/shared/design-tokens/` | CSS custom properties, design system variables exported from Stitch |
| `src/shared/utils/` | Geo-distance calculation, ID generation, rate-limiter, offline-cache helpers |

### Rules for Part Isolation

1. **NEVER create, edit, or delete files outside your assigned part folder.**
2. **NEVER import directly from another part's folder.** If you need data from another part, use the shared types/interfaces defined in `src/shared/types/`.
3. **If you need a new shared utility or type**, create a proposal in `docs/shared-proposals/` with the filename `proposal-<part-number>-<description>.md`. Do NOT directly add to `src/shared/`.
4. **Each part has its own routing prefix:**
   - Part 1: `/user/*`, `/auth/*`, `/chat/*`, `/sos/*`
   - Part 2: `/shelter/*`, `/shelter-dashboard/*`
   - Part 3: `/service/*`, `/orders/*`, `/dispatch/*`
5. **Each part has its own CSS file(s)** inside its folder. Do NOT write global CSS. Use only design tokens from `src/shared/design-tokens/`.

---

## 🎨 Design System & Stitch Usage Rules

### Mandatory: Use Stitch for All UI Design

1. **Always use Stitch MCP to generate screen designs** before writing any UI code.
2. **Reference the existing Stitch project** in `stitch_reference/stitch_women_safety_and_support_network/` for design language, color palette, typography, and component patterns.
3. **Do NOT copy the reference designs exactly.** Use them as inspiration for VYNTRA's own identity. The design should feel related but distinct — like a cousin, not a clone.
4. **The two DESIGN.md files** in the reference (`sanctuary_haven/DESIGN.md` and `sanctuary_operational_system/DESIGN.md`) define the design system foundations. Use these as the baseline for creating VYNTRA's design system.

### Design Principles (from Reference)

- **Color Palette:** Warm rose-coral primary for safety actions, plum-lavender secondary for community/care, botanical green for confirmed safety/availability, amber for warnings. No harsh alarm reds.
- **Typography:** `Plus Jakarta Sans` for headlines/badges, `Inter` or `Atkinson Hyperlegible Next` for body text. Extended letter-spacing for accessibility.
- **Touch Targets:** Minimum 48×48px interactive areas. 56px minimum height for buttons. 64px for Emergency SOS.
- **Offline Indicators:** Always show PWA connectivity status (Online/Synced, Offline/Saved Locally, Sync Pending).
- **Shapes:** Rounded corners (8px–16px for cards, pill/full-round for badges). No sharp corners.
- **Elevation:** Tactile surface stacking with warm outlines. No heavy glassmorphism or CPU-intensive blur effects.
- **Emergency Triage Colors:** P1 (Urgent) = rose-red background, P2 (Elderly/Child) = amber, P3 (General) = plum-lavender.
- **Layout:** Mobile-first, thumb-friendly. SOS and critical actions in bottom 40% of viewport.

### Before Writing Any Screen

1. Call Stitch `generate_screen_from_text` with a detailed description of the screen.
2. Review the generated design.
3. If adjustments are needed, use `edit_screens` to refine.
4. Only after design approval, implement the screen in code.
5. The implemented screen must match the approved Stitch design within reasonable implementation constraints.

---

## 🏗️ Architecture & Tech Stack Rules

### Core Stack

| Layer | Technology |
|-------|------------|
| **Frontend Framework** | Next.js 14+ (App Router) or Vite + React |
| **Language** | TypeScript (strict mode) |
| **Styling** | Vanilla CSS with CSS Custom Properties (design tokens) |
| **Backend/Database** | Firebase (Auth, Firestore, Cloud Functions) |
| **Offline Storage** | IndexedDB via `idb` library + Service Worker |
| **PWA** | Workbox for Service Worker, Web App Manifest |
| **Maps** | Leaflet.js (offline-capable) or Google Maps API |
| **State Management** | React Context + useReducer (no external state lib unless justified) |

### Architecture Patterns

1. **Offline-First:** Every data operation must work offline. Write to IndexedDB first, sync to Firebase when online.
2. **Firebase Paths:** Follow the predefined Firestore path structure in `src/shared/firebase/paths.ts`. Do NOT create ad-hoc collection names.
3. **ID Generation:** Use the shared `generateUniqueId()` utility from `src/shared/utils/id-generator.ts`. Never use `Math.random()` directly.
4. **Rate Limiting:** All Firebase queries must go through the shared rate-limiter utility.
5. **Error Handling:** Every async operation must have try-catch with user-friendly error messages. Never show raw error objects to users.
6. **Data Validation:** Validate all user input on the client side before any Firebase write. Use Zod schemas defined in `src/shared/types/schemas/`.

---

## ✅ Code Quality & Review Standards

### Before Marking Any Feature as Complete

Every AI agent must perform the following review checklist:

#### 1. Functional Correctness
- [ ] Every user flow works end-to-end (happy path)
- [ ] Edge cases are handled (empty states, network failure, invalid input)
- [ ] Offline mode works correctly for all critical features
- [ ] Data persists correctly in IndexedDB and syncs to Firebase
- [ ] No console errors or warnings in development mode

#### 2. Algorithm & Logic Verification
- [ ] State/district code validation logic matches the spec in Working.md
- [ ] World Chat 6-hour cycle boundaries are correct (12AM, 6AM, 12PM, 6PM)
- [ ] SOS code encoding/decoding is reversible and compact
- [ ] Shelter score calculation uses the correct weighted formula
- [ ] Geo-distance calculations use Haversine formula correctly
- [ ] Rate limiting works as specified (combination-based, not just time-based)

#### 3. Data Flow Verification
- [ ] Data contracts match the shared TypeScript interfaces
- [ ] Firebase document structure matches the defined schema
- [ ] Offline cache invalidation works correctly
- [ ] No data leaks between user sessions
- [ ] Person ID linkage works (both existing app users and shelter-generated IDs)

#### 4. UI/UX Verification
- [ ] Design matches the approved Stitch screens
- [ ] PWA connectivity badge is visible on every screen
- [ ] Touch targets meet 48×48px minimum
- [ ] Responsive layout works on mobile, tablet, and desktop
- [ ] Loading states and skeleton screens are implemented
- [ ] Empty states have proper messaging and illustrations
- [ ] All text is readable (contrast ratio ≥ 4.5:1, critical text ≥ 7:1)

#### 5. Code Quality
- [ ] No `any` types in TypeScript (use proper typing)
- [ ] No unused imports or variables
- [ ] Functions are under 50 lines (extract helpers for longer logic)
- [ ] Component files are under 300 lines (split into sub-components)
- [ ] All public functions have JSDoc comments
- [ ] File names use kebab-case, component names use PascalCase
- [ ] CSS class names use BEM convention or CSS Modules

#### 6. Security
- [ ] No sensitive data in client-side logs
- [ ] Firebase security rules are defined for all collections
- [ ] User input is sanitized before display (XSS prevention)
- [ ] Auth tokens are not stored in localStorage (use Firebase SDK's built-in handling)

---

## 📁 Project Folder Structure

```
VYNTRA/
├── .agents/
│   └── rules/
│       └── AGENTS.md                    ← This file (AI agent rules)
├── docs/
│   ├── PART-1-USER-SYSTEM.md            ← Full spec for Part 1
│   ├── PART-2-SHELTER-PROVIDER.md       ← Full spec for Part 2
│   ├── PART-3-SERVICE-PROVIDER.md       ← Full spec for Part 3
│   ├── SHARED-DATA-CONTRACTS.md         ← Shared interfaces & schemas
│   ├── MERGE-GUIDE.md                   ← How to merge all parts
│   └── shared-proposals/                ← Cross-part change proposals
├── stitch_reference/                    ← Stitch design reference (READ-ONLY)
│   └── stitch_women_safety_and_support_network/
├── src/
│   ├── shared/                          ← Shared code (coordinate before editing)
│   │   ├── types/
│   │   ├── constants/
│   │   ├── firebase/
│   │   ├── design-tokens/
│   │   └── utils/
│   ├── part1-user-system/               ← PART 1 ONLY
│   │   ├── auth/
│   │   ├── profile/
│   │   ├── menstrual-tracker/
│   │   ├── world-chat/
│   │   ├── sos/
│   │   └── styles/
│   ├── part2-shelter-provider/          ← PART 2 ONLY
│   │   ├── registration/
│   │   ├── dashboard/
│   │   ├── bed-management/
│   │   ├── facilities/
│   │   ├── inventory/
│   │   ├── metadata/
│   │   └── styles/
│   └── part3-service-provider/          ← PART 3 ONLY
│       ├── registration/
│       ├── dashboard/
│       ├── orders/
│       ├── dispatch/
│       ├── shelter-scoring/
│       ├── sos-decode/
│       └── styles/
├── public/
│   ├── manifest.json
│   ├── service-worker.js
│   └── icons/
├── Working.md                           ← Original spec (reference only)
└── package.json
```

---

## 🔀 Merge Protocol

When all three parts are complete and reviewed:

1. **Each part must pass its own review checklist** (above).
2. **Run the full test suite** for each part independently.
3. **Verify shared type compatibility** — ensure no part has locally overridden shared types.
4. **Follow `docs/MERGE-GUIDE.md`** for the step-by-step merge process.
5. **Post-merge integration testing** must cover all cross-part flows:
   - User creates SOS → Shelter receives and decodes → Navigation opens
   - Shelter inventory drops → Order generated → Service Provider accepts → Delivery confirmed → Inventory auto-updates
   - World Chat message flow with proper 6-hour cycle grouping
6. **No force-pushes** to the main branch. All merges via pull request with at least one review.

---

## 🔒 Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `shelter-dashboard.tsx` |
| Components | PascalCase | `ShelterDashboard` |
| Functions | camelCase | `calculateShelterScore()` |
| Constants | UPPER_SNAKE_CASE | `MAX_BED_CAPACITY` |
| CSS Classes | BEM or CSS Modules | `.shelter-card__header--active` |
| Firebase Collections | kebab-case | `shelter-providers` |
| Firebase Documents | Auto-generated ID | `abc123xyz` |
| Route Paths | kebab-case with prefix | `/shelter/dashboard` |
| Branch Names | `part-<N>/<feature>` | `part-2/bed-management` |

---

## 📝 Documentation Standards

1. **Every component must have a JSDoc header** explaining its purpose, props, and which part it belongs to.
2. **Every utility function must document** its parameters, return type, and any side effects.
3. **Complex algorithms** (scoring, geo-distance, SOS encoding, stock prediction) must have inline comments explaining the logic step-by-step.
4. **Each part folder must contain a `README.md`** explaining the folder structure and how to run/test that part independently.

---

## 🚫 Things to NEVER Do

1. ❌ Never edit files outside your assigned part folder
2. ❌ Never use `any` type in TypeScript
3. ❌ Never store auth tokens manually (use Firebase SDK)
4. ❌ Never make Firebase calls without rate limiting
5. ❌ Never skip offline-first pattern (write locally first, sync later)
6. ❌ Never use inline styles (use CSS files with design tokens)
7. ❌ Never copy Stitch reference designs exactly (use as inspiration only)
8. ❌ Never create global CSS that could affect other parts
9. ❌ Never hardcode state/district codes (use constants from shared)
10. ❌ Never skip the review checklist before marking complete
