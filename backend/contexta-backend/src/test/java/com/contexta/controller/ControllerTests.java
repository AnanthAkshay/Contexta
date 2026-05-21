package com.contexta.controller;

import com.contexta.model.HomeEvent;
import com.contexta.model.MovementEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class ControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testContextEndpoints() throws Exception {
        // Test GET /context initial state
        mockMvc.perform(get("/context"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.context", is("IDLE")))
                .andExpect(jsonPath("$.confidence", is(0.60)));

        // Test POST /context
        ContextController.ContextEvent newContext = new ContextController.ContextEvent(
                "MEETING", 0.95, "DND Enabled", "Calendar Event", "Calendar"
        );
        mockMvc.perform(post("/context")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newContext)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.context", is("MEETING")))
                .andExpect(jsonPath("$.confidence", is(0.95)));

        // Test GET /context after update
        mockMvc.perform(get("/context"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.context", is("MEETING")));

        // Test GET /action-log has initial seeded items
        mockMvc.perform(get("/action-log"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))));

        // Test POST /action-log
        ContextController.ActionLogEntry newLog = new ContextController.ActionLogEntry(
                10, "12:00:00 PM", "WALKING", "Steps detected", false, "Sensor"
        );
        mockMvc.perform(post("/action-log")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newLog)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.context", is("WALKING")))
                .andExpect(jsonPath("$.action", is("Steps detected")));

        // Verify it was prepended to the action logs list
        mockMvc.perform(get("/action-log"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].context", is("WALKING")));
    }

    @Test
    public void testHomeEndpoints() throws Exception {
        // Test GET /home/status
        mockMvc.perform(get("/home/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.service", is("home-detection")))
                .andExpect(jsonPath("$.homeSSID", is("MyHomeWiFi")));

        // Test POST /home/set to update baseline
        Map<String, Object> homeSetReq = new HashMap<>();
        homeSetReq.put("ssid", "NewHomeWiFi");
        homeSetReq.put("latitude", 40.7128);
        homeSetReq.put("longitude", -74.0060);

        mockMvc.perform(post("/home/set")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(homeSetReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.homeSSID", is("NewHomeWiFi")))
                .andExpect(jsonPath("$.homeLatitude", is(40.7128)));

        // Test POST /home/set-office to update office baseline
        Map<String, Object> officeSetReq = new HashMap<>();
        officeSetReq.put("ssid", "NewOfficeWiFi");
        officeSetReq.put("latitude", 40.7282);
        officeSetReq.put("longitude", -74.0776);

        mockMvc.perform(post("/home/set-office")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(officeSetReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.officeSSID", is("NewOfficeWiFi")))
                .andExpect(jsonPath("$.officeLatitude", is(40.7282)));

        // Test /home/detect - Scenario 1: WiFi SSID matches Home, coordinates unavailable
        HomeEvent wifiOnlyHomeEvent = new HomeEvent("NewHomeWiFi", "dev123", System.currentTimeMillis() / 1000, null, null);
        mockMvc.perform(post("/home/detect")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wifiOnlyHomeEvent)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isHome", is(true)))
                .andExpect(jsonPath("$.profileMode", is("HOME")))
                .andExpect(jsonPath("$.confidence", is(0.90)));

        // Test /home/detect - Scenario 2: GPS within 50m of Home, connected to other WiFi
        HomeEvent gpsOnlyHomeEvent = new HomeEvent("OtherWiFi", "dev123", System.currentTimeMillis() / 1000, 40.7128, -74.0060);
        mockMvc.perform(post("/home/detect")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(gpsOnlyHomeEvent)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isHome", is(true)))
                .andExpect(jsonPath("$.profileMode", is("HOME")))
                .andExpect(jsonPath("$.confidence", is(0.85)));

        // Test /home/detect - Scenario 3: SSID matches Office, GPS lock unavailable
        HomeEvent officeEvent = new HomeEvent("NewOfficeWiFi", "dev123", System.currentTimeMillis() / 1000, null, null);
        mockMvc.perform(post("/home/detect")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(officeEvent)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isHome", is(false)))
                .andExpect(jsonPath("$.profileMode", is("OFFICE")))
                .andExpect(jsonPath("$.confidence", is(0.90)));

        // Test /home/detect - Scenario 4: Away (SSID doesn't match and GPS far away)
        HomeEvent awayEvent = new HomeEvent("CoffeeShopWiFi", "dev123", System.currentTimeMillis() / 1000, 30.0, 30.0);
        mockMvc.perform(post("/home/detect")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(awayEvent)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isHome", is(false)))
                .andExpect(jsonPath("$.profileMode", is("AWAY")))
                .andExpect(jsonPath("$.confidence", is(0.95)));
    }

    @Test
    public void testMovementEndpoints() throws Exception {
        // Test GET /movement/status
        mockMvc.perform(get("/movement/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.service", is("movement-detection")))
                .andExpect(jsonPath("$.status", is("active")));

        // Test POST /movement - walking with no override
        MovementEvent walkingEvent = new MovementEvent(true, 1.2, "walking", "dev123", System.currentTimeMillis() / 1000, 0.92, 4.0, "~20 min");
        mockMvc.perform(post("/movement")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(walkingEvent)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isMoving", is(true)))
                .andExpect(jsonPath("$.transportMode", is("walking")))
                .andExpect(jsonPath("$.suggestion", containsString("Launch music")))
                .andExpect(jsonPath("$.confidence", is(0.92)))
                .andExpect(jsonPath("$.etaEstimate", is("~20 min")));

        // Test POST /movement - walking but speed is high (driving override)
        MovementEvent drivingOverrideEvent = new MovementEvent(true, 0.5, "walking", "dev123", System.currentTimeMillis() / 1000, 0.95, 60.0, "~5 min");
        mockMvc.perform(post("/movement")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(drivingOverrideEvent)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isMoving", is(true)))
                .andExpect(jsonPath("$.transportMode", is("driving")))
                .andExpect(jsonPath("$.suggestion", containsString("Open Maps")))
                .andExpect(jsonPath("$.confidence", lessThanOrEqualTo(0.85)));
    }
}
