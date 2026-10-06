# VYNTRA — Part 3: Service Provider, Shelter Scoring & Emergency Decode System

> **Owner:** Team Member 3  
> **Folder:** `src/part3-service-provider/`  
> **Routing Prefixes:** `/service/*`, `/orders/*`, `/dispatch/*`  
> **Design Theme:** Serene Sanctuary (Tactile Bento Cards, Warm Rose-Coral `#ad2644`, Slate Spruce, 48px+ touch targets)

---

## 📦 Modules Overview

### Module A — Registration & Dashboard (`registration/`, `dashboard/`)
- **Route:** `/service/register`, `/service/dashboard`
- **Features:**
  - One-time GPS supply hub onboarding with coordinate detection and district selection.
  - Unique ID generation: `VYNTRA-SVC-<8-character-alphanumeric>` via `generateUniqueId('SVC')`.
  - Offline caching in IndexedDB / LocalStorage and Firestore syncing under `service-providers/{providerId}`.
  - Active duty operational toggle (`Active Duty` vs `Standby`).
  - Tactile Bento metric cards: Pending Orders, Active Dispatches, Shelter Shortages, and Completed Deliveries.

### Module B & C — Stock Prediction & Resource Orders (`orders/`)
- **Route:** `/orders/create`, `/orders/:orderId`
- **Features:**
  - `stock-predictor.ts`: Evaluates consumption intensity (`quantityUsed / elapsedDays`) and estimates remaining supply hours and days.
  - `nearest-provider-finder.ts`: Implements the Haversine formula from `src/shared/utils/geo-distance.ts` to identify the 5 nearest depots or target 1 dedicated partner.
  - `order-service.ts`: First-acceptance locking mechanism. Multiple nearby providers receive the order, and the first provider who accepts claims exclusive fulfillment responsibility.
  - Item catalog: Dignity & Sanitary pad bundles, trauma kits, folding stretchers, wheelchairs, and custom supplies.

### Module D — Dispatch, Preparation Gate & Inventory Sync (`dispatch/`)
- **Route:** `/dispatch/:orderId`, `/dispatch/confirm/:orderId`
- **Features:**
  - `PrepareItemChecklist.tsx`: Interactive verification inspection checklist.
  - **100% Preparation Gate:** The dispatch authorization button is strictly locked until all items and quantities are verified.
  - Handover Delivery Receipt card.
  - **Automatic Inventory Update:** When the shelter confirms delivery receipt, the exact items and quantities delivered are automatically merged into the shelter's live inventory (`shelter-providers/{shelterId}/inventory/{itemId}`) and metadata summary without manual re-entry.

### Module E — Shelter Scoring System (`shelter-scoring/`)
- **Engine:** `scoring-engine.ts`, `score-calculator.ts`, `ShelterScoreCard.tsx`
- **Formula:** 0 to 100 Shelter Readiness Index:
  - Available bed capacity ratio (Max: 25 pts)
  - Women's sanitation facilities (Max: 20 pts)
  - Sanitary napkins & hygiene reserves (Max: 20 pts)
  - Medical & healthcare support (Max: 15 pts)
  - Wheelchair & mobility equipment (Max: 10 pts)
  - Emergency & backup supplies (Max: 10 pts)
- Writes updated score back to `shelter-providers/{shelterId}/metadata` (`shelterScore`) for use by Part 1's SOS shelter ranking.

### Module F — SOS Decode & Tactical Navigation (`sos-decode/`)
- **Route:** `/service/sos-decode`
- **Features:**
  - Decodes compact SMS SOS string: `VYNTRA|<lat>,<lng>|<condition-codes>|<userId>|<timestamp>`.
  - Condition mapping: PG (Pregnancy), MN (Menstruation), VM (Vomiting), MD (Medical Difficulty), WC (Wheelchair), HC (Healthcare), SN (Sanitation), AD (Distress), CC (Child Care), EA (Elderly).
  - Triage Priority Tiers: P1 (Rose-coral Urgent), P2 (Amber Vulnerable), P3 (Plum-lavender General).
  - Tactical Radar Map: Visual distance telemetry, pulse animation, and GPS lock.
  - 64px Tactical Navigation Trigger: Opens turn-by-turn Google Maps directly to the victim coordinates (`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`).

---

## 🧪 Independent Testing Guide

To test Part 3 screens independently:
1. **Registration:** Navigate to `/service/register` to onboard a service provider depot.
2. **Dashboard:** Navigate to `/service/dashboard` to inspect metrics, pending orders, and depot toggle.
3. **New Order:** Navigate to `/orders/create` to test low-stock detection, item selection, and 5-nearest provider broadcast.
4. **Dispatch Checklist:** Navigate to `/dispatch/VYNTRA-ORD-NARMADA1` to test the 100% verification gate lock.
5. **Delivery Handover:** Navigate to `/dispatch/confirm/VYNTRA-ORD-NARMADA1` to test automatic inventory sync.
6. **SOS Decrypt:** Navigate to `/service/sos-decode` and paste or click scenario presets to test coordinate extraction and Google Maps navigation launching.
