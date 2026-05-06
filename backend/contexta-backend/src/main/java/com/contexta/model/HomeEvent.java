package com.contexta.model;

/**
 * Request DTO for home detection events.
 * Sent from the Android client to the backend.
 */
public record HomeEvent(
        /** Currently connected WiFi SSID */
        String currentSSID,
        /** Device ID or session identifier */
        String deviceId,
        /** Unix epoch seconds */
        long timestamp
) {}
