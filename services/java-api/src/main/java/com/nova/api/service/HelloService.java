package com.nova.api.service;

import org.springframework.stereotype.Service;

@Service
public class HelloService {

    public String getMessage() {
        return "NOVA API - Automatic Restart Working!";
    }
}