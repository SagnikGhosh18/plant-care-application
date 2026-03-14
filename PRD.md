# Plant Identification & Care App — Product Requirements Document

**Version:** 1.0
**Audience:** Engineering Team
**Status:** Draft

---

## 1. Product Overview

A mobile application that enables users to identify plants via camera, build a personal plant library, and maintain plant health through AI-driven care instructions and reminders. The AI layer is powered by Claude (Anthropic) for plant identification, care content generation, and conversational support. All user data is stored locally on-device using SQLite — no backend or cloud infrastructure required.

---

## 2. Goals & Success Metrics

| Metric | Description |
|---|---|
| Plants scanned per user | Measures core feature adoption |
| Daily active users (DAU) | Measures retention and engagement |
| Reminder completion rate | Measures task/reminder utility |
| Chatbot usage rate | Measures AI botanist adoption |
| Average collection size | Measures long-term stickiness |

---

## 3. App Architecture

### 3.1 Navigation

The app uses a **bottom navigation bar** with three primary tabs:

| Tab | Screen |
|---|---|
| 🌿 Library | Plant collection (default home screen) |
| 💬 Botanist | AI chatbot |
| 🔔 Reminders | Task and care reminders |

### 3.2 Storage

All data is persisted locally using **SQLite** via `expo-sqlite`. No data leaves the device except for Claude API calls during plant identification and chatbot queries.

**Data stored in SQLite:**
- Plant library (plant records, care data)
- Reminder and task state
- Chatbot conversation history (optional, per session)

**Photos** are stored on the local file system. Before saving, images are compressed to reduce storage footprint. Only the file path is stored in SQLite. Images are sent to the Claude API transiently as base64 for identification only and are not retained server-side.

---

## 4. Feature Specifications

### 4.1 Plant Library

**Overview**
The main screen reads all plant records from SQLite and displays them in the user's collection. Users can scan a new plant or open an existing plant's detail page. The library is fully functional offline.

---

#### 4.1.1 Add Plant Flow

```
User taps "Scan Plant"
  → Camera opens
  → User captures photo
  → Image is compressed before use
  → [Requires connectivity] Image sent to Claude API (base64) for identification
  → Claude returns: plant name, scientific name, care instructions
  → User is shown identification result + confirmation prompt
  → On confirm → Plant record written to SQLite; compressed image saved to local file system
  → On reject → User can retake photo or cancel
```

**Engineering Notes:**
- Compress the image (resize + JPEG quality reduction) before sending to Claude API and before saving to disk. Target: max 1024px on longest side, JPEG 70% quality.
- Show a loading state during the API call.
- If the device is offline, show a clear message: *"Plant identification requires an internet connection. Your photo has not been lost — try again when you're back online."*
- Handle errors for: failed identification, poor image quality, network timeout, Claude API errors.

---

#### 4.1.2 SQLite Schema

**`plants` table**

| Column | Type | Description |
|---|---|---|
| `id` | TEXT (UUID) | Primary key, generated client-side |
| `name` | TEXT | Common name |
| `scientific_name` | TEXT | Latin name |
| `photo_path` | TEXT | Local file system path to compressed image |
| `watering_schedule` | TEXT | Frequency/instructions for watering |
| `light_requirements` | TEXT | Light level and placement |
| `fertilizer_guidance` | TEXT | Type and frequency of fertilizer |
| `common_problems` | TEXT | JSON-serialised array of known issues |
| `last_watered_at` | INTEGER | Unix timestamp of last watering |
| `last_fertilized_at` | INTEGER | Unix timestamp of last fertilization |
| `created_at` | INTEGER | Unix timestamp of when plant was added |

**`reminders` table**

| Column | Type | Description |
|---|---|---|
| `id` | TEXT (UUID) | Primary key |
| `plant_id` | TEXT | Foreign key → `plants.id` |
| `type` | TEXT | One of: `water`, `fertilize`, `repot`, `rotate` |
| `scheduled_at` | INTEGER | Unix timestamp for next reminder |
| `completed_at` | INTEGER | Unix timestamp when marked done (nullable) |
| `notification_id` | TEXT | expo-notifications identifier for cancellation |

---

### 4.2 Plant Detail Page

Each plant has a dedicated detail page. All data is read from SQLite — fully available offline.

| Section | Content |
|---|---|
| Overview | Plant name, scientific name, photo |
| Care Guide | Watering, sunlight, fertilizer |
| Common Problems | Diseases and troubleshooting tips |
| Plant History | Last watered / last fertilized timestamps |
| Quick Actions | "Mark as Watered" / "Mark as Fertilized" buttons |

**Quick Action Behaviour:**
- Tapping "Mark as Watered" updates `last_watered_at` in SQLite and dismisses/updates the related reminder.
- Tapping "Mark as Fertilized" updates `last_fertilized_at` in SQLite and dismisses/updates the related reminder.
- Both actions are fully offline — no connectivity required.

---

### 4.3 Consult With Botanist (AI Chatbot)

Users can chat with an AI botanist powered by Claude. **Requires connectivity** for all Claude API calls.

**Context passed to Claude per session:**
- Selected plant species (if applicable)
- Plant care history (`last_watered_at`, `last_fertilized_at`), read from SQLite
- Optional user-uploaded photo (compressed, sent as base64 for that message only)
- Prior messages in the conversation (maintained in-memory per session)

**Offline Behaviour:**
- If offline, the chat input is disabled and a banner is shown: *"Chatting with the botanist requires an internet connection."*
- Previously loaded conversation history (if persisted) remains visible and readable.

**Engineering Notes:**
- No server-side session — all conversation history is managed client-side.
- Claude API is called directly from the device with full message history in each request.
- Use `claude-sonnet-4-20250514` as the model.
- System prompt should include plant context and instruct Claude to act as a knowledgeable botanist.

---

### 4.4 Reminders & Tasks

The app auto-generates care reminders from plant records in SQLite. All reminder logic runs locally using **`expo-notifications`** — no push server required.

**Reminder Types:**

| Reminder | Trigger Logic |
|---|---|
| Water plant | Derived from `watering_schedule` + `last_watered_at` |
| Fertilize plant | Derived from `fertilizer_guidance` + `last_fertilized_at` |
| Repot plant | Periodic (every 12 months) |
| Rotate for sunlight | Periodic (every 2 weeks) |

**Task Behaviour:**
- Reminders are scheduled locally via `expo-notifications` when a plant is added or a quick action is completed.
- All task state is stored in SQLite and readable offline.
- Marking a task complete updates the plant record in SQLite and reschedules the next reminder.
- Notification permissions must be requested on first use.

---

## 5. Offline Support Summary

| Feature | Offline Available? | Notes |
|---|---|---|
| View plant library | ✅ Yes | Reads from SQLite |
| View plant detail | ✅ Yes | Reads from SQLite |
| Mark as watered / fertilized | ✅ Yes | Writes to SQLite |
| View & manage reminders | ✅ Yes | Reads/writes SQLite |
| Local notifications | ✅ Yes | Scheduled via expo-notifications |
| Scan & identify plant | ❌ No | Requires Claude API |
| Consult botanist (chat) | ❌ No | Requires Claude API |

---

## 6. AI Usage Summary (Claude)

| Use Case | Input | Expected Output |
|---|---|---|
| Plant identification | Compressed image (base64, sent once) | Name, scientific name, care data |
| Care instruction generation | Plant species | Structured care instructions |
| Botanist chatbot | User query + plant context + optional image | Natural language response |

**Claude API model:** `claude-sonnet-4-20250514`

---

## 7. Out of Scope (v1)

- Cloud sync or multi-device support
- User accounts or authentication
- Social or community features
- Plant marketplace or e-commerce
- Third-party smart device integrations (e.g., soil sensors)
- Web app — mobile only for v1

---

## 8. Open Questions for Engineering

1. **Claude API key management** — Store via `expo-constants` from an `.env` file. Must not be hardcoded or committed to version control.
2. **Conversation history persistence** — Should chatbot history be persisted to SQLite across sessions, or cleared on app close? (Recommend: persist, with a "Clear chat" option.)
3. **Data loss risk** — Since all data is local, consider offering a JSON export/backup option in a future version.