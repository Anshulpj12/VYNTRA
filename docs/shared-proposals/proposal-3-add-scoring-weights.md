# Proposal 3: Standardize Shelter Scoring Weights Constant

> **Proposal ID:** proposal-3-add-scoring-weights
> **Author:** Part 3 Team (Service Provider & Shelter Scoring)
> **Date:** 2026-10-07
> **Status:** Proposed

---

## 1. Context & Motivation

In `docs/PART-3-SERVICE-PROVIDER.md` and `docs/SHARED-DATA-CONTRACTS.md`, the platform specifies a **Shelter Readiness/Support Score out of 100** computed dynamically based on live shelter capacity, sanitation facilities, hygiene inventory, healthcare support, and mobility equipment.

This proposal defines the official weight distribution to be housed in `src/shared/constants/scoring-weights.ts` so that Part 1 (SOS shelter ranking), Part 2 (shelter management), and Part 3 (scoring engine) share the exact mathematical specification.

---

## 2. Proposed Specification (`src/shared/constants/scoring-weights.ts`)

```typescript
export interface ScoringWeightConfig {
  availableBeds: number;        // Max 25 points
  womenSanitation: number;      // Max 20 points
  hygieneResources: number;     // Max 20 points
  healthcareFacilities: number; // Max 15 points
  mobilityEquipment: number;    // Max 10 points
  emergencyEquipment: number;   // Max 10 points
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeightConfig = {
  availableBeds: 25,
  womenSanitation: 20,
  hygieneResources: 20,
  healthcareFacilities: 15,
  mobilityEquipment: 10,
  emergencyEquipment: 10,
};

export const TOTAL_MAX_SCORE = 100;
```

---

## 3. Impact Assessment

- **Part 1:** Uses `shelterScore` (0-100) on cached shelter metadata to rank shelters during offline SOS generation.
- **Part 2:** When shelter facilities or inventory update, triggers score re-calculation.
- **Part 3:** Implements the `scoring-engine.ts` calculation logic utilizing these exact weights.
- **Compatibility:** Backward compatible; non-breaking addition.
