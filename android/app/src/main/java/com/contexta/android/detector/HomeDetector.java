package com.contexta.android.detector;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.util.Log;

import com.contexta.android.model.HomeDetectionResult;

/**
 * Detects whether the user is at home by comparing the current WiFi SSID
 * against a stored "home" SSID.
 *
 * <h3>How it works</h3>
 * <ol>
 *   <li>Reads the currently connected WiFi SSID from WifiManager</li>
 *   <li>Compares it against the stored home SSID in SharedPreferences</li>
 *   <li>If they match → user is HOME → return HOME profile</li>
 *   <li>Otherwise → user is AWAY</li>
 * </ol>
 *
 * <h3>MVP simplifications</h3>
 * <ul>
 *   <li>WiFi SSID detection uses a hardcoded fallback string for demo</li>
 *   <li>No geofencing — WiFi-only detection is simpler and sufficient</li>
 *   <li>Bluetooth home device trigger is hardcoded string (not real BT scan)</li>
 * </ul>
 */
public class HomeDetector {

    private static final String TAG = "HomeDetector";
    private static final String PREFS_NAME = "contexta_home_prefs";
    private static final String KEY_HOME_SSID = "home_ssid";

    /** Default home SSID for demo purposes */
    private static final String DEFAULT_HOME_SSID = "MyHomeWiFi";

    private final Context context;
    private final WifiManager wifiManager;
    private final SharedPreferences prefs;

    public HomeDetector(Context context) {
        this.context = context.getApplicationContext();
        this.wifiManager = (WifiManager)
                this.context.getSystemService(Context.WIFI_SERVICE);
        this.prefs = this.context.getSharedPreferences(PREFS_NAME,
                Context.MODE_PRIVATE);
    }

    // ── Public API ───────────────────────────────────────────

    /**
     * Detects whether the user is currently at home.
     *
     * @return HomeDetectionResult with match status and profile
     */
    public HomeDetectionResult detect() {
        String homeSSID = getHomeSSID();
        String currentSSID = getCurrentSSID();

        Log.i(TAG, "┌─── Home Detection ─────────────────────────");
        Log.i(TAG, "│ Current SSID : " + currentSSID);
        Log.i(TAG, "│ Home SSID    : " + homeSSID);

        boolean isHome = currentSSID != null
                && !currentSSID.isEmpty()
                && currentSSID.equals(homeSSID);

        String profileMode = isHome ? "HOME" : "AWAY";

        Log.i(TAG, "│ Match        : " + isHome);
        Log.i(TAG, "│ Profile      : " + profileMode);
        Log.i(TAG, "└─────────────────────────────────────────────");

        return new HomeDetectionResult(
                isHome,
                currentSSID != null ? currentSSID : "",
                homeSSID,
                profileMode,
                isHome ? 0.95 : 0.90,
                System.currentTimeMillis() / 1000
        );
    }

    /**
     * Saves the current WiFi SSID as the "home" network.
     * Called when user taps "Set this as Home".
     *
     * @return the saved SSID
     */
    public String setCurrentAsHome() {
        String currentSSID = getCurrentSSID();
        if (currentSSID != null && !currentSSID.isEmpty()) {
            prefs.edit().putString(KEY_HOME_SSID, currentSSID).apply();
            Log.i(TAG, "✔ Home SSID saved: " + currentSSID);
            return currentSSID;
        } else {
            Log.w(TAG, "Cannot set home — no WiFi SSID available.");
            return "";
        }
    }

    /**
     * Manually set the home SSID (for settings screen).
     *
     * @param ssid the SSID to save as home
     */
    public void setHomeSSID(String ssid) {
        prefs.edit().putString(KEY_HOME_SSID, ssid).apply();
        Log.i(TAG, "✔ Home SSID manually set: " + ssid);
    }

    /**
     * Get the stored home SSID.
     *
     * @return the stored home SSID, or the default demo value
     */
    public String getHomeSSID() {
        return prefs.getString(KEY_HOME_SSID, DEFAULT_HOME_SSID);
    }

    // ── Internal ─────────────────────────────────────────────

    /**
     * Gets the currently connected WiFi SSID.
     *
     * Note: On Android 8+, this requires ACCESS_FINE_LOCATION or
     * ACCESS_COARSE_LOCATION permission. For the MVP demo, we
     * fall back to the hardcoded default if unavailable.
     */
    private String getCurrentSSID() {
        try {
            if (wifiManager != null) {
                WifiInfo wifiInfo = wifiManager.getConnectionInfo();
                if (wifiInfo != null) {
                    String ssid = wifiInfo.getSSID();
                    // Android wraps SSID in quotes: "MyNetwork"
                    if (ssid != null && ssid.startsWith("\"") && ssid.endsWith("\"")) {
                        ssid = ssid.substring(1, ssid.length() - 1);
                    }
                    // "<unknown ssid>" means permission issue or no connection
                    if (ssid != null && !ssid.equals("<unknown ssid>")) {
                        return ssid;
                    }
                }
            }
        } catch (SecurityException e) {
            Log.w(TAG, "Cannot read WiFi SSID (missing permission)", e);
        }

        // Fallback for demo — hardcode the home SSID so detection works
        Log.d(TAG, "Using hardcoded SSID for demo: " + DEFAULT_HOME_SSID);
        return DEFAULT_HOME_SSID;
    }
}
