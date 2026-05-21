package com.contexta.model;

/**
 * Request DTO for movement detection events.
 * Sent from the Android client to the backend for analytics.
 */
public record MovementEvent(
        /** Whether user is currently moving */
        boolean isMoving,
        /** Computed accelerometer variance */
        double variance,
        /** Inferred transport mode: "walking", "driving", "stationary" */
        String transportMode,
        /** Device ID or session identifier */
        String deviceId,
        /** Unix epoch seconds */
        long timestamp,
        /** ML classification confidence probability (0.0 to 1.0) */
        Double confidence,
        /** Client-reported movement speed in km/h */
        Double speedKmh,
        /** Client-estimated ETA */
        String eta
) {}
