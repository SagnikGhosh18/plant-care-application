# CLAUDE.md — Plant Identification & Care App

This file provides instructions for Claude Code when working on this project.
Read this fully before writing any code.

---

## Project Overview

A React Native (Expo) mobile app for plant identification and care management.
All data is stored locally on-device. The only network dependency is the Anthropic Claude API.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native via Expo (bare workflow — `expo run:android` / `expo run:ios`) |
| Language | TypeScript (strict mode) |
| Navigation | Expo Router v55 (file-based routing) |
| Database | expo-sqlite v55 |
| Notifications | expo-notifications v55 |
| Camera | expo-camera v55 |
| Image manipulation | expo-image-manipulator v55 |
| Image picker | expo-image-picker v55 |
| Icons | @expo/vector-icons (Ionicons) |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| State management | Zustand v5 |
| Styling | StyleSheet (React Native built-in) — no third-party UI libraries |

---

## Project Structure

```
app/
  (tabs)/
    _layout.tsx         # Tab bar layout (Library / Botanist / Reminders)
    index.tsx           # Plant Library (default tab)
    botanist.tsx        # Consult Botanist chatbot
    reminders.tsx       # Reminders & Tasks
  plant/
    [id].tsx            # Plant Detail page
  _layout.tsx           # Root layout — DB init, notification permissions, store bootstrap

src/
  db/
    schema.ts           # SQLite open + CREATE TABLE migrations (openDatabaseSync)
    plants.ts           # CRUD operations for plants table
    reminders.ts        # CRUD operations for reminders table

  services/
    claude.ts           # All Anthropic API calls (identification + chat)
    notifications.ts    # expo-notifications scheduling and cancellation
    imageUtils.ts       # Image compression + base64 encode + delete

  store/
    usePlantStore.ts    # Zustand store for plant library state
    useReminderStore.ts # Zustand store for reminder/task state

  hooks/
    useNetworkStatus.ts # Hook to detect online/offline state
    usePlants.ts        # Hook wrapping DB + store for plant operations
    useReminders.ts     # Hook wrapping DB + store for reminder operations

  types/
    plant.ts            # Plant, PlantIdentificationResult, PlantSummary types
    reminder.ts         # Reminder, ReminderType types
    chat.ts             # ChatMessage type

  constants/
    prompts.ts          # Claude system prompts + buildBotanistSystemPrompt()
```

---

## Architecture Rules

### 1. Database layer (`src/db/`)
- All raw SQLite operations live here. No component should import `expo-sqlite` directly.
- Uses `openDatabaseSync` from `expo-sqlite` (v55 synchronous API).
- Functions must be async and return typed results.
- Run migrations on app startup in `app/_layout.tsx`.
- Use transactions for multi-step writes (e.g., adding a plant + scheduling a reminder).

### 2. Services layer (`src/services/`)
- `claude.ts` handles all Anthropic API calls. No component should call the API directly.
- `notifications.ts` wraps all `expo-notifications` scheduling. No component should call expo-notifications directly.
- Notification triggers use `{ type: SchedulableTriggerInputTypes.DATE, date: timestamp }` — not a bare `Date` object.
- `imageUtils.ts` compresses images before they are saved or sent to the API. Compression target: max 1024px on the longest side, JPEG quality 0.7.
- `imageUtils.ts` imports from `expo-file-system/legacy` (not `expo-file-system`) to avoid deprecation of `getInfoAsync`.

### 3. Store layer (`src/store/`)
- Zustand stores hold in-memory state that mirrors the DB.
- On app start, load all plants and reminders from SQLite into the store.
- All writes go to SQLite first, then update the store. Never update the store without persisting to SQLite.

### 4. Hooks layer (`src/hooks/`)
- UI components interact with data only through hooks — never directly with the DB or store.
- Hooks compose DB operations + store updates into single callable functions (e.g., `addPlant`, `markAsWatered`).

### 5. Components
- Components are presentational where possible. Business logic lives in hooks and services.
- No component imports from `src/db/` or calls the Claude API directly.
- `CameraView` does not support children — overlay controls must be sibling `View`s with `position: 'absolute'` inside a common parent container.

---

## SQLite Schema

### `plants`
```sql
CREATE TABLE IF NOT EXISTS plants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  photo_path TEXT NOT NULL,
  watering_schedule TEXT NOT NULL,
  light_requirements TEXT NOT NULL,
  fertilizer_guidance TEXT NOT NULL,
  common_problems TEXT NOT NULL DEFAULT '[]',
  last_watered_at INTEGER,
  last_fertilized_at INTEGER,
  created_at INTEGER NOT NULL
);
```

### `reminders`
```sql
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('water', 'fertilize', 'repot', 'rotate')),
  scheduled_at INTEGER NOT NULL,
  completed_at INTEGER,
  notification_id TEXT,
  created_at INTEGER NOT NULL
);
```

---

## Claude API

### Configuration
- Model: `claude-sonnet-4-20250514`
- API key: loaded from environment variable `EXPO_PUBLIC_ANTHROPIC_API_KEY`
- Never hardcode the API key. Never commit it to version control.
- Called via `fetch` directly against `https://api.anthropic.com/v1/messages`.

### Plant Identification
- Send image as base64 with `media_type: "image/jpeg"`.
- Expect structured JSON back. Prompt Claude to return only JSON with no preamble.
- Parse and validate the response before writing to SQLite.

**Identification prompt (in `src/constants/prompts.ts`):**
```
You are a plant identification expert. Identify the plant in the image and return ONLY a JSON object with this exact structure, no preamble or explanation:
{
  "name": "common name",
  "scientific_name": "latin name",
  "watering_schedule": "how often and how to water",
  "light_requirements": "light level and placement advice",
  "fertilizer_guidance": "type and frequency of fertilizer",
  "common_problems": ["problem 1", "problem 2"]
}
If the image does not contain a plant, return: { "error": "No plant detected" }
```

### Botanist Chatbot
- Include a system prompt that sets Claude's role as a botanist.
- Inject the current plant's name, care data, and recent history into the system prompt when a plant context is selected.
- Pass the full conversation history (user + assistant messages) in every API call.
- Support optional image attachment in user messages (compressed base64).
- Conversation history is in-memory only — cleared on app close. No persistence to SQLite.

**Botanist system prompt (in `src/constants/prompts.ts`):**
```
You are a knowledgeable and friendly botanist assistant. Help users care for their plants with accurate, practical advice. Be concise and friendly. If the user has selected a plant, use its care information and history to give personalised advice.
```

---

## Offline Behaviour

Use the `useNetworkStatus` hook (wrapping `@react-native-community/netinfo`) to detect connectivity.

| Feature | Offline behaviour |
|---|---|
| Plant library | Fully functional — reads from SQLite |
| Plant detail | Fully functional — reads from SQLite |
| Mark as watered / fertilized | Fully functional — writes to SQLite |
| Reminders tab | Fully functional — reads/writes SQLite |
| Scan plant | Disable camera trigger. Show banner: "Plant identification requires an internet connection." |
| Botanist chat | Disable input. Show banner: "Chatting with the botanist requires an internet connection." |

---

## Notifications

Use `expo-notifications` for all local notification scheduling.

- Request permissions on first app launch (in `_layout.tsx`).
- When a plant is added, schedule reminders based on its care data.
- When a reminder is completed, cancel the existing notification (`notification_id`) and schedule the next one.
- On app launch, reconcile scheduled notifications against the `reminders` table to handle any that fired while the app was closed.
- Trigger format: `{ type: SchedulableTriggerInputTypes.DATE, date: number }` — import `SchedulableTriggerInputTypes` from `expo-notifications`.

---

## Image Handling

1. Capture with `expo-camera` or pick from gallery with `expo-image-picker`.
2. Compress immediately using `expo-image-manipulator`: resize to max 1024px, JPEG quality 0.7.
3. Save the compressed file to `FileSystem.documentDirectory + 'plants/'`.
4. Store only the file path in SQLite (`photo_path`).
5. When sending to Claude API, read the file and base64-encode it.
6. When a plant is deleted, delete the corresponding image file from disk.
7. Import file system utilities from `expo-file-system/legacy`.

---

## Code Style

- TypeScript strict mode enabled. No `any` types.
- Use `async/await` over `.then()` chains.
- All DB functions handle their own errors and throw typed errors upward.
- Use named exports everywhere. No default exports except for Expo Router screen files.
- Keep components under 150 lines. Extract logic to hooks if a component grows large.
- No inline styles — always use `StyleSheet.create()`.

---

## Environment Variables

Create a `.env.local` file at the root (never commit this — already in `.gitignore`):

```
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_key_here
```

Access in code via:
```ts
const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
```

---

## Key Dependencies

```json
{
  "expo": "~55.0.6",
  "expo-router": "~55.0.5",
  "expo-sqlite": "~55.0.10",
  "expo-camera": "~55.0.9",
  "expo-image-manipulator": "~55.0.10",
  "expo-image-picker": "~55.0.12",
  "expo-notifications": "~55.0.12",
  "expo-file-system": "~55.0.10",
  "expo-linking": "~55.0.7",
  "@expo/vector-icons": "^15.1.1",
  "@react-native-community/netinfo": "11.5.2",
  "@react-navigation/native": "^7.1.33",
  "react-native-safe-area-context": "~5.6.2",
  "react-native-screens": "~4.23.0",
  "react-native-gesture-handler": "~2.30.0",
  "react-native-reanimated": "4.2.1",
  "react-dom": "^19.2.0",
  "zustand": "^5.0.11",
  "uuid": "^13.0.0",
  "react-native-get-random-values": "^2.0.0",
  "typescript": "~5.9.2"
}
```

All packages installed with `--legacy-peer-deps` due to peer dependency conflicts in the react-dom tree.

---

## Do Not

- Do not use class components. Functional components with hooks only.
- Do not install a UI component library (no NativeBase, Tamagui, Gluestack, etc.). Use React Native's built-in components and `StyleSheet`.
- Do not call the Claude API from inside a component. Always go through `src/services/claude.ts`.
- Do not access SQLite from inside a component. Always go through hooks.
- Do not hardcode the API key anywhere.
- Do not use `expo-av` or other heavy media libraries — image-only for v1.
- Do not introduce a backend. This is a fully local app.
- Do not persist chatbot conversation history — it is session-only (in-memory).
- Do not import from `expo-file-system` directly — use `expo-file-system/legacy`.
- Do not pass a bare `Date` as a notification trigger — use `SchedulableTriggerInputTypes.DATE`.
- Do not place children inside `CameraView` — use absolute-positioned siblings instead.
- Do not run `npm install` without `--legacy-peer-deps`.
