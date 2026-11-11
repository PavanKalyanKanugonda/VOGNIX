package com.vognix.controller;

import com.vognix.dto.ApiResponse;
import com.vognix.dto.WishlistDTOs;
import com.vognix.security.UserPrincipal;
import com.vognix.service.WishlistService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wishlist")
@Tag(name = "Wishlist", description = "Customer wishlist management")
public class WishlistController {

    private final WishlistService wishlistService;

    public WishlistController(WishlistService wishlistService) {
        this.wishlistService = wishlistService;
    }

    @GetMapping
    @Operation(summary = "Get user wishlist")
    public ResponseEntity<ApiResponse<WishlistDTOs.WishlistDTO>> getWishlist(@AuthenticationPrincipal UserPrincipal currentUser) {
        WishlistDTOs.WishlistDTO wishlist = wishlistService.getWishlist(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(wishlist));
    }

    @PostMapping("/{productId}")
    @Operation(summary = "Toggle product in wishlist")
    public ResponseEntity<ApiResponse<WishlistDTOs.WishlistDTO>> toggleWishlist(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long productId) {
        WishlistDTOs.WishlistDTO wishlist = wishlistService.toggleWishlistItem(currentUser.getId(), productId);
        return ResponseEntity.ok(ApiResponse.success("Wishlist updated", wishlist));
    }

    @DeleteMapping("/{productId}")
    @Operation(summary = "Remove product from wishlist")
    public ResponseEntity<ApiResponse<WishlistDTOs.WishlistDTO>> removeFromWishlist(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long productId) {
        WishlistDTOs.WishlistDTO wishlist = wishlistService.removeFromWishlist(currentUser.getId(), productId);
        return ResponseEntity.ok(ApiResponse.success("Removed from wishlist", wishlist));
    }

    @PostMapping("/{productId}/move-to-cart")
    @Operation(summary = "Move item from wishlist to cart")
    public ResponseEntity<ApiResponse<Void>> moveToCart(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long productId,
            @RequestParam(required = false) Long variantId) {
        wishlistService.moveToCart(currentUser.getId(), productId, variantId);
        return ResponseEntity.ok(ApiResponse.success("Moved to cart", null));
    }
}
