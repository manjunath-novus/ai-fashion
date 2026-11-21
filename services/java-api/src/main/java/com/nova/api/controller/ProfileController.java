
package com.nova.api.controller;

import com.nova.api.dto.ProfileRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class ProfileController {

    @PostMapping("/profile")
    public Map<String, Object> createProfile(
            @Valid @RequestBody ProfileRequest request) {

        return Map.of(
                "message", "Profile received successfully!",
                "name", request.name(),
                "email", request.email()
        );
    }
}
