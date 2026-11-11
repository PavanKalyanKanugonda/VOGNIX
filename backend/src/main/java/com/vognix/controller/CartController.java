package com.vognix.controller;

import com.vognix.dto.ApiResponse;
import com.vognix.dto.CartDTOs;
import com.vognix.security.UserPrincipal;
import com.vognix.service.CartService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@Tag(name = "Shopping Cart", description = "Shopping cart item operations and discount calculations")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    @Operation(summary = "Get user shopping cart with pricing calculations")
    public ResponseEntity<ApiResponse<CartDTOs.CartDTO>> getCart(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam(required = false) String couponCode) {
        CartDTOs.CartDTO cart = cartService.getCart(currentUser.getId(), couponCode);
        return ResponseEntity.ok(ApiResponse.success(cart));
    }

    @PostMapping("/items")
    @Operation(summary = "Add item variant to shopping cart")
    public ResponseEntity<ApiResponse<CartDTOs.CartDTO>> addItem(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody CartDTOs.AddToCartRequest request,
            @RequestParam(required = false) String couponCode) {
        CartDTOs.CartDTO cart = cartService.addItemToCart(currentUser.getId(), request, couponCode);
        return ResponseEntity.ok(ApiResponse.success("Item added to cart", cart));
    }

    @PutMapping("/items/{id}")
    @Operation(summary = "Update quantity of cart item")
    public ResponseEntity<ApiResponse<CartDTOs.CartDTO>> updateQuantity(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody CartDTOs.UpdateCartItemRequest request,
            @RequestParam(required = false) String couponCode) {
        CartDTOs.CartDTO cart = cartService.updateCartItemQuantity(currentUser.getId(), id, request.getQuantity(), couponCode);
        return ResponseEntity.ok(ApiResponse.success("Cart updated", cart));
    }

    @DeleteMapping("/items/{id}")
    @Operation(summary = "Remove item from shopping cart")
    public ResponseEntity<ApiResponse<CartDTOs.CartDTO>> removeItem(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @RequestParam(required = false) String couponCode) {
        CartDTOs.CartDTO cart = cartService.removeCartItem(currentUser.getId(), id, couponCode);
        return ResponseEntity.ok(ApiResponse.success("Item removed from cart", cart));
    }

    @PostMapping("/apply-coupon")
    @Operation(summary = "Validate and apply discount coupon")
    public ResponseEntity<ApiResponse<CartDTOs.CartDTO>> applyCoupon(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody CartDTOs.ApplyCouponRequest request) {
        CartDTOs.CartDTO cart = cartService.getCart(currentUser.getId(), request.getCouponCode());
        if (cart.getAppliedCoupon() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid or inapplicable coupon code"));
        }
        return ResponseEntity.ok(ApiResponse.success("Coupon applied successfully!", cart));
    }
}
