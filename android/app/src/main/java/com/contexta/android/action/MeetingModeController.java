package com.contexta.android.action;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

/**
 * Controls real system-level phone actions for Contexta.
 *
 * When a MEETING context is detected this class:
 *   1. Switches the ringer to SILENT mode   (AudioManager)
 *   2. Enables Do Not Disturb               (NotificationManager)
 *
 * When the meeting ends (or context switches to IDLE) it can
 * restore normal mode via {@link #disableMeetingMode()}.
 *
 * <h3>Required permissions</h3>
 * <ul>
 *   <li>{@code MODIFY_AUDIO_SETTINGS} — declared in manifest</li>
 *   <li>{@code ACCESS_NOTIFICATION_POLICY} — declared in manifest,
 *       but the user must also manually grant <em>Notification Policy
 *       Access</em> via system settings (one-time).</li>
 * </ul>
 */
public class MeetingModeController {

    private static final String TAG = "MeetingMode";

    private final Context context;
    private final AudioManager audioManager;
    private final NotificationManager notificationManager;

    /** Stores the ringer mode before we changed it, so we can restore later */
    private int previousRingerMode = -1;

    public MeetingModeController(Context context) {
        this.context = context.getApplicationContext();
        this.audioManager = (AudioManager)
                this.context.getSystemService(Context.AUDIO_SERVICE);
        this.notificationManager = (NotificationManager)
                this.context.getSystemService(Context.NOTIFICATION_SERVICE);
    }

    // ══════════════════════════════════════════════════════════
    // DND PERMISSION CHECK
    // ══════════════════════════════════════════════════════════

    /**
     * Returns {@code true} when the app has been granted
     * <em>Notification Policy Access</em> (required for DND control).
     */
    public boolean hasDndPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return notificationManager.isNotificationPolicyAccessGranted();
        }
        // Pre-Marshmallow — DND API doesn't exist, treat as granted
        return true;
    }

    /**
     * Opens the system settings screen where the user can grant
     * Notification Policy Access to this app.
     *
     * <p>Call this from an Activity context — the Intent needs
     * {@code FLAG_ACTIVITY_NEW_TASK} when launched from a non-Activity.</p>
     */
    public void requestDndPermission() {
        Log.w(TAG, "DND permission not granted — opening system settings…");
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    // ══════════════════════════════════════════════════════════
    // ENABLE MEETING MODE
    // ══════════════════════════════════════════════════════════

    /**
     * Activates meeting mode:
     * <ol>
     *   <li>Sets ringer to {@link AudioManager#RINGER_MODE_SILENT}</li>
     *   <li>Sets DND to {@link NotificationManager#INTERRUPTION_FILTER_PRIORITY}</li>
     * </ol>
     *
     * @return {@code true} if both actions succeeded,
     *         {@code false} if DND permission is missing
     */
    public boolean enableMeetingMode() {
        Log.i(TAG, "┌─── Enabling Meeting Mode ──────────────────");

        // ── 1. Check DND permission ──────────────────────────
        if (!hasDndPermission()) {
            Log.e(TAG, "│ ✘ Cannot enable DND — permission not granted.");
            Log.e(TAG, "│   Call requestDndPermission() first.");
            Log.i(TAG, "└───────────────────────────────────────────");
            return false;
        }

        // ── 2. Enable Silent Mode ────────────────────────────
        enableSilentMode();

        // ── 3. Enable Do Not Disturb ─────────────────────────
        enableDnd();

        Log.i(TAG, "│");
        Log.i(TAG, "│ ✔ Meeting Mode Enabled: Silent + DND");
        Log.i(TAG, "└───────────────────────────────────────────");
        return true;
    }

    // ══════════════════════════════════════════════════════════
    // DISABLE MEETING MODE (restore normal)
    // ══════════════════════════════════════════════════════════

    /**
     * Restores the phone to normal mode:
     * <ol>
     *   <li>Restores the previous ringer mode (or NORMAL if unknown)</li>
     *   <li>Disables DND (sets interruption filter to ALL)</li>
     * </ol>
     */
    public void disableMeetingMode() {
        Log.i(TAG, "┌─── Disabling Meeting Mode ─────────────────");

        // ── 1. Restore ringer ────────────────────────────────
        restoreRingerMode();

        // ── 2. Disable DND ───────────────────────────────────
        disableDnd();

        Log.i(TAG, "│");
        Log.i(TAG, "│ ✔ Meeting Mode Disabled: Normal + DND Off");
        Log.i(TAG, "└───────────────────────────────────────────");
    }

    // ══════════════════════════════════════════════════════════
    // CONTEXT-AWARE TRIGGER
    // ══════════════════════════════════════════════════════════

    /**
     * Integration hook — call this with the detected context string.
     *
     * <pre>
     *   controller.onContextChanged("MEETING");  // → enables meeting mode
     *   controller.onContextChanged("NONE");      // → disables meeting mode
     * </pre>
     *
     * @param context detected context from {@code MeetingDetector}
     * @return {@code true} if meeting mode was toggled
     */
    public boolean onContextChanged(String context) {
        if ("MEETING".equals(context)) {
            Log.i(TAG, "Context → MEETING — activating meeting mode…");
            return enableMeetingMode();
        } else {
            Log.i(TAG, "Context → " + context + " — restoring normal mode…");
            disableMeetingMode();
            return true;
        }
    }

    // ══════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ══════════════════════════════════════════════════════════

    /** Switches the ringer to SILENT and saves the previous mode */
    private void enableSilentMode() {
        try {
            previousRingerMode = audioManager.getRingerMode();
            audioManager.setRingerMode(AudioManager.RINGER_MODE_SILENT);

            Log.i(TAG, "│ 🔇 Silent Mode ON  (was: " + ringerModeName(previousRingerMode) + ")");
        } catch (SecurityException e) {
            Log.e(TAG, "│ ✘ Failed to set silent mode", e);
        }
    }

    /** Restores the ringer to whatever it was before we changed it */
    private void restoreRingerMode() {
        try {
            int restoreTo = (previousRingerMode >= 0)
                    ? previousRingerMode
                    : AudioManager.RINGER_MODE_NORMAL;

            audioManager.setRingerMode(restoreTo);
            Log.i(TAG, "│ 🔔 Ringer restored to: " + ringerModeName(restoreTo));

            previousRingerMode = -1;
        } catch (SecurityException e) {
            Log.e(TAG, "│ ✘ Failed to restore ringer mode", e);
        }
    }

    /** Enables DND with PRIORITY filter (allows starred contacts / alarms) */
    private void enableDnd() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                notificationManager.setInterruptionFilter(
                        NotificationManager.INTERRUPTION_FILTER_PRIORITY);
                Log.i(TAG, "│ 🔕 DND ON  (filter: PRIORITY)");
            } catch (SecurityException e) {
                Log.e(TAG, "│ ✘ Failed to enable DND", e);
            }
        } else {
            Log.w(TAG, "│ ⚠ DND API unavailable (pre-Marshmallow)");
        }
    }

    /** Disables DND — allows all notifications through */
    private void disableDnd() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                notificationManager.setInterruptionFilter(
                        NotificationManager.INTERRUPTION_FILTER_ALL);
                Log.i(TAG, "│ 🔔 DND OFF (filter: ALL)");
            } catch (SecurityException e) {
                Log.e(TAG, "│ ✘ Failed to disable DND", e);
            }
        }
    }

    /** Converts ringer mode int to a human-readable name for logs */
    private static String ringerModeName(int mode) {
        switch (mode) {
            case AudioManager.RINGER_MODE_SILENT:  return "SILENT";
            case AudioManager.RINGER_MODE_VIBRATE: return "VIBRATE";
            case AudioManager.RINGER_MODE_NORMAL:  return "NORMAL";
            default:                               return "UNKNOWN(" + mode + ")";
        }
    }
}
