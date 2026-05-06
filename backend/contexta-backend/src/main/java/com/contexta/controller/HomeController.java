package com.contexta.controller;

import com.contexta.model.HomeEvent;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST endpoint for home detection.
 *
 * POST /home/detect — receives WiFi SSID from Android client,
 * returns a home profile with settings to apply.
 */
@RestController
@RequestMapping("/home")
public class HomeController {

    /** Hardcoded home SSID for MVP — matches the Android default */
    private static final String HOME_SSID = "MyHomeWiFi";

    /**
     * Detects if the user is at home based on their WiFi SSID
     * and returns the appropriate profile.
     *
     * @param event the home detection event from the device
     * @return home profile with settings
     */
    @PostMapping("/detect")
    public HomeResponse detectHome(@RequestBody HomeEvent event) {
        boolean isHome = HOME_SSID.equalsIgnoreCase(event.currentSSID());

        String profileMode = isHome ? "HOME" : "AWAY";
        String wallpaperHint = isHome ? "personal_wallpaper" : "default_wallpaper";
        String volumeLevel = isHome ? "60%" : "vibrate";
        String notificationGrouping = isHome ? "personal" : "work";

        return new HomeResponse(
                isHome,
                profileMode,
                event.currentSSID(),
                HOME_SSID,
                wallpaperHint,
                volumeLevel,
                notificationGrouping,
                0.95 // high confidence for SSID match
        );
    }

    /**
     * GET /home/status — health check for home service.
     */
    @GetMapping("/status")
    public Map<String, String> status() {
        return Map.of(
                "service", "home-detection",
                "status", "active",
                "homeSSID", HOME_SSID,
                "version", "1.0-mvp"
        );
    }

    /**
     * POST /home/set — allows the client to update the home SSID.
     * MVP: just returns confirmation (no persistent storage).
     */
    @PostMapping("/set")
    public Map<String, Object> setHomeSSID(@RequestBody Map<String, String> body) {
        String newSSID = body.getOrDefault("ssid", "");
        return Map.of(
                "success", !newSSID.isEmpty(),
                "homeSSID", newSSID.isEmpty() ? HOME_SSID : newSSID,
                "message", newSSID.isEmpty()
                        ? "No SSID provided"
                        : "Home SSID updated to: " + newSSID
        );
    }

    public record HomeResponse(
            boolean isHome,
            String profileMode,
            String currentSSID,
            String homeSSID,
            String wallpaperHint,
            String volumeLevel,
            String notificationGrouping,
            double confidence
    ) {}
}
