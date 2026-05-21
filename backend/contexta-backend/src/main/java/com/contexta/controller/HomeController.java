package com.contexta.controller;

import com.contexta.model.HomeEvent;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/**
 * REST endpoint for home detection.
 * Upgraded to support dynamic home SSID and coordinates persistence,
 * and server-side Fused Location consensus algorithm (SSID + GPS proximity).
 */
@RestController
@RequestMapping("/home")
public class HomeController {

    /** Dynamic mutable thread-safe baselines for Home SSID and coordinates */
    private final AtomicReference<String> homeSSID = new AtomicReference<>("MyHomeWiFi");
    private final AtomicReference<Double> homeLatitude = new AtomicReference<>(37.7749);
    private final AtomicReference<Double> homeLongitude = new AtomicReference<>(-122.4194);

    /** Dynamic mutable thread-safe baselines for Office SSID and coordinates */
    private final AtomicReference<String> officeSSID = new AtomicReference<>("OfficeWiFi_5G");
    private final AtomicReference<Double> officeLatitude = new AtomicReference<>(37.7894);
    private final AtomicReference<Double> officeLongitude = new AtomicReference<>(-122.4014);

    /**
     * Detects if the user is at home or at the office based on their WiFi SSID and Fused GPS coordinates.
     * Computes real-time Haversine distance and resolves context consensus.
     *
     * @param event the home detection event from the device (with nullable coordinates)
     * @return home profile with settings, confidence rates, and reasoning
     */
    @PostMapping("/detect")
    public HomeResponse detectHome(@RequestBody HomeEvent event) {
        String currentSSID = event.currentSSID();
        Double deviceLat = event.latitude();
        Double deviceLon = event.longitude();

        String configuredHomeSSID = this.homeSSID.get();
        double configuredHomeLat = this.homeLatitude.get();
        double configuredHomeLon = this.homeLongitude.get();

        String configuredOfficeSSID = this.officeSSID.get();
        double configuredOfficeLat = this.officeLatitude.get();
        double configuredOfficeLon = this.officeLongitude.get();

        boolean wifiMatchesHome = configuredHomeSSID.equalsIgnoreCase(currentSSID);
        boolean wifiMatchesOffice = configuredOfficeSSID.equalsIgnoreCase(currentSSID);

        boolean isHome = wifiMatchesHome;
        boolean isOffice = wifiMatchesOffice;
        double confidence = 0.90;
        String reason = "";

        if (deviceLat != null && deviceLon != null) {
            // Geodesic distance using the Haversine formula
            double distanceHomeM = haversineDistance(deviceLat, deviceLon, configuredHomeLat, configuredHomeLon);
            double distanceOfficeM = haversineDistance(deviceLat, deviceLon, configuredOfficeLat, configuredOfficeLon);

            boolean gpsMatchesHome = distanceHomeM <= 50.0; // 50 meters radius
            boolean gpsMatchesOffice = distanceOfficeM <= 50.0;

            if (wifiMatchesHome || gpsMatchesHome) {
                isHome = true;
                isOffice = false;
                if (wifiMatchesHome && gpsMatchesHome) {
                    confidence = 1.00;
                    reason = String.format("SSID matches \"%s\" AND GPS is within %.0fm of home (Strong Dual-Signal Match)", currentSSID, distanceHomeM);
                } else if (wifiMatchesHome) {
                    confidence = 0.80;
                    reason = String.format("Connected to SSID \"%s\", but GPS is %.0fm away from home (Potential WiFi drift/SSID sharing)", currentSSID, distanceHomeM);
                } else {
                    confidence = 0.85;
                    reason = String.format("GPS is within %.0fm of home, though connected to SSID \"%s\"", distanceHomeM, currentSSID);
                }
            } else if (wifiMatchesOffice || gpsMatchesOffice) {
                isHome = false;
                isOffice = true;
                if (wifiMatchesOffice && gpsMatchesOffice) {
                    confidence = 1.00;
                    reason = String.format("SSID matches \"%s\" AND GPS is within %.0fm of office (Strong Dual-Signal Work Match)", currentSSID, distanceOfficeM);
                } else if (wifiMatchesOffice) {
                    confidence = 0.80;
                    reason = String.format("Connected to SSID \"%s\", but GPS is %.0fm away from office (Potential WiFi drift/SSID sharing)", currentSSID, distanceOfficeM);
                } else {
                    confidence = 0.85;
                    reason = String.format("GPS is within %.0fm of office, though connected to SSID \"%s\"", distanceOfficeM, currentSSID);
                }
            } else {
                isHome = false;
                isOffice = false;
                confidence = 0.95;
                reason = String.format("SSID \"%s\" ≠ home/office AND GPS is far away from home (%.0fm) and office (%.0fm)", currentSSID, distanceHomeM, distanceOfficeM);
            }
        } else {
            // Fused Location coordinates unavailable: fall back to WiFi SSID only
            if (wifiMatchesHome) {
                isHome = true;
                isOffice = false;
                confidence = 0.90;
                reason = String.format("WiFi SSID \"%s\" matches home network (GPS lock unavailable)", currentSSID);
            } else if (wifiMatchesOffice) {
                isHome = false;
                isOffice = true;
                confidence = 0.90;
                reason = String.format("WiFi SSID \"%s\" matches office network (GPS lock unavailable)", currentSSID);
            } else {
                isHome = false;
                isOffice = false;
                confidence = 0.85;
                reason = String.format("WiFi SSID \"%s\" ≠ home/office network \"%s\" (GPS lock unavailable)", currentSSID, configuredHomeSSID);
            }
        }

        String profileMode = isHome ? "HOME" : (isOffice ? "OFFICE" : "AWAY");
        String wallpaperHint = isHome ? "personal_wallpaper" : (isOffice ? "office_wallpaper" : "default_wallpaper");
        String volumeLevel = isHome ? "60%" : "vibrate";
        String notificationGrouping = isHome ? "personal" : "work";

        return new HomeResponse(
                isHome,
                profileMode,
                currentSSID,
                configuredHomeSSID,
                wallpaperHint,
                volumeLevel,
                notificationGrouping,
                confidence,
                reason
        );
    }

    /**
     * GET /home/status — health check for home service showing active settings.
     */
    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of(
                "service", "home-detection",
                "status", "active",
                "homeSSID", this.homeSSID.get(),
                "homeLatitude", this.homeLatitude.get(),
                "homeLongitude", this.homeLongitude.get(),
                "officeSSID", this.officeSSID.get(),
                "officeLatitude", this.officeLatitude.get(),
                "officeLongitude", this.officeLongitude.get(),
                "version", "1.1-fused"
        );
    }

    /**
     * POST /home/set — allows the client to update and persist the home SSID and coordinates.
     */
    @PostMapping("/set")
    public Map<String, Object> setHomeSSID(@RequestBody Map<String, Object> body) {
        String newSSID = (String) body.get("ssid");
        Double lat = body.get("latitude") != null ? Double.valueOf(body.get("latitude").toString()) : null;
        Double lon = body.get("longitude") != null ? Double.valueOf(body.get("longitude").toString()) : null;

        if (newSSID != null && !newSSID.trim().isEmpty()) {
            this.homeSSID.set(newSSID.trim());
        }
        if (lat != null) {
            this.homeLatitude.set(lat);
        }
        if (lon != null) {
            this.homeLongitude.set(lon);
        }

        return Map.of(
                "success", true,
                "homeSSID", this.homeSSID.get(),
                "homeLatitude", this.homeLatitude.get(),
                "homeLongitude", this.homeLongitude.get(),
                "message", "Home configuration successfully synchronized on Spring Boot backend"
        );
    }

    /**
     * POST /home/set-office — allows the client to update and persist the office SSID and coordinates.
     */
    @PostMapping("/set-office")
    public Map<String, Object> setOfficeSSID(@RequestBody Map<String, Object> body) {
        String newSSID = (String) body.get("ssid");
        Double lat = body.get("latitude") != null ? Double.valueOf(body.get("latitude").toString()) : null;
        Double lon = body.get("longitude") != null ? Double.valueOf(body.get("longitude").toString()) : null;

        if (newSSID != null && !newSSID.trim().isEmpty()) {
            this.officeSSID.set(newSSID.trim());
        }
        if (lat != null) {
            this.officeLatitude.set(lat);
        }
        if (lon != null) {
            this.officeLongitude.set(lon);
        }

        return Map.of(
                "success", true,
                "officeSSID", this.officeSSID.get(),
                "officeLatitude", this.officeLatitude.get(),
                "officeLongitude", this.officeLongitude.get(),
                "message", "Office configuration successfully synchronized on Spring Boot backend"
        );
    }

    /**
     * Haversine formula calculation for geodesic distance (in meters) between two coordinates.
     */
    private double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000; // Radius of Earth in meters
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    public record HomeResponse(
            boolean isHome,
            String profileMode,
            String currentSSID,
            String homeSSID,
            String wallpaperHint,
            String volumeLevel,
            String notificationGrouping,
            double confidence,
            String reason
    ) {}
}
