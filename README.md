# Contexta

**Context-aware smartphone automation that makes your phone proactive, not reactive.**

Contexta reads real-time signals (calendar events, accelerometer, WiFi) to detect user context — meetings, commuting, home arrival — and automatically adapts phone behavior: enabling DND, suggesting Maps/Music, switching to personal mode, all on-device with zero cloud dependency.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  React Native (Expo)  ←→  Context Logic  ←→  Android Native APIs    │
│  ─────────────────       ──────────────      ──────────────────────  │
│  Dashboard UI            determineContext()   Calendar (READ_CALENDAR)│
│  3 Context Cards         MEETING / IDLE       AudioManager (Silent)  │
│  Event Log               COMMUTING / STAT.    NotificationMgr (DND)  │
│  Settings Screen         HOME / AWAY          SensorManager (Accel.) │
│  Home Mode Theme         Confidence Score     WifiManager (SSID)     │
│  Movement CTAs           Variance Threshold   Intent (Maps/Spotify)  │
└──────────────────────────────────────────────────────────────────────┘
         ↕ (analytics sync)
   Spring Boot Backend — /context, /movement, /home/detect
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------| 
| Frontend | React Native (Expo) | Dashboard, 3 context cards, settings, event log |
| Logic | TypeScript + Java | Context detection, classification, threshold engine |
| Android | Native APIs | Calendar, AudioManager, SensorManager, WifiManager |
| Backend | Spring Boot (Java) | Analytics sync, profile management |

## Key Features

### Feature 1: Meeting Detection
- **Calendar-based context detection** — reads device calendar, classifies events as MEETING/IDLE
- **Automatic DND + Silent Mode** — system-level phone actions triggered by context
- **Confidence scoring** — 0.91 for keyword match

### Feature 2: Movement Detection
- **Accelerometer variance** — rolling 5s window, threshold > 0.8 = "moving"
- **Transport mode** — walking (>0.8) / driving (>3.0) classification
- **Actionable CTAs** — Maps deep link for navigation, Spotify for music
- **ETA suggestion** — static string (MVP)

### Feature 3: Home Detection
- **WiFi SSID matching** — compares current network against stored home SSID
- **Profile switching** — HOME mode with volume, wallpaper hint, notification grouping
- **Setup screen** — "Set this as Home" button in Settings tab
- **Visual theme** — UI switches to green-tinted theme when Home detected

## Common Features
- **On-device processing** — < 100ms latency, no data leaves the device
- **User override** — one-tap control to restore normal mode
- **Event logging** — transparent audit trail of all decisions
- **3 context cards** — unified dashboard with all detection results

## Quick Start

```bash
cd frontend/contexta-app
npm install
npx expo start
```

## Project Structure

```
Contexta/
├── android/                    # Native Android module
│   └── app/src/main/java/com/contexta/android/
│       ├── MainActivity.java                    # Pipeline orchestrator (3 features)
│       ├── action/
│       │   ├── MeetingModeController.java       # Silent + DND control
│       │   ├── MovementActionController.java    # Maps/Spotify intents
│       │   └── HomeProfileController.java       # Profile switching
│       ├── detector/
│       │   ├── MeetingDetector.java             # Calendar query + classify
│       │   ├── MovementDetector.java            # Accelerometer variance
│       │   └── HomeDetector.java                # WiFi SSID matching
│       └── model/
│           ├── CalendarEventResult.java         # Meeting result POJO
│           ├── MovementResult.java              # Movement result POJO
│           └── HomeDetectionResult.java         # Home result POJO
├── frontend/                   # React Native (Expo) app
│   └── contexta-app/
│       ├── app/(tabs)/
│       │   ├── index.tsx                        # Main dashboard (3 cards)
│       │   ├── explore.tsx                      # Explore tab
│       │   ├── settings.tsx                     # Home SSID config
│       │   └── _layout.tsx                      # Tab navigator
│       └── services/
│           ├── calendarBridge.ts                # Mock calendar bridge
│           ├── contextDetector.ts               # Meeting context logic
│           ├── movementBridge.ts                # Mock accelerometer bridge
│           ├── movementDetector.ts              # Movement context logic
│           ├── homeBridge.ts                    # Mock WiFi bridge
│           └── homeDetector.ts                  # Home context logic
├── backend/                    # Spring Boot API
│   └── contexta-backend/
│       └── src/main/java/com/contexta/
│           ├── ContextaApplication.java         # App entry + CORS
│           ├── controller/
│           │   ├── ContextController.java       # POST /context
│           │   ├── MovementController.java      # POST /movement
│           │   └── HomeController.java          # POST /home/detect
│           └── model/
│               ├── MovementEvent.java           # Movement DTO
│               └── HomeEvent.java               # Home DTO
└── docs/
    └── architecture.md                          # System architecture
```
