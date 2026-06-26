<div align="center">

<img src="assets/logo.png" alt="Contexta — Connect · Understand · Transform" width="480" />

<br/><br/>

> **Your phone already has everything it needs to help you. Contexta makes it act on it — on-device, privately, without asking.**

[![Platform](https://img.shields.io/badge/Platform-Android-brightgreen?style=flat-square&logo=android)](https://android.com)
[![Frontend](https://img.shields.io/badge/Frontend-React%20Native%200.73-blue?style=flat-square&logo=react)](https://reactnative.dev)
[![Backend](https://img.shields.io/badge/Backend-Spring%20Boot%203-green?style=flat-square&logo=springboot)](https://spring.io/projects/spring-boot)
[![Hackathon](https://img.shields.io/badge/Hackathon-OpenClaw%20by%20Samsung%20Prism%202026-red?style=flat-square)](https://www.samsungprism.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[📲 Download APK](Contexta-Release.apk) &nbsp;·&nbsp; [🎬 Watch Demo](Contexta_Demo.mp4) &nbsp;·&nbsp; [📄 Full Proposal](Contexta_Openclaw.pdf)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [The Problem](#️-the-problem)
- [The Solution](#-the-solution)
- [Screenshots](#-screenshots)
- [System Architecture](#️-system-architecture)
- [Intelligent Context Pipelines](#-intelligent-context-pipelines)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Privacy & Performance](#️-privacy--performance)
- [Getting Started](#-getting-started)
- [Team](#-team)

---

## 🌟 Overview

**Contexta** is a Personal AI Operating System layer for Android smartphones. It acts as an autonomous agent that continuously reads your physical environment and digital schedule to proactively adjust your phone settings — saving you from the cognitive tax of constant manual toggles.

Whether you're stepping into a meeting, walking to a destination, or arriving home after work, Contexta **observes**, **decides**, and **acts** seamlessly in the background — with zero cloud dependency, zero latency, and zero compromise on privacy.

| Stat | Value |
|------|-------|
| ⚡ Action Latency | < 100ms |
| 🧠 Processing | 100% On-Device |
| ☁️ Cloud Calls | Zero |
| 🔋 Battery Overhead | Negligible (WorkManager) |
| 📱 Platform | Android 10+ |

---

## ⚠️ The Problem

Smartphones are inherently **reactive**. This creates friction at every step of a user's day:

- **Manual Switching** — Users must remember to silence their phones before meetings or raise brightness when stepping outdoors.
- **Micro-Distractions** — The average user makes ~40 minor setting adjustments per day, collectively fragmenting focus and wasting cognitive energy.
- **Rigid Schedules** — Tools like "Do Not Disturb" operate on fixed time windows, ignoring sudden real-world changes.
- **Context Blindness** — No native Android feature connects your calendar, movement, and location into a unified, proactive response.

---

## 💡 The Solution

Contexta introduces a continuous, on-device perception-action loop:

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  OBSERVE │────▶│  DECIDE  │────▶│   ACT    │────▶│  LEARN   │
│ Calendar │     │ On-Device│     │  DND /   │     │ Override │
│ WiFi     │     │  Logic   │     │ Volume / │     │ Feedback │
│ Accel.   │     │  + ML    │     │  Apps    │     │  Loop    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

1. **Observe** — Ingests native Android signals: Calendar events, Accelerometer readings, WiFi SSID.
2. **Decide** — Classifies user context in real-time using on-device logic (Meeting, Walking, Driving, Home, Away).
3. **Act** — Triggers system intents: DND mode, sound profiles, app launches.
4. **Learn** — Adapts instantly to user overrides without retraining or cloud sync.

---

## 📱 Screenshots

### Full Session Walkthrough — Cold Start → Meeting → Walking → Home

<table>
  <tr>
    <td align="center"><b>1. Initial Dashboard</b></td>
    <td align="center"><b>2. Meeting Detected → DND ON</b></td>
    <td align="center"><b>3. Walking → Maps & Music</b></td>
    <td align="center"><b>4. Home Profile Active</b></td>
  </tr>
  <tr>
    <td><img src="assets/screenshots/dashboard_initial.jpeg" width="180"/></td>
    <td><img src="assets/screenshots/meeting_cold_start.jpeg" width="180"/></td>
    <td><img src="assets/screenshots/walking_detection.jpeg" width="180"/></td>
    <td><img src="assets/screenshots/home_detection_home.jpeg" width="180"/></td>
  </tr>
  <tr>
    <td>Three detectors idle at launch. 0 actions, HOME OFF, DND OFF.</td>
    <td>Calendar finds "Sprint Standup" (91% conf). DND instantly enabled.</td>
    <td>Accelerometer variance > 0.8 (87% conf). Maps & Music offered.</td>
    <td>SSID "MyHomeWiFi" matches (95% conf). HOME ON, DND ON.</td>
  </tr>
</table>

<table>
  <tr>
    <td align="center"><b>5. Away Mode — Office WiFi</b></td>
    <td align="center"><b>6. Home + DND — 5 Events</b></td>
    <td align="center"><b>7. Meeting Re-Triggered — 6 Events</b></td>
    <td align="center"><b>8. Full Activity Log — 8 Events</b></td>
  </tr>
  <tr>
    <td><img src="assets/screenshots/home_detection_away.jpeg" width="180"/></td>
    <td><img src="assets/screenshots/home_profile_active.jpeg" width="180"/></td>
    <td><img src="assets/screenshots/meeting_detection_active.jpeg" width="180"/></td>
    <td><img src="assets/screenshots/activity_log_full.jpeg" width="180"/></td>
  </tr>
  <tr>
    <td>SSID "OfficeWiFi_5G" ≠ home. Device correctly stays AWAY.</td>
    <td>HOME confirmed ON. DND still active from earlier meeting. 5 actions.</td>
    <td>Calendar re-scans every cycle. Consistent DND re-trigger. 6 events.</td>
    <td>Complete audit: 3× DND, 1× Walk→Music, 2× HOME, 2× AWAY.</td>
  </tr>
</table>

---

## 🏗️ System Architecture

Contexta bridges a high-fidelity React Native frontend with a low-latency Android Java Native Engine.

```
┌──────────────────────────────────────────────────────────────────────┐
│         REACT NATIVE FRONTEND  (Expo · TypeScript · UI/UX)           │
│                                                                      │
│   ContextDashboard   ActivityLog   OverridePanel   DetectorCards     │
├──────────────────┬───────────────────┬───────────────────────────────┤
│  CalendarBridge  │   MovementBridge  │         HomeBridge            │
│  (JSI / RN NM)   │   (JSI / RN NM)  │        (JSI / RN NM)          │
├──────────────────┴───────────────────┴───────────────────────────────┤
│          ANDROID NATIVE SENSOR FUSION ENGINE  (Java)                 │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  MeetingDetector │  │ MovementDetector │  │   HomeDetector   │   │
│  │  CalendarContract│  │  SensorManager   │  │   WifiManager    │   │
│  │  ±30min scan     │  │  XYZ variance    │  │   SSID match     │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘   │
│           ▼                     ▼                      ▼             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ MeetingModeCtrl  │  │ MovementAction   │  │ HomeProfileCtrl  │   │
│  │ DND / Silent API │  │ Maps · Music     │  │ Volume · Media   │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
│                                                                      │
│  ╔══════════════════════════════════════════════════════════════╗    │
│  ║         WorkManager  (battery-efficient background polling)  ║    │
│  ╚══════════════════════════════════════════════════════════════╝    │
└──────────────────────────────────────────────────────────────────────┘
```

### Layer Breakdown

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **UI Layer** | React Native 0.73, Expo, TypeScript | Dashboard, real-time logs, override controls |
| **Bridge Layer** | React Native Native Modules (JSI) | Bi-directional JSON sync between JS and Java |
| **Detector Layer** | Android Java | Reads raw sensors; outputs classified context |
| **Action Layer** | Android Intents & APIs | Executes system-level changes (DND, volume, app launch) |
| **Scheduler** | Android WorkManager | Battery-safe background polling; avoids aggressive Wakelocks |
| **Backend** | Spring Boot 3 | Rule configuration, telemetry storage, future ML model serving |

---

## 🧠 Intelligent Context Pipelines

### Pipeline 1 · Meeting Context (Calendar NLP)

```
CalendarContract ──▶ ±30min window scan ──▶ Keyword match
                                              (Meeting / Call / Standup)
                                                    │
                                                    ▼
                                   ACTION_INTERRUPTION_FILTER_PRIORITY
                                        (DND ON · Ringer Silenced)
```

- **Sensor:** Android `CalendarContract` provider
- **Window:** ±30 minutes from current time
- **Keywords:** `Meeting`, `Call`, `Standup`, `Interview`, `Review`
- **Confidence:** Percentage match (e.g., 91%)
- **Action:** `NotificationManager.ACTION_INTERRUPTION_FILTER_PRIORITY` + silent ringer

---

### Pipeline 2 · Kinetic Context (Accelerometer Math)

```
SensorManager (SENSOR_DELAY_NORMAL)
        │
        ▼
XYZ magnitude vector ──▶ Sliding variance window
                                │
               ┌────────────────┴────────────────┐
          var > 3.0                          var > 0.8
               │                                 │
               ▼                                 ▼
           DRIVING                           WALKING
       Launch Google Maps               Launch Music App
```

- **Sensor:** `SensorManager.SENSOR_DELAY_NORMAL` (TYPE_ACCELEROMETER)
- **Math:** `variance = Σ(|magnitude − mean|²) / n` over a sliding window
- **Thresholds:** Variance > 3.0 → Driving · Variance > 0.8 → Walking
- **Confidence:** Percentage (e.g., 87%)
- **Action:** Fires Android `Intent` to launch Maps (Driving) or Spotify/Music (Walking)

---

### Pipeline 3 · Location Context (WiFi Geofencing)

```
WifiManager.getConnectionInfo()
        │
        ▼
Current SSID ──▶ Compare with stored Home SSID
                        │
          ┌─────────────┴──────────────┐
       MATCH                       NO MATCH
          │                            │
          ▼                            ▼
    Profile → HOME               Profile → AWAY
 (normalize volumes,          (office-appropriate
  lift app restrictions)        settings retained)
```

- **Sensor:** `WifiManager.getConnectionInfo()` — no GPS required
- **Logic:** String-matches current SSID against user-configured home network
- **Confidence:** Fixed 95% (SSID uniqueness assumption)
- **Home Action:** Normalizes ringer, lifts notification restrictions, applies comfort media settings
- **Away Action:** Retains DND-compatible office profile; conserves battery

---

## 🛠 Tech Stack

| Area | Technology |
|------|-----------|
| Mobile Frontend | React Native 0.73, Expo, TypeScript |
| UI Design | Custom Glassmorphism · Tailwind-style utilities |
| Native Engine | Android Java (API 29+) |
| Background Jobs | Android WorkManager |
| Sensor APIs | CalendarContract, SensorManager, WifiManager |
| System APIs | NotificationManager, AudioManager, Intent |
| Backend | Spring Boot 3, Java 17 |
| Build | Gradle 8, EAS Build |

---

## 📁 Project Structure

```
Contexta/
├── android/                      # Android native module (Java)
│   └── app/src/main/java/
│       ├── detectors/
│       │   ├── MeetingDetector.java
│       │   ├── MovementDetector.java
│       │   └── HomeDetector.java
│       ├── controllers/
│       │   ├── MeetingModeController.java
│       │   ├── MovementActionController.java
│       │   └── HomeProfileController.java
│       └── bridges/
│           ├── CalendarBridge.java
│           ├── MovementBridge.java
│           └── HomeBridge.java
├── frontend/                     # React Native / Expo app (TypeScript)
│   ├── components/
│   │   ├── ContextDashboard.tsx
│   │   ├── DetectorCard.tsx
│   │   ├── ActivityLog.tsx
│   │   └── OverridePanel.tsx
│   └── services/
│       ├── CalendarService.ts
│       ├── MovementService.ts
│       └── HomeService.ts
├── backend/                      # Spring Boot 3 (Java)
│   └── src/main/java/
│       ├── config/
│       ├── controller/
│       └── service/
├── assets/
│   ├── logo.png                  # Contexta brand logo
│   └── screenshots/              # App screenshots (8 screens)
│       ├── dashboard_initial.jpeg
│       ├── meeting_cold_start.jpeg
│       ├── walking_detection.jpeg
│       ├── home_detection_home.jpeg
│       ├── home_detection_away.jpeg
│       ├── home_profile_active.jpeg
│       ├── meeting_detection_active.jpeg
│       └── activity_log_full.jpeg
├── docs/                         # Architecture diagrams
├── Contexta-Release.apk          # Prebuilt release APK
├── Contexta_Demo.mp4             # Demo walkthrough video
├── Contexta_Openclaw.pdf         # Full hackathon proposal
└── README.md
```

---

## 🛡️ Privacy & Performance

| Principle | Implementation |
|-----------|---------------|
| **Zero Cloud Processing** | All detection logic runs 100% on-device. No calendar events, GPS data, or sensor telemetry are ever transmitted externally. |
| **No Persistent Storage** | Sensor readings are processed in-memory and discarded immediately after classification. |
| **Negligible Battery Impact** | Android WorkManager with batched tasks and passive listeners — no aggressive CPU Wakelocks. |
| **Sub-100ms Latency** | Native Java execution eliminates JS-bridge round-trips for time-critical actions. |
| **Offline Ready** | Works with zero internet connection. All intelligence is pre-compiled on the device. |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Android Studio (Flamingo or later)
- Java 17
- Expo CLI: `npm install -g expo-cli`

### Run the Frontend

```bash
git clone https://github.com/AnanthAkshay/Contexta.git
cd Contexta/frontend
npm install
npx expo run:android
```

### Build the Native Android Module

```bash
cd Contexta/android
./gradlew assembleRelease
```

### Run the Backend

```bash
cd Contexta/backend
./mvnw spring-boot:run
```

### Install the Prebuilt APK

```bash
adb install Contexta-Release.apk
```

> Grant permissions on first launch: **Calendar**, **Physical Activity**, and **Nearby WiFi Devices**.

---

## 👨‍💻 Team

**Team Beta Onepiece — M.S. Ramaiah Institute of Technology, Bengaluru**

| Name | Role |
|------|------|
| Akshay A | Team Lead · Frontend (React Native) |
| Aaditya V | Backend (Spring Boot) |
| Tejas M | UI/UX Design |
| H M Pranav | Database & Integration |

> *Submitted for the **OpenClaw Hackathon by Samsung Prism 2026** — Daily Utility Track.*

---

<div align="center">

<img src="assets/logo.png" alt="Contexta" width="220"/>

<br/>

Made with ❤️ in Bengaluru &nbsp;·&nbsp; M.S. Ramaiah Institute of Technology

⚡ On-device &nbsp;·&nbsp; 🧠 No cloud &nbsp;·&nbsp; 📴 Offline ready

</div>


.....

