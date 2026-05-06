package com.contexta.android.model;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Represents the result of WiFi-based home detection.
 *
 * Output format:
 * {
 *   "isHome": true,
 *   "currentSSID": "MyHomeWiFi",
 *   "homeSSID": "MyHomeWiFi",
 *   "profileMode": "HOME",
 *   "timestamp": 1710000000
 * }
 */
public class HomeDetectionResult {

    /** Whether the user is currently at home */
    private final boolean isHome;

    /** Currently connected WiFi SSID */
    private final String currentSSID;

    /** Stored home WiFi SSID for matching */
    private final String homeSSID;

    /** Active profile mode — "HOME" or "AWAY" */
    private final String profileMode;

    /** Detection time as Unix epoch seconds */
    private final long timestamp;

    public HomeDetectionResult(boolean isHome, String currentSSID,
                                String homeSSID, String profileMode, long timestamp) {
        this.isHome = isHome;
        this.currentSSID = currentSSID;
        this.homeSSID = homeSSID;
        this.profileMode = profileMode;
        this.timestamp = timestamp;
    }

    // ── Getters ──────────────────────────────────────────────

    public boolean isHome() {
        return isHome;
    }

    public String getCurrentSSID() {
        return currentSSID;
    }

    public String getHomeSSID() {
        return homeSSID;
    }

    public String getProfileMode() {
        return profileMode;
    }

    public long getTimestamp() {
        return timestamp;
    }

    // ── Serialisation ────────────────────────────────────────

    public JSONObject toJson() {
        JSONObject json = new JSONObject();
        try {
            json.put("isHome", isHome);
            json.put("currentSSID", currentSSID);
            json.put("homeSSID", homeSSID);
            json.put("profileMode", profileMode);
            json.put("timestamp", timestamp);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return json;
    }

    @Override
    public String toString() {
        return toJson().toString();
    }

    // ── Factory for "away" result ────────────────────────────

    /** Returns a result indicating user is not home */
    public static HomeDetectionResult away(String currentSSID) {
        return new HomeDetectionResult(false, currentSSID, "",
                "AWAY", System.currentTimeMillis() / 1000);
    }
}
