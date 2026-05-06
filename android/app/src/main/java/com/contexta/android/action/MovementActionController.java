package com.contexta.android.action;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;

/**
 * Handles actions triggered when movement/commuting is detected.
 *
 * <h3>Capabilities</h3>
 * <ul>
 *   <li>Launch Maps with deep link (shows Maps intent screen)</li>
 *   <li>Launch Spotify/music player with deep link</li>
 *   <li>Show ETA suggestion (static string for MVP)</li>
 * </ul>
 *
 * <h3>MVP Simplifications</h3>
 * <ul>
 *   <li>Spotify launch — shows intent screen, no real playback</li>
 *   <li>Maps suggestion — deep link UI only, no real navigation</li>
 *   <li>ETA calculation — hardcoded static string</li>
 * </ul>
 */
public class MovementActionController {

    private static final String TAG = "MovementAction";

    private final Context context;

    public MovementActionController(Context context) {
        this.context = context.getApplicationContext();
    }

    // ── Maps ─────────────────────────────────────────────────

    /**
     * Opens Google Maps with a generic navigation intent.
     * Shows the Maps intent screen (deep link UI only, no actual destination).
     */
    public void openMaps() {
        Log.i(TAG, "┌─── Opening Maps ─────────────────────────");
        try {
            // Generic Maps deep link — opens Maps home screen
            Uri gmmIntentUri = Uri.parse("geo:0,0?q=");
            Intent mapIntent = new Intent(Intent.ACTION_VIEW, gmmIntentUri);
            mapIntent.setPackage("com.google.android.apps.maps");
            mapIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (mapIntent.resolveActivity(context.getPackageManager()) != null) {
                context.startActivity(mapIntent);
                Log.i(TAG, "│ ✔ Maps launched via deep link");
            } else {
                // Fallback: open in browser
                Intent browserIntent = new Intent(Intent.ACTION_VIEW,
                        Uri.parse("https://maps.google.com"));
                browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(browserIntent);
                Log.i(TAG, "│ ✔ Maps opened in browser (app not installed)");
            }
        } catch (Exception e) {
            Log.e(TAG, "│ ✘ Failed to open Maps", e);
        }
        Log.i(TAG, "└─────────────────────────────────────────────");
    }

    /**
     * Opens Google Maps with a specific destination query.
     *
     * @param destination the destination to navigate to
     */
    public void openMapsWithDestination(String destination) {
        Log.i(TAG, "┌─── Opening Maps → " + destination + " ────");
        try {
            Uri gmmIntentUri = Uri.parse("geo:0,0?q=" + Uri.encode(destination));
            Intent mapIntent = new Intent(Intent.ACTION_VIEW, gmmIntentUri);
            mapIntent.setPackage("com.google.android.apps.maps");
            mapIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(mapIntent);
            Log.i(TAG, "│ ✔ Maps launched with destination: " + destination);
        } catch (Exception e) {
            Log.e(TAG, "│ ✘ Failed to open Maps", e);
        }
        Log.i(TAG, "└─────────────────────────────────────────────");
    }

    // ── Music / Spotify ─────────────────────────────────────

    /**
     * Opens Spotify (or default music player) via intent.
     * MVP: Shows the intent screen, doesn't auto-play.
     */
    public void openMusicPlayer() {
        Log.i(TAG, "┌─── Opening Music Player ────────────────");
        try {
            // Try Spotify first
            Intent spotifyIntent = context.getPackageManager()
                    .getLaunchIntentForPackage("com.spotify.music");

            if (spotifyIntent != null) {
                spotifyIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(spotifyIntent);
                Log.i(TAG, "│ ✔ Spotify launched");
            } else {
                // Fallback: open a generic music intent
                Intent musicIntent = new Intent(Intent.ACTION_MAIN);
                musicIntent.addCategory(Intent.CATEGORY_APP_MUSIC);
                musicIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(musicIntent);
                Log.i(TAG, "│ ✔ Default music player launched");
            }
        } catch (Exception e) {
            Log.w(TAG, "│ ⚠ Could not launch music player", e);
            // Last resort: open Spotify in Play Store
            try {
                Intent storeIntent = new Intent(Intent.ACTION_VIEW,
                        Uri.parse("market://details?id=com.spotify.music"));
                storeIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(storeIntent);
                Log.i(TAG, "│ ✔ Opened Spotify in Play Store");
            } catch (Exception e2) {
                Log.e(TAG, "│ ✘ Cannot open any music app", e2);
            }
        }
        Log.i(TAG, "└─────────────────────────────────────────────");
    }

    // ── ETA ──────────────────────────────────────────────────

    /**
     * Returns a hardcoded ETA string for the MVP.
     * In a real implementation, this would query a routing API.
     *
     * @return static ETA string
     */
    public String getEstimatedArrival() {
        // MVP: hardcoded static string
        return "~25 min (estimated)";
    }

    // ── Context-aware trigger ────────────────────────────────

    /**
     * Called when movement context changes.
     * Logs the suggested action for the transport mode.
     *
     * @param transportMode the detected transport mode
     */
    public void onMovementDetected(String transportMode) {
        Log.i(TAG, "┌─── Movement Context Change ──────────────");
        Log.i(TAG, "│ Transport Mode : " + transportMode);
        Log.i(TAG, "│ ETA            : " + getEstimatedArrival());

        switch (transportMode) {
            case "driving":
                Log.i(TAG, "│ Suggestion     : Open Maps for navigation");
                Log.i(TAG, "│ Action         : Show Maps + Music CTAs");
                break;
            case "walking":
                Log.i(TAG, "│ Suggestion     : Launch music for your walk");
                Log.i(TAG, "│ Action         : Show Music + Maps CTAs");
                break;
            default:
                Log.i(TAG, "│ Suggestion     : None (stationary)");
                break;
        }

        Log.i(TAG, "└─────────────────────────────────────────────");
    }
}
