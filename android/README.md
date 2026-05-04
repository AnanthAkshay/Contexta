# Contexta — Android Calendar Context Module

Calendar-based context detection for the Contexta automation system.

## What It Does

1. **Reads** device calendar events within a ±30-minute window
2. **Classifies** each event as `MEETING` or `NONE` using keyword matching
3. **Logs** all results to Logcat for debugging
4. **Returns** a JSON result for downstream automation

## Detection Keywords

Events containing any of these words (case-insensitive) are classified as `MEETING`:

| Keyword    | Example Title          |
|------------|------------------------|
| `meeting`  | "Team Meeting"         |
| `call`     | "Client Call"          |
| `standup`  | "Sprint Standup"       |
| `class`    | "CS101 Class"          |

## Output Format

```json
{
  "event": "MEETING",
  "title": "Sprint Standup",
  "timestamp": 1710000000
}
```

## Files

```
android/app/src/main/
├── AndroidManifest.xml                          # READ_CALENDAR permission
└── java/com/contexta/android/
    ├── MainActivity.java                        # Entry point + permission flow
    ├── detector/
    │   └── MeetingDetector.java                 # Calendar query + classification
    └── model/
        └── CalendarEventResult.java             # Result POJO with JSON support
```

## Permissions

- `READ_CALENDAR` — declared in manifest, requested at runtime

## Example Logcat Output

```
I/Contexta.Main: ═══════════════════════════════════════════
I/Contexta.Main:  Contexta — Calendar Context Detection
I/Contexta.Main: ═══════════════════════════════════════════
I/Contexta.Main: ───────────────────────────────────────────
I/Contexta.Main:  Starting calendar scan…
I/Contexta.Main: ───────────────────────────────────────────
I/MeetingDetector: Found 2 event(s) in window.
I/MeetingDetector: Event: "Sprint Standup" | Time: 09:00 AM | Type: MEETING
I/MeetingDetector: Event: "Lunch Break"    | Time: 09:15 AM | Type: NONE
I/Contexta.Main: ───────────────────────────────────────────
I/Contexta.Main: ★ Detected MEETING: "Sprint Standup" at 09:00 AM
I/Contexta.Main:   Event (non-meeting): "Lunch Break" at 09:15 AM
I/Contexta.Main: ───────────────────────────────────────────
I/Contexta.Main: Primary result JSON: {"event":"MEETING","title":"Sprint Standup","timestamp":1710000000}
I/Contexta.Main: 🔔 ACTION NEEDED — phone should switch to meeting mode.
```
