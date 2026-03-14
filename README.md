# Plant ID — Plant Identification & Care App

A React Native (Expo) mobile app for identifying plants via camera and managing their care with AI-powered guidance and local reminders.

---

## Features

- **Plant Identification** — Scan a plant with your camera or upload from gallery. Claude AI identifies the species and returns care instructions instantly.
- **Plant Library** — Browse your collection in a 2-column grid. Cards show a warning badge when a plant has more than 3 overdue reminders.
- **Plant Detail** — View full care guide, common problems, a chronological history of care actions (completed, missed, upcoming), and quick-action buttons to log watering and fertilising.
- **Reminders** — Automatic reminders for watering, fertilising, repotting, and rotating. Split into Today/Upcoming sections. Tapping a reminder navigates to the plant detail page. Completing a reminder reschedules it automatically.
- **Botanist Chatbot** — Conversational plant care assistant powered by Claude. Supports optional plant context injection and image attachments. Typing animation shown while the AI responds.
- **Offline Support** — Library, detail, reminders, and quick actions all work offline. Identification and chatbot require an internet connection and display a banner when offline.
- **Local-first** — All data stored on-device via SQLite. No backend or cloud storage.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native via Expo SDK 55 |
| Language | TypeScript (strict) |
| Navigation | Expo Router v55 (file-based) |
| Database | expo-sqlite v55 (`openDatabaseSync`) |
| State | Zustand v5 |
| Notifications | expo-notifications v55 |
| Camera | expo-camera v55 |
| Image processing | expo-image-manipulator v55 |
| Gallery picker | expo-image-picker v55 |
| Icons | @expo/vector-icons (Ionicons) |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |

---

## Project Structure

```
app/
  (tabs)/
    _layout.tsx       # Tab bar (Library / Botanist / Reminders)
    index.tsx         # Plant Library screen
    botanist.tsx      # Botanist chatbot screen
    reminders.tsx     # Reminders screen
  plant/
    [id].tsx          # Plant detail screen
  _layout.tsx         # Root layout — DB init, notifications, store bootstrap

src/
  db/
    schema.ts         # SQLite schema + migrations
    plants.ts         # Plants CRUD
    reminders.ts      # Reminders CRUD

  services/
    claude.ts         # Anthropic API calls (identification + chat)
    notifications.ts  # expo-notifications scheduling
    imageUtils.ts     # Compression, base64, delete

  store/
    usePlantStore.ts      # In-memory plant state (Zustand)
    useReminderStore.ts   # In-memory reminder state (Zustand)

  hooks/
    useNetworkStatus.ts   # Online/offline detection
    usePlants.ts          # Plant operations (add, water, fertilise, delete)
    useReminders.ts       # Reminder operations + history + missed count

  types/
    plant.ts          # Plant, PlantIdentificationResult, PlantSummary
    reminder.ts       # Reminder, ReminderType
    chat.ts           # ChatMessage

  constants/
    prompts.ts        # Claude system prompts
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g @expo/cli`)
- Android Studio (for Android) or Xcode (for iOS)
- An Anthropic API key

### Setup

1. Clone the repo and install dependencies:

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is required due to peer dependency conflicts in the react-dom tree.

2. Create a `.env.local` file in the project root:

```
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_key_here
```

3. Run on Android or iOS:

```bash
expo run:android
# or
expo run:ios
```

---

## Architecture

The app uses a strict layered architecture. Data flows in one direction:

```
SQLite (DB layer)
    ↓
Services (API, notifications, image)
    ↓
Zustand stores (in-memory mirror of DB)
    ↓
Hooks (compose DB + store operations)
    ↓
Screens (presentational, calls hooks only)
```

### Key rules

- Components never import from `src/db/` or call the Claude API directly.
- All writes go to SQLite first, then update the store.
- `completed_at` stores the last care action timestamp. `scheduled_at` stores the next due date. Both persist independently — completing a reminder does not wipe the completion history.
- Notification triggers use `SchedulableTriggerInputTypes.DATE` (not a bare `Date` object).
- Images are compressed to max 1024px / JPEG 0.7 before saving or sending to the API.
- File system utilities import from `expo-file-system/legacy` (not `expo-file-system`).

---

## Data Model

### `plants`

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| name | TEXT | Common name |
| scientific_name | TEXT | Latin name |
| photo_path | TEXT | Local file path |
| watering_schedule | TEXT | From Claude |
| light_requirements | TEXT | From Claude |
| fertilizer_guidance | TEXT | From Claude |
| common_problems | TEXT | JSON array |
| last_watered_at | INTEGER | Unix ms, nullable |
| last_fertilized_at | INTEGER | Unix ms, nullable |
| created_at | INTEGER | Unix ms |

### `reminders`

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| plant_id | TEXT FK | References plants |
| type | TEXT | `water` / `fertilize` / `repot` / `rotate` |
| scheduled_at | INTEGER | Next due (Unix ms) |
| completed_at | INTEGER | Last completed (Unix ms), nullable |
| notification_id | TEXT | expo-notifications ID, nullable |
| created_at | INTEGER | Unix ms |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |

Never commit `.env.local` — it is listed in `.gitignore`.

---

## Reminder Schedule (defaults)

| Type | Initial delay | Reschedule interval |
|---|---|---|
| Water | 3 days | 3 days |
| Fertilize | 14 days | 14 days |
| Repot | 365 days | 365 days |
| Rotate | 14 days | 14 days |
