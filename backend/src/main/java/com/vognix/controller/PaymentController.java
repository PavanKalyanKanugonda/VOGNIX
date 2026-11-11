package com.vognix.controller;

import com.vognix.dto.ApiResponse;
import com.vognix.dto.PaymentDTOs;
import com.vognix.security.UserPrincipal;
import com.vognix.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@Tag(name = "Payments", description = "Razorpay online payments and cash on delivery")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/config")
    @Operation(summary = "Get active payment gateway mode (RAZORPAY or SANDBOX)")
    public ResponseEntity<ApiResponse<PaymentDTOs.GatewayConfigResponse>> config() {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getGatewayConfig()));
    }

    @PostMapping({"/create-order", "/initiate"})
    @Operation(summary = "Create/initiate an order and payment attempt from the authenticated customer's database cart")
    public ResponseEntity<ApiResponse<PaymentDTOs.PaymentResponse>> createOrder(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody PaymentDTOs.CreateOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Checkout order created",
                paymentService.createOrder(currentUser.getId(), request, idempotencyKey)));
    }

    @PostMapping("/confirm")
    @Operation(summary = "Confirm simulated online payment outcome (PAID, FAILED, or PENDING) in sandbox mode")
    public ResponseEntity<ApiResponse<PaymentDTOs.PaymentResponse>> confirm(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody PaymentDTOs.ConfirmPaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Payment confirmation processed",
                paymentService.confirmSandboxPayment(currentUser.getId(), request)));
    }

    @PostMapping("/verify")
    @Operation(summary = "Verify Razorpay signature and confirm captured payment with Razorpay")
    public ResponseEntity<ApiResponse<PaymentDTOs.PaymentResponse>> verify(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody PaymentDTOs.VerifyPaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Payment verification completed",
                paymentService.verifyPayment(currentUser.getId(), request)));
    }

    @PostMapping("/failure")
    @Operation(summary = "Record a failed attempt only after checking its state with Razorpay")
    public ResponseEntity<ApiResponse<PaymentDTOs.PaymentResponse>> failure(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody PaymentDTOs.FailureRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Payment attempt status refreshed",
                paymentService.recordFailedAttempt(currentUser.getId(), request)));
    }

    @PostMapping("/webhook")
    @Operation(summary = "Receive signed Razorpay webhook events")
    public ResponseEntity<Void> webhook(
            @RequestHeader("X-Razorpay-Signature") String signature,
            @RequestHeader(value = "X-Razorpay-Event-Id", required = false) String eventId,
            @RequestBody String body) {
        paymentService.handleWebhook(body, signature, eventId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{paymentId}/status")
    @Operation(summary = "Get the authenticated customer's payment status")
    public ResponseEntity<ApiResponse<PaymentDTOs.PaymentResponse>> status(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long paymentId,
            @RequestParam(defaultValue = "false") boolean sync) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getStatus(currentUser.getId(), paymentId, sync)));
    }

    @PostMapping("/{paymentId}/retry")
    @Operation(summary = "Create a new Razorpay attempt for a failed order")
    public ResponseEntity<ApiResponse<PaymentDTOs.PaymentResponse>> retry(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long paymentId) {
        return ResponseEntity.ok(ApiResponse.success("Payment retry created",
                paymentService.retry(currentUser.getId(), paymentId)));
    }

    @GetMapping
    @Operation(summary = "Get the authenticated customer's payment history")
    public ResponseEntity<ApiResponse<List<PaymentDTOs.PaymentResponse>>> history(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getCustomerHistory(currentUser.getId())));
    }
}
