package com.contexta.controller;

import com.contexta.model.MovementEvent;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST endpoint for movement detection analytics.
 *
 * POST /movement — receives movement data from Android client,
 * returns a movement profile with suggested actions.
 */
@RestController
@RequestMapping("/movement")
public class MovementController {

    /**
     * Processes a movement detection event and returns suggested actions.
     *
     * @param event the movement event from the device
     * @return movement profile with suggestions
     */
    @PostMapping
    public MovementResponse processMovement(@RequestBody MovementEvent event) {
        String suggestion;
        String etaEstimate;

        boolean overridden = false;
        String finalMode = event.transportMode();
        boolean finalMoving = event.isMoving();

        if (event.speedKmh() != null) {
            double speed = event.speedKmh();
            if (speed > 35.0) {
                if (!"driving".equals(finalMode) || !finalMoving) {
                    finalMode = "driving";
                    finalMoving = true;
                    overridden = true;
                }
            } else if (speed >= 6.0) {
                // Inferred as cycling if not already walking
                if (!"walking".equals(finalMode) && (!"cycling".equals(finalMode) || !finalMoving)) {
                    finalMode = "cycling";
                    finalMoving = true;
                    overridden = true;
                }
            } else if (speed >= 1.0) {
                // Inferred as walking
                if (!"walking".equals(finalMode) || !finalMoving) {
                    finalMode = "walking";
                    finalMoving = true;
                    overridden = true;
                }
            } else {
                // speed < 1.0 km/h: Override to stationary
                if (!"stationary".equals(finalMode) || finalMoving) {
                    finalMode = "stationary";
                    finalMoving = false;
                    overridden = true;
                }
            }
        }

        if (finalMoving) {
            switch (finalMode) {
                case "driving":
                    suggestion = "Open Maps for navigation assistance";
                    etaEstimate = (event.eta() != null && !event.eta().equals("N/A") && !overridden) ? event.eta() : "~15 min by car";
                    break;
                case "walking":
                    suggestion = "Launch music for your walk";
                    etaEstimate = (event.eta() != null && !event.eta().equals("N/A") && !overridden) ? event.eta() : "~25 min on foot";
                    break;
                case "cycling":
                    suggestion = "Safety first - put on a helmet!";
                    etaEstimate = (event.eta() != null && !event.eta().equals("N/A") && !overridden) ? event.eta() : "~20 min by cycle";
                    break;
                default:
                    suggestion = "No action needed";
                    etaEstimate = (event.eta() != null) ? event.eta() : "N/A";
                    break;
            }
        } else {
            suggestion = "You're stationary - no movement detected";
            etaEstimate = "N/A";
        }

        double confidence = (event.confidence() != null)
                ? event.confidence()
                : Math.min(1.0, 0.90 + event.variance() * 0.01);

        if (overridden) {
            confidence = Math.min(confidence, 0.85);
            System.out.printf("[Backend Movement Override] Speed=%.1f km/h mismatch! Overriding mode: %s -> %s (moving: %b -> %b, new confidence: %.2f%%)\n",
                    event.speedKmh(), event.transportMode(), finalMode, event.isMoving(), finalMoving, confidence * 100);
        } else {
            System.out.printf("[Backend Movement] Processed %s: var=%.3f, speed=%s km/h, confidence=%.2f%%, eta=%s\n",
                    event.transportMode(), event.variance(), event.speedKmh(), confidence * 100, etaEstimate);
        }

        return new MovementResponse(
                finalMoving,
                event.variance(),
                finalMode,
                suggestion,
                etaEstimate,
                confidence
        );
    }

    /**
     * GET /movement/status — quick health check for movement service.
     */
    @GetMapping("/status")
    public Map<String, String> status() {
        return Map.of(
                "service", "movement-detection",
                "status", "active",
                "version", "1.0-mvp"
        );
    }

    public record MovementResponse(
            boolean isMoving,
            double variance,
            String transportMode,
            String suggestion,
            String etaEstimate,
            double confidence
    ) {}
}
