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
| Framework | React Native via Expo (managed workflow) |
| Language | TypeScript (strict mode) |
| Navigation | Expo Router (file-based routing) |
| Database | expo-sqlite |
| Notifications | expo-notifications |
| Camera | expo-camera |
| Image manipulation | expo-image-manipulator |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| State management | Zustand |
| Styling | StyleSheet (React Native built-in) — no third-party UI libraries |

---

## Project Structure

```
app/
  (tabs)/
    index.tsx           # Plant Library (default tab)
    botanist.tsx        # Consult Botanist chatbot
    reminders.tsx       # Reminders & Tasks
  plant/
    [id].tsx            # Plant Detail page
  _layout.tsx           # Root layout with tab navigation

src/
  db/
    schema.ts           # SQLite table definitions and migrations
    plants.ts           # CRUD operations for plants table
    reminders.ts        # CRUD operations for reminders table

  services/
    claude.ts           # All Anthropic API calls (identification + chat)
    notifications.ts    # expo-notifications scheduling and cancellation
    imageUtils.ts       # Image compression logic

  store/
    usePlantStore.ts    # Zustand store for plant library state
    useReminderStore.ts # Zustand store for reminder/task state

  hooks/
    useNetworkStatus.ts # Hook to detect online/offline state
    usePlants.ts        # Hook wrapping DB + store for plant operations
    useReminders.ts     # Hook wrapping DB + store for reminder operations

  types/
    plant.ts            # Plant, CareInstructions, PlantSummary types
    reminder.ts         # Reminder, ReminderType types
    chat.ts             # ChatMessage type

  constants/
    prompts.ts          # Claude system prompts
```

---

## Architecture Rules

### 1. Database layer (`src/db/`)
- All raw SQLite operations live here. No component should import `expo-sqlite` directly.
- Functions must be async and return typed results.
- Run migrations on app startup in `_layout.tsx`.
- Use transactions for multi-step writes (e.g., adding a plant + scheduling a reminder).

### 2. Services layer (`src/services/`)
- `claude.ts` handles all Anthropic API calls. No component should call the API directly.
- `notifications.ts` wraps all `expo-notifications` scheduling. No component should call expo-notifications directly.
- `imageUtils.ts` compresses images before they are saved or sent to the API. Compression target: max 1024px on the longest side, JPEG quality 70.

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

---

## Image Handling

1. Capture with `expo-camera`.
2. Compress immediately using `expo-image-manipulator`: resize to max 1024px, JPEG quality 0.7.
3. Save the compressed file to `FileSystem.documentDirectory + 'plants/'`.
4. Store only the file path in SQLite (`photo_path`).
5. When sending to Claude API, read the file and base64-encode it.
6. When a plant is deleted, delete the corresponding image file from disk.

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

Create a `.env.local` file at the root (never commit this):

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
  "expo": "~51.0.0",
  "expo-router": "~3.0.0",
  "expo-sqlite": "~14.0.0",
  "expo-camera": "~15.0.0",
  "expo-image-manipulator": "~12.0.0",
  "expo-notifications": "~0.28.0",
  "expo-file-system": "~17.0.0",
  "@react-native-community/netinfo": "^11.0.0",
  "zustand": "^4.5.0",
  "typescript": "^5.0.0"
}
```

---

## Do Not

- Do not use class components. Functional components with hooks only.
- Do not install a UI component library (no NativeBase, Tamagui, Gluestack, etc.). Use React Native's built-in components and `StyleSheet`.
- Do not call the Claude API from inside a component. Always go through `src/services/claude.ts`.
- Do not access SQLite from inside a component. Always go through hooks.
- Do not hardcode the API key anywhere.
- Do not use `expo-av` or other heavy media libraries — image-only for v1.
- Do not introduce a backend. This is a fully local app.