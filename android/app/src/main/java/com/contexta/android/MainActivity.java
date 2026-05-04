package com.contexta.android;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.contexta.android.action.MeetingModeController;
import com.contexta.android.detector.MeetingDetector;
import com.contexta.android.model.CalendarEventResult;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Entry-point Activity for the Contexta context-aware automation system.
 *
 * On launch it:
 *   1. Requests READ_CALENDAR permission (runtime)
 *   2. Checks & requests DND Notification Policy Access
 *   3. Scans the calendar for events within ±30 min
 *   4. Classifies each event (MEETING / NONE)
 *   5. Automatically enables Silent + DND when a meeting is detected
 *   6. Logs the full pipeline result to Logcat
 *
 * No UI is rendered — all output goes to Logcat.
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "Contexta.Main";
    private static final int RC_READ_CALENDAR = 1001;

    private MeetingModeController meetingModeController;

    // ── Lifecycle ────────────────────────────────────────────

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Log.i(TAG, "═══════════════════════════════════════════");
        Log.i(TAG, " Contexta — Context-Aware Automation");
        Log.i(TAG, "═══════════════════════════════════════════");

        // Initialise the meeting mode controller
        meetingModeController = new MeetingModeController(this);

        // ── DND permission (must be granted manually in settings) ──
        if (!meetingModeController.hasDndPermission()) {
            Log.w(TAG, "DND permission not granted — opening settings…");
            meetingModeController.requestDndPermission();
            // We don't block here; the user can grant it and re-launch.
            // The controller will gracefully fail if DND is still off.
        } else {
            Log.i(TAG, "✔ DND Notification Policy Access: GRANTED");
        }

        // ── Calendar permission (runtime) ─────────────────────
        if (hasCalendarPermission()) {
            runDetection();
        } else {
            requestCalendarPermission();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Re-check DND permission when user returns from settings
        if (meetingModeController != null && meetingModeController.hasDndPermission()) {
            Log.i(TAG, "✔ DND permission now granted (onResume).");
        }
    }

    // ── Calendar Permission handling ─────────────────────────

    private boolean hasCalendarPermission() {
        return ContextCompat.checkSelfPermission(this,
                Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestCalendarPermission() {
        Log.d(TAG, "Requesting READ_CALENDAR permission…");
        ActivityCompat.requestPermissions(this,
                new String[]{Manifest.permission.READ_CALENDAR},
                RC_READ_CALENDAR);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode,
                                           @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == RC_READ_CALENDAR) {
            if (grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.i(TAG, "READ_CALENDAR permission GRANTED.");
                runDetection();
            } else {
                Log.e(TAG, "READ_CALENDAR permission DENIED. Cannot read events.");
            }
        }
    }

    // ── Detection + Action Pipeline ─────────────────────────

    private void runDetection() {
        Log.i(TAG, "───────────────────────────────────────────");
        Log.i(TAG, " Starting calendar scan…");
        Log.i(TAG, "───────────────────────────────────────────");

        MeetingDetector detector = new MeetingDetector(this);

        // Get ALL classified events (for full debug output)
        List<CalendarEventResult> allEvents = detector.detectAll();

        if (allEvents.isEmpty()) {
            Log.i(TAG, "✔ No events within the ±30-min window.");
            Log.i(TAG, "Result: " + CalendarEventResult.none().toJson().toString());

            // No meeting → ensure normal mode
            meetingModeController.onContextChanged("NONE");
            return;
        }

        // Log each event
        Log.i(TAG, "───────────────────────────────────────────");
        for (CalendarEventResult event : allEvents) {
            String time = formatEpoch(event.getTimestamp());
            if (event.isMeeting()) {
                Log.i(TAG, "★ Detected MEETING: \"" + event.getTitle()
                        + "\" at " + time);
            } else {
                Log.i(TAG, "  Event (non-meeting): \"" + event.getTitle()
                        + "\" at " + time);
            }
        }
        Log.i(TAG, "───────────────────────────────────────────");

        // Primary result = first MEETING, or first event
        CalendarEventResult primary = detector.detect();
        Log.i(TAG, "Primary result JSON: " + primary.toJson().toString());

        // ── TRIGGER SYSTEM ACTION ────────────────────────────
        if (primary.isMeeting()) {
            Log.i(TAG, "🔔 MEETING detected — triggering system actions…");
            boolean success = meetingModeController.onContextChanged("MEETING");
            if (success) {
                Log.i(TAG, "✔ System actions applied: Silent + DND");
                Log.i(TAG, "Detected MEETING: \"" + primary.getTitle()
                        + "\" at " + formatEpoch(primary.getTimestamp()));
            } else {
                Log.w(TAG, "⚠ Meeting mode partially applied (DND permission missing?)");
            }
        } else {
            Log.i(TAG, "✔ No meeting detected. Ensuring normal mode.");
            meetingModeController.onContextChanged("NONE");
        }
    }

    // ── Helpers ──────────────────────────────────────────────

    private String formatEpoch(long epochSeconds) {
        SimpleDateFormat sdf = new SimpleDateFormat("hh:mm a", Locale.getDefault());
        return sdf.format(new Date(epochSeconds * 1000));
    }
}
