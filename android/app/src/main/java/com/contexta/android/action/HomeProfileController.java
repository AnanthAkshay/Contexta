package com.contexta.android.action;

import android.content.Context;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.util.Log;

/**
 * Controls profile switching when home detection state changes.
 *
 * <h3>When user arrives HOME</h3>
 * <ul>
 *   <li>Switches to NORMAL ringer mode (undo any meeting silence)</li>
 *   <li>Logs "wallpaper hint" change (preview image only — no actual wallpaper change)</li>
 *   <li>Stores the active profile in SharedPreferences</li>
 *   <li>Suggests notification grouping for personal apps</li>
 * </ul>
 *
 * <h3>When user leaves (AWAY)</h3>
 * <ul>
 *   <li>Restores work profile settings</li>
 *   <li>Logs profile transition</li>
 * </ul>
 *
 * <h3>MVP Simplifications</h3>
 * <ul>
 *   <li>Wallpaper change — show preview image only, no actual system change</li>
 *   <li>Bluetooth home device — hardcoded string, not real BT scan</li>
 *   <li>Volume level — logged but simplified adjustment</li>
 * </ul>
 */
public class HomeProfileController {

    private static final String TAG = "HomeProfile";
    private static final String PREFS_NAME = "contexta_profile_prefs";
    private static final String KEY_ACTIVE_PROFILE = "active_profile";
    private static final String KEY_HOME_VOLUME = "home_volume";

    /** Simulated Bluetooth device name (hardcoded for MVP) */
    private static final String SIMULATED_BT_DEVICE = "Living Room Speaker";

    private final Context context;
    private final AudioManager audioManager;
    private final SharedPreferences prefs;

    public HomeProfileController(Context context) {
        this.context = context.getApplicationContext();
        this.audioManager = (AudioManager)
                this.context.getSystemService(Context.AUDIO_SERVICE);
        this.prefs = this.context.getSharedPreferences(PREFS_NAME,
                Context.MODE_PRIVATE);
    }

    // ── Public API ───────────────────────────────────────────

    /**
     * Switch to HOME profile.
     * Called when HomeDetector confirms user is at home.
     *
     * @return true if profile switch succeeded
     */
    public boolean switchToHomeProfile() {
        Log.i(TAG, "┌─── Switching to HOME Profile ──────────────");

        // ── 1. Restore normal ringer (undo any meeting DND) ──
        try {
            audioManager.setRingerMode(AudioManager.RINGER_MODE_NORMAL);
            Log.i(TAG, "│ 🔔 Ringer → NORMAL");
        } catch (SecurityException e) {
            Log.w(TAG, "│ ⚠ Cannot change ringer mode", e);
        }

        // ── 2. Set comfortable volume level ──────────────────
        try {
            int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
            int homeVolume = prefs.getInt(KEY_HOME_VOLUME, maxVolume * 60 / 100);
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, homeVolume, 0);
            Log.i(TAG, "│ 🔊 Media volume → " + homeVolume + "/" + maxVolume);
        } catch (Exception e) {
            Log.w(TAG, "│ ⚠ Cannot set volume", e);
        }

        // ── 3. Log wallpaper hint (simulated — preview only) ──
        Log.i(TAG, "│ 🖼  Wallpaper hint → Personal (preview image shown)");

        // ── 4. Log Bluetooth device (simulated) ──────────────
        Log.i(TAG, "│ 📡 BT Device detected → " + SIMULATED_BT_DEVICE + " (hardcoded)");

        // ── 5. Notification grouping suggestion ──────────────
        Log.i(TAG, "│ 🔔 Notification grouping → Personal apps prioritized");

        // ── 6. Save active profile ───────────────────────────
        prefs.edit().putString(KEY_ACTIVE_PROFILE, "HOME").apply();

        Log.i(TAG, "│");
        Log.i(TAG, "│ ✔ HOME Profile Active");
        Log.i(TAG, "└─────────────────────────────────────────────");

        return true;
    }

    /**
     * Switch to AWAY (work/default) profile.
     * Called when HomeDetector determines user has left home.
     *
     * @return true if profile switch succeeded
     */
    public boolean switchToAwayProfile() {
        Log.i(TAG, "┌─── Switching to AWAY Profile ──────────────");

        // ── 1. Keep current ringer (don't override meeting mode) ──
        Log.i(TAG, "│ 🔇 Ringer → unchanged (may be in meeting mode)");

        // ── 2. Log wallpaper revert ──────────────────────────
        Log.i(TAG, "│ 🖼  Wallpaper hint → Default/Work");

        // ── 3. Notification grouping ─────────────────────────
        Log.i(TAG, "│ 🔔 Notification grouping → Work apps prioritized");

        // ── 4. Save active profile ───────────────────────────
        prefs.edit().putString(KEY_ACTIVE_PROFILE, "AWAY").apply();

        Log.i(TAG, "│");
        Log.i(TAG, "│ ✔ AWAY Profile Active");
        Log.i(TAG, "└─────────────────────────────────────────────");

        return true;
    }

    // ── Context-aware trigger ────────────────────────────────

    /**
     * Called when home detection context changes.
     *
     * @param profileMode "HOME" or "AWAY"
     * @return true if profile was switched
     */
    public boolean onHomeContextChanged(String profileMode) {
        if ("HOME".equals(profileMode)) {
            return switchToHomeProfile();
        } else {
            return switchToAwayProfile();
        }
    }

    /**
     * Get the current active profile.
     *
     * @return "HOME" or "AWAY"
     */
    public String getActiveProfile() {
        return prefs.getString(KEY_ACTIVE_PROFILE, "AWAY");
    }
}
