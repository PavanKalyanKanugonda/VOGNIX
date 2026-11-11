package com.vognix.controller;

import com.vognix.dto.AddressDTOs;
import com.vognix.dto.ApiResponse;
import com.vognix.dto.AuthDTOs;
import com.vognix.security.UserPrincipal;
import com.vognix.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@Tag(name = "User & Addresses", description = "Customer profile and address book management")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/profile")
    @Operation(summary = "Get current authenticated user profile")
    public ResponseEntity<ApiResponse<AuthDTOs.UserProfileResponse>> getProfile(@AuthenticationPrincipal UserPrincipal currentUser) {
        AuthDTOs.UserProfileResponse profile = userService.getProfile(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @PutMapping("/profile")
    @Operation(summary = "Update current user profile")
    public ResponseEntity<ApiResponse<AuthDTOs.UserProfileResponse>> updateProfile(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestBody AuthDTOs.UserUpdateRequest request) {
        AuthDTOs.UserProfileResponse profile = userService.updateProfile(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", profile));
    }

    @GetMapping("/addresses")
    @Operation(summary = "Get list of saved delivery addresses")
    public ResponseEntity<ApiResponse<List<AddressDTOs.AddressResponse>>> getAddresses(@AuthenticationPrincipal UserPrincipal currentUser) {
        List<AddressDTOs.AddressResponse> addresses = userService.getAddresses(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(addresses));
    }

    @PostMapping("/addresses")
    @Operation(summary = "Add new delivery address")
    public ResponseEntity<ApiResponse<AddressDTOs.AddressResponse>> addAddress(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody AddressDTOs.AddressRequest request) {
        AddressDTOs.AddressResponse address = userService.addAddress(currentUser.getId(), request);
        return new ResponseEntity<>(ApiResponse.success("Address added successfully", address), HttpStatus.CREATED);
    }

    @PutMapping("/addresses/{id}")
    @Operation(summary = "Update existing address")
    public ResponseEntity<ApiResponse<AddressDTOs.AddressResponse>> updateAddress(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody AddressDTOs.AddressRequest request) {
        AddressDTOs.AddressResponse address = userService.updateAddress(currentUser.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Address updated successfully", address));
    }

    @DeleteMapping("/addresses/{id}")
    @Operation(summary = "Delete delivery address")
    public ResponseEntity<ApiResponse<Void>> deleteAddress(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id) {
        userService.deleteAddress(currentUser.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Address deleted successfully", null));
    }

    @PutMapping("/addresses/{id}/default")
    @Operation(summary = "Set address as default")
    public ResponseEntity<ApiResponse<AddressDTOs.AddressResponse>> setDefaultAddress(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id) {
        AddressDTOs.AddressResponse address = userService.setDefaultAddress(currentUser.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Default address updated", address));
    }
}
