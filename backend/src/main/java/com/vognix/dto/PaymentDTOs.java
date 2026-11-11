package com.vognix.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public final class PaymentDTOs {

    private PaymentDTOs() {}

    public static class CreateOrderRequest {
        @NotNull
        private Long addressId;

        private String couponCode;

        @NotBlank
        private String paymentMethod;

        public Long getAddressId() { return addressId; }
        public void setAddressId(Long addressId) { this.addressId = addressId; }
        public String getCouponCode() { return couponCode; }
        public void setCouponCode(String couponCode) { this.couponCode = couponCode; }
        public String getPaymentMethod() { return paymentMethod; }
        public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    }

    public static class VerifyPaymentRequest {
        @NotBlank
        private String razorpayOrderId;
        @NotBlank
        private String razorpayPaymentId;
        @NotBlank
        private String razorpaySignature;

        public String getRazorpayOrderId() { return razorpayOrderId; }
        public void setRazorpayOrderId(String razorpayOrderId) { this.razorpayOrderId = razorpayOrderId; }
        public String getRazorpayPaymentId() { return razorpayPaymentId; }
        public void setRazorpayPaymentId(String razorpayPaymentId) { this.razorpayPaymentId = razorpayPaymentId; }
        public String getRazorpaySignature() { return razorpaySignature; }
        public void setRazorpaySignature(String razorpaySignature) { this.razorpaySignature = razorpaySignature; }
    }

    public static class FailureRequest {
        @NotNull
        private Long paymentId;
        @NotBlank
        private String razorpayPaymentId;

        public Long getPaymentId() { return paymentId; }
        public void setPaymentId(Long paymentId) { this.paymentId = paymentId; }
        public String getRazorpayPaymentId() { return razorpayPaymentId; }
        public void setRazorpayPaymentId(String razorpayPaymentId) { this.razorpayPaymentId = razorpayPaymentId; }
    }

    public static class PaymentResponse {
        private Long paymentId;
        private Long orderId;
        private String orderNumber;
        private String razorpayOrderId;
        private String razorpayPaymentId;
        private String keyId;
        private String gatewayMode;
        private String paymentMethod;
        private String paymentStatus;
        private BigDecimal amount;
        private String currency;
        private String failureReason;
        private boolean paymentSignatureVerified;
        private LocalDateTime createdAt;

        public Long getPaymentId() { return paymentId; }
        public void setPaymentId(Long paymentId) { this.paymentId = paymentId; }
        public Long getOrderId() { return orderId; }
        public void setOrderId(Long orderId) { this.orderId = orderId; }
        public String getOrderNumber() { return orderNumber; }
        public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
        public String getRazorpayOrderId() { return razorpayOrderId; }
        public void setRazorpayOrderId(String razorpayOrderId) { this.razorpayOrderId = razorpayOrderId; }
        public String getRazorpayPaymentId() { return razorpayPaymentId; }
        public void setRazorpayPaymentId(String razorpayPaymentId) { this.razorpayPaymentId = razorpayPaymentId; }
        public String getKeyId() { return keyId; }
        public void setKeyId(String keyId) { this.keyId = keyId; }
        public String getGatewayMode() { return gatewayMode; }
        public void setGatewayMode(String gatewayMode) { this.gatewayMode = gatewayMode; }
        public String getPaymentMethod() { return paymentMethod; }
        public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
        public String getPaymentStatus() { return paymentStatus; }
        public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public String getCurrency() { return currency; }
        public void setCurrency(String currency) { this.currency = currency; }
        public String getFailureReason() { return failureReason; }
        public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
        public boolean isPaymentSignatureVerified() { return paymentSignatureVerified; }
        public void setPaymentSignatureVerified(boolean paymentSignatureVerified) { this.paymentSignatureVerified = paymentSignatureVerified; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }

    public static class GatewayConfigResponse {
        private String gatewayMode;
        private boolean razorpayConfigured;
        private String currency;

        public String getGatewayMode() { return gatewayMode; }
        public void setGatewayMode(String gatewayMode) { this.gatewayMode = gatewayMode; }
        public boolean isRazorpayConfigured() { return razorpayConfigured; }
        public void setRazorpayConfigured(boolean razorpayConfigured) { this.razorpayConfigured = razorpayConfigured; }
        public String getCurrency() { return currency; }
        public void setCurrency(String currency) { this.currency = currency; }
    }

    public static class ConfirmPaymentRequest {
        @NotNull(message = "Payment ID is required")
        private Long paymentId;

        private String paymentStatus = "PAID";
        private String paymentMethod;
        private String transactionId;
        private String failureReason;
        private String paymentDetailsJson;

        public Long getPaymentId() { return paymentId; }
        public void setPaymentId(Long paymentId) { this.paymentId = paymentId; }
        public String getPaymentStatus() { return paymentStatus; }
        public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
        public String getPaymentMethod() { return paymentMethod; }
        public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
        public String getTransactionId() { return transactionId; }
        public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
        public String getFailureReason() { return failureReason; }
        public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
        public String getPaymentDetailsJson() { return paymentDetailsJson; }
        public void setPaymentDetailsJson(String paymentDetailsJson) { this.paymentDetailsJson = paymentDetailsJson; }
    }
}
