package com.vognix.controller;

import com.vognix.dto.ApiResponse;
import com.vognix.dto.OrderDTOs;
import com.vognix.dto.PagedResponse;
import com.vognix.security.UserPrincipal;
import com.vognix.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@Tag(name = "Orders & Checkout", description = "Order placement, history, tracking, and cancellation")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/checkout/validate")
    @Operation(summary = "Pre-checkout stock, address, and coupon validation")
    public ResponseEntity<ApiResponse<OrderDTOs.CheckoutValidateResponse>> validateCheckout(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody OrderDTOs.CheckoutValidateRequest request) {
        OrderDTOs.CheckoutValidateResponse response = orderService.validateCheckout(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/orders")
    @Operation(summary = "Place order with atomic inventory deduction and idempotency support")
    public ResponseEntity<ApiResponse<OrderDTOs.OrderResponse>> placeOrder(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody OrderDTOs.OrderPlacementRequest request) {
        OrderDTOs.OrderResponse response = orderService.placeOrder(currentUser.getId(), request, idempotencyKey);
        return new ResponseEntity<>(ApiResponse.success("Order placed successfully!", response), HttpStatus.CREATED);
    }

    @GetMapping("/orders")
    @Operation(summary = "Get user order history with status timeline")
    public ResponseEntity<ApiResponse<PagedResponse<OrderDTOs.OrderResponse>>> getOrders(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "10") int size) {
        PagedResponse<OrderDTOs.OrderResponse> response = orderService.getCustomerOrders(currentUser.getId(), page, size);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/orders/{id}")
    @Operation(summary = "Get detailed order tracking and items by order ID")
    public ResponseEntity<ApiResponse<OrderDTOs.OrderResponse>> getOrderById(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id) {
        OrderDTOs.OrderResponse response = orderService.getOrderById(currentUser.getId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/orders/{id}/cancel")
    @Operation(summary = "Cancel order and automatically restore inventory")
    public ResponseEntity<ApiResponse<OrderDTOs.OrderResponse>> cancelOrder(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody OrderDTOs.CancelOrderRequest request) {
        OrderDTOs.OrderResponse response = orderService.cancelOrder(currentUser.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Order cancelled and inventory restored", response));
    }
}
