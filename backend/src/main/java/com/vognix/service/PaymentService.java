package com.vognix.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vognix.dto.PaymentDTOs;
import com.vognix.entity.*;
import com.vognix.exception.BadRequestException;
import com.vognix.exception.InsufficientStockException;
import com.vognix.exception.ResourceNotFoundException;
import com.vognix.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import org.json.JSONObject;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class PaymentService {

    private static final String CURRENCY = "INR";
    private static final List<String> ONLINE_METHODS = List.of(
            "UPI", "CARD", "NETBANKING", "WALLET", "SIMULATED_UPI", "SIMULATED_CARD"
    );

    @PersistenceContext
    private EntityManager entityManager;

    private final PaymentRepository paymentRepository;
    private final PaymentWebhookEventRepository webhookEventRepository;
    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final UserAddressRepository addressRepository;
    private final InventoryRepository inventoryRepository;
    private final CartItemRepository cartItemRepository;
    private final CouponRepository couponRepository;
    private final CartService cartService;
    private final RazorpayGateway razorpayGateway;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    public PaymentService(PaymentRepository paymentRepository,
                          PaymentWebhookEventRepository webhookEventRepository,
                          OrderRepository orderRepository,
                          CartRepository cartRepository,
                          OrderItemRepository orderItemRepository,
                          UserRepository userRepository,
                          UserAddressRepository addressRepository,
                          InventoryRepository inventoryRepository,
                          CartItemRepository cartItemRepository,
                          CouponRepository couponRepository,
                          CartService cartService,
                          RazorpayGateway razorpayGateway,
                          AuditLogService auditLogService,
                          ObjectMapper objectMapper) {
        this.paymentRepository = paymentRepository;
        this.webhookEventRepository = webhookEventRepository;
        this.orderRepository = orderRepository;
        this.cartRepository = cartRepository;
        this.orderItemRepository = orderItemRepository;
        this.userRepository = userRepository;
        this.addressRepository = addressRepository;
        this.inventoryRepository = inventoryRepository;
        this.cartItemRepository = cartItemRepository;
        this.couponRepository = couponRepository;
        this.cartService = cartService;
        this.razorpayGateway = razorpayGateway;
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PaymentDTOs.PaymentResponse createOrder(Long userId, PaymentDTOs.CreateOrderRequest request, String idempotencyKey) {
        String method = normalizeMethod(request.getPaymentMethod());
        if (!"COD".equals(method) && !ONLINE_METHODS.contains(method)) {
            throw new BadRequestException("Unsupported payment method");
        }

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Payment existing = paymentRepository.findByIdempotencyKey(idempotencyKey.trim()).orElse(null);
            if (existing != null) {
                if (!existing.getOrder().getUser().getId().equals(userId)) {
                    throw new BadRequestException("Idempotency key is already associated with another customer");
                }
                return toResponse(existing, !"COD".equals(existing.getPaymentMethod()));
            }
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        UserAddress address = addressRepository.findByIdAndUserId(request.getAddressId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Selected delivery address was not found"));
        cartService.getOrCreateCart(userId);
        Cart cart = cartRepository.findByUserIdWithLock(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Shopping cart not found"));
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Payment existing = paymentRepository.findByIdempotencyKey(idempotencyKey.trim()).orElse(null);
            if (existing != null) {
                if (!existing.getOrder().getUser().getId().equals(userId)) {
                    throw new BadRequestException("Idempotency key is already associated with another customer");
                }
                return toResponse(existing, !"COD".equals(existing.getPaymentMethod()));
            }
        }
        List<CartItem> cartItems = cartItemRepository.findByCartId(cart.getId());
        if (cartItems.isEmpty()) {
            throw new BadRequestException("Your cart is empty");
        }

        boolean cod = "COD".equals(method);
        reserveOrDeductStock(cartItems, cod);
        var cartTotals = cartService.buildCartDTO(cart, request.getCouponCode());

        Order order = new Order();
        order.setOrderNumber("VOG-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase(Locale.ROOT));
        order.setUser(user);
        order.setShippingAddressId(address.getId());
        order.setShippingAddressSnapshot(formatAddress(address));
        order.setSubtotal(cartTotals.getSubtotal());
        order.setDiscountAmount(cartTotals.getCouponDiscount());
        order.setShippingFee(cartTotals.getShippingFee());
        order.setTaxAmount(cartTotals.getTaxAmount());
        order.setTotalAmount(cartTotals.getTotalAmount());
        order.setCouponCode(cartTotals.getAppliedCoupon());
        order.setStatus(cod ? "PLACED" : "PENDING_PAYMENT");
        order = orderRepository.save(order);

        List<OrderItem> orderItems = createOrderItems(order, cartItems);
        orderItemRepository.saveAll(orderItems);
        order.setItems(orderItems);

        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setTransactionId("PAY_" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT));
        payment.setPaymentMethod(method);
        payment.setPaymentStatus("PENDING");
        payment.setAmount(order.getTotalAmount());
        payment.setCurrency(CURRENCY);
        payment.setIdempotencyKey(blankToNull(idempotencyKey));

        if (!cod) {
            long amountPaise = order.getTotalAmount().movePointRight(2).setScale(0, RoundingMode.UNNECESSARY).longValueExact();
            if (razorpayGateway.isSandboxMode()) {
                payment.setRazorpayOrderId("SANDBOX_ORD_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14).toUpperCase(Locale.ROOT));
            } else {
                payment.setRazorpayOrderId(razorpayGateway.createOrder(amountPaise, CURRENCY, order.getOrderNumber(), order.getId()));
            }
        } else {
            clearPurchasedCartItems(cartItems, orderItems);
            incrementCouponUsage(order.getCouponCode());
        }
        payment = paymentRepository.save(payment);

        auditLogService.logAction(userId, user.getEmail(), "PAYMENT_ORDER_CREATED", "Payment",
                payment.getTransactionId(), "Created " + method + " payment for order " + order.getOrderNumber(), null);
        return toResponse(payment, !cod);
    }

    public PaymentDTOs.GatewayConfigResponse getGatewayConfig() {
        PaymentDTOs.GatewayConfigResponse response = new PaymentDTOs.GatewayConfigResponse();
        boolean sandbox = razorpayGateway.isSandboxMode();
        response.setGatewayMode(sandbox ? "SANDBOX" : "RAZORPAY");
        response.setRazorpayConfigured(!sandbox);
        response.setCurrency(CURRENCY);
        return response;
    }

    @Transactional
    public PaymentDTOs.PaymentResponse verifyPayment(Long userId, PaymentDTOs.VerifyPaymentRequest request) {
        Payment payment = paymentRepository.findByRazorpayOrderId(request.getRazorpayOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment order not found"));
        requireOwner(payment, userId);

        if (!razorpayGateway.verifyPaymentSignature(request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(), request.getRazorpaySignature())) {
            throw new BadRequestException("Razorpay payment signature is invalid");
        }

        JSONObject providerPayment = razorpayGateway.fetchPayment(request.getRazorpayPaymentId());
        validateProviderPayment(payment, request.getRazorpayOrderId(), providerPayment);

        String gatewayStatus = providerPayment.optString("status", "");
        if ("authorized".equalsIgnoreCase(gatewayStatus)) {
            long amountPaise = payment.getAmount().movePointRight(2).setScale(0, RoundingMode.UNNECESSARY).longValueExact();
            providerPayment = razorpayGateway.capturePayment(request.getRazorpayPaymentId(), amountPaise, payment.getCurrency());
            validateProviderPayment(payment, request.getRazorpayOrderId(), providerPayment);
            gatewayStatus = providerPayment.optString("status", "captured");
        }

        payment.setRazorpayPaymentId(request.getRazorpayPaymentId());
        payment.setPaymentMethod(providerPayment.optString("method", payment.getPaymentMethod()).toUpperCase(Locale.ROOT));
        payment.setPaymentSignatureVerified(true);
        payment.setPaymentDetailsJson(buildRazorpayDetailsJson(providerPayment));

        if ("captured".equalsIgnoreCase(gatewayStatus)) {
            markPaid(payment);
            auditLogService.logAction(userId, payment.getOrder().getUser().getEmail(), "RAZORPAY_PAYMENT_VERIFIED", "Payment",
                    payment.getTransactionId(), "Verified Razorpay payment " + request.getRazorpayPaymentId() + " for order " + payment.getOrder().getOrderNumber(), null);
        } else if ("failed".equalsIgnoreCase(gatewayStatus)) {
            String reason = providerPayment.optString("error_description", "Payment failed");
            markFailed(payment, reason);
            auditLogService.logAction(userId, payment.getOrder().getUser().getEmail(), "RAZORPAY_PAYMENT_FAILED", "Payment",
                    payment.getTransactionId(), "Razorpay payment failed for order " + payment.getOrder().getOrderNumber() + ": " + reason, null);
        }
        return toResponse(paymentRepository.save(payment), false);
    }

    @Transactional
    public PaymentDTOs.PaymentResponse recordFailedAttempt(Long userId, PaymentDTOs.FailureRequest request) {
        Payment payment = paymentRepository.findById(request.getPaymentId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        requireOwner(payment, userId);
        JSONObject providerPayment = razorpayGateway.fetchPayment(request.getRazorpayPaymentId());
        validateProviderPayment(payment, payment.getRazorpayOrderId(), providerPayment);
        if (!"failed".equalsIgnoreCase(providerPayment.optString("status", ""))) {
            throw new BadRequestException("Razorpay has not reported this payment as failed");
        }
        payment.setRazorpayPaymentId(request.getRazorpayPaymentId());
        markFailed(payment, providerPayment.optString("error_description", "Payment failed"));
        return toResponse(paymentRepository.save(payment), false);
    }

    @Transactional
    public PaymentDTOs.PaymentResponse getStatus(Long userId, Long paymentId) {
        return getStatus(userId, paymentId, false);
    }

    @Transactional
    public PaymentDTOs.PaymentResponse getStatus(Long userId, Long paymentId, boolean syncWithGateway) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        requireOwner(payment, userId);

        if (syncWithGateway
                && "PENDING".equals(payment.getPaymentStatus())
                && !"COD".equalsIgnoreCase(payment.getPaymentMethod())
                && !razorpayGateway.isSandboxMode()
                && payment.getRazorpayOrderId() != null
                && payment.getRazorpayOrderId().startsWith("order_")) {
            reconcileWithRazorpayOrder(payment);
        }

        return toResponse(payment, false);
    }

    @Transactional(readOnly = true)
    public List<PaymentDTOs.PaymentResponse> getCustomerHistory(Long userId) {
        return paymentRepository.findByOrder_User_IdOrderByCreatedAtDesc(userId).stream()
                .map(payment -> toResponse(payment, false))
                .toList();
    }

    @Transactional
    public PaymentDTOs.PaymentResponse confirmSandboxPayment(Long userId, PaymentDTOs.ConfirmPaymentRequest request) {
        if (!razorpayGateway.isSandboxMode()) {
            throw new BadRequestException("Simulated confirmation is unavailable while Razorpay credentials are configured");
        }
        Payment payment = paymentRepository.findById(request.getPaymentId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        requireOwner(payment, userId);

        if ("COD".equalsIgnoreCase(payment.getPaymentMethod())) {
            throw new BadRequestException("Cash on delivery orders do not use online payment confirmation");
        }

        Order order = orderRepository.findByIdWithLock(payment.getOrder().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if ("CANCELLED".equals(order.getStatus())) {
            throw new BadRequestException("Cancelled orders cannot complete payment");
        }
        if ("PAID".equals(payment.getPaymentStatus()) || "PAID".equals(order.getStatus())) {
            return toResponse(payment, false);
        }

        if (request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank()) {
            String normalizedMethod = normalizeMethod(request.getPaymentMethod());
            if (!ONLINE_METHODS.contains(normalizedMethod)) {
                throw new BadRequestException("Unsupported online payment method: " + normalizedMethod);
            }
            payment.setPaymentMethod(normalizedMethod);
        }
        if (request.getPaymentDetailsJson() != null && !request.getPaymentDetailsJson().isBlank()) {
            payment.setPaymentDetailsJson(request.getPaymentDetailsJson());
        }

        String outcome = normalizeMethod(request.getPaymentStatus());
        if (outcome.isEmpty() || "PAID".equals(outcome) || "SUCCESS".equals(outcome)) {
            if ("FAILED".equals(payment.getPaymentStatus())) {
                throw new BadRequestException("Create a retry attempt before confirming a failed payment");
            }
            if (!"PENDING_PAYMENT".equals(order.getStatus())) {
                List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
                reserveOrderStock(items);
                order.setStatus("PENDING_PAYMENT");
                orderRepository.save(order);
            }
            String providerTxnId = blankToNull(request.getTransactionId());
            if (providerTxnId == null) {
                providerTxnId = "SANDBOX_PAY_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14).toUpperCase(Locale.ROOT);
            }
            payment.setRazorpayPaymentId(providerTxnId);
            payment.setPaymentSignatureVerified(true);
            markPaid(payment);
            payment = paymentRepository.save(payment);
            auditLogService.logAction(userId, order.getUser().getEmail(), "SANDBOX_PAYMENT_SUCCESS", "Payment",
                    payment.getTransactionId(), "Simulated " + payment.getPaymentMethod() + " payment succeeded for order " + order.getOrderNumber(), null);
        } else if ("FAILED".equals(outcome)) {
            String providerTxnId = blankToNull(request.getTransactionId());
            if (providerTxnId != null) {
                payment.setRazorpayPaymentId(providerTxnId);
            }
            String reason = blankToNull(request.getFailureReason());
            if (reason == null) {
                reason = "Transaction declined by simulated bank gateway";
            }
            markFailed(payment, reason);
            payment = paymentRepository.save(payment);
            auditLogService.logAction(userId, order.getUser().getEmail(), "SANDBOX_PAYMENT_FAILED", "Payment",
                    payment.getTransactionId(), "Simulated payment failed for order " + order.getOrderNumber() + ": " + reason, null);
        } else if ("PENDING".equals(outcome)) {
            payment.setPaymentStatus("PENDING");
            payment = paymentRepository.save(payment);
        } else {
            throw new BadRequestException("Unsupported payment confirmation status: " + request.getPaymentStatus());
        }

        return toResponse(payment, false);
    }

    @Transactional
    public PaymentDTOs.PaymentResponse retry(Long userId, Long paymentId) {
        Payment previous = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        requireOwner(previous, userId);
        if ("COD".equalsIgnoreCase(previous.getPaymentMethod())) {
            throw new BadRequestException("Cash on delivery orders do not support online payment retry");
        }
        if (!List.of("FAILED", "CANCELLED", "PENDING").contains(previous.getPaymentStatus())) {
            throw new BadRequestException("Only a pending, failed, or cancelled payment can be retried");
        }
        Order order = orderRepository.findByIdWithLock(previous.getOrder().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if ("PAID".equals(order.getStatus()) || "DELIVERED".equals(order.getStatus()) || "CANCELLED".equals(order.getStatus())) {
            throw new BadRequestException("This order cannot accept another payment attempt");
        }
        Payment activeAttempt = paymentRepository
                .findFirstByOrderIdAndPaymentStatusOrderByCreatedAtDesc(order.getId(), "PENDING")
                .orElse(null);
        if (activeAttempt != null) {
            boolean sandbox = razorpayGateway.isSandboxMode();
            String existingRzOrderId = activeAttempt.getRazorpayOrderId();
            if (!sandbox && (existingRzOrderId == null || existingRzOrderId.startsWith("SANDBOX_ORD_"))) {
                long amountPaise = order.getTotalAmount().movePointRight(2).setScale(0, RoundingMode.UNNECESSARY).longValueExact();
                activeAttempt.setRazorpayOrderId(razorpayGateway.createOrder(amountPaise, CURRENCY, order.getOrderNumber(), order.getId()));
                activeAttempt = paymentRepository.save(activeAttempt);
            } else if (sandbox && (existingRzOrderId == null || !existingRzOrderId.startsWith("SANDBOX_ORD_"))) {
                activeAttempt.setRazorpayOrderId("SANDBOX_ORD_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14).toUpperCase(Locale.ROOT));
                activeAttempt = paymentRepository.save(activeAttempt);
            }
            return toResponse(activeAttempt, true);
        }
        if (!"PENDING_PAYMENT".equals(order.getStatus())) {
            List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
            reserveOrderStock(items);
            order.setStatus("PENDING_PAYMENT");
            orderRepository.save(order);
        }

        Payment retry = new Payment();
        retry.setOrder(order);
        retry.setTransactionId("PAY_" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT));
        retry.setPaymentMethod(previous.getPaymentMethod());
        retry.setPaymentStatus("PENDING");
        retry.setAmount(order.getTotalAmount());
        retry.setCurrency(CURRENCY);
        long amountPaise = order.getTotalAmount().movePointRight(2).setScale(0, RoundingMode.UNNECESSARY).longValueExact();
        if (razorpayGateway.isSandboxMode()) {
            retry.setRazorpayOrderId("SANDBOX_ORD_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14).toUpperCase(Locale.ROOT));
        } else {
            retry.setRazorpayOrderId(razorpayGateway.createOrder(amountPaise, CURRENCY, order.getOrderNumber(), order.getId()));
        }
        return toResponse(paymentRepository.save(retry), true);
    }

    @Transactional
    public void handleWebhook(String body, String signature, String eventId) {
        if (!razorpayGateway.verifyWebhookSignature(body, signature)) {
            throw new BadRequestException("Razorpay webhook signature is invalid");
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            String type = root.path("event").asText();
            String resolvedEventId = eventId == null || eventId.isBlank() ? sha256(body) : eventId;
            if (webhookEventRepository.existsByEventId(resolvedEventId)) {
                return;
            }

            if ("payment.captured".equals(type) || "payment.failed".equals(type)) {
                JsonNode entity = root.path("payload").path("payment").path("entity");
                String razorpayOrderId = entity.path("order_id").asText();
                Payment payment = paymentRepository.findByRazorpayOrderId(razorpayOrderId)
                        .orElseThrow(() -> new BadRequestException("Webhook payment order is not recognized"));
                validateProviderPayment(payment, razorpayOrderId, new JSONObject(entity.toString()));
                payment.setRazorpayPaymentId(entity.path("id").asText());
                payment.setPaymentMethod(entity.path("method").asText(payment.getPaymentMethod()).toUpperCase(Locale.ROOT));
                if ("payment.captured".equals(type)) {
                    if (!"captured".equalsIgnoreCase(entity.path("status").asText())) {
                        throw new BadRequestException("Captured webhook has an invalid payment state");
                    }
                    markPaid(payment);
                } else {
                    markFailed(payment, entity.path("error_description").asText("Payment failed"));
                }
                paymentRepository.save(payment);
            } else if ("order.paid".equals(type)) {
                JsonNode entity = root.path("payload").path("order").path("entity");
                String razorpayOrderId = entity.path("id").asText();
                Payment payment = paymentRepository.findByRazorpayOrderId(razorpayOrderId)
                        .orElseThrow(() -> new BadRequestException("Webhook order is not recognized"));
                long amountPaid = entity.path("amount_paid").asLong(-1);
                long expectedAmount = payment.getAmount().movePointRight(2).longValueExact();
                if (amountPaid != expectedAmount || !CURRENCY.equals(entity.path("currency").asText())) {
                    throw new BadRequestException("Webhook order amount or currency does not match");
                }
                markPaid(payment);
                paymentRepository.save(payment);
            } else {
                throw new BadRequestException("Unsupported Razorpay webhook event: " + type);
            }
            webhookEventRepository.save(new PaymentWebhookEvent(resolvedEventId, type));
        } catch (BadRequestException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BadRequestException("Could not process Razorpay webhook");
        }
    }

    private void reserveOrDeductStock(List<CartItem> cartItems, boolean cod) {
        List<CartItem> sortedItems = new ArrayList<>(cartItems);
        sortedItems.sort(Comparator.comparing(item -> item.getVariant().getId()));
        for (CartItem item : sortedItems) {
            Inventory locked = lockInventory(item.getVariant().getId(),
                    "Inventory is unavailable for " + item.getVariant().getSku());
            if (locked.getAvailableQuantity() < item.getQuantity()) {
                throw new InsufficientStockException("Insufficient stock for " + item.getVariant().getProduct().getTitle());
            }
            if (cod) {
                locked.setStockQuantity(locked.getStockQuantity() - item.getQuantity());
            } else {
                locked.setReservedQuantity(locked.getReservedQuantity() + item.getQuantity());
            }
            inventoryRepository.save(locked);
        }
    }

    private void reserveOrderStock(List<OrderItem> items) {
        for (OrderItem item : items) {
            Inventory inventory = lockInventory(item.getVariant().getId(),
                    "Inventory is unavailable for " + item.getVariant().getSku());
            if (inventory.getAvailableQuantity() < item.getQuantity()) {
                throw new InsufficientStockException("Insufficient stock to retry this order");
            }
            inventory.setReservedQuantity(inventory.getReservedQuantity() + item.getQuantity());
            inventoryRepository.save(inventory);
        }
    }

    private List<OrderItem> createOrderItems(Order order, List<CartItem> cartItems) {
        List<OrderItem> orderItems = new ArrayList<>();
        for (CartItem cartItem : cartItems) {
            ProductVariant variant = cartItem.getVariant();
            Product product = variant.getProduct();
            BigDecimal price = variant.getPriceOverride() != null ? variant.getPriceOverride() : product.getDiscountedPrice();
            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setVariant(variant);
            item.setProductTitle(product.getTitle());
            item.setBrandName(product.getBrand().getName());
            item.setSize(variant.getSize());
            item.setColor(variant.getColor());
            item.setUnitPrice(price);
            item.setQuantity(cartItem.getQuantity());
            item.setTotalPrice(price.multiply(BigDecimal.valueOf(cartItem.getQuantity())).setScale(2, RoundingMode.HALF_UP));
            if (product.getImages() != null && !product.getImages().isEmpty()) {
                item.setProductImage(product.getImages().get(0).getImageUrl());
            }
            orderItems.add(item);
        }
        return orderItems;
    }

    private void markPaid(Payment payment) {
        if ("PAID".equals(payment.getPaymentStatus())) {
            return;
        }
        Order order = payment.getOrder();
        if (!"PAID".equals(order.getStatus())) {
            for (OrderItem item : orderItemRepository.findByOrderId(order.getId())) {
                Inventory inventory = lockInventory(item.getVariant().getId(),
                        "Inventory is unavailable during payment capture");
                if (inventory.getReservedQuantity() < item.getQuantity()) {
                    throw new BadRequestException("Reserved inventory does not match the order");
                }
                inventory.setReservedQuantity(inventory.getReservedQuantity() - item.getQuantity());
                inventory.setStockQuantity(inventory.getStockQuantity() - item.getQuantity());
                inventoryRepository.save(inventory);
            }
            order.setStatus("PAID");
            orderRepository.save(order);
            clearOrderCartItems(order);
            incrementCouponUsage(order.getCouponCode());
        }
        payment.setPaymentStatus("PAID");
        payment.setFailureReason(null);
    }

    private void markFailed(Payment payment, String reason) {
        if ("PAID".equals(payment.getPaymentStatus()) || "FAILED".equals(payment.getPaymentStatus())) {
            return;
        }
        Order order = payment.getOrder();
        if (!"PAID".equals(order.getStatus()) && "PENDING_PAYMENT".equals(order.getStatus())) {
            for (OrderItem item : orderItemRepository.findByOrderId(order.getId())) {
                inventoryRepository.findByVariantIdWithLock(item.getVariant().getId()).ifPresent(inventory -> {
                    refreshLockedInventory(inventory);
                    inventory.setReservedQuantity(Math.max(0, inventory.getReservedQuantity() - item.getQuantity()));
                    inventoryRepository.save(inventory);
                });
            }
            order.setStatus("PAYMENT_FAILED");
            orderRepository.save(order);
        }
        payment.setPaymentStatus("FAILED");
        payment.setFailureReason(reason);
    }

    private void clearOrderCartItems(Order order) {
        Cart cart = cartService.getOrCreateCart(order.getUser().getId());
        List<CartItem> cartItems = cartItemRepository.findByCartId(cart.getId());
        clearPurchasedCartItems(cartItems, orderItemRepository.findByOrderId(order.getId()));
    }

    private void clearPurchasedCartItems(List<CartItem> cartItems, List<OrderItem> purchasedItems) {
        for (OrderItem purchased : purchasedItems) {
            for (CartItem cartItem : cartItems) {
                if (cartItem.getVariant().getId().equals(purchased.getVariant().getId())) {
                    if (cartItem.getQuantity() <= purchased.getQuantity()) {
                        cartItemRepository.delete(cartItem);
                    } else {
                        cartItem.setQuantity(cartItem.getQuantity() - purchased.getQuantity());
                        cartItemRepository.save(cartItem);
                    }
                    break;
                }
            }
        }
    }

    private void validateProviderPayment(Payment payment, String expectedRazorpayOrderId, JSONObject providerPayment) {
        if (!expectedRazorpayOrderId.equals(providerPayment.optString("order_id"))
                || providerPayment.optLong("amount", -1) != payment.getAmount().movePointRight(2).longValueExact()
                || !payment.getCurrency().equals(providerPayment.optString("currency"))) {
            throw new BadRequestException("Razorpay payment amount, currency, or order does not match");
        }
    }

    private void requireOwner(Payment payment, Long userId) {
        if (!payment.getOrder().getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Payment not found");
        }
    }

    private PaymentDTOs.PaymentResponse toResponse(Payment payment, boolean includeKeyId) {
        PaymentDTOs.PaymentResponse response = new PaymentDTOs.PaymentResponse();
        response.setPaymentId(payment.getId());
        response.setOrderId(payment.getOrder().getId());
        response.setOrderNumber(payment.getOrder().getOrderNumber());
        response.setRazorpayOrderId(payment.getRazorpayOrderId());
        response.setRazorpayPaymentId(payment.getRazorpayPaymentId());
        if ("COD".equalsIgnoreCase(payment.getPaymentMethod())) {
            response.setGatewayMode("COD");
            response.setKeyId(null);
        } else if (razorpayGateway.isSandboxMode()) {
            response.setGatewayMode("SANDBOX");
            response.setKeyId(null);
        } else {
            response.setGatewayMode("RAZORPAY");
            response.setKeyId(includeKeyId && payment.getRazorpayOrderId() != null ? razorpayGateway.getKeyId() : null);
        }
        response.setPaymentMethod(payment.getPaymentMethod());
        response.setPaymentStatus(payment.getPaymentStatus());
        response.setAmount(payment.getAmount());
        response.setCurrency(payment.getCurrency());
        response.setFailureReason(payment.getFailureReason());
        response.setPaymentSignatureVerified(payment.isPaymentSignatureVerified());
        response.setCreatedAt(payment.getCreatedAt());
        return response;
    }

    private void incrementCouponUsage(String couponCode) {
        if (couponCode != null) {
            couponRepository.findByCodeIgnoreCase(couponCode).ifPresent(coupon -> {
                coupon.setUsedCount(coupon.getUsedCount() + 1);
                couponRepository.save(coupon);
            });
        }
    }

    private String formatAddress(UserAddress address) {
        return address.getFullName() + ", " + address.getStreetAddress() + ", "
                + (address.getLocality() == null ? "" : address.getLocality() + ", ")
                + address.getCity() + ", " + address.getState() + " - " + address.getPostalCode()
                + " (Phone: " + address.getPhone() + ")";
    }

    private String normalizeMethod(String method) {
        return method == null ? "" : method.trim().toUpperCase(Locale.ROOT);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Inventory lockInventory(Long variantId, String errorMessage) {
        Inventory inventory = inventoryRepository.findByVariantIdWithLock(variantId)
                .orElseThrow(() -> new InsufficientStockException(errorMessage));
        refreshLockedInventory(inventory);
        return inventory;
    }

    private void refreshLockedInventory(Inventory inventory) {
        if (entityManager != null && entityManager.contains(inventory)) {
            entityManager.refresh(inventory, LockModeType.PESSIMISTIC_WRITE);
        }
    }

    private void reconcileWithRazorpayOrder(Payment payment) {
        try {
            List<JSONObject> orderPayments = razorpayGateway.fetchOrderPayments(payment.getRazorpayOrderId());
            if (orderPayments == null || orderPayments.isEmpty()) {
                return;
            }
            JSONObject captured = orderPayments.stream()
                    .filter(p -> "captured".equalsIgnoreCase(p.optString("status")))
                    .findFirst()
                    .orElse(null);
            if (captured != null) {
                validateProviderPayment(payment, payment.getRazorpayOrderId(), captured);
                payment.setRazorpayPaymentId(captured.optString("id"));
                payment.setPaymentMethod(captured.optString("method", payment.getPaymentMethod()).toUpperCase(Locale.ROOT));
                payment.setPaymentSignatureVerified(true);
                payment.setPaymentDetailsJson(buildRazorpayDetailsJson(captured));
                markPaid(payment);
                paymentRepository.save(payment);
                return;
            }

            JSONObject authorized = orderPayments.stream()
                    .filter(p -> "authorized".equalsIgnoreCase(p.optString("status")))
                    .findFirst()
                    .orElse(null);
            if (authorized != null) {
                validateProviderPayment(payment, payment.getRazorpayOrderId(), authorized);
                long amountPaise = payment.getAmount().movePointRight(2).setScale(0, RoundingMode.UNNECESSARY).longValueExact();
                JSONObject capturedNow = razorpayGateway.capturePayment(authorized.optString("id"), amountPaise, payment.getCurrency());
                validateProviderPayment(payment, payment.getRazorpayOrderId(), capturedNow);
                payment.setRazorpayPaymentId(capturedNow.optString("id", authorized.optString("id")));
                payment.setPaymentMethod(capturedNow.optString("method", payment.getPaymentMethod()).toUpperCase(Locale.ROOT));
                payment.setPaymentSignatureVerified(true);
                payment.setPaymentDetailsJson(buildRazorpayDetailsJson(capturedNow));
                markPaid(payment);
                paymentRepository.save(payment);
            }
        } catch (RuntimeException ignored) {
            // Leave existing status intact if gateway sync cannot be completed right now
        }
    }

    private String buildRazorpayDetailsJson(JSONObject providerPayment) {
        JSONObject details = new JSONObject();
        details.put("gateway", "RAZORPAY");
        details.put("status", providerPayment.optString("status", ""));
        details.put("method", providerPayment.optString("method", ""));
        if (providerPayment.has("vpa") && !providerPayment.isNull("vpa")) {
            details.put("vpa", providerPayment.optString("vpa"));
        }
        if (providerPayment.has("bank") && !providerPayment.isNull("bank")) {
            details.put("bank", providerPayment.optString("bank"));
        }
        if (providerPayment.has("wallet") && !providerPayment.isNull("wallet")) {
            details.put("wallet", providerPayment.optString("wallet"));
        }
        JSONObject card = providerPayment.optJSONObject("card");
        if (card != null) {
            details.put("cardLast4", card.optString("last4", ""));
            details.put("cardNetwork", card.optString("network", ""));
            details.put("cardType", card.optString("type", ""));
        }
        return details.toString();
    }

    private String sha256(String value) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(digest);
    }
}
