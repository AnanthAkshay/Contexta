# Contexta — Android Native Context Module

Native context detection engine for the Contexta automation system.

## System Architecture

The Android module acts as the sensor fusion and execution layer. It runs on-device without requiring a continuous cloud connection.

```
┌─────────────────────────────────────────────────────────────┐
│                       MainActivity                          │
│  (Orchestrator, Permission Flow, Lifecycle Management)      │
└──────────────┬───────────────────────┬──────────────────────┘
               │                       │
      ┌────────▼────────┐     ┌────────▼────────┐
      │  Detectors      │     │  Action Contrls │
      │  (Sensors)      │     │  (Execution)    │
      └────────┬────────┘     └────────┬────────┘
               │                       │
      ├─ MeetingDetector      ├─ MeetingModeController
      ├─ MovementDetector     ├─ MovementActionController
      └─ HomeDetector         └─ HomeProfileController
```

### 1. Detectors (Observe Layer)
- **MeetingDetector:** Reads Calendar events (±30 min window). Classifies via keyword NLP.
- **MovementDetector:** Samples Accelerometer. Computes variance to detect WALKING, DRIVING, or STATIONARY.
- **HomeDetector:** Reads WiFi SSID and matches against saved Home Network to determine HOME or AWAY.

### 2. Action Controllers (Act Layer)
- **MeetingModeController:** Toggles Android DND and Silent Mode via Notification Policy.
- **MovementActionController:** Triggers Intents (e.g., launching Google Maps or Music) based on transport mode.
- **HomeProfileController:** Adjusts volume, brightness, and system profiles based on location context.

## Detection Keywords (Calendar)

Events containing any of these words (case-insensitive) are classified as `MEETING`:

| Keyword    | Example Title          |
|------------|------------------------|
| `meeting`  | "Team Meeting"         |
| `call`     | "Client Call"          |
| `standup`  | "Sprint Standup"       |
| `class`    | "CS101 Class"          |

## Output Format

The module outputs structured JSON to Logcat for downstream consumption (e.g., by the React Native layer).

```json
{
  "event": "MEETING",
  "title": "Sprint Standup",
  "timestamp": 1710000000
}
```

```json
{
  "isMoving": true,
  "variance": 12.4,
  "transportMode": "walking",
  "timestamp": 1710000050
}
```

```json
{
  "isHome": true,
  "currentSSID": "\"MyHomeWiFi\"",
  "homeSSID": "\"MyHomeWiFi\"",
  "profileMode": "HOME"
}
```

## Files

```
android/app/src/main/
├── AndroidManifest.xml                          # Permissions (CALENDAR, LOCATION, DND)
└── java/com/contexta/android/
    ├── MainActivity.java                        # Entry point + pipeline orchestration
    ├── detector/
    │   ├── MeetingDetector.java                 # Calendar query + classification
    │   ├── MovementDetector.java                # Accelerometer sampling + variance math
    │   └── HomeDetector.java                    # WiFi SSID matching
    ├── action/
    │   ├── MeetingModeController.java           # DND + Ringer adjustments
    │   ├── MovementActionController.java        # Maps / Music Intents
    │   └── HomeProfileController.java           # Volume / Wallpaper profiles
    └── model/
        ├── CalendarEventResult.java             
        ├── MovementResult.java
        └── HomeDetectionResult.java
```

## Permissions

- `READ_CALENDAR` — Declared in manifest, requested at runtime.
- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` — Required for WiFi SSID reading in newer Android versions.
- `ACCESS_NOTIFICATION_POLICY` — Required for DND toggling (Settings Intent).

## Example Logcat Output

```
I/Contexta.Main: ═══════════════════════════════════════════
I/Contexta.Main:  Contexta — Context-Aware Automation
I/Contexta.Main:  Day 3: Movement + Home Detection
I/Contexta.Main: ═══════════════════════════════════════════
I/Contexta.Main: ───────────────────────────────────────────
I/Contexta.Main:  Feature 1: Calendar Meeting Detection
I/Contexta.Main: ★ Detected MEETING: "Sprint Standup" at 09:00 AM
I/Contexta.Main: 🔔 MEETING detected — triggering system actions…
I/Contexta.Main: ✔ System actions applied: Silent + DND
I/Contexta.Main: ───────────────────────────────────────────
I/Contexta.Main:  Feature 2: Accelerometer Movement Detection
I/Contexta.Main: 🚶 MOVEMENT detected — variance: 15.302 | mode: walking
I/Contexta.Main: ───────────────────────────────────────────
I/Contexta.Main:  Feature 3: WiFi Home Detection
I/Contexta.Main: 🏠 HOME detected — profile switched to HOME
```
