package com.contexta.android.model;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Represents the result of accelerometer-based movement detection.
 *
 * Output format:
 * {
 *   "isMoving": true,
 *   "variance": 1.23,
 *   "transportMode": "walking",
 *   "timestamp": 1710000000
 * }
 */
public class MovementResult {

    /** Whether the user is currently moving (variance > threshold) */
    private final boolean isMoving;

    /** Computed accelerometer variance over the rolling window */
    private final double variance;

    /** Inferred transport mode — "walking", "driving", or "stationary" */
    private final String transportMode;

    /** Classifier confidence score (0.0 - 1.0) calculated via TFLite MLP */
    private final double confidence;

    /** Detection time as Unix epoch seconds */
    private final long timestamp;

    public MovementResult(boolean isMoving, double variance, String transportMode, double confidence, long timestamp) {
        this.isMoving = isMoving;
        this.variance = variance;
        this.transportMode = transportMode;
        this.confidence = confidence;
        this.timestamp = timestamp;
    }

    // ── Getters ──────────────────────────────────────────────

    public boolean isMoving() {
        return isMoving;
    }

    public double getVariance() {
        return variance;
    }

    public String getTransportMode() {
        return transportMode;
    }

    public double getConfidence() {
        return confidence;
    }

    public long getTimestamp() {
        return timestamp;
    }

    // ── Serialisation ────────────────────────────────────────

    public JSONObject toJson() {
        JSONObject json = new JSONObject();
        try {
            json.put("isMoving", isMoving);
            json.put("variance", variance);
            json.put("transportMode", transportMode);
            json.put("confidence", confidence);
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

    // ── Factory for "stationary" result ────────────────────────

    /** Returns a result indicating no movement was detected */
    public static MovementResult stationary() {
        return new MovementResult(false, 0.0, "stationary", 1.00,
                System.currentTimeMillis() / 1000);
    }
}
