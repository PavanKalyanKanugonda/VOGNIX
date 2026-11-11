package com.vognix.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vognix.dto.CartDTOs;
import com.vognix.dto.OrderDTOs;
import com.vognix.dto.PagedResponse;
import com.vognix.entity.*;
import com.vognix.exception.BadRequestException;
import com.vognix.exception.InsufficientStockException;
import com.vognix.exception.ResourceNotFoundException;
import com.vognix.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class OrderService {

    @PersistenceContext
    private EntityManager entityManager;

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartService cartService;
    private final CartItemRepository cartItemRepository;
    private final UserAddressRepository addressRepository;
    private final UserRepository userRepository;
    private final InventoryRepository inventoryRepository;
    private final PaymentRepository paymentRepository;
    private final CouponRepository couponRepository;
    private final IdempotencyRecordRepository idempotencyRecordRepository;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    public OrderService(OrderRepository orderRepository,
                        OrderItemRepository orderItemRepository,
                        CartService cartService,
                        CartItemRepository cartItemRepository,
                        UserAddressRepository addressRepository,
                        UserRepository userRepository,
                        InventoryRepository inventoryRepository,
                        PaymentRepository paymentRepository,
                        CouponRepository couponRepository,
                        IdempotencyRecordRepository idempotencyRecordRepository,
                        AuditLogService auditLogService,
                        ObjectMapper objectMapper) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.cartService = cartService;
        this.cartItemRepository = cartItemRepository;
        this.addressRepository = addressRepository;
        this.userRepository = userRepository;
        this.inventoryRepository = inventoryRepository;
        this.paymentRepository = paymentRepository;
        this.couponRepository = couponRepository;
        this.idempotencyRecordRepository = idempotencyRecordRepository;
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public OrderDTOs.CheckoutValidateResponse validateCheckout(Long userId, OrderDTOs.CheckoutValidateRequest request) {
        UserAddress address = addressRepository.findByIdAndUserId(request.getAddressId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Selected delivery address not found: " + request.getAddressId()));

        Cart cart = cartService.getOrCreateCart(userId);
        List<CartItem> items = cartItemRepository.findByCartId(cart.getId());
        if (items.isEmpty()) {
            throw new BadRequestException("Your cart is empty. Add items before checking out.");
        }

        List<String> issues = new ArrayList<>();
        for (CartItem item : items) {
            ProductVariant v = item.getVariant();
            int stock = (v.getInventory() != null) ? v.getInventory().getAvailableQuantity() : 0;
            if (stock < item.getQuantity()) {
                issues.add("Item '" + v.getProduct().getTitle() + " (" + v.getSize() + ")' only has " + stock + " in stock (requested: " + item.getQuantity() + ")");
            }
        }

        CartDTOs.CartDTO cartDTO = cartService.buildCartDTO(cart, request.getCouponCode());

        OrderDTOs.CheckoutValidateResponse response = new OrderDTOs.CheckoutValidateResponse();
        response.setValid(issues.isEmpty());
        response.setMessage(issues.isEmpty() ? "Ready for checkout" : "Some items have insufficient stock");
        response.setSubtotal(cartDTO.getSubtotal());
        response.setDiscountAmount(cartDTO.getCouponDiscount());
        response.setShippingFee(cartDTO.getShippingFee());
        response.setTaxAmount(cartDTO.getTaxAmount());
        response.setTotalAmount(cartDTO.getTotalAmount());
        response.setIssues(issues);

        return response;
    }

    @Transactional
    public OrderDTOs.OrderResponse placeOrder(Long userId, OrderDTOs.OrderPlacementRequest request, String idempotencyKey) {
        if (!"COD".equalsIgnoreCase(request.getPaymentMethod())) {
            throw new BadRequestException("Online orders must be created through the verified payment checkout");
        }

        // 1. Idempotency Check
        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<IdempotencyRecord> recordOpt = idempotencyRecordRepository.findByIdempotencyKeyAndExpiresAtAfter(
                    idempotencyKey.trim(), LocalDateTime.now());
            if (recordOpt.isPresent()) {
                try {
                    return objectMapper.readValue(recordOpt.get().getResponseBody(), OrderDTOs.OrderResponse.class);
                } catch (Exception e) {
                    // Fall back to continuing placement if parse fails
                }
            }
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        UserAddress address = addressRepository.findByIdAndUserId(request.getAddressId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Selected address not found: " + request.getAddressId()));

        Cart cart = cartService.getOrCreateCart(userId);
        List<CartItem> cartItems = cartItemRepository.findByCartId(cart.getId());
        if (cartItems.isEmpty()) {
            throw new BadRequestException("Cannot place order with an empty cart");
        }

        // 2. Validate & Deduct Stock with Pessimistic Locking (deterministic order avoids deadlocks)
        List<CartItem> sortedItems = new ArrayList<>(cartItems);
        sortedItems.sort(Comparator.comparing(item -> item.getVariant().getId()));
        for (CartItem item : sortedItems) {
            ProductVariant variant = item.getVariant();
            Inventory inventory = lockInventory(variant.getId(),
                    "Inventory record not found for variant " + variant.getSku());

            if (inventory.getAvailableQuantity() < item.getQuantity()) {
                throw new InsufficientStockException("Insufficient stock for item '" + variant.getProduct().getTitle() +
                        "' (" + variant.getSize() + "). Available: " + inventory.getAvailableQuantity() + ", requested: " + item.getQuantity());
            }

            inventory.setStockQuantity(inventory.getStockQuantity() - item.getQuantity());
            inventoryRepository.save(inventory);
        }

        // 3. Compute final pricing
        CartDTOs.CartDTO cartDTO = cartService.buildCartDTO(cart, request.getCouponCode());

        // 4. Create Order
        String orderNumber = "VOG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setUser(user);
        order.setShippingAddressId(address.getId());

        String addressSnapshot = address.getFullName() + ", " + address.getStreetAddress() + ", " +
                (address.getLocality() != null ? address.getLocality() + ", " : "") +
                address.getCity() + ", " + address.getState() + " - " + address.getPostalCode() +
                " (Phone: " + address.getPhone() + ")";
        order.setShippingAddressSnapshot(addressSnapshot);

        order.setSubtotal(cartDTO.getSubtotal());
        order.setDiscountAmount(cartDTO.getCouponDiscount());
        order.setShippingFee(cartDTO.getShippingFee());
        order.setTaxAmount(cartDTO.getTaxAmount());
        order.setTotalAmount(cartDTO.getTotalAmount());
        order.setCouponCode(cartDTO.getAppliedCoupon());
        
        order.setStatus("PLACED");

        order = orderRepository.save(order);

        // 5. Create Order Items
        List<OrderItem> orderItems = new ArrayList<>();
        for (CartItem item : cartItems) {
            ProductVariant v = item.getVariant();
            Product p = v.getProduct();
            BigDecimal unitPrice = (v.getPriceOverride() != null) ? v.getPriceOverride() : p.getDiscountedPrice();

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setVariant(v);
            orderItem.setProductTitle(p.getTitle());
            orderItem.setBrandName(p.getBrand().getName());
            orderItem.setSize(v.getSize());
            orderItem.setColor(v.getColor());
            orderItem.setUnitPrice(unitPrice);
            orderItem.setQuantity(item.getQuantity());
            orderItem.setTotalPrice(unitPrice.multiply(BigDecimal.valueOf(item.getQuantity())));
            if (p.getImages() != null && !p.getImages().isEmpty()) {
                orderItem.setProductImage(p.getImages().get(0).getImageUrl());
            }

            orderItems.add(orderItem);
        }
        orderItemRepository.saveAll(orderItems);
        order.setItems(orderItems);

        // 6. Create Payment Record
        String txnId = "TXN_" + request.getPaymentMethod() + "_" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setTransactionId(txnId);
        payment.setPaymentMethod("COD");
        payment.setPaymentStatus("PENDING");
        payment.setAmount(order.getTotalAmount());
        payment.setCurrency("INR");
        payment.setIdempotencyKey(idempotencyKey);
        paymentRepository.save(payment);

        // Update coupon usage if applied
        if (order.getCouponCode() != null) {
            couponRepository.findByCodeIgnoreCase(order.getCouponCode()).ifPresent(c -> {
                c.setUsedCount(c.getUsedCount() + 1);
                couponRepository.save(c);
            });
        }

        // 7. Clear cart
        cartService.clearCart(userId);

        auditLogService.logAction(userId, user.getEmail(), "ORDER_PLACED", "Order", order.getOrderNumber(),
                "Order placed with " + orderItems.size() + " items. Total: ₹" + order.getTotalAmount(), null);

        OrderDTOs.OrderResponse response = mapToOrderResponse(order, payment);

        // 8. Cache Idempotency Record
        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            try {
                String responseJson = objectMapper.writeValueAsString(response);
                IdempotencyRecord record = new IdempotencyRecord(
                        idempotencyKey.trim(),
                        "hash-" + idempotencyKey.hashCode(),
                        responseJson,
                        200,
                        LocalDateTime.now().plusHours(24)
                );
                idempotencyRecordRepository.save(record);
            } catch (Exception e) {
                // Ignore caching error
            }
        }

        return response;
    }

    @Transactional(readOnly = true)
    public PagedResponse<OrderDTOs.OrderResponse> getCustomerOrders(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        Page<Order> orderPage = orderRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        List<OrderDTOs.OrderResponse> dtos = orderPage.getContent().stream()
                .map(o -> {
                    List<Payment> payments = paymentRepository.findByOrderIdOrderByCreatedAtDesc(o.getId());
                    Payment p = payments.isEmpty() ? null : payments.get(0);
                    return mapToOrderResponse(o, p);
                })
                .collect(Collectors.toList());

        return new PagedResponse<>(dtos, orderPage.getNumber(), orderPage.getSize(),
                orderPage.getTotalElements(), orderPage.getTotalPages(), orderPage.isLast());
    }

    @Transactional(readOnly = true)
    public OrderDTOs.OrderResponse getOrderById(Long userId, Long orderId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
        List<Payment> payments = paymentRepository.findByOrderIdOrderByCreatedAtDesc(order.getId());
        Payment p = payments.isEmpty() ? null : payments.get(0);
        return mapToOrderResponse(order, p);
    }

    @Transactional
    public OrderDTOs.OrderResponse cancelOrder(Long userId, Long orderId, OrderDTOs.CancelOrderRequest request) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        if (!order.isCancellable()) {
            throw new BadRequestException("Order status '" + order.getStatus() + "' is not eligible for cancellation");
        }

        String previousStatus = order.getStatus();
        order.setStatus("CANCELLED");
        order.setCancellationReason(request.getReason());
        order = orderRepository.save(order);

        // Release a pending-payment reservation; restore stock for committed orders.
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        if ("PENDING_PAYMENT".equals(previousStatus)) {
            for (OrderItem item : items) {
                if (item.getVariant() != null) {
                    findAndLockInventory(item.getVariant().getId()).ifPresent(inv -> {
                        inv.setReservedQuantity(Math.max(0, inv.getReservedQuantity() - item.getQuantity()));
                        inventoryRepository.save(inv);
                    });
                }
            }
        } else if (!"PAYMENT_FAILED".equals(previousStatus)) {
            for (OrderItem item : items) {
                if (item.getVariant() != null) {
                    findAndLockInventory(item.getVariant().getId()).ifPresent(inv -> {
                        inv.setStockQuantity(inv.getStockQuantity() + item.getQuantity());
                        inventoryRepository.save(inv);
                    });
                }
            }
        }

        auditLogService.logAction(userId, order.getUser().getEmail(), "ORDER_CANCELLED", "Order", order.getOrderNumber(),
                "Order cancelled by customer. Reason: " + request.getReason() + ". Stock restored.", null);

        List<Payment> payments = paymentRepository.findByOrderIdOrderByCreatedAtDesc(order.getId());
        Payment p = payments.isEmpty() ? null : payments.get(0);
        if (p != null && "PENDING".equals(p.getPaymentStatus())) {
            p.setPaymentStatus("CANCELLED");
            paymentRepository.save(p);
        }
        return mapToOrderResponse(order, p);
    }

    public OrderDTOs.OrderResponse mapToOrderResponse(Order order, Payment payment) {
        OrderDTOs.OrderResponse dto = new OrderDTOs.OrderResponse();
        dto.setId(order.getId());
        dto.setOrderNumber(order.getOrderNumber());
        dto.setUserId(order.getUser().getId());
        dto.setCustomerName(order.getUser().getFirstName() + " " + order.getUser().getLastName());
        dto.setCustomerEmail(order.getUser().getEmail());
        dto.setShippingAddressSnapshot(order.getShippingAddressSnapshot());
        dto.setSubtotal(order.getSubtotal());
        dto.setDiscountAmount(order.getDiscountAmount());
        dto.setShippingFee(order.getShippingFee());
        dto.setTaxAmount(order.getTaxAmount());
        dto.setTotalAmount(order.getTotalAmount());
        dto.setStatus(order.getStatus());
        dto.setCouponCode(order.getCouponCode());
        dto.setCancellationReason(order.getCancellationReason());
        dto.setCancellable(order.isCancellable());
        dto.setCreatedAt(order.getCreatedAt());

        if (payment != null) {
            dto.setPaymentMethod(payment.getPaymentMethod());
            dto.setPaymentStatus(payment.getPaymentStatus());
            dto.setPaymentId(payment.getId());
            dto.setTransactionId(payment.getRazorpayPaymentId() != null
                    ? payment.getRazorpayPaymentId() : payment.getTransactionId());
        }

        List<OrderItem> items = (order.getItems() != null && !order.getItems().isEmpty())
                ? order.getItems()
                : orderItemRepository.findByOrderId(order.getId());
        if (items == null) {
            items = java.util.Collections.emptyList();
        }
        dto.setItems(items.stream().map(item -> {
            OrderDTOs.OrderItemResponseDTO itemDto = new OrderDTOs.OrderItemResponseDTO();
            ProductVariant variant = item.getVariant();
            itemDto.setId(item.getId());
            itemDto.setProductId(variant != null && variant.getProduct() != null ? variant.getProduct().getId() : null);
            itemDto.setVariantId(variant != null ? variant.getId() : null);
            itemDto.setSku(variant != null ? variant.getSku() : null);
            itemDto.setProductTitle(item.getProductTitle());
            itemDto.setBrandName(item.getBrandName());
            itemDto.setProductImage(item.getProductImage());
            itemDto.setSize(item.getSize());
            itemDto.setColor(item.getColor());
            itemDto.setUnitPrice(item.getUnitPrice());
            itemDto.setQuantity(item.getQuantity());
            itemDto.setTotalPrice(item.getTotalPrice());
            return itemDto;
        }).collect(Collectors.toList()));

        return dto;
    }

    private Inventory lockInventory(Long variantId, String notFoundMessage) {
        Inventory inventory = inventoryRepository.findByVariantIdWithLock(variantId)
                .orElseThrow(() -> new InsufficientStockException(notFoundMessage));
        refreshLockedInventory(inventory);
        return inventory;
    }

    private Optional<Inventory> findAndLockInventory(Long variantId) {
        Optional<Inventory> opt = inventoryRepository.findByVariantIdWithLock(variantId);
        opt.ifPresent(this::refreshLockedInventory);
        return opt;
    }

    private void refreshLockedInventory(Inventory inventory) {
        if (entityManager != null && entityManager.contains(inventory)) {
            entityManager.refresh(inventory, LockModeType.PESSIMISTIC_WRITE);
        }
    }
}
