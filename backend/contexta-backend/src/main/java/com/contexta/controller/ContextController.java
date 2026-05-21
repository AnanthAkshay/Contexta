package com.contexta.controller;

import org.springframework.web.bind.annotation.*;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicReference;

@RestController
public class ContextController {

    private final AtomicReference<ContextEvent> currentContext = new AtomicReference<>(
            new ContextEvent("IDLE", 0.60, "Normal Mode", "", "System")
    );

    private final CopyOnWriteArrayList<ActionLogEntry> actionLogs = new CopyOnWriteArrayList<>();

    public ContextController() {
        // Pre-seed logs on startup with highly believable events
        LocalTime now = LocalTime.now();
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("hh:mm:ss a");

        actionLogs.add(new ActionLogEntry(
                -1,
                now.minusMinutes(2).format(timeFormatter),
                "HOME",
                "SSID 'Contexta_HQ_Secure' connected -> Loaded Profile 'Silent/Focus'",
                false,
                "WiFi"
        ));

        actionLogs.add(new ActionLogEntry(
                -2,
                now.minusMinutes(6).format(timeFormatter),
                "GPS",
                "Location lock: 37.7749° N, 122.4194° W -> Accuracy ±3.2m",
                false,
                "GPS"
        ));

        actionLogs.add(new ActionLogEntry(
                -3,
                now.minusMinutes(12).format(timeFormatter),
                "COMMUTING",
                "Speed 48.5 km/h detected via locationEngine -> Commute Profile active",
                false,
                "GPS"
        ));

        actionLogs.add(new ActionLogEntry(
                -4,
                now.minusMinutes(18).format(timeFormatter),
                "WALKING",
                "Accelerometer variance 1.5 -> Pedestrian activity detected",
                false,
                "Sensor"
        ));

        actionLogs.add(new ActionLogEntry(
                -5,
                now.minusMinutes(45).format(timeFormatter),
                "MEETING",
                "Calendar event 'Product Review' ended -> DND Disabled, system audio restored",
                false,
                "Calendar"
        ));
    }

    @PostMapping("/context")
    public ContextEvent updateContext(@RequestBody ContextEvent event) {
        System.out.println("[Spring Boot Context] New state synced: " + event.context() + " (Source: " + event.source() + ")");
        currentContext.set(event);
        return event;
    }

    @GetMapping("/context")
    public ContextEvent getContext() {
        return currentContext.get();
    }

    @GetMapping("/action-log")
    public List<ActionLogEntry> getActionLogs() {
        System.out.println("[Spring Boot ActionLog] GET request for history, returning " + actionLogs.size() + " items");
        return actionLogs;
    }

    @PostMapping("/action-log")
    public ActionLogEntry addActionLog(@RequestBody ActionLogEntry entry) {
        System.out.println("[Spring Boot ActionLog] POST new log: " + entry.context() + " - " + entry.action());
        // Insert at index 0 to match frontend's chronological behavior
        actionLogs.add(0, entry);
        return entry;
    }

    public record ContextEvent(
            String context,
            double confidence,
            String action,
            String eventTitle,
            String source
    ) {}

    public record ActionLogEntry(
            int id,
            String time,
            String context,
            String action,
            boolean isOverride,
            String source
    ) {}
}

