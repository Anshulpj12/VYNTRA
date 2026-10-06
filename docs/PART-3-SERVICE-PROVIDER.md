# VYNTRA — Part 3: Service Provider, Shelter Scoring & Emergency Decode System (Complete Specification)

> **Assignee:** Team Member 3
> **Folder:** `src/part3-service-provider/`
> **Routes:** `/service/*`, `/orders/*`, `/dispatch/*`

---

## Module A — Service Provider Registration & Dashboard

The **Service Provider** is the resource-supply side of the platform, responsible for supplying shelters with the equipment, hygiene products, medical-support items, sanitation products, and other necessary resources required for women staying in emergency shelters. When a user enters the application after login, they can select the **Service Provider** role from the role selection screen (built in Part 1). After selecting this option, the provider completes their registration by entering the required provider information, including the **provider name/details, location, state, district, and geographical coordinates**. The geographical coordinates are critical because the system uses them to determine which shelters are nearest to which service providers when resource orders are generated. After registration, a unique Service Provider ID is generated using the shared `generateUniqueId('SVC')` utility, producing an ID in the format `VYNTRA-SVC-<8-character-alphanumeric>`. The registration data is stored in Firebase under the path `service-providers/{providerId}` and simultaneously cached locally in IndexedDB. After registration, the provider gets access to a dedicated professional **Service Provider Dashboard**, where incoming resource orders are received, reviewed, accepted, prepared, and dispatched.

---

## Module B — Connection With Shelter Inventory & Stock Monitoring

The Service Provider system is directly connected with the **Shelter Provider's inventory-management system** (built in Part 2). Inside the shelter dashboard, the provider can maintain a complete inventory of the resources available at the shelter. The shelter can add a completely new inventory item by entering its name and the amount of stock currently available. Existing stock can also be manually edited whenever required. The inventory can contain items such as women's hygiene products, sanitary pads, sanitation-related materials, medical-support equipment, emergency-use equipment, and other necessary resources. Whenever a resource is used, the shelter provider can record the quantity consumed. During this usage entry, the system can ask whether the resource was associated with a particular person/patient. If it was associated with a person, the provider can enter that person's application ID and the required details. If the resource was used generally, for another purpose, or does not need to be associated with a particular person, the provider can skip the person-identification information. After the usage is recorded, the system automatically updates the corresponding inventory quantity and the current stock available in the shelter's inventory metadata.

The inventory system also continuously observes the **rate at which different resources are being consumed**. Based on historical usage data, the system can determine which resources are approaching an out-of-stock condition and can estimate approximately how long the existing stock is expected to remain available. The prediction is based on the actual usage intensity of that particular shelter rather than only on a fixed predefined value. As more usage data is collected, the system learns from the previous consumption pattern and can continuously correct its estimation, allowing the predicted remaining-stock period to become more suitable to the shelter's actual consumption behavior. Therefore, the shelter provider can see both the current stock condition and the predicted period for which that stock is likely to remain available. This stock-prediction logic is implemented in Part 3 because it requires analysis of cross-shelter consumption patterns and feeds directly into the ordering system.

**Important clarification on Part 2 vs Part 3 boundary:** Part 2 handles the shelter-side inventory management — adding items, recording usage, updating quantities. Part 3 reads that inventory data and usage logs from Firebase, runs the consumption-rate analysis and stock-prediction algorithms, and powers the ordering/supply system. The usage log data written by Part 2 at `shelter-providers/{shelterId}/inventory/{itemId}/usage-log/{logId}` is the input data source for Part 3's prediction engine.

---

## Module C — Order System & Resource Requests

When the shelter provider opens the **Order** section, the system connects directly with the current inventory-management data and shows resources that are becoming low, going out of stock, or may need replenishment according to the current stock and predicted consumption. The shelter provider can then select the required items by their names and specify the exact quantity required for each item. The complete order information, including the selected resources, quantities, shelter information, and relevant order data, is collected into a single order metadata structure. The order metadata includes the requesting shelter's ID, shelter name, location, coordinates, the list of requested items with quantities, the order timestamp, and the order status. Each order is assigned a unique ID using the shared `generateUniqueId('ORD')` utility, producing an ID in the format `VYNTRA-ORD-<8-character-alphanumeric>`.

The shelter provider can choose whether the request should be sent to **one specific nearby Service Provider** or distributed to **five nearby Service Providers**. When the single-provider option is selected, the shelter provider can choose a specific known provider. When the five-provider option is selected, the system identifies the relevant nearby Service Providers using their registered geographical coordinates. The distance between the shelter and each registered service provider is calculated using the Haversine formula from `src/shared/utils/geo-distance.ts`, and the five nearest providers are selected. The order/request information is then sent to the selected providers. The request data is cached locally from the database so that the order information and quantities remain available even when connectivity is temporarily limited.

Each selected Service Provider receives the order on their dashboard and can see exactly which items have been requested and in what quantities. The provider that accepts the request first gets the order assigned to their dashboard. This creates a **first-acceptance mechanism** in which multiple nearby providers can receive the same request, but the first provider who accepts it becomes responsible for fulfilling that order. Once one provider accepts, the order is marked as accepted and removed from the other providers' pending requests. The shelter provider can also choose to send the order to only one selected provider when they already know which provider should fulfil the requirement.

The order data is stored in Firebase under the path `orders/{orderId}` with references to the requesting shelter ID and the accepting provider ID. Order status progresses through the stages: `pending` → `accepted` → `preparing` → `dispatched` → `delivered` → `confirmed`.

---

## Module D — Dispatch, Delivery & Automatic Inventory Update

After a Service Provider accepts an order, the requested items and quantities appear in the provider's dashboard. The provider can locally manage and mark the order details, including the availability and preparation of the requested quantities. The provider can check off each item as it is prepared and mark the required quantities as fulfilled. Once all requested items and their required quantities have been prepared and fulfilled, the provider gets the **Dispatch** option. The dispatch button only becomes available when all items in the order are marked as prepared.

When the provider confirms dispatch, the system sends the dispatch confirmation and complete order information back to the requesting shelter provider. The shelter provider then receives a notification and a confirmation request and must explicitly confirm that the delivery has been received. This prevents the system from automatically updating inventory based on a dispatch that may not have actually arrived.

Only after the shelter provider confirms the received delivery does the system update the shelter's inventory/storage data. The **exact same items and exact quantities that were ordered and confirmed as received** are automatically added to the corresponding storage/inventory section of the shelter dashboard. This prevents the delivered quantity from being manually re-entered and keeps the shelter's current stock synchronized with the completed order. The completed transaction is therefore connected from the original order through provider acceptance, preparation, dispatch, shelter confirmation, and final inventory update.

The complete resource-transfer process can therefore be represented as: **Shelter Provider Inventory → Monitor Current Stock → Record Usage → Update Stock → Analyze Usage Intensity → Predict Remaining Stock Availability → Identify Low/Upcoming Shortage Items → Open Order Section → Select Required Equipment/Resources → Enter Required Quantities → Select One Provider OR Five Nearby Providers → Send Order Metadata → Cache Order Data → Provider Receives Order → First Provider Accepts → Order Appears on Provider Dashboard → Provider Checks/Prepares Required Items → Marks Required Quantities → Complete Order Preparation → Confirm Dispatch → Dispatch Confirmation Sent to Shelter → Shelter Receives Delivery → Shelter Confirms Receipt → Exact Ordered Items and Quantities Automatically Added to Shelter Storage/Inventory → Shelter Metadata Updated.**

The Service Provider system therefore forms the **resource-supply layer** of the emergency platform. It connects the shelter's live inventory with nearby resource providers and creates a complete supply cycle from **stock monitoring and consumption tracking to prediction, ordering, provider acceptance, dispatch, delivery confirmation, and automatic inventory updating**. This makes the resource system dynamic rather than requiring the shelter provider to manually contact suppliers and separately update their inventory after every delivery.

---

## Module E — Shelter Scoring System

After a **Women Shelter/Space Provider** completes registration (Part 2), the shelter already has its basic identity information such as shelter name, registered mobile number, geographical coordinates, city, and district. After this, the provider continuously builds and maintains the complete shelter profile through the professional dashboard (Part 2). The system uses the current information of the shelter to generate an overall **Shelter Readiness/Support Score out of 100**. The score is calculated from the important resources and facilities available at that shelter, such as available beds, women's sanitation facilities, sanitary napkins/pads and other hygiene resources, healthcare facilities, wheelchairs, medical-support equipment, operation/medical facilities where applicable, and other necessary resources required by women during an emergency. The specific weights assigned to each category for scoring purposes should be defined in `src/shared/constants/scoring-weights.ts` and can be adjusted as the system evolves.

Whenever the provider changes the condition of any facility or resource — for example, a bed becomes occupied, equipment becomes unavailable, inventory decreases, or a facility becomes available — the updated condition is loaded into the database and the shelter's current score is recalculated according to the available data. Along with the score, the system maintains the shelter's **unique Shelter ID, registered mobile number, geographical coordinates, city, district, name, facilities, resource availability, and other current metadata**. The geographical coordinates are especially important because the shelter is not only represented by its score but also by its actual physical location. The scoring algorithm reads data from the shelter metadata written by Part 2 at `shelter-providers/{shelterId}/metadata` and writes the calculated score back to the same metadata document so it is available for Part 1's SOS shelter-ranking system.

The scoring system is placed in Part 3 because it is a cross-cutting analytical function that combines shelter data with resource availability and feeds into the emergency-dispatch workflow. It runs whenever shelter metadata changes and keeps the score continuously up to date.

---

## Module F — SOS Decode, Emergency Display & Navigation (Shelter-Side)

When a woman sends an SOS message via SMS (the sending flow is built in Part 1), the shelter provider receives the message on their device. The provider can then open the **Decode/Dispatch** section in the shelter dashboard. The received SOS code is entered or pasted into the decoding system. The system separates the different components of the compact message: the **geographical coordinates are extracted separately**, while the individual emergency-condition codes are decoded back into their corresponding meanings. The SOS code format is `VYNTRA|<latitude>,<longitude>|<condition-codes-joined-by-dashes>|<userId>|<timestamp>`, and the decoding logic must match the encoding specification defined in `src/shared/constants/sos-codes.ts`. For example, a short condition code `PG` is converted back into "Pregnancy", `MD` into "Medical Difficulty", `WC` into "Wheelchair Required", and so on, so that the shelter provider can immediately understand what is happening and what type of support the woman requires. The decoded information is displayed together with the relevant emergency details, while the coordinates are used independently for location tracking and navigation.

The decoded coordinates are then displayed on the shelter provider's internal map as the **woman's emergency location**. If the woman had live location enabled when the SOS was created, the coordinates represent the location obtained at the time the SOS was pressed. The shelter provider can therefore see the woman's location relative to the shelter and understand where assistance needs to be sent. The provider's dashboard can display the decoded emergency requirements and the woman's location together so that the provider does not need to manually interpret a long text message.

Below the decoded location, the shelter provider receives a **Google Maps/navigation option**. When the provider selects it, the application passes the decoded woman's coordinates to the navigation system and opens navigation with the woman's location already defined as the destination. This allows the provider or responding shelter personnel to move directly from the shelter dashboard to navigation without manually copying latitude/longitude values or searching for the location. The complete emergency communication therefore follows the sequence: **Woman → SOS → Location + Emergency Conditions → Compact SOS Code → Selected Shelter's Cached Mobile Number → SMS Application → Send → Shelter Provider → Decode/Dispatch → Separate Coordinates + Emergency Codes → Decode Emergency Conditions → Display Woman's Location on Shelter Map → Open Navigation → Navigate to Woman**.

The SOS decode module is placed in Part 3 rather than Part 2 because it is the emergency-response operational layer that sits on top of the shelter management system. Part 2 handles the shelter's day-to-day management, while Part 3 handles the emergency response, scoring, and supply logistics that connect the shelter to the wider platform.

---

## Complete Offline Emergency Architecture

The complete offline emergency architecture can therefore operate as: **Shelter Registration (Part 2) → Shelter Coordinates + City + District + Shelter ID → Shelter Facilities/Equipment/Bed/Inventory Data → Calculate Current Shelter Score /100 (Part 3) → Continuously Update Score With Current Availability → Cache Shelter Dataset by District (Part 1) → Woman Has Cached Profile + Shelter Data → SOS Pressed (Part 1) → Request Location Permission → Use Exact Current Coordinates if Available → Otherwise Use Registered Profile/Home Coordinates → Select Emergency Conditions OR Continue With Saved Profile Information → Convert Conditions Into Short Unique Codes → Combine Codes + Coordinates + Required Information → Generate Compact SOS Message → Select Preferred Shelter → Use Cached Shelter Mobile Number → Open SMS Application → Automatically Insert Shelter Number + SOS Code → Woman Sends Message → Shelter Receives SOS → Open Decode/Dispatch (Part 3) → Decode Short Codes → Separate Coordinates → Display Emergency Conditions → Display Woman's Location → Open Navigation → Navigate to Woman**.

This layer makes the shelter network more than a directory of shelters. The shelters are continuously evaluated through their **current resources and facilities**, the user's emergency request can be generated using **locally available information**, nearby shelters can be ranked using **cached coordinates and scores**, and the final SOS can be delivered through the device's normal messaging system without requiring the complete application to remain online. The shelter provider can then decode the request, understand the woman's situation, locate her on the map, and directly start navigation to the emergency location.

---

## Folder Structure

```
src/part3-service-provider/
├── README.md
├── registration/
│   ├── ServiceProviderRegistrationScreen.tsx
│   ├── registration-service.ts
│   ├── registration-store.ts
│   └── components/
│       ├── ProviderInfoForm.tsx
│       └── LocationPicker.tsx
├── dashboard/
│   ├── ServiceDashboardScreen.tsx
│   ├── dashboard-service.ts
│   └── components/
│       ├── DashboardOverview.tsx
│       ├── IncomingOrdersList.tsx
│       ├── ActiveOrderCard.tsx
│       └── ProviderStatusBanner.tsx
├── orders/
│   ├── OrderCreationScreen.tsx
│   ├── OrderDetailScreen.tsx
│   ├── order-service.ts
│   ├── stock-predictor.ts
│   ├── nearest-provider-finder.ts
│   └── components/
│       ├── LowStockAlertList.tsx
│       ├── OrderItemSelector.tsx
│       ├── QuantityInput.tsx
│       ├── ProviderSelectionMode.tsx
│       └── OrderSummaryCard.tsx
├── dispatch/
│   ├── DispatchScreen.tsx
│   ├── DeliveryConfirmationScreen.tsx
│   ├── dispatch-service.ts
│   └── components/
│       ├── PrepareItemChecklist.tsx
│       ├── DispatchButton.tsx
│       ├── DeliveryReceiptCard.tsx
│       └── InventoryAutoUpdateBanner.tsx
├── shelter-scoring/
│   ├── scoring-engine.ts
│   ├── score-calculator.ts
│   └── components/
│       └── ShelterScoreCard.tsx
├── sos-decode/
│   ├── SOSDecodeScreen.tsx
│   ├── sos-decoder.ts
│   ├── navigation-launcher.ts
│   └── components/
│       ├── SOSCodeInput.tsx
│       ├── DecodedConditionsDisplay.tsx
│       ├── EmergencyLocationMap.tsx
│       └── NavigateButton.tsx
└── styles/
    ├── part3-base.css
    ├── registration.css
    ├── dashboard.css
    ├── orders.css
    ├── dispatch.css
    ├── scoring.css
    └── sos-decode.css
```

---

## Cross-Part Dependencies

Part 3 reads shelter metadata from `shelter-providers/{shelterId}/metadata` (written by Part 2) to calculate shelter scores and identify inventory shortages. It also reads inventory usage logs from `shelter-providers/{shelterId}/inventory/{itemId}/usage-log/{logId}` (written by Part 2) for stock-prediction analysis. Part 3 writes the calculated shelter score back to the shelter metadata document so that Part 1's SOS system can use it for shelter ranking. Part 3 also writes and manages order documents at `orders/{orderId}` which both the service provider and shelter provider dashboards read. After delivery confirmation, Part 3 writes the updated inventory quantities back to `shelter-providers/{shelterId}/inventory/{itemId}` to complete the automatic stock update.

Part 3 reads the SOS code encoding specification from `src/shared/constants/sos-codes.ts` (shared with Part 1's encoder) to decode incoming SOS messages. The decoding must produce the exact reverse of Part 1's encoding — the same condition codes, the same coordinate format, and the same field ordering.

The shared utilities used by Part 3 include: `id-generator.ts` for generating unique order and provider IDs, `geo-distance.ts` for Haversine distance calculation when finding nearest service providers, `offline-cache.ts` as the IndexedDB wrapper, `config.ts` for Firebase initialization, `paths.ts` for Firestore collection paths, `sos-codes.ts` for emergency condition codes, `scoring-weights.ts` for shelter score calculation weights, and `tokens.css` for design system CSS variables.
