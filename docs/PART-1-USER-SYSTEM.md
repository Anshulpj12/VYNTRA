# VYNTRA — Part 1: User System (Complete Specification)

> **Assignee:** Team Member 1
> **Folder:** `src/part1-user-system/`
> **Routes:** `/auth/*`, `/user/*`, `/chat/*`, `/sos/*`

---

## Module A — Authentication & Google Login

When a person first visits the application, the first authentication mechanism is **Google Login**. The user does not immediately receive a normal manually created application identity; instead, after successful Google authentication, the system uses the authenticated Google information to create a **random, unique application ID** for that person. This generated ID becomes the internal identity of the user within the application and is associated with the user's Google authentication details. The format of this ID should be `VYNTRA-USR-<8-character-alphanumeric>`, for example `VYNTRA-USR-A7K2M9X1`. The ID generation must use the shared `generateUniqueId('USR')` utility from `src/shared/utils/id-generator.ts`. The purpose of generating a separate application ID is to provide a consistent identifier that can be used throughout the platform for profile records, World Chat records, emergency-support data, and other services without relying directly on manually entered identity information every time.

The authentication state must be persisted locally in IndexedDB so that the user remains logged in even when the device is offline. When the application launches, it should first check the locally cached auth state before attempting to verify with Firebase, following the offline-first approach. If the user is already authenticated locally, they can proceed directly to their home screen without needing internet connectivity. If they are not authenticated, they must be shown the login screen where the only available option is the Google Login button. Since Google OAuth itself requires internet connectivity, the login screen should clearly indicate if the device is offline and login is temporarily unavailable.

After authentication and the basic profile process, the application allows the person to choose the type of role they want to operate under. The system provides **three primary role options: User, Service Provider, and Women Shelter/Space Provider**. The **User** role is intended for the person who may require emergency assistance, displacement support, communication, shelter, medical assistance, transportation, or other services that will be connected to the remaining modules of the platform. Their profile and personal information become the foundation through which the platform can understand their requirements and later determine suitable support. The **Women Shelter/Space Provider** role is intended for the organization, institution, facility, or responsible person who provides a safe place or shelter space for women during emergency displacement. This role is connected to the availability and management of safe spaces, with the detailed shelter workflow being developed as Part 2. The third role is the **Service Provider**, which is connected to the supply and service side of the emergency-support ecosystem and is developed as Part 3. Part 1 only implements the complete User role flow. When a user selects the Shelter Provider role, the application should redirect them to the `/shelter/*` route prefix. When they select the Service Provider role, the application should redirect them to the `/service/*` route prefix. These routes belong to Part 2 and Part 3 respectively and will be implemented by those teams.

---

## Module B — User Profile Creation & Management

Once authentication is completed and the unique application ID has been generated, the user is taken through the profile-creation process. The user provides basic information such as **name, gender, age, location (state and district selected from predefined lists), home address, home geographical coordinates (auto-detected via device GPS with the option for manual override), and an emergency contact number**. The system then provides additional fields according to the information and requirements relevant to the user. For female users, this can include information related to **pregnancy (whether currently pregnant and estimated month), disability (multi-select from mobility, visual, hearing, cognitive, or none), medical conditions (free text for any chronic conditions), menstruation-related information (currently menstruating yes or no), and other special requirements or conditions** that could become important during an emergency. The purpose of this information is not simply to create a conventional user profile; it becomes important metadata that can later help the system understand the person's situation and determine what kind of emergency support may be appropriate. For example, if a person has a condition that makes normal evacuation difficult or requires specific resources, the system can use the stored information as part of the later prioritization and support mechanisms. The profile therefore acts as the basic information layer for the entire emergency-support system.

Once the user completes their information, the application associates the entered details with the generated unique application ID and stores the information as **user metadata**. When the user confirms or submits the profile, the information is transferred to **Firebase**, which acts as the online storage and backend data layer for the application. At the same time, important information is also stored locally on the user's device in IndexedDB so that the application can continue providing selected functionality even when the user does not have an active internet connection. This local storage is particularly important for an emergency system because the loss of connectivity should not automatically mean the loss of access to the user's own information or every application function. When connectivity is restored, the system can use its online backend to work with the stored information. The user can also return to their profile later and **view, modify, or update their information**, allowing the system to keep their current condition and requirements updated instead of depending permanently on the information entered during first registration. Profile changes are saved to IndexedDB immediately and then synced to Firebase when connectivity is available. A "last modified" timestamp is maintained, and a "pending sync" indicator is shown when offline edits have not yet been uploaded.

The system should also maintain a **profile completeness percentage** so the user can see how much of the available information they have filled out. Basic information fields are mandatory and block profile submission, while extended information fields (for female users) are strongly recommended but do not prevent the user from proceeding. The purpose is to encourage maximum information entry without creating a barrier during an urgent situation.

The profile data is stored in Firebase under the path `users/{appId}/profile` as a subcollection document containing all profile fields.

---

## Module C — Menstrual Cycle Tracker

The application contains a dedicated **menstrual-cycle recording module**. This module is intentionally designed as a tracking and record-keeping function rather than a prediction system. The user can manually indicate when their menstrual cycle **starts**, and at the time of recording, the application automatically attaches the **current date and time from the device** to the event. This means the user does not need to manually type the current timestamp every time they create a record. However, because the automatically recorded date or time may sometimes need correction, the user is also given the ability to **manually edit the recorded date and time** after it has been attached. Each record therefore stores both the auto-captured device timestamp and the user-edited timestamp (if any correction was made).

When the cycle ends, the user can mark the **end of the cycle**, and the application similarly stores the corresponding date and time with the same auto-capture-plus-optional-edit mechanism. The "End Cycle" action should only be available when a cycle is currently active (meaning a start has been recorded but no corresponding end exists yet). The application pairs each start event with its corresponding end event to form a complete cycle record and can calculate the duration in days between them.

These start and end records are maintained as historical information, allowing the user to look back at previous cycles instead of having only the latest record available. The application can use these stored records to create a **visual graph of the user's cycle history**, allowing the user to see their previously recorded information in an organized manner. The graph should display cycle lengths over time, with the X-axis representing months and the Y-axis representing cycle duration in days, rendered as a simple bar chart or timeline visualization. The graph must render entirely from locally stored data so it works offline.

The user can also attach **personal notes** to their records. These notes can be used to record what happened during a particular cycle, how the user felt, symptoms or observations, or any other information that the user personally considers relevant. Notes are stored as part of the cycle record and each note retains its own creation and update timestamps. These notes remain part of the user's personal records unless the user chooses to share relevant information through the communication system.

Importantly, this module does **not** contain a menstrual-cramp intensity scale and does **not** attempt to predict the user's next menstrual cycle. There is no 1–5 pain/intensity rating and no cycle-prediction mechanism; the purpose of this component is strictly to allow the user to record actual cycle events, maintain their history, visualize their recorded history, and add personal notes.

All cycle data is stored locally in IndexedDB for full offline functionality. The data is synced to Firebase under the path `users/{appId}/cycles/{cycleId}` when connectivity is available.

---

## Module D — World Chat System

Another major component of the application is the **World Chat**, which is designed as a geographically organized information-sharing system rather than a conventional unrestricted global chat. The purpose of this system is to allow users to share experiences, feelings, observations, local situations, or other relevant information with people associated with the same geographical region. Instead of placing all users into one common chat room, the system organizes the information primarily according to **state and district**. This means that information submitted by a person can remain associated with the region in which it is relevant, making the communication more useful during situations where local conditions may differ significantly between districts.

The system also introduces a **category-selection step before a message can be shared**. A user cannot simply open the chat and immediately submit a message. First, the user selects the category that represents the type of information they want to share. After selecting the category, they can write their message and submit it. The selected category is stored together with the message so that the system knows the nature or classification of the information being shared. The category list is defined in `src/shared/constants/chat-categories.ts` and can include categories such as Safety Alert, Medical Need, Resource Request, Community Update, General Experience, and Shelter Information.

### State & District Code System

The World Chat uses a **state and district identification mechanism** based on numerical codes. Each state is assigned a predefined numerical range, and the range can be configured according to the system's code structure as defined in `src/shared/constants/state-codes.ts`. For example, a particular state could have a range such as **400–600**, giving that state a defined pool of available numbers. The starting number does not have to be the same for every state; different states can have different predefined ranges. When the first person from a state or district registers in the system, the application can identify an available number from the appropriate state range and associate that allocation with the required regional information. When another user from the same region later attempts to use the system, the application does not simply generate an unrelated number every time. Instead, it attempts to identify an existing allocation and match the user's **state and district information** with the previously established regional assignment. This creates a structured relationship between the numerical code and the geographical region.

### Verification Flow

The user enters information such as their **state, district, and district code**, and the application then performs a series of checks before communicating with Firebase. The system first combines the information entered by the user with the system's predefined or generated state-code information. It verifies whether the entered number belongs to the valid numerical range associated with that state. It then checks whether the combination of information appears valid according to the information available locally on the device. The purpose of performing these checks locally is to avoid sending every small or obviously invalid search directly to the backend. If the locally performed checks indicate that the requested combination could be valid, the application can then contact **Firebase** to perform the required verification of the district information. This makes the verification process more efficient and reduces unnecessary database operations. The system also includes **rate limiting based on the search combination**, meaning that if a user repeatedly searches or submits the same combination of information, the application does not continuously send identical requests to Firebase without restriction. This protects the backend from unnecessary repeated requests and makes the regional verification mechanism more controlled. The rate-limiter utility from `src/shared/utils/rate-limiter.ts` must be used for this purpose.

District code assignment and verification data is stored in Firebase at the path `district-codes/{stateCode}/{districtCode}`. Locally verified district data is cached in IndexedDB so the user does not need to re-verify every time they access the chat.

### Six-Hour Data Cycle Architecture

Once the geographical information has been verified, the user can access the relevant World Chat information for that district. However, the system is deliberately not designed as a conventional continuously changing real-time chat where every message is treated as an individual update that must constantly be fetched and displayed. Instead, the World Chat uses a **six-hour data-cycle architecture**. The complete day is divided into four fixed periods: **12 AM–6 AM, 6 AM–12 PM, 12 PM–6 PM, and 6 PM–12 AM**. The boundaries are fixed at 12 AM, 6 AM, 12 PM, and 6 PM. During each six-hour period, all messages and selected experiences associated with the district are continuously collected into the active record for that period. This active data structure is called the **Current Record**, or pending record. While the six-hour period is still active, the Current Record remains open, and new messages can continue to be added to it. Each submitted message retains its associated information, including the **user ID, district code, selected category, message content, and timestamp**. Therefore, even though the messages are grouped into a six-hour regional record, the system still knows which user submitted the information, what category they selected, and when the information was submitted.

At the moment the six-hour period ends, the Current Record is closed. It then becomes a **Completed Record** representing the finished six-hour period for that particular regional data set. Once the record has become completed, new messages are not added to that same record. Instead, the application creates a new Current Record for the next six-hour period. For example, during the period from **12 PM to 6 PM**, the system maintains one Current Record. At 6 PM, that record becomes a Completed Record, and a new Current Record is created for the **6 PM–12 AM** period. The same process continues throughout the day. Therefore, the basic data flow can be represented as **Current Record → six-hour period completes → Completed Record → new Current Record**. When a user opens World Chat, selects their district, and presses the **Fetch** option, the application first verifies the district code and then retrieves the relevant regional information according to the system's fetching logic. This allows the application to work with grouped six-hour regional information rather than continuously performing independent retrieval operations for every individual message. The system's final policy for how long completed records are retained, archived, or deleted can be defined separately; the important architecture is that the currently active six-hour record and the completed six-hour record remain conceptually separate.

The World Chat data is stored in Firebase under `world-chat/{stateCode}/{districtCode}/current-record` for the active 6-hour record, and `world-chat/{stateCode}/{districtCode}/completed-records/{periodId}` for completed records. Previously fetched records are cached in IndexedDB so they can be viewed offline, and messages written while offline are queued locally for submission when connectivity returns.

---

## Module E — SOS Interface (User Side Only)

The main application contains an easily accessible **SOS system on the front page** so that a woman does not need to navigate through multiple screens during an emergency. The SOS button must be prominently placed on the home screen, large, high-contrast, and positioned in the bottom portion of the viewport for thumb-friendly access. The minimum touch target size for the SOS button is 64×64px, and it should use the primary safety rose-coral color from the design system.

### Location Acquisition

When the user presses SOS, the system first attempts to obtain the user's **current exact geographical coordinates** through device location. If the user allows location access, the SOS system uses the exact location of the woman at the time the SOS is pressed. If location access is unavailable, disabled, or the user does not want to provide live location, the application can fall back to the **registered coordinates associated with the woman's profile/home location** that are already stored locally. This provides an offline-capable fallback instead of making live GPS access the only way to generate an SOS request.

### Emergency Condition Selection

After the SOS is initiated, the application provides the woman with a structured set of emergency conditions or requirements that can be selected. The available conditions can represent situations such as **pregnancy (code: PG), menstruation (MN), vomiting (VM), medical difficulty (MD), requirement of a wheelchair (WC), need for healthcare support (HC), sanitation requirements (SN), acute distress (AD), child care required (CC), or elderly assistance (EA)**. The purpose is not to make the woman type a long explanation during an emergency; instead, the application uses predefined conditions that can be represented by compact unique codes. These condition codes are defined in `src/shared/constants/sos-codes.ts`. The user's existing profile information is already available locally because the application is designed as an offline-first system. Therefore, necessary information that has already been entered into the user's profile can be reused without requiring another online request. The system provides a **"Continue/Use Saved Information"** option so that the woman does not have to manually select every piece of information when the necessary information is already present in her locally stored profile. For example, if the profile indicates the woman is pregnant, the `PG` condition is automatically included.

### Compact SOS Code Generation

The selected emergency information is converted into a **compact SOS code**. Each important condition has its own predefined short code that represents a larger meaning. The selected emergency conditions, required information, and location are then encoded together into a single compact SOS message/code. The format of this code is: `VYNTRA|<latitude>,<longitude>|<condition-codes-joined-by-dashes>|<userId>|<timestamp>`. For example: `VYNTRA|26.9124,75.7873|PG-MD-WC|USR-A7K2M9X1|1696588800`. The final code therefore contains both the woman's relevant emergency information and her location information in a compact form that can be transmitted through a normal SMS message even when the main application has limited or no internet connectivity. The encoding and decoding logic for these codes must be consistent between Part 1 (encoding on the user side) and Part 3 (decoding on the shelter/dispatch side), and the specification is shared through `src/shared/constants/sos-codes.ts`.

### Shelter Discovery & Ranking

The shelter-discovery system uses the locally cached shelter dataset for the user's selected district. When a user has an internet connection, the application can download and cache the relevant shelter information for the selected district. Therefore, the application does not need to continuously depend on the internet to know which shelters are available in that district. The locally cached dataset contains the shelter identity, coordinates, score, contact number, city/district information, and the relevant current resource/facility information. As the shelter information changes while the user is online, the local dataset can be updated with the latest available information so that the application has a usable emergency dataset even when connectivity is later lost.

When the woman has an internet connection, the application can display the shelters on a map. Each registered shelter is represented by a **coloured map point**, while the woman's current SOS location is represented separately by a location dot. This allows the user to visually understand where she is in relation to the available shelters. Below or alongside the map, the system ranks the available shelters according to their **priority score and geographical distance**. A shelter with stronger available facilities/resources and a suitable distance can therefore receive a higher position in the recommended list. The geographical distance must be calculated using the Haversine formula from `src/shared/utils/geo-distance.ts`. The system does not depend completely on the visual map, however. Because the shelter coordinates are already cached locally, if the internet is unavailable and the map cannot be rendered or updated, the application can still calculate and compare the geographical distance using the stored coordinates and rank the shelters below the map based on proximity and shelter score. Thus, the core emergency-selection process continues to work even when the map itself is unavailable offline.

### SMS Dispatch

The woman can then select the shelter she prefers from the available shelter list/map. Once she selects a shelter, the application uses the shelter's **cached registered mobile number**, which is associated with its shelter name, location, Shelter ID, and other stored details. Instead of requiring a separate internet-based messaging service, the application opens the device's normal **message/SMS application** with the selected shelter provider's number already placed as the recipient. The compact SOS code generated by the application is automatically inserted into the message body. Therefore, the woman only needs to select the shelter and press **Send**. The application handles the preparation of the recipient number and emergency code automatically. The complete flow is therefore designed around information that has already been cached on the device, allowing the emergency communication to work even when the main application itself is offline.

**Important:** Part 1 only handles the SOS from the **user's side** — generating and sending the SOS. The receiving, decoding, location display, and navigation on the shelter provider's side is handled by Part 3 (the Decode/Dispatch system).

The SOS process does not write anything to Firebase. It is entirely offline-capable. The shelter data is read from the locally cached IndexedDB store, which was originally populated from the Firebase `shelters/{districtCode}/` collection when the device was online.

---

## Folder Structure

```
src/part1-user-system/
├── README.md
├── auth/
│   ├── LoginScreen.tsx
│   ├── RoleSelectScreen.tsx
│   ├── auth-service.ts
│   └── auth-store.ts
├── profile/
│   ├── ProfileCreateScreen.tsx
│   ├── ProfileViewScreen.tsx
│   ├── ProfileEditScreen.tsx
│   ├── profile-service.ts
│   ├── profile-store.ts
│   └── components/
│       ├── BasicInfoForm.tsx
│       ├── ExtendedInfoForm.tsx
│       ├── ProfileCompletenessBar.tsx
│       └── ProfileSummaryCard.tsx
├── menstrual-tracker/
│   ├── TrackerHomeScreen.tsx
│   ├── CycleHistoryScreen.tsx
│   ├── CycleGraphScreen.tsx
│   ├── CycleDetailScreen.tsx
│   ├── AddNoteScreen.tsx
│   ├── tracker-service.ts
│   ├── tracker-store.ts
│   └── components/
│       ├── CycleStatusCard.tsx
│       ├── CycleTimeline.tsx
│       ├── CycleBarChart.tsx
│       ├── NotesList.tsx
│       └── StartEndButtons.tsx
├── world-chat/
│   ├── ChatEntryScreen.tsx
│   ├── DistrictChatScreen.tsx
│   ├── NewMessageScreen.tsx
│   ├── CompletedRecordScreen.tsx
│   ├── chat-service.ts
│   ├── chat-store.ts
│   ├── district-verifier.ts
│   ├── six-hour-cycle.ts
│   └── components/
│       ├── DistrictCodeForm.tsx
│       ├── CategorySelector.tsx
│       ├── MessageCard.tsx
│       ├── RecordPeriodHeader.tsx
│       └── FetchButton.tsx
├── sos/
│   ├── HomeScreen.tsx
│   ├── SOSLocationScreen.tsx
│   ├── SOSConditionsScreen.tsx
│   ├── SOSShelterSelectScreen.tsx
│   ├── SOSSendScreen.tsx
│   ├── sos-service.ts
│   ├── sos-encoder.ts
│   ├── shelter-cache.ts
│   └── components/
│       ├── SOSButton.tsx
│       ├── ConditionCheckbox.tsx
│       ├── ShelterCard.tsx
│       ├── ShelterMap.tsx
│       ├── ShelterRankedList.tsx
│       └── SOSCodePreview.tsx
└── styles/
    ├── part1-base.css
    ├── auth.css
    ├── profile.css
    ├── tracker.css
    ├── chat.css
    └── sos.css
```

---

## Cross-Part Dependencies

Part 1 reads shelter data (ID, name, coordinates, score, mobile number) that is written by Part 2 and scored by Part 3. This data is cached from the Firebase `shelters/` collection into local IndexedDB. Part 1 also writes user profile metadata to `users/{appId}/profile` which Part 2 can read when a shelter provider links a person by their application ID. The SOS code encoding specification in `src/shared/constants/sos-codes.ts` must be kept consistent with Part 3's decoding logic.

The shared utilities used by Part 1 include: `id-generator.ts` for generating unique user IDs, `geo-distance.ts` for Haversine distance calculation in shelter ranking, `rate-limiter.ts` for World Chat verification throttling, `offline-cache.ts` as the IndexedDB wrapper, `state-codes.ts` for state numerical ranges, `sos-codes.ts` for emergency condition codes, `chat-categories.ts` for World Chat categories, `config.ts` for Firebase initialization, `paths.ts` for Firestore collection paths, and `tokens.css` for design system CSS variables.
