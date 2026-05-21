package com.contexta.android.model;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Represents the result of calendar-based context detection.
 *
 * Output format:
 * {
 *   "event": "MEETING" | "NONE",
 *   "title": "Sprint Standup",
 *   "timestamp": 1710000000
 * }
 */
public class CalendarEventResult {

    /** Detected event type — "MEETING" or "NONE" */
    private final String event;

    /** Original calendar event title (empty string when no event) */
    private final String title;

    /** Classifier confidence score (0.0 - 1.0) */
    private final double confidence;

    /** Event start time as Unix epoch seconds (0 when no event) */
    private final long timestamp;

    public CalendarEventResult(String event, String title, double confidence, long timestamp) {
        this.event = event;
        this.title = title;
        this.confidence = confidence;
        this.timestamp = timestamp;
    }

    // ── Getters ──────────────────────────────────────────────

    public String getEvent() {
        return event;
    }

    public String getTitle() {
        return title;
    }

    public double getConfidence() {
        return confidence;
    }

    public long getTimestamp() {
        return timestamp;
    }

    // ── Convenience helpers ──────────────────────────────────

    /** Returns true when the detected type is MEETING */
    public boolean isMeeting() {
        return "MEETING".equals(event);
    }

    /** Serialises this result to a JSONObject */
    public JSONObject toJson() {
        JSONObject json = new JSONObject();
        try {
            json.put("event", event);
            json.put("title", title);
            json.put("confidence", confidence);
            json.put("timestamp", timestamp);
        } catch (JSONException e) {
            // Should never happen with these simple types
            e.printStackTrace();
        }
        return json;
    }

    @Override
    public String toString() {
        return toJson().toString();
    }

    // ── Factory for "no event" scenario ──────────────────────

    /** Returns a result indicating no meeting was detected */
    public static CalendarEventResult none() {
        return new CalendarEventResult("NONE", "", 0.60, 0);
    }
}
