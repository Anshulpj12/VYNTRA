# VYNTRA — Part 2: Women Shelter/Space Provider System (Complete Specification)

> **Assignee:** Team Member 2
> **Folder:** `src/part2-shelter-provider/`
> **Routes:** `/shelter/*`, `/shelter-dashboard/*`

---

## Module A — Shelter Provider Authentication & One-Time Registration

The second major part of the platform is the **Women Shelter/Space Provider system**, which is designed to turn a registered shelter or safe space into a continuously managed digital entity within the emergency-response platform. The purpose of this section is not only to register a shelter and display its basic information, but to provide the shelter provider with a **complete professional management system** through which they can continuously manage the current condition of the shelter, including its capacity, people staying there, beds, facilities, sanitation, equipment, storage, inventory, and other operational information. The shelter provider has a separate role in the application and begins the process by selecting the **Women Shelter/Space Provider** option from the role selection screen (built in Part 1) and logging in through **Google Login**. Successful Google authentication only verifies the provider's login identity; it does **not immediately make the shelter profile active**. After login, the provider initially has an incomplete/inactive shelter profile and must complete the first-time registration before the shelter can become an active shelter in the system.

During this **one-time registration**, the shelter provider has to enter the complete basic information required to establish the shelter. This includes the **shelter name, shelter location, state, district, geographical coordinates, registered mobile number, and other required identification and location details**. The geographical coordinates are important because the shelter represents a real physical location, and the emergency-response system will later need to know where the shelter is located in relation to people requiring assistance and other shelters or services. The provider also has to enter the shelter's initial **capacity information**, particularly the number of beds available. Along with the basic location and capacity information, the provider has to specify the **facilities available at the shelter**, including facilities intended for women, sanitation facilities, and other facilities or services that the shelter provides. Wherever a facility has a measurable quantity or capacity, the provider enters the corresponding number during registration. The registration therefore does not simply answer the question of "Does this shelter exist?" It creates an initial digital representation of **where the shelter is, what it provides, how many people it can accommodate, and what facilities are available there**.

The provider must completely fill the required first-entry information before the shelter can become active. Until all mandatory details have been entered and submitted successfully, the provider remains in the **incomplete/inactive profile state**. Once the provider has completed the first registration and submitted the information, the system creates the shelter's identity inside the application. A **random unique ID** is generated for the shelter/provider using the shared `generateUniqueId('SHL')` utility, producing an ID in the format `VYNTRA-SHL-<8-character-alphanumeric>`. This ID becomes the central identifier through which all information belonging to that shelter is connected. The shelter's registration details, location, coordinates, district, state, capacity, facilities, and all later management information are associated with this unique Shelter/Provider ID. This gives every registered shelter its own identifiable record in the platform and allows the system to distinguish between multiple shelters even when they are operating in the same district or state. The registration data is stored in Firebase under the path `shelter-providers/{shelterId}` and simultaneously cached locally in IndexedDB.

---

## Module B — Professional Shelter Management Dashboard

After successful completion of the one-time registration, the shelter profile becomes **active** and the provider can enter the dedicated **Shelter Management Dashboard**. The information entered during registration becomes the shelter's initial baseline/current information. However, from this point onward, the system is no longer treated as a static registration form. The provider uses the dashboard as the **actual day-to-day management system of the shelter**. The provider can continuously modify and update the information according to what is currently happening inside the shelter. This means that the original registration establishes the shelter, while the dashboard maintains the shelter's continuously changing real-world condition.

The dashboard provides the provider with a complete view of the shelter's current operational state. It can contain information such as the **total bed capacity, currently occupied beds, currently available beds, people currently staying in the shelter, expected duration of their stay, available facilities, sanitation facilities, equipment, storage, inventory, and other operational information**. The provider can enter new information and update existing information whenever the actual condition of the shelter changes. Therefore, the information shown by the dashboard should represent the **current condition of the shelter**, rather than simply repeating the information entered during the original registration.

The central concept of this entire part is **"one-time registration, continuous management."** The shelter provider only needs to establish the shelter through the complete first-time registration once. That registration creates the shelter's identity and initial baseline. After activation, the provider uses the professional dashboard as the shelter's ongoing digital management system.

---

## Module C — People/Occupant Management & Bed Allocation

One of the important functions of this dashboard is **people/occupant management**. When a person arrives at the shelter, the provider can create an entry for that person in the shelter-management system. The provider can enter the required information about the person's stay, including **how many days the person is expected to remain in the shelter**. The system can associate that stay with the person's application ID if the person is already using the main application. If the person does not already have an application ID and is being registered through the shelter system, the shelter can generate a **random ID** for that person using the shared `generateUniqueId('PRS')` utility, producing an ID in the format `VYNTRA-PRS-<8-character-alphanumeric>`. This allows the shelter system to manage both types of people: people who already exist in the main platform and people who are being entered into the shelter system directly. If the person already uses the application, the provider can instead **manually enter the person's existing application ID** so that the shelter record can be connected to the person's existing identity rather than creating another duplicate identity.

When a person is admitted and assigned a bed, the shelter's current capacity is automatically updated. For example, if the shelter has a certain number of available beds and one person occupies one of those beds, the system **reduces the currently available-bed count by one** and reflects the corresponding increase in occupied capacity. The original total capacity does not change simply because someone occupies a bed; instead, the system maintains the relationship between **total capacity, occupied capacity, and currently available capacity**. When a person leaves the shelter after their stay, the system can update the occupancy again and make that bed available. This allows the provider to see the current accommodation situation without manually recalculating the available beds every time someone enters or leaves.

The person's expected stay duration is also connected to the shelter's management information. When the provider records that a person will remain for a certain number of days, that information becomes part of the person's shelter record. This allows the shelter to maintain information about **who is currently staying, how long they are expected to stay, and the current occupancy associated with those people**. As people arrive and leave, the dashboard can continuously represent the current shelter population and bed availability. The occupant data is stored in Firebase under the path `shelter-providers/{shelterId}/occupants/{personId}` and locally cached for offline access.

---

## Module D — Facility & Sanitation Management

The shelter also has a complete **facility-management component**. The facilities entered during the first registration are not permanently fixed values. The provider can continuously update them according to the current situation. This includes the facilities available specifically for women, **sanitation facilities**, and other facilities provided by the shelter. If the number or current availability of a particular facility changes, the provider can update the value through the dashboard. The system therefore maintains not only the original facility information but the **current available condition** of those facilities.

Each facility record should contain the facility name, the type of facility (women-specific, sanitation, medical, general), the total capacity or quantity, the currently available amount, and a last-updated timestamp. The provider can add new facilities that were not part of the original registration, remove facilities that are no longer available, or modify the capacity and availability of existing ones. The facility data is stored in Firebase under the path `shelter-providers/{shelterId}/facilities/{facilityId}` and locally cached.

---

## Module E — Equipment, Inventory & Storage Management

The same live-management concept applies to the shelter's **equipment and inventory system**. The provider has a full inventory-management section in which they can add the equipment, resources, supplies, and other things available at the shelter. To add an item, the provider enters the **name of the equipment or item and its quantity**. Each entry is connected to the shelter's unique Shelter/Provider ID. The provider can continuously modify the quantity as the real-world stock changes. If an item is used, the current quantity can be reduced. If new items are received, the quantity can be increased. If equipment is added, removed, replaced, or otherwise changed, the provider can update the corresponding information. Therefore, the inventory does not remain as the original list created during registration; it becomes a **continuously maintained current inventory**. The inventory can contain items such as women's hygiene products, sanitary pads, sanitation-related materials, medical-support equipment, emergency-use equipment, and other necessary resources.

The shelter's storage information is also connected to this system. The platform can maintain the current information about what the shelter currently has in storage and the quantity of each item. This is important because the shelter's operational condition depends not only on how many beds it has but also on what equipment, supplies, and other resources are currently available. The provider therefore manages the shelter as a single operational system where **occupancy, capacity, facilities, equipment, and inventory** can all be updated continuously.

Whenever a resource is used, the shelter provider can record the quantity consumed. During this usage entry, the system can ask whether the resource was associated with a particular person/patient. If it was associated with a person, the provider can enter that person's application ID and the required details. If the resource was used generally, for another purpose, or does not need to be associated with a particular person, the provider can skip the person-identification information. After the usage is recorded, the system automatically updates the corresponding inventory quantity and the current stock available in the shelter's inventory metadata. This usage-tracking data is also used later by Part 3's stock-prediction system.

The inventory data is stored in Firebase under the path `shelter-providers/{shelterId}/inventory/{itemId}` and the usage log under `shelter-providers/{shelterId}/inventory/{itemId}/usage-log/{logId}`. Both are locally cached for offline functionality.

---

## Module F — Consolidated Shelter Metadata

All of these different types of information are connected to the same **Shelter/Provider ID**. The system does not treat the shelter's location, bed capacity, occupant information, sanitation information, facility information, equipment, and inventory as unrelated records. They are connected to the shelter's identity and form the overall digital representation of that shelter. The system maintains a **single consolidated metadata structure/file** containing the shelter's relevant information. This metadata can include the shelter ID, shelter name, location, state, district, coordinates, registered mobile number, total bed capacity, current occupied beds, current available beds, people currently staying, their expected duration of stay, facilities, sanitation information, equipment, inventory items, current quantities, storage information, and other current operational details.

The important distinction is between the **initial registration data and current management data**. The first registration establishes the shelter's initial state and creates its identity. Once the shelter becomes active, the management dashboard continuously updates the current state. If one bed becomes occupied, the current available-bed value changes. If a person leaves, the available capacity changes again. If a facility changes, the current facility information changes. If equipment is consumed or added, the inventory quantity changes. If resources are received, the storage quantity increases. Therefore, the metadata associated with the shelter continuously represents the **latest/current condition of the shelter**.

The system also allows the shelter's information to connect to the wider emergency-response platform. When the main platform needs to identify an appropriate shelter, it can use the shelter's current information rather than relying only on its original registration. For example, the system can determine whether the shelter currently has available beds, whether particular facilities are available, and what resources are currently present. This becomes especially important when multiple shelters are available because the emergency-response system needs to know the **actual current capacity and facilities**, not just the theoretical maximum capacity that was entered during registration.

The consolidated metadata document is stored in Firebase under the path `shelter-providers/{shelterId}/metadata` as a single document that is kept in sync with the individual component changes (beds, facilities, inventory). This metadata document is what gets cached by Part 1's SOS system for shelter discovery and ranking.

The inventory system also connects to the **Service Provider system** (Part 3). Since the shelter continuously maintains its current resource quantities, the platform can compare those quantities with the required or minimum levels defined for the shelter. If a resource falls below the required level, the system can identify the shortage. The shortage can then be connected to the relevant Service Provider so that the provider can receive an alert and take action. In this way, the shelter does not need to manually monitor every resource and independently communicate every shortage. The shelter's continuously updated inventory becomes the data source for the resource-monitoring and service-provider mechanism built in Part 3.

---

## Complete Process Flow

The complete Women Shelter/Space Provider process can therefore be represented as:

**Women Shelter/Space Provider Selection → Google Login → Provider Authentication → Inactive/Incomplete Profile → One-Time Shelter Registration → Shelter Name → Location → State → District → Coordinates → Registered Mobile Number → Total Capacity → Available Beds → Women-Focused Facilities → Sanitation Facilities → Facility Numbers/Capacity → Other Required Shelter Details → Complete First Entry → Generate Unique Random Shelter ID → Store Initial Shelter Metadata → Activate Shelter Profile → Enter Professional Shelter Dashboard → Use as Full Shelter Management System → Manage Current Capacity → Manage Occupants → Enter Person ID or Generate Person ID → Enter Expected Stay Duration → Assign Bed → Reduce Current Available Bed Count → Track Occupied/Available Beds → Manage Facilities → Manage Sanitation → Manage Equipment → Manage Storage → Manage Inventory → Add Item/Equipment Name + Quantity → Record Usage With Optional Person Association → Continuously Update Current Quantities → Update Shelter Conditions → Consolidate Current Information Into Shelter Metadata → Monitor Current Capacity and Resources → Detect Shortages → Connect With Service Providers (Part 3).**

The key architecture is: **Register once → Activate → Generate/associate ID → Professional dashboard → Manage people + beds + facilities + sanitation + equipment + inventory → Update continuously → Maintain one current shelter metadata state → Connect that live state to the larger emergency system.**

---

## Folder Structure

```
src/part2-shelter-provider/
├── README.md
├── registration/
│   ├── ShelterRegistrationScreen.tsx
│   ├── registration-service.ts
│   ├── registration-store.ts
│   └── components/
│       ├── ShelterInfoForm.tsx
│       ├── LocationPicker.tsx
│       ├── CapacityForm.tsx
│       └── FacilitiesForm.tsx
├── dashboard/
│   ├── ShelterDashboardScreen.tsx
│   ├── dashboard-service.ts
│   └── components/
│       ├── DashboardOverview.tsx
│       ├── CapacitySummaryCard.tsx
│       ├── QuickActionsBar.tsx
│       └── ShelterStatusBanner.tsx
├── bed-management/
│   ├── BedManagementScreen.tsx
│   ├── bed-service.ts
│   └── components/
│       ├── BedGrid.tsx
│       ├── BedStatusCard.tsx
│       └── OccupancyCounter.tsx
├── facilities/
│   ├── FacilitiesScreen.tsx
│   ├── facilities-service.ts
│   └── components/
│       ├── FacilityCard.tsx
│       ├── SanitationSection.tsx
│       └── FacilityEditor.tsx
├── inventory/
│   ├── InventoryScreen.tsx
│   ├── UsageLogScreen.tsx
│   ├── inventory-service.ts
│   ├── usage-tracker.ts
│   └── components/
│       ├── InventoryItemCard.tsx
│       ├── AddItemForm.tsx
│       ├── UsageEntryForm.tsx
│       ├── StockLevelBar.tsx
│       └── UsageHistoryList.tsx
├── metadata/
│   ├── metadata-service.ts
│   ├── metadata-consolidator.ts
│   └── occupant-service.ts
│       ├── OccupantAdmissionScreen.tsx
│       ├── OccupantListScreen.tsx
│       └── components/
│           ├── OccupantCard.tsx
│           ├── AdmissionForm.tsx
│           └── StayDurationBadge.tsx
└── styles/
    ├── part2-base.css
    ├── registration.css
    ├── dashboard.css
    ├── beds.css
    ├── facilities.css
    └── inventory.css
```

---

## Cross-Part Dependencies

Part 2 writes shelter registration and metadata to the Firebase `shelter-providers/{shelterId}/` collection. This data is read by Part 1's SOS system (which caches it locally for offline shelter discovery and ranking) and by Part 3's shelter-scoring algorithm (which calculates a readiness score based on the current metadata). Part 2 also writes inventory data including usage logs which Part 3's stock-prediction and ordering system reads to determine consumption rates and generate orders.

Part 2 reads user profile data from `users/{appId}/profile` (written by Part 1) when a shelter provider links an occupant to an existing application user by entering their application ID.

The shared utilities used by Part 2 include: `id-generator.ts` for generating unique shelter and person IDs, `offline-cache.ts` as the IndexedDB wrapper, `config.ts` for Firebase initialization, `paths.ts` for Firestore collection paths, and `tokens.css` for design system CSS variables.
