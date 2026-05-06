package com.contexta.android;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.contexta.android.action.HomeProfileController;
import com.contexta.android.action.MeetingModeController;
import com.contexta.android.action.MovementActionController;
import com.contexta.android.detector.HomeDetector;
import com.contexta.android.detector.MeetingDetector;
import com.contexta.android.detector.MovementDetector;
import com.contexta.android.model.CalendarEventResult;
import com.contexta.android.model.HomeDetectionResult;
import com.contexta.android.model.MovementResult;

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
 *   6. Starts accelerometer-based movement detection
 *   7. Detects home via WiFi SSID matching
 *   8. Logs the full pipeline result to Logcat
 *
 * No UI is rendered — all output goes to Logcat.
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "Contexta.Main";
    private static final int RC_READ_CALENDAR = 1001;
    private static final int RC_LOCATION = 1002;

    private MeetingModeController meetingModeController;
    private MovementDetector movementDetector;
    private MovementActionController movementActionController;
    private HomeDetector homeDetector;
    private HomeProfileController homeProfileController;

    // ── Lifecycle ────────────────────────────────────────────

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Log.i(TAG, "═══════════════════════════════════════════");
        Log.i(TAG, " Contexta — Context-Aware Automation");
        Log.i(TAG, " Day 3: Movement + Home Detection");
        Log.i(TAG, "═══════════════════════════════════════════");

        // Initialise controllers
        meetingModeController = new MeetingModeController(this);
        movementDetector = new MovementDetector(this);
        movementActionController = new MovementActionController(this);
        homeDetector = new HomeDetector(this);
        homeProfileController = new HomeProfileController(this);

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
            runDetectionPipeline();
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

    @Override
    protected void onDestroy() {
        super.onDestroy();
        // Clean up movement detector
        if (movementDetector != null) {
            movementDetector.stopDetection();
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

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this,
                Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestLocationPermission() {
        Log.d(TAG, "Requesting ACCESS_FINE_LOCATION permission…");
        ActivityCompat.requestPermissions(this,
                new String[]{
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                },
                RC_LOCATION);
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
                runDetectionPipeline();
            } else {
                Log.e(TAG, "READ_CALENDAR permission DENIED. Cannot read events.");
                // Still run movement & home detection
                runMovementDetection();
                runHomeDetection();
            }
        } else if (requestCode == RC_LOCATION) {
            if (grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.i(TAG, "LOCATION permission GRANTED — re-running home detection.");
                runHomeDetection();
            } else {
                Log.w(TAG, "LOCATION permission DENIED — using hardcoded SSID.");
                runHomeDetection(); // Will use fallback
            }
        }
    }

    // ── Full Detection Pipeline ─────────────────────────────

    /**
     * Runs all three detection features:
     * 1. Calendar-based meeting detection (Day 2)
     * 2. Accelerometer movement detection (Day 3 — Feature 2)
     * 3. WiFi-based home detection (Day 3 — Feature 3)
     */
    private void runDetectionPipeline() {
        // Feature 1: Meeting Detection
        runMeetingDetection();

        // Feature 2: Movement Detection
        runMovementDetection();

        // Feature 3: Home Detection
        if (hasLocationPermission()) {
            runHomeDetection();
        } else {
            requestLocationPermission();
        }
    }

    // ── Feature 1: Meeting Detection ─────────────────────────

    private void runMeetingDetection() {
        Log.i(TAG, "───────────────────────────────────────────");
        Log.i(TAG, " Feature 1: Calendar Meeting Detection");
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

    // ── Feature 2: Movement Detection ────────────────────────

    private void runMovementDetection() {
        Log.i(TAG, "───────────────────────────────────────────");
        Log.i(TAG, " Feature 2: Accelerometer Movement Detection");
        Log.i(TAG, "───────────────────────────────────────────");

        movementDetector.startDetection(result -> {
            if (result.isMoving()) {
                Log.i(TAG, "🚶 MOVEMENT detected — variance: "
                        + String.format(Locale.US, "%.3f", result.getVariance())
                        + " | mode: " + result.getTransportMode());

                // Notify the action controller
                movementActionController.onMovementDetected(result.getTransportMode());
            }
        });

        // Also do a one-shot detection for immediate feedback
        MovementResult immediateResult = movementDetector.detectOnce();
        Log.i(TAG, "Immediate detection: " + immediateResult.toJson().toString());
    }

    // ── Feature 3: Home Detection ────────────────────────────

    private void runHomeDetection() {
        Log.i(TAG, "───────────────────────────────────────────");
        Log.i(TAG, " Feature 3: WiFi Home Detection");
        Log.i(TAG, "───────────────────────────────────────────");

        HomeDetectionResult homeResult = homeDetector.detect();
        Log.i(TAG, "Home detection JSON: " + homeResult.toJson().toString());

        // Switch profile based on detection
        boolean switched = homeProfileController.onHomeContextChanged(
                homeResult.getProfileMode());

        if (homeResult.isHome()) {
            Log.i(TAG, "🏠 HOME detected — profile switched to HOME");
            Log.i(TAG, "   SSID match: " + homeResult.getCurrentSSID()
                    + " == " + homeResult.getHomeSSID());
        } else {
            Log.i(TAG, "🌍 AWAY — profile set to AWAY");
            Log.i(TAG, "   Current SSID: " + homeResult.getCurrentSSID()
                    + " ≠ Home SSID: " + homeResult.getHomeSSID());
        }
    }

    // ── Helpers ──────────────────────────────────────────────

    private String formatEpoch(long epochSeconds) {
        SimpleDateFormat sdf = new SimpleDateFormat("hh:mm a", Locale.getDefault());
        return sdf.format(new Date(epochSeconds * 1000));
    }
}
