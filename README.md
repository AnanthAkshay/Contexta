![Platform](https://img.shields.io/badge/Platform-Android-green)
![Framework](https://img.shields.io/badge/Framework-React%20Native%20Expo-blue)
![Backend](https://img.shields.io/badge/Backend-Spring%20Boot-brightgreen)

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

## Team
| Name | Role |
|------|------|
| [Name 1] | Frontend / React Native |
| [Name 2] | Android Native Modules |
| [Name 3] | Backend / Spring Boot |
| [Name 4] | Integration & Testing |

## Screenshots
> Screenshots from a Samsung Galaxy device running the app in demo mode.

| Dashboard — Home Mode | Meeting Detection Active | Movement — Walking |
|---|---|---|
| ![Home Mode](docs/screenshots/home-mode.png) | ![Meeting](docs/screenshots/meeting-active.png) | ![Walking](docs/screenshots/walking.png) |

## Download APK
Download: [contexta-debug.apk](releases/contexta-debug.apk)

To install on Android:
1. Enable "Install from unknown sources" in Settings → Security
2. Transfer APK to device
3. Tap to install

## AI Disclosure
See [AI_DISCLOSURE.md](AI_DISCLOSURE.md) for details on how AI tools were used in this project.

## Project Structure

```
Contexta/
├── android/                    # Native Android module
├── frontend/                   # React Native (Expo) app
├── backend/                    # Spring Boot API
└── docs/
    └── architecture.md                          # System architecture
```

