package com.vognix.service;

import com.razorpay.Payment;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import com.vognix.exception.BadRequestException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RazorpayGateway {

    @Value("${razorpay.key-id:}")
    private String keyId;

    @Value("${razorpay.key-secret:}")
    private String keySecret;

    @Value("${razorpay.webhook-secret:}")
    private String webhookSecret;

    private volatile RazorpayClient cachedClient;
    private volatile String cachedClientCredentials;

    public boolean isSandboxMode() {
        return keyId == null || keyId.isBlank() || keySecret == null || keySecret.isBlank();
    }

    public String getKeyId() {
        requireApiCredentials();
        return keyId;
    }

    public String createOrder(long amountPaise, String currency, String receipt, Long internalOrderId) {
        requireApiCredentials();
        try {
            JSONObject request = new JSONObject()
                    .put("amount", amountPaise)
                    .put("currency", currency)
                    .put("receipt", receipt)
                    .put("payment_capture", true)
                    .put("notes", new JSONObject().put("vognix_order_id", internalOrderId));
            return getClient().orders.create(request).get("id").toString();
        } catch (RazorpayException | RuntimeException exception) {
            throw new IllegalStateException("Razorpay order creation failed: " + exception.getMessage(), exception);
        }
    }

    public boolean verifyPaymentSignature(String orderId, String paymentId, String signature) {
        requireApiCredentials();
        try {
            return Utils.verifySignature(orderId + "|" + paymentId, signature, keySecret);
        } catch (RazorpayException exception) {
            return false;
        }
    }

    public boolean verifyWebhookSignature(String body, String signature) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            throw new IllegalStateException("Razorpay webhook secret is not configured");
        }
        try {
            return Utils.verifyWebhookSignature(body, signature, webhookSecret);
        } catch (RazorpayException exception) {
            return false;
        }
    }

    public JSONObject fetchPayment(String paymentId) {
        requireApiCredentials();
        try {
            return getClient().payments.fetch(paymentId).toJson();
        } catch (RazorpayException exception) {
            throw new IllegalStateException("Could not verify payment with Razorpay: " + exception.getMessage(), exception);
        }
    }

    public JSONObject capturePayment(String paymentId, long amountPaise, String currency) {
        requireApiCredentials();
        try {
            JSONObject request = new JSONObject()
                    .put("amount", amountPaise)
                    .put("currency", currency);
            return getClient().payments.capture(paymentId, request).toJson();
        } catch (RazorpayException exception) {
            throw new IllegalStateException("Could not capture payment with Razorpay: " + exception.getMessage(), exception);
        }
    }

    public List<JSONObject> fetchOrderPayments(String razorpayOrderId) {
        requireApiCredentials();
        try {
            List<Payment> payments = getClient().orders.fetchPayments(razorpayOrderId);
            return payments.stream().map(Payment::toJson).toList();
        } catch (RazorpayException exception) {
            throw new IllegalStateException("Could not fetch order payments from Razorpay: " + exception.getMessage(), exception);
        }
    }

    private RazorpayClient getClient() throws RazorpayException {
        String credentials = keyId + ":" + keySecret;
        if (cachedClient == null || !credentials.equals(cachedClientCredentials)) {
            synchronized (this) {
                if (cachedClient == null || !credentials.equals(cachedClientCredentials)) {
                    cachedClient = new RazorpayClient(keyId, keySecret);
                    cachedClientCredentials = credentials;
                }
            }
        }
        return cachedClient;
    }

    private void requireApiCredentials() {
        if (keyId == null || keyId.isBlank() || keySecret == null || keySecret.isBlank()) {
            throw new BadRequestException("Online payments are not configured. Set Razorpay Test Mode credentials.");
        }
    }
}
