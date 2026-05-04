# Contexta

**Context-aware smartphone automation that makes your phone proactive, not reactive.**

Contexta reads real-time signals (calendar events, sensors) to detect user context — meetings, idle time, travel — and automatically adapts phone behavior: enabling DND, silencing ringers, and managing notifications, all on-device with zero cloud dependency.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React Native (Expo)  ←→  Context Logic  ←→  Android APIs  │
│  ─────────────────       ──────────────      ────────────── │
│  Dashboard UI            determineContext()   Calendar       │
│  Event Log               MEETING / IDLE       Silent Mode    │
│  Summary Stats           Confidence Score     DND Control    │
│  Override Controls       Keyword Classifier   AudioManager   │
└─────────────────────────────────────────────────────────────┘
         ↕ (future)
   Spring Boot Backend — analytics & decision sync
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React Native (Expo) | Dashboard, controls, event log |
| Logic | TypeScript + Java | Context detection, classification |
| Android | Native APIs | Calendar, AudioManager, NotificationManager |
| Backend | Spring Boot (Java) | Analytics sync (future) |

## Key Features

- **Calendar-based context detection** — reads device calendar, classifies events as MEETING/IDLE
- **Automatic DND + Silent Mode** — system-level phone actions triggered by context
- **On-device processing** — < 100ms latency, no data leaves the device
- **User override** — one-tap control to restore normal mode
- **Event logging** — transparent audit trail of all decisions
- **Accuracy tracking** — self-monitoring system performance

## Quick Start

```bash
cd frontend/contexta-app
npm install
npx expo start
```

## Project Structure

```
Contexta/
├── android/           # Native Android module
│   └── app/src/main/java/com/contexta/android/
│       ├── MainActivity.java              # Pipeline orchestrator
│       ├── action/MeetingModeController.java  # Silent + DND
│       ├── detector/MeetingDetector.java       # Calendar query
│       └── model/CalendarEventResult.java     # Result POJO
├── frontend/          # React Native (Expo) app
│   └── contexta-app/
│       ├── app/(tabs)/index.tsx           # Main dashboard
│       └── services/
│           ├── calendarBridge.ts           # Android bridge (mock)
│           └── contextDetector.ts         # Context logic
├── backend/           # Spring Boot API
└── docs/              # Architecture notes
```
