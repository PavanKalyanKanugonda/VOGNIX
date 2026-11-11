package com.vognix.controller;

import com.vognix.dto.ApiResponse;
import com.vognix.dto.AuthDTOs;
import com.vognix.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Customer registration, login, and password management")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register new customer account")
    public ResponseEntity<ApiResponse<AuthDTOs.AuthResponse>> register(@Valid @RequestBody AuthDTOs.RegisterRequest request) {
        AuthDTOs.AuthResponse response = authService.register(request);
        return new ResponseEntity<>(ApiResponse.success("Registration successful", response), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    @Operation(summary = "Login customer or administrator")
    public ResponseEntity<ApiResponse<AuthDTOs.AuthResponse>> login(@Valid @RequestBody AuthDTOs.LoginRequest request) {
        AuthDTOs.AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Initiate password reset request")
    public ResponseEntity<ApiResponse<String>> forgotPassword(@Valid @RequestBody AuthDTOs.ForgotPasswordRequest request) {
        String message = authService.initiateForgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success(message, message));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password with verification token")
    public ResponseEntity<ApiResponse<String>> resetPassword(@Valid @RequestBody AuthDTOs.ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successfully. You may now login.", null));
    }
}
