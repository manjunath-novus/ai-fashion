
package com.nova.api.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class StatusController {

    @GetMapping("/api/status")
    public Map<String, Object> getStatus() {
        return Map.of(
                "app", "NOVA",
                "service", "Java API",
                "status", "running",
                "port", 8080
        );
    }
}
