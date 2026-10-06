# VYNTRA — Merge Guide

> **Purpose:** This document defines the step-by-step process for merging all three parts into a single working application after each part has been independently completed and reviewed.

---

## Pre-Merge Requirements

Before starting the merge process, every part must have passed its own review checklist as defined in the `.agents/rules/AGENTS.md` file. Each team member should confirm that their part works independently, all screens render correctly, all offline functionality operates as expected, all data writes and reads follow the shared Firebase path structure defined in `docs/SHARED-DATA-CONTRACTS.md`, and no files exist outside their assigned folder. Each part must also have its own `README.md` inside its folder explaining how to run and test that part independently.

---

## Step 1 — Verify Shared Type Compatibility

Before merging any code, verify that no part has locally overridden or duplicated any shared types, interfaces, or constants. Every part should import types from `src/shared/types/` and constants from `src/shared/constants/`. If any part created local copies of shared types to work around import issues during development, those copies must be removed and replaced with proper imports from the shared directory before merging. Run a search across all three part folders for any files that define the same interface names as those in `src/shared/types/` to catch duplicates.

---

## Step 2 — Verify Firebase Path Consistency

Check that every Firebase read and write operation across all three parts uses the exact collection and document paths defined in `src/shared/firebase/paths.ts`. Part 1 writes to `users/`, reads from `shelters/` and `world-chat/` and `district-codes/`. Part 2 writes to `shelter-providers/` including subcollections for occupants, facilities, inventory, and metadata. Part 3 writes to `service-providers/` and `orders/`, reads from `shelter-providers/` for scoring and stock prediction, and writes shelter scores back to `shelter-providers/{shelterId}/metadata`. If any part used different path strings during development, they must be corrected to match the shared path constants.

---

## Step 3 — Verify SOS Encode/Decode Consistency

The SOS code that Part 1 generates and the SOS code that Part 3 decodes must be perfectly reversible. Take three to five sample SOS scenarios with different combinations of conditions, coordinates, user IDs, and timestamps. Encode each scenario using Part 1's `sos-encoder.ts` and then decode each using Part 3's `sos-decoder.ts`. Verify that every decoded field exactly matches the original input. If there are any discrepancies in format, field ordering, delimiter usage, or condition code definitions, resolve them before proceeding.

---

## Step 4 — Merge Routing

The three parts use separate route prefixes that should not conflict. Part 1 uses `/auth/*`, `/user/*`, `/chat/*`, and `/sos/*`. Part 2 uses `/shelter/*` and `/shelter-dashboard/*`. Part 3 uses `/service/*`, `/orders/*`, and `/dispatch/*`. During the merge, create a unified routing configuration that imports the route definitions from each part and registers them under the application's main router. Verify that no route paths overlap between parts. The role selection screen in Part 1 should correctly redirect to Part 2 routes when the Shelter Provider role is selected and to Part 3 routes when the Service Provider role is selected.

---

## Step 5 — Merge CSS Without Conflicts

Each part has its own CSS files inside its `styles/` folder. During the merge, verify that no CSS class names conflict between parts. All parts should be using BEM naming conventions or CSS Modules scoped to their components, and all color values, spacing, typography, and other design tokens should come from the shared `src/shared/design-tokens/tokens.css` file rather than hardcoded values. Import each part's CSS in the correct order (shared tokens first, then part-specific styles). Verify that no part's styles leak into or override another part's components.

---

## Step 6 — Post-Merge Integration Testing

After the code merge is complete, perform the following end-to-end integration tests that cross part boundaries:

**Flow 1 — User SOS to Shelter Decode:** A user creates a profile (Part 1), presses SOS (Part 1), generates a compact SOS code (Part 1), and the shelter provider receives and decodes that code (Part 3). Verify that the decoded conditions, coordinates, and user ID exactly match what was encoded. Verify that the navigation button opens the correct location.

**Flow 2 — Shelter Inventory to Service Provider Order:** A shelter provider registers and adds inventory (Part 2), records usage that brings an item below its minimum threshold (Part 2), the system detects the shortage and shows it in the order section (Part 3), the shelter creates an order sent to nearby providers (Part 3), a service provider accepts and dispatches (Part 3), the shelter confirms delivery (Part 3), and the inventory is automatically updated with the delivered quantities (Part 3 writes back to Part 2's data). Verify that the shelter's inventory numbers are correct after the complete cycle.

**Flow 3 — Shelter Score Updates:** A shelter registers with initial capacity and facilities (Part 2), the scoring system calculates an initial score (Part 3), the shelter provider changes facility availability or bed occupancy (Part 2), and the score is recalculated (Part 3). Verify that the new score reflects the changes. Then verify that Part 1's SOS shelter list shows the updated score when the user fetches shelter data.

**Flow 4 — World Chat 6-Hour Cycle:** Multiple users submit messages to the same district chat during a 6-hour period (Part 1). Verify that all messages appear in the same Current Record. Wait for (or simulate) the period boundary. Verify that the Current Record becomes a Completed Record and a new Current Record is created. Verify that messages cannot be added to the Completed Record.

**Flow 5 — Person ID Linkage:** A shelter provider admits a person by entering their existing application ID (Part 2 reads from Part 1's user data). Verify that the shelter's occupant record correctly links to the user's profile. Then admit a person who does not have an application ID. Verify that a new person ID is generated by the shelter system and the occupant is properly tracked.

---

## Step 7 — PWA and Offline Verification

After integration testing, verify the complete PWA behavior. The service worker should cache all static assets. The manifest should be correctly configured with the app name, icons, and theme colors. Test the following offline scenarios:

The user should be able to view their profile, browse their cycle history, view cached World Chat records, and initiate the SOS flow entirely offline. The shelter provider should be able to view their dashboard, manage beds and occupants, record inventory usage, and decode SOS messages offline. The service provider should be able to view their dashboard and accepted orders offline. When connectivity returns, all pending data should automatically sync to Firebase.

---

## Step 8 — Final Review

After all integration tests pass, perform a final code review across the entire merged codebase. Verify that there are no `any` types remaining in TypeScript, no unused imports or variables, no console.log statements in production code, no hardcoded Firebase collection names (all should use path constants), and no direct `Math.random()` calls (all should use the shared ID generator). Verify that every screen shows the PWA connectivity status badge and that all touch targets meet the minimum 48×48px requirement.

---

## Branch Strategy

Each team member works on their own branch with the naming convention `part-<N>/<feature>`, for example `part-1/world-chat` or `part-2/bed-management`. When a part is complete and reviewed, it is merged into a `develop` branch via pull request. After all three parts are merged into `develop` and integration testing passes, `develop` is merged into `main`. No force-pushes are allowed on `main` or `develop`. All merges must go through pull requests with at least one review from another team member.
