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
        String etaEstimate = "~25 min";

        if (event.isMoving()) {
            switch (event.transportMode()) {
                case "driving":
                    suggestion = "Open Maps for navigation assistance";
                    etaEstimate = "~15 min by car";
                    break;
                case "walking":
                    suggestion = "Launch music for your walk";
                    etaEstimate = "~25 min on foot";
                    break;
                default:
                    suggestion = "No action needed";
                    etaEstimate = "N/A";
                    break;
            }
        } else {
            suggestion = "You're stationary — no movement detected";
            etaEstimate = "N/A";
        }

        return new MovementResponse(
                event.isMoving(),
                event.variance(),
                event.transportMode(),
                suggestion,
                etaEstimate,
                0.87 // hardcoded confidence for MVP
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
