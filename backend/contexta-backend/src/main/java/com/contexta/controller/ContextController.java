package com.contexta.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ContextController {

    @PostMapping("/context")
    public ContextResponse getContext() {
        return new ContextResponse("MEETING", 0.91);
    }

    public record ContextResponse(String context, double confidence) {}
}
