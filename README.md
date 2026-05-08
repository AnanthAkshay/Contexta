# Contexta — Context-Aware Phone Intelligence

> **Your phone already has everything it needs to help you. Contexta makes it act on it — on-device, privately, without asking.**

<p align="center">
  <img src="assets/logo.png" alt="Contexta Logo" width="500"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android-brightgreen?style=flat-square&logo=android"/>
  <img src="https://img.shields.io/badge/Frontend-React%20Native%200.73-blue?style=flat-square&logo=react"/>
  <img src="https://img.shields.io/badge/Backend-Spring%20Boot%203-green?style=flat-square&logo=springboot"/>
  <img src="https://img.shields.io/badge/Hackathon-OpenClaw%20by%20Samsung%20Prism%202026-red?style=flat-square"/>
</p>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [App Gallery & UX](#-app-gallery--ux)
- [System Architecture](#-system-architecture)
- [Intelligent Context Pipelines](#-intelligent-context-pipelines)
- [Privacy & Performance](#-privacy--performance)
- [Team](#-team)

---

## 🌟 Overview

**Contexta** is a Personal AI Operating System layer for Android smartphones. It acts as an autonomous agent that reads your physical environment and digital schedule to proactively adjust your phone settings, saving you from constant manual toggles.

Whether you're stepping into a meeting, driving on the highway, or arriving home, Contexta **observes**, **decides**, and **acts** seamlessly in the background.

---

## ⚠️ The Problem

Smartphones are inherently **reactive**. This creates friction:
- **Manual Switching:** Users must remember to silence their phones before meetings or increase brightness when outdoors.
- **Micro-distractions:** The average user makes ~40 minor setting adjustments per day. Collectively, this fragments focus and wastes cognitive energy.
- **Context Blindness:** Tools like "Do Not Disturb" operate on rigid schedules, ignoring sudden real-world changes.

---

## 💡 The Solution

Contexta introduces a continuous, on-device loop:

1. **Observe:** Ingests native signals (Calendar, Accelerometer, WiFi SSID).
2. **Decide:** Classifies current user context using on-device logic and ML (Meeting, Walking, Driving, Home).
3. **Act:** Automatically triggers system intent and settings changes (DND, Sound Profiles, Launching Apps).
4. **Learn:** Adapts to user overrides instantly.

---

## 📱 App Gallery & UX

Contexta features a **Premium Light Glassmorphism** interface. Soft gradients, frosted glass cards, and micro-animations provide a state-of-the-art dashboard to monitor what your phone is thinking.

### 1. The Intelligence Dashboard
<p align="center">
  <img src="assets/screenshots/dashboard_live.png" alt="Dashboard View" width="280"/>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="assets/screenshots/activity_log.png" alt="Activity Log" width="280"/>
</p>
<p align="center">
  <em><strong>Left:</strong> The main observer dashboard waiting for triggers. &nbsp;·&nbsp; <strong>Right:</strong> Real-time Activity Audit Log recording autonomous decisions.</em>
</p>

### 2. Context-Aware Triggers
<p align="center">
  <img src="assets/screenshots/meeting_detection.png" alt="Meeting Detection" width="280"/>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="assets/screenshots/movement_detection.png" alt="Movement Detection" width="280"/>
</p>
<p align="center">
  <em><strong>Left:</strong> Calendar context ("Sprint Standup") instantly triggering DND & Silent Mode. &nbsp;·&nbsp; <strong>Right:</strong> Kinetic context (Walking) launching Maps & Music.</em>
</p>

### 3. Location Intelligence
<p align="center">
  <img src="assets/screenshots/home_away.png" alt="Home Detection - Away" width="280"/>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="assets/screenshots/home_detected.png" alt="Home Detection - Home" width="280"/>
</p>
<p align="center">
  <em><strong>Left:</strong> WiFi mismatch ("OfficeWiFi_5G") keeping the device in Away mode. &nbsp;·&nbsp; <strong>Right:</strong> SSID match ("MyHomeWiFi") successfully applying the Home Profile.</em>
</p>

---

## 🏗️ System Architecture

Contexta's architecture bridges a beautiful React Native frontend with a powerful, low-level Android Java Native Engine.

```text
┌──────────────────────────────────────────────────────────────────┐
│  REACT NATIVE FRONTEND (Expo, UI/UX, User Override Controls)     │
├───────────────────────┬────────────────────────┬─────────────────┤
│    CalendarBridge     │     MovementBridge     │   HomeBridge    │
├───────────────────────┴────────────────────────┴─────────────────┤
│  ANDROID NATIVE SENSOR FUSION ENGINE (Java)                      │
│                                                                  │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐ │
│  │ MeetingDetector │   │ MovementDetector│   │  HomeDetector   │ │
│  │ (Calendar API)  │   │ (Accelerometer) │   │  (WiFi SSID)    │ │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘ │
│           │                     │                     │          │
│  ┌────────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐ │
│  │ MeetingModeCtrl │   │ MovementAction  │   │ HomeProfileCtrl │ │
│  │ (DND/Silent API)│   │ (Maps/Music)    │   │ (Volume/Media)  │ │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

1. **Frontend:** React Native app displaying live telemetry.
2. **Bridge Layer:** Bi-directional JSI/MethodChannels syncing real-time sensor JSON.
3. **Native Layer:** Pure Android Java utilizing `WorkManager` for battery-efficient background polling and execution.

---

## 🧠 Intelligent Context Pipelines

Contexta features three primary autonomous pipelines:

### 1. Meeting Context (Calendar NLP)
- **Sensor:** Android `CalendarContract`.
- **Logic:** Scans a ±30 minute window for keywords (`Meeting`, `Call`, `Standup`).
- **Action:** Triggers Android's `NotificationManager.ACTION_INTERRUPTION_FILTER_PRIORITY` (DND) and silences the ringer.

### 2. Kinetic Context (Accelerometer Math)
- **Sensor:** `SensorManager.SENSOR_DELAY_NORMAL`.
- **Logic:** Computes XYZ magnitude variance over time.
  - Variance `> 3.0` → **DRIVING**
  - Variance `> 0.8` → **WALKING**
- **Action:** Fires Intents to preemptively launch Google Maps (Driving) or Spotify/Music (Walking).

### 3. Location Context (WiFi Geofencing)
- **Sensor:** `WifiManager.getConnectionInfo()`.
- **Logic:** Matches current SSID to user-configured Home Network SSID.
- **Action:** Transitions system state. Away mode raises volumes; Home mode normalizes notification sounds and un-restricts app limits.

---

## 🛡️ Privacy & Performance

- **Zero Cloud Processing:** All detection and action logic runs **100% locally on-device**. No calendar events, location data, or sensor telemetry are ever transmitted externally.
- **Negligible Battery Drain:** Contexta operates on passive listeners and batched `WorkManager` events to preserve battery life, avoiding aggressive Wakelocks.
- **Sub-50ms Latency:** Native Java actions execute in milliseconds, providing instant responsiveness as you move through your day.

---

## 👨‍💻 Team

**Team Beta Onepiece — M.S. Ramaiah Institute of Technology, Bengaluru**

| Name | Role |
|---|---|
| Akshay A | Team Lead · Frontend |
| Aaditya V | Backend |
| Tejas M | UI/UX |
| H M Pranav | Database |

> *Submitted for OpenClaw Hackathon by Samsung Prism 2026 — Daily Utility Track*
