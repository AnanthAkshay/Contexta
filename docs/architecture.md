# Contexta — Architecture

## System Architecture (Day 3)

```
┌──────────────────────────────────────────────────────────────────────┐
│  React Native (Expo)  ←→  Context Logic  ←→  Android Native APIs    │
│  ─────────────────       ──────────────      ──────────────────────  │
│  Dashboard UI            determineContext()   Calendar (READ_CALENDAR)│
│  3 Context Cards         MEETING / IDLE       AudioManager (Silent)  │
│  Event Log               COMMUTING / STAT.    NotificationMgr (DND)  │
│  Summary Stats           HOME / AWAY          SensorManager (Accel.) │
│  Settings Screen         Confidence Score     WifiManager (SSID)     │
│  Home Mode Theme         Keyword Classifier   SharedPreferences      │
│  Movement CTAs           Variance Threshold   Intent (Maps/Spotify)  │
└──────────────────────────────────────────────────────────────────────┘
         ↕ (analytics sync)
   Spring Boot Backend — /context, /movement, /home/detect
```

## Feature Pipeline

### Feature 1: Meeting Detection (Day 2)
```
Calendar API → MeetingDetector → keyword match → MEETING/NONE
    → MeetingModeController → Silent + DND
    → UI: Context Card 1 with DND badge
```

### Feature 2: Movement Detection (Day 3)
```
Accelerometer → MovementDetector → rolling 5s variance
    → threshold > 0.8 = moving
    → classify: walking (>0.8) / driving (>3.0)
    → MovementActionController → Maps/Spotify intent
    → UI: Context Card 2 with Maps/Music CTAs
```

### Feature 3: Home Detection (Day 3)
```
WiFi SSID → HomeDetector → match against stored home SSID
    → HOME/AWAY profile
    → HomeProfileController → volume, wallpaper hint, notifications
    → UI: Context Card 3 + Home Mode banner + theme switch
```

## Detection Thresholds

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Movement variance | > 0.8 | Classify as "moving" |
| Driving variance | > 3.0 | Classify as "driving" |
| Meeting confidence | 0.91 | Calendar keyword match |
| Home confidence | 0.95 | SSID exact match |
| Sensor interval | 500ms | Accelerometer read rate |
| Rolling window | 5s (10 samples) | Variance computation |
| Calendar window | ±30 min | Event detection range |

## API Endpoints (Spring Boot)

| Method | Path | Purpose |
|--------|------|---------|
| POST | /context | Meeting detection analytics |
| POST | /movement | Movement event processing |
| GET | /movement/status | Movement service health |
| POST | /home/detect | Home detection via SSID |
| POST | /home/set | Update home SSID |
| GET | /home/status | Home service health |
