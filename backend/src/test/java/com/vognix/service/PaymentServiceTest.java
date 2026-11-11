package com.vognix.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vognix.dto.PaymentDTOs;
import com.vognix.entity.Cart;
import com.vognix.entity.Order;
import com.vognix.entity.Payment;
import com.vognix.entity.User;
import com.vognix.exception.BadRequestException;
import com.vognix.repository.*;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentWebhookEventRepository webhookEventRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private CartRepository cartRepository;
    @Mock private OrderItemRepository orderItemRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserAddressRepository addressRepository;
    @Mock private InventoryRepository inventoryRepository;
    @Mock private CartItemRepository cartItemRepository;
    @Mock private CouponRepository couponRepository;
    @Mock private CartService cartService;
    @Mock private RazorpayGateway razorpayGateway;
    @Mock private AuditLogService auditLogService;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks private PaymentService paymentService;

    @Test
    void rejectsInvalidCheckoutSignatureWithoutFetchingOrChangingPayment() {
        Payment payment = paymentFor(11L);
        when(paymentRepository.findByRazorpayOrderId("order_test_1")).thenReturn(Optional.of(payment));
        when(razorpayGateway.verifyPaymentSignature("order_test_1", "pay_test_1", "invalid"))
                .thenReturn(false);
        PaymentDTOs.VerifyPaymentRequest request = new PaymentDTOs.VerifyPaymentRequest();
        request.setRazorpayOrderId("order_test_1");
        request.setRazorpayPaymentId("pay_test_1");
        request.setRazorpaySignature("invalid");

        assertThrows(BadRequestException.class, () -> paymentService.verifyPayment(11L, request));
        verify(razorpayGateway, never()).fetchPayment(anyString());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void rejectsProviderAmountMismatchEvenWhenCheckoutSignatureIsValid() {
        Payment payment = paymentFor(11L);
        when(paymentRepository.findByRazorpayOrderId("order_test_1")).thenReturn(Optional.of(payment));
        when(razorpayGateway.verifyPaymentSignature("order_test_1", "pay_test_1", "valid"))
                .thenReturn(true);
        when(razorpayGateway.fetchPayment("pay_test_1")).thenReturn(new JSONObject()
                .put("order_id", "order_test_1")
                .put("amount", 9999)
                .put("currency", "INR")
                .put("status", "captured"));
        PaymentDTOs.VerifyPaymentRequest request = new PaymentDTOs.VerifyPaymentRequest();
        request.setRazorpayOrderId("order_test_1");
        request.setRazorpayPaymentId("pay_test_1");
        request.setRazorpaySignature("valid");

        assertThrows(BadRequestException.class, () -> paymentService.verifyPayment(11L, request));
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void ignoresDuplicateSignedWebhookEvent() {
        when(razorpayGateway.verifyWebhookSignature(anyString(), anyString())).thenReturn(true);
        when(webhookEventRepository.existsByEventId("evt_test_duplicate")).thenReturn(true);

        paymentService.handleWebhook("{\"event\":\"payment.captured\"}", "signed", "evt_test_duplicate");

        verify(paymentRepository, never()).findByRazorpayOrderId(anyString());
        verify(webhookEventRepository, never()).save(any());
    }

    @Test
    void returnsGatewayConfigReflectingConfiguredRazorpayCredentials() {
        when(razorpayGateway.isSandboxMode()).thenReturn(false);
        PaymentDTOs.GatewayConfigResponse razorpayConfig = paymentService.getGatewayConfig();
        assertEquals("RAZORPAY", razorpayConfig.getGatewayMode());
        assertTrue(razorpayConfig.isRazorpayConfigured());
        assertEquals("INR", razorpayConfig.getCurrency());

        when(razorpayGateway.isSandboxMode()).thenReturn(true);
        PaymentDTOs.GatewayConfigResponse sandboxConfig = paymentService.getGatewayConfig();
        assertEquals("SANDBOX", sandboxConfig.getGatewayMode());
        assertFalse(sandboxConfig.isRazorpayConfigured());
    }

    @Test
    void capturesAuthorizedPaymentDuringVerificationAndMarksOrderPaid() {
        Payment payment = paymentFor(11L);
        payment.setId(55L);
        payment.getOrder().setId(77L);
        Cart cart = new Cart(payment.getOrder().getUser());
        cart.setId(9L);

        when(paymentRepository.findByRazorpayOrderId("order_test_1")).thenReturn(Optional.of(payment));
        when(razorpayGateway.verifyPaymentSignature("order_test_1", "pay_test_1", "valid")).thenReturn(true);
        when(razorpayGateway.fetchPayment("pay_test_1")).thenReturn(new JSONObject()
                .put("id", "pay_test_1")
                .put("order_id", "order_test_1")
                .put("amount", 10000)
                .put("currency", "INR")
                .put("method", "upi")
                .put("status", "authorized"));
        when(razorpayGateway.capturePayment("pay_test_1", 10000L, "INR")).thenReturn(new JSONObject()
                .put("id", "pay_test_1")
                .put("order_id", "order_test_1")
                .put("amount", 10000)
                .put("currency", "INR")
                .put("method", "upi")
                .put("vpa", "success@razorpay")
                .put("status", "captured"));
        when(orderItemRepository.findByOrderId(77L)).thenReturn(Collections.emptyList());
        when(cartService.getOrCreateCart(11L)).thenReturn(cart);
        when(cartItemRepository.findByCartId(9L)).thenReturn(Collections.emptyList());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentDTOs.VerifyPaymentRequest request = new PaymentDTOs.VerifyPaymentRequest();
        request.setRazorpayOrderId("order_test_1");
        request.setRazorpayPaymentId("pay_test_1");
        request.setRazorpaySignature("valid");

        PaymentDTOs.PaymentResponse response = paymentService.verifyPayment(11L, request);

        assertEquals("PAID", response.getPaymentStatus());
        assertEquals("UPI", response.getPaymentMethod());
        assertTrue(response.isPaymentSignatureVerified());
        verify(razorpayGateway).capturePayment("pay_test_1", 10000L, "INR");
        verify(orderRepository).save(payment.getOrder());
        assertEquals("PAID", payment.getOrder().getStatus());
    }

    private Payment paymentFor(Long userId) {
        User user = new User();
        user.setId(userId);
        Order order = new Order();
        order.setUser(user);
        order.setStatus("PENDING_PAYMENT");
        order.setTotalAmount(new BigDecimal("100.00"));
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setRazorpayOrderId("order_test_1");
        payment.setAmount(new BigDecimal("100.00"));
        payment.setCurrency("INR");
        payment.setPaymentStatus("PENDING");
        return payment;
    }
}
