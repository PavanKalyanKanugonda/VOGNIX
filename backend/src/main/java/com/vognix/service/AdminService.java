package com.vognix.service;

import com.vognix.dto.AdminDTOs;
import com.vognix.dto.OrderDTOs;
import com.vognix.dto.PagedResponse;
import com.vognix.dto.ProductDTOs;
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
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private static final Map<String, Set<String>> ALLOWED_ORDER_TRANSITIONS = Map.of(
            "PENDING_PAYMENT", Set.of("PAID", "PAYMENT_FAILED"),
            "PAYMENT_FAILED", Set.of("PAID", "CANCELLED"),
            "PLACED", Set.of("PAID", "PACKED", "SHIPPED", "CANCELLED"),
            "PAID", Set.of("PACKED", "SHIPPED", "CANCELLED"),
            "PACKED", Set.of("SHIPPED", "CANCELLED"),
            "SHIPPED", Set.of("DELIVERED"),
            "DELIVERED", Set.of(),
            "CANCELLED", Set.of()
    );

    @PersistenceContext
    private EntityManager entityManager;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final CartRepository cartRepository;
    private final WishlistRepository wishlistRepository;
    private final PasswordEncoder passwordEncoder;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final ProductVariantRepository variantRepository;
    private final InventoryRepository inventoryRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;
    private final CouponRepository couponRepository;
    private final AuditLogService auditLogService;
    private final OrderService orderService;
    private final ProductService productService;

    public AdminService(UserRepository userRepository,
                        RoleRepository roleRepository,
                        CartRepository cartRepository,
                        WishlistRepository wishlistRepository,
                        PasswordEncoder passwordEncoder,
                        ProductRepository productRepository,
                        CategoryRepository categoryRepository,
                        BrandRepository brandRepository,
                        ProductVariantRepository variantRepository,
                        InventoryRepository inventoryRepository,
                        OrderRepository orderRepository,
                        OrderItemRepository orderItemRepository,
                        PaymentRepository paymentRepository,
                        CouponRepository couponRepository,
                        AuditLogService auditLogService,
                        OrderService orderService,
                        ProductService productService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.cartRepository = cartRepository;
        this.wishlistRepository = wishlistRepository;
        this.passwordEncoder = passwordEncoder;
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.brandRepository = brandRepository;
        this.variantRepository = variantRepository;
        this.inventoryRepository = inventoryRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.paymentRepository = paymentRepository;
        this.couponRepository = couponRepository;
        this.auditLogService = auditLogService;
        this.orderService = orderService;
        this.productService = productService;
    }

    @Transactional(readOnly = true)
    public AdminDTOs.DashboardStatsDTO getDashboardStats() {
        AdminDTOs.DashboardStatsDTO stats = new AdminDTOs.DashboardStatsDTO();
        stats.setTotalRevenue(orderRepository.sumSuccessfulRevenue());
        stats.setTotalOrders(orderRepository.count());
        stats.setTotalCustomers(userRepository.count());
        stats.setTotalProducts(productRepository.count());
        stats.setPendingOrders(orderRepository.countByStatus("PLACED") + orderRepository.countByStatus("PAID") + orderRepository.countByStatus("PACKED"));
        stats.setDeliveredOrders(orderRepository.countByStatus("DELIVERED"));

        List<Inventory> lowStockList = inventoryRepository.findLowStockInventories();
        stats.setLowStockCount(lowStockList.size());
        stats.setLowStockItems(lowStockList.stream().map(inv -> {
            ProductVariant v = inv.getVariant();
            return new AdminDTOs.LowStockItemDTO(
                    v.getId(),
                    v.getProduct().getId(),
                    v.getProduct().getTitle(),
                    v.getSku(),
                    v.getSize(),
                    v.getColor(),
                    inv.getStockQuantity(),
                    inv.getLowStockThreshold()
            );
        }).collect(Collectors.toList()));

        Page<Order> recentOrdersPage = orderRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 5));
        stats.setRecentOrders(recentOrdersPage.getContent().stream()
                .map(o -> {
                    List<Payment> payments = paymentRepository.findByOrderIdOrderByCreatedAtDesc(o.getId());
                    Payment p = payments.isEmpty() ? null : payments.get(0);
                    return orderService.mapToOrderResponse(o, p);
                })
                .collect(Collectors.toList()));

        return stats;
    }

    @Transactional
    public ProductDTOs.ProductDetailDTO createProduct(Long adminUserId, String adminEmail, ProductDTOs.ProductCreateRequest request) {
        Brand brand = brandRepository.findById(request.getBrandId())
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + request.getBrandId()));
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + request.getCategoryId()));

        String slug = request.getTitle().toLowerCase().replaceAll("[^a-z0-9]+", "-") + "-" + (System.currentTimeMillis() % 10000);

        Product product = new Product();
        product.setTitle(request.getTitle().trim());
        product.setSlug(slug);
        product.setDescription(request.getDescription().trim());
        product.setBrand(brand);
        product.setCategory(category);
        product.setGender(request.getGender() != null ? request.getGender() : "UNISEX");
        product.setBasePrice(request.getBasePrice());
        product.setDiscountPercent(request.getDiscountPercent() != null ? request.getDiscountPercent() : 0);
        product.setIsFeatured(Boolean.TRUE.equals(request.getIsFeatured()));
        product.setIsActive(true);
        product = productRepository.save(product);

        // Add Images
        if (request.getImageUrls() != null) {
            int order = 1;
            for (String url : request.getImageUrls()) {
                if (url != null && !url.trim().isEmpty()) {
                    ProductImage img = new ProductImage(product, url.trim(), order, order == 1);
                    product.getImages().add(img);
                    order++;
                }
            }
        }

        // Add Variants & Inventory
        if (request.getVariants() != null) {
            for (ProductDTOs.VariantCreateRequest varReq : request.getVariants()) {
                ProductVariant variant = new ProductVariant();
                variant.setProduct(product);
                variant.setSku("VOG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                variant.setSize(varReq.getSize());
                variant.setColor(varReq.getColor());
                variant.setColorCode(varReq.getColorCode());
                variant = variantRepository.save(variant);

                Inventory inv = new Inventory(variant, varReq.getStockQuantity() != null ? varReq.getStockQuantity() : 20, 5);
                inventoryRepository.save(inv);
                variant.setInventory(inv);
                product.getVariants().add(variant);
            }
        }

        product = productRepository.save(product);

        auditLogService.logAction(adminUserId, adminEmail, "PRODUCT_CREATED", "Product", product.getId().toString(),
                "Created product: " + product.getTitle() + " (Brand: " + brand.getName() + ")", null);

        return productService.getProductById(product.getId());
    }

    @Transactional(readOnly = true)
    public PagedResponse<ProductDTOs.ProductSummaryDTO> getAdminProducts(String search, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        Page<Product> productPage = (search == null || search.isBlank())
                ? productRepository.findAllByOrderByCreatedAtDesc(pageable)
                : productRepository.findAllForAdmin(search.trim(), pageable);
        List<ProductDTOs.ProductSummaryDTO> dtos = productPage.getContent().stream()
                .map(productService::mapToSummaryDTO)
                .collect(Collectors.toList());
        return new PagedResponse<>(dtos, productPage.getNumber(), productPage.getSize(),
                productPage.getTotalElements(), productPage.getTotalPages(), productPage.isLast());
    }

    @Transactional
    public ProductDTOs.ProductDetailDTO updateProduct(Long adminUserId, String adminEmail, Long productId, ProductDTOs.ProductCreateRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        if (request.getTitle() != null) product.setTitle(request.getTitle().trim());
        if (request.getDescription() != null) product.setDescription(request.getDescription().trim());
        if (request.getBasePrice() != null) product.setBasePrice(request.getBasePrice());
        if (request.getDiscountPercent() != null) product.setDiscountPercent(request.getDiscountPercent());
        if (request.getGender() != null) product.setGender(request.getGender());
        if (request.getIsActive() != null) product.setIsActive(request.getIsActive());
        if (request.getIsFeatured() != null) product.setIsFeatured(request.getIsFeatured());

        if (request.getBrandId() != null) {
            Brand brand = brandRepository.findById(request.getBrandId())
                    .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + request.getBrandId()));
            product.setBrand(brand);
        }
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + request.getCategoryId()));
            product.setCategory(category);
        }

        if (request.getImageUrls() != null) {
            product.getImages().clear();
            int order = 1;
            for (String url : request.getImageUrls()) {
                if (url != null && !url.trim().isEmpty()) {
                    ProductImage img = new ProductImage(product, url.trim(), order, order == 1);
                    product.getImages().add(img);
                    order++;
                }
            }
        }

        if (request.getVariants() != null && !request.getVariants().isEmpty()) {
            for (ProductDTOs.VariantCreateRequest varReq : request.getVariants()) {
                String reqSize = varReq.getSize() != null ? varReq.getSize().trim() : "";
                String reqColor = varReq.getColor() != null ? varReq.getColor().trim() : "";
                ProductVariant existing = product.getVariants().stream()
                        .filter(v -> v.getSize().equalsIgnoreCase(reqSize) && v.getColor().equalsIgnoreCase(reqColor))
                        .findFirst()
                        .orElse(null);
                if (existing != null) {
                    if (varReq.getColorCode() != null && !varReq.getColorCode().isBlank()) {
                        existing.setColorCode(varReq.getColorCode());
                    }
                    if (varReq.getStockQuantity() != null && existing.getInventory() != null) {
                        existing.getInventory().setStockQuantity(Math.max(0, varReq.getStockQuantity()));
                        inventoryRepository.save(existing.getInventory());
                    }
                } else if (!reqSize.isEmpty() && !reqColor.isEmpty()) {
                    ProductVariant variant = new ProductVariant();
                    variant.setProduct(product);
                    variant.setSku("VOG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                    variant.setSize(reqSize);
                    variant.setColor(reqColor);
                    variant.setColorCode(varReq.getColorCode() != null ? varReq.getColorCode() : "#000000");
                    variant = variantRepository.save(variant);

                    Inventory inv = new Inventory(variant, varReq.getStockQuantity() != null ? Math.max(0, varReq.getStockQuantity()) : 20, 5);
                    inventoryRepository.save(inv);
                    variant.setInventory(inv);
                    product.getVariants().add(variant);
                }
            }
        }

        product = productRepository.save(product);

        auditLogService.logAction(adminUserId, adminEmail, "PRODUCT_UPDATED", "Product", product.getId().toString(),
                "Updated product: " + product.getTitle() + " (Active: " + product.getIsActive() + ")", null);

        return productService.getProductById(product.getId());
    }

    @Transactional
    public void deleteProduct(Long adminUserId, String adminEmail, Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));
        
        // Soft delete / deactivate
        product.setIsActive(false);
        productRepository.save(product);

        auditLogService.logAction(adminUserId, adminEmail, "PRODUCT_DEACTIVATED", "Product", product.getId().toString(),
                "Deactivated product: " + product.getTitle(), null);
    }

    @Transactional
    public void updateVariantStock(Long adminUserId, String adminEmail, Long variantId, int newQuantity) {
        Inventory inventory = inventoryRepository.findByVariantId(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for variant id: " + variantId));

        int oldStock = inventory.getStockQuantity();
        inventory.setStockQuantity(newQuantity);
        inventoryRepository.save(inventory);

        auditLogService.logAction(adminUserId, adminEmail, "INVENTORY_UPDATED", "ProductVariant", variantId.toString(),
                "Updated stock from " + oldStock + " to " + newQuantity + " for SKU: " + inventory.getVariant().getSku(), null);
    }

    @Transactional(readOnly = true)
    public PagedResponse<OrderDTOs.OrderResponse> getAllOrders(String status, int page, int size) {
        return getAllOrders(status, null, page, size);
    }

    @Transactional(readOnly = true)
    public PagedResponse<OrderDTOs.OrderResponse> getAllOrders(String status, String search, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        String normalizedStatus = (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status))
                ? status.toUpperCase(Locale.ROOT).trim()
                : null;
        String normalizedSearch = (search != null && !search.trim().isEmpty())
                ? search.trim()
                : null;

        Page<Order> orderPage;
        if (normalizedSearch != null && normalizedStatus != null) {
            orderPage = orderRepository.searchOrdersByStatusForAdmin(normalizedStatus, normalizedSearch, pageable);
        } else if (normalizedSearch != null) {
            orderPage = orderRepository.searchOrdersForAdmin(normalizedSearch, pageable);
        } else if (normalizedStatus != null) {
            orderPage = orderRepository.findByStatusOrderByCreatedAtDesc(normalizedStatus, pageable);
        } else {
            orderPage = orderRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

        List<OrderDTOs.OrderResponse> dtos = orderPage.getContent().stream()
                .map(o -> {
                    List<Payment> payments = paymentRepository.findByOrderIdOrderByCreatedAtDesc(o.getId());
                    Payment p = payments.isEmpty() ? null : payments.get(0);
                    return orderService.mapToOrderResponse(o, p);
                })
                .collect(Collectors.toList());

        return new PagedResponse<>(dtos, orderPage.getNumber(), orderPage.getSize(),
                orderPage.getTotalElements(), orderPage.getTotalPages(), orderPage.isLast());
    }

    @Transactional
    public OrderDTOs.OrderResponse updateOrderStatus(Long adminUserId, String adminEmail, Long orderId, OrderDTOs.OrderStatusUpdateRequest request) {
        Order order = orderRepository.findByIdWithLock(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        String oldStatus = order.getStatus().toUpperCase(Locale.ROOT);
        String newStatus = request.getStatus().toUpperCase(Locale.ROOT).trim();

        if ("CANCELLED".equals(newStatus) && "PENDING_PAYMENT".equals(oldStatus)) {
            throw new BadRequestException("An online payment must resolve before this order can be cancelled");
        }

        if (!newStatus.equals(oldStatus)) {
            Set<String> allowed = ALLOWED_ORDER_TRANSITIONS.getOrDefault(oldStatus, Set.of());
            if (!allowed.contains(newStatus)) {
                throw new BadRequestException("Invalid order status transition from " + oldStatus + " to " + newStatus);
            }
        } else {
            List<Payment> payments = paymentRepository.findByOrderIdOrderByCreatedAtDesc(order.getId());
            Payment p = payments.isEmpty() ? null : payments.get(0);
            return orderService.mapToOrderResponse(order, p);
        }

        order.setStatus(newStatus);
        if ("CANCELLED".equals(newStatus) && request.getRemarks() != null && !request.getRemarks().isBlank()) {
            order.setCancellationReason(request.getRemarks().trim());
        }
        order = orderRepository.save(order);

        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        List<Payment> payments = paymentRepository.findByOrderIdOrderByCreatedAtDesc(order.getId());
        Payment latestPayment = payments.isEmpty() ? null : payments.get(0);

        if ("PAID".equals(newStatus)) {
            if ("PENDING_PAYMENT".equals(oldStatus)) {
                for (OrderItem item : items) {
                    if (item.getVariant() != null) {
                        Inventory inv = lockInventory(item.getVariant().getId(), "Inventory unavailable");
                        inv.setReservedQuantity(Math.max(0, inv.getReservedQuantity() - item.getQuantity()));
                        inv.setStockQuantity(Math.max(0, inv.getStockQuantity() - item.getQuantity()));
                        inventoryRepository.save(inv);
                    }
                }
            } else if ("PAYMENT_FAILED".equals(oldStatus)) {
                for (OrderItem item : items) {
                    if (item.getVariant() != null) {
                        Inventory inv = lockInventory(item.getVariant().getId(), "Inventory unavailable");
                        if (inv.getAvailableQuantity() < item.getQuantity()) {
                            throw new InsufficientStockException("Insufficient stock to mark failed order as PAID");
                        }
                        inv.setStockQuantity(inv.getStockQuantity() - item.getQuantity());
                        inventoryRepository.save(inv);
                    }
                }
            }
            if (latestPayment != null && !"PAID".equals(latestPayment.getPaymentStatus())) {
                latestPayment.setPaymentStatus("PAID");
                latestPayment.setFailureReason(null);
                paymentRepository.save(latestPayment);
            }
        } else if ("PAYMENT_FAILED".equals(newStatus) && "PENDING_PAYMENT".equals(oldStatus)) {
            for (OrderItem item : items) {
                if (item.getVariant() != null) {
                    inventoryRepository.findByVariantIdWithLock(item.getVariant().getId()).ifPresent(inv -> {
                        refreshLockedInventory(inv);
                        inv.setReservedQuantity(Math.max(0, inv.getReservedQuantity() - item.getQuantity()));
                        inventoryRepository.save(inv);
                    });
                }
            }
            if (latestPayment != null && "PENDING".equals(latestPayment.getPaymentStatus())) {
                latestPayment.setPaymentStatus("FAILED");
                latestPayment.setFailureReason(request.getRemarks() != null ? request.getRemarks() : "Marked failed by administrator");
                paymentRepository.save(latestPayment);
            }
        } else if ("CANCELLED".equals(newStatus)) {
            if (!"PAYMENT_FAILED".equals(oldStatus)) {
                for (OrderItem item : items) {
                    if (item.getVariant() != null) {
                        inventoryRepository.findByVariantIdWithLock(item.getVariant().getId()).ifPresent(inv -> {
                            refreshLockedInventory(inv);
                            inv.setStockQuantity(inv.getStockQuantity() + item.getQuantity());
                            inventoryRepository.save(inv);
                        });
                    }
                }
            }
            if (latestPayment != null && "PENDING".equals(latestPayment.getPaymentStatus())) {
                latestPayment.setPaymentStatus("CANCELLED");
                paymentRepository.save(latestPayment);
            }
        }

        auditLogService.logAction(adminUserId, adminEmail, "ORDER_STATUS_CHANGED", "Order", order.getOrderNumber(),
                "Status transitioned from " + oldStatus + " to " + newStatus + ". Remarks: " + request.getRemarks(), null);

        return orderService.mapToOrderResponse(order, latestPayment);
    }

    @Transactional
    public void markCodPaymentCollected(Long adminUserId, String adminEmail, Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        if (!"COD".equals(payment.getPaymentMethod()) || !"PENDING".equals(payment.getPaymentStatus())) {
            throw new BadRequestException("Only a pending COD payment can be marked as collected");
        }
        payment.setPaymentStatus("PAID");
        paymentRepository.save(payment);
        auditLogService.logAction(adminUserId, adminEmail, "COD_PAYMENT_COLLECTED", "Payment",
                payment.getTransactionId(), "Cash on delivery collected for order " + payment.getOrder().getOrderNumber(), null);
    }

    @Transactional(readOnly = true)
    public List<AdminDTOs.CouponResponse> getCoupons() {
        return couponRepository.findAll().stream().map(this::mapCouponToDTO).collect(Collectors.toList());
    }

    @Transactional
    public AdminDTOs.CouponResponse createCoupon(Long adminUserId, String adminEmail, AdminDTOs.CouponRequest request) {
        if (couponRepository.existsByCodeIgnoreCase(request.getCode().trim())) {
            throw new BadRequestException("Coupon code " + request.getCode() + " already exists");
        }

        Coupon coupon = new Coupon();
        coupon.setCode(request.getCode().toUpperCase().trim());
        coupon.setDescription(request.getDescription().trim());
        coupon.setDiscountType(request.getDiscountType() != null ? request.getDiscountType() : "PERCENTAGE");
        coupon.setDiscountValue(request.getDiscountValue());
        coupon.setMinOrderAmount(request.getMinOrderAmount() != null ? request.getMinOrderAmount() : BigDecimal.ZERO);
        coupon.setMaxDiscountAmount(request.getMaxDiscountAmount());
        coupon.setValidFrom(LocalDateTime.now());
        coupon.setValidUntil(LocalDateTime.now().plusDays(request.getDaysValid() != null ? request.getDaysValid() : 30));
        coupon.setUsageLimit(request.getUsageLimit() != null ? request.getUsageLimit() : 1000);
        coupon.setUsedCount(0);
        coupon.setIsActive(Boolean.TRUE.equals(request.getIsActive()));

        coupon = couponRepository.save(coupon);

        auditLogService.logAction(adminUserId, adminEmail, "COUPON_CREATED", "Coupon", coupon.getCode(),
                "Created coupon " + coupon.getCode() + " with discount " + coupon.getDiscountValue(), null);

        return mapCouponToDTO(coupon);
    }

    private AdminDTOs.CouponResponse mapCouponToDTO(Coupon c) {
        AdminDTOs.CouponResponse dto = new AdminDTOs.CouponResponse();
        dto.setId(c.getId());
        dto.setCode(c.getCode());
        dto.setDescription(c.getDescription());
        dto.setDiscountType(c.getDiscountType());
        dto.setDiscountValue(c.getDiscountValue());
        dto.setMinOrderAmount(c.getMinOrderAmount());
        dto.setMaxDiscountAmount(c.getMaxDiscountAmount());
        dto.setValidUntil(c.getValidUntil());
        dto.setUsageLimit(c.getUsageLimit());
        dto.setUsedCount(c.getUsedCount());
        dto.setIsActive(c.getIsActive());
        return dto;
    }

    // Category Management
    @Transactional(readOnly = true)
    public List<Category> getAllCategories() {
        return categoryRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
    }

    @Transactional
    public Category createCategory(Long adminUserId, String adminEmail, AdminDTOs.CategoryRequest request) {
        String slug = toSlug(request.getSlug(), request.getName());
        if (categoryRepository.existsBySlugIgnoreCase(slug)) {
            throw new BadRequestException("Category slug '" + slug + "' already exists");
        }
        Category category = new Category();
        category.setName(request.getName().trim());
        category.setSlug(slug);
        category.setDescription(request.getDescription());
        category.setImageUrl(request.getImageUrl());
        category.setIsActive(request.getIsActive() == null || request.getIsActive());
        if (request.getParentId() != null) {
            Category parent = categoryRepository.findById(request.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent category not found with id: " + request.getParentId()));
            category.setParent(parent);
        }
        category = categoryRepository.save(category);
        auditLogService.logAction(adminUserId, adminEmail, "CATEGORY_CREATED", "Category", category.getId().toString(),
                "Created category: " + category.getName() + " (" + category.getSlug() + ")", null);
        return category;
    }

    @Transactional
    public Category updateCategory(Long adminUserId, String adminEmail, Long categoryId, AdminDTOs.CategoryRequest request) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
        String slug = toSlug(request.getSlug(), request.getName());
        if (categoryRepository.existsBySlugIgnoreCaseAndIdNot(slug, categoryId)) {
            throw new BadRequestException("Category slug '" + slug + "' already exists");
        }
        category.setName(request.getName().trim());
        category.setSlug(slug);
        category.setDescription(request.getDescription());
        category.setImageUrl(request.getImageUrl());
        if (request.getIsActive() != null) {
            category.setIsActive(request.getIsActive());
        }
        if (request.getParentId() != null) {
            if (request.getParentId().equals(categoryId)) {
                throw new BadRequestException("A category cannot be its own parent");
            }
            Category parent = categoryRepository.findById(request.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent category not found with id: " + request.getParentId()));
            category.setParent(parent);
        } else {
            category.setParent(null);
        }
        category = categoryRepository.save(category);
        auditLogService.logAction(adminUserId, adminEmail, "CATEGORY_UPDATED", "Category", category.getId().toString(),
                "Updated category: " + category.getName(), null);
        return category;
    }

    @Transactional
    public void deleteCategory(Long adminUserId, String adminEmail, Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
        category.setIsActive(false);
        categoryRepository.save(category);
        auditLogService.logAction(adminUserId, adminEmail, "CATEGORY_DEACTIVATED", "Category", category.getId().toString(),
                "Deactivated category: " + category.getName(), null);
    }

    // Brand Management
    @Transactional(readOnly = true)
    public List<Brand> getAllBrands() {
        return brandRepository.findAll(Sort.by(Sort.Direction.ASC, "name"));
    }

    @Transactional
    public Brand createBrand(Long adminUserId, String adminEmail, AdminDTOs.BrandRequest request) {
        String name = request.getName().trim();
        String slug = toSlug(request.getSlug(), name);
        if (brandRepository.existsByNameIgnoreCase(name)) {
            throw new BadRequestException("Brand '" + name + "' already exists");
        }
        if (brandRepository.existsBySlugIgnoreCase(slug)) {
            throw new BadRequestException("Brand slug '" + slug + "' already exists");
        }
        Brand brand = new Brand();
        brand.setName(name);
        brand.setSlug(slug);
        brand.setLogoUrl(request.getLogoUrl());
        brand.setDescription(request.getDescription());
        brand.setIsActive(request.getIsActive() == null || request.getIsActive());
        brand = brandRepository.save(brand);
        auditLogService.logAction(adminUserId, adminEmail, "BRAND_CREATED", "Brand", brand.getId().toString(),
                "Created brand: " + brand.getName(), null);
        return brand;
    }

    @Transactional
    public Brand updateBrand(Long adminUserId, String adminEmail, Long brandId, AdminDTOs.BrandRequest request) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + brandId));
        String name = request.getName().trim();
        String slug = toSlug(request.getSlug(), name);
        if (brandRepository.existsByNameIgnoreCaseAndIdNot(name, brandId)) {
            throw new BadRequestException("Brand '" + name + "' already exists");
        }
        if (brandRepository.existsBySlugIgnoreCaseAndIdNot(slug, brandId)) {
            throw new BadRequestException("Brand slug '" + slug + "' already exists");
        }
        brand.setName(name);
        brand.setSlug(slug);
        brand.setLogoUrl(request.getLogoUrl());
        brand.setDescription(request.getDescription());
        if (request.getIsActive() != null) {
            brand.setIsActive(request.getIsActive());
        }
        brand = brandRepository.save(brand);
        auditLogService.logAction(adminUserId, adminEmail, "BRAND_UPDATED", "Brand", brand.getId().toString(),
                "Updated brand: " + brand.getName(), null);
        return brand;
    }

    // Customer Management
    @Transactional(readOnly = true)
    public PagedResponse<AdminDTOs.CustomerSummaryDTO> getCustomers(String search, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<User> userPage;
        if (search != null && !search.trim().isEmpty()) {
            String term = search.trim();
            userPage = userRepository.findByEmailContainingIgnoreCaseOrFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
                    term, term, term, pageable);
        } else {
            userPage = userRepository.findAll(pageable);
        }

        Map<Long, long[]> orderCounts = new HashMap<>();
        Map<Long, BigDecimal> orderSpends = new HashMap<>();
        for (Object[] row : orderRepository.summarizeOrdersByCustomer()) {
            Long uid = ((Number) row[0]).longValue();
            long count = ((Number) row[1]).longValue();
            BigDecimal spent = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
            orderCounts.put(uid, new long[]{count});
            orderSpends.put(uid, spent);
        }

        List<AdminDTOs.CustomerSummaryDTO> dtos = userPage.getContent().stream().map(u -> mapToCustomerSummaryDTO(
                u,
                orderCounts.containsKey(u.getId()) ? orderCounts.get(u.getId())[0] : 0L,
                orderSpends.getOrDefault(u.getId(), BigDecimal.ZERO)
        )).collect(Collectors.toList());

        return new PagedResponse<>(dtos, userPage.getNumber(), userPage.getSize(),
                userPage.getTotalElements(), userPage.getTotalPages(), userPage.isLast());
    }

    @Transactional
    public AdminDTOs.CustomerSummaryDTO updateCustomerStatus(Long adminUserId, String adminEmail, Long customerId, boolean isActive) {
        if (adminUserId.equals(customerId) && !isActive) {
            throw new BadRequestException("Administrators cannot deactivate their own account");
        }
        User user = userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + customerId));
        if (!isActive && Boolean.TRUE.equals(user.getIsActive()) && hasRole(user, "ROLE_ADMIN")
                && userRepository.countByIsActiveTrueAndRoles_Name("ROLE_ADMIN") <= 1) {
            throw new BadRequestException("Cannot deactivate the last active administrator account");
        }
        user.setIsActive(isActive);
        user = userRepository.save(user);

        auditLogService.logAction(adminUserId, adminEmail, "CUSTOMER_STATUS_UPDATED", "User", user.getId().toString(),
                (isActive ? "Activated" : "Deactivated") + " user account: " + user.getEmail(), null);

        return mapToCustomerSummaryDTO(user, 0L, BigDecimal.ZERO);
    }

    @Transactional
    public AdminDTOs.CustomerSummaryDTO createCustomerOrAdmin(Long adminUserId, String adminEmail, AdminDTOs.CreateUserRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new BadRequestException("An account with email " + normalizedEmail + " already exists");
        }

        Set<Role> resolvedRoles = resolveRequestedRoles(
                (request.getRoles() == null || request.getRoles().isEmpty())
                        ? List.of("ROLE_CUSTOMER")
                        : request.getRoles()
        );

        User user = new User(
                normalizedEmail,
                passwordEncoder.encode(request.getPassword()),
                request.getFirstName().trim(),
                request.getLastName().trim(),
                request.getPhone() != null && !request.getPhone().isBlank() ? request.getPhone().trim() : null
        );
        user.setRoles(resolvedRoles);
        user = userRepository.save(user);

        cartRepository.save(new Cart(user));
        wishlistRepository.save(new Wishlist(user));

        String rolesDesc = resolvedRoles.stream().map(Role::getName).sorted().collect(Collectors.joining(", "));
        auditLogService.logAction(adminUserId, adminEmail, "ADMIN_USER_CREATED", "User", user.getId().toString(),
                "Created account " + user.getEmail() + " with roles [" + rolesDesc + "]", null);

        return mapToCustomerSummaryDTO(user, 0L, BigDecimal.ZERO);
    }

    @Transactional
    public AdminDTOs.CustomerSummaryDTO updateCustomerRoles(Long adminUserId, String adminEmail, Long targetUserId, AdminDTOs.UpdateUserRolesRequest request) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));

        Set<Role> resolvedRoles = resolveRequestedRoles(request.getRoles());
        boolean willHaveAdmin = resolvedRoles.stream().anyMatch(r -> "ROLE_ADMIN".equals(r.getName()));
        boolean currentlyAdmin = hasRole(user, "ROLE_ADMIN");

        if (currentlyAdmin && !willHaveAdmin) {
            if (adminUserId.equals(targetUserId)) {
                throw new BadRequestException("Administrators cannot remove their own ROLE_ADMIN privileges");
            }
            if (Boolean.TRUE.equals(user.getIsActive())
                    && userRepository.countByIsActiveTrueAndRoles_Name("ROLE_ADMIN") <= 1) {
                throw new BadRequestException("Cannot revoke ROLE_ADMIN from the last active administrator");
            }
        }

        user.setRoles(resolvedRoles);
        user = userRepository.save(user);

        String rolesDesc = resolvedRoles.stream().map(Role::getName).sorted().collect(Collectors.joining(", "));
        auditLogService.logAction(adminUserId, adminEmail, "USER_ROLES_UPDATED", "User", user.getId().toString(),
                "Updated roles for " + user.getEmail() + " to [" + rolesDesc + "]", null);

        return mapToCustomerSummaryDTO(user, 0L, BigDecimal.ZERO);
    }

    @Transactional
    public void resetCustomerPassword(Long adminUserId, String adminEmail, Long targetUserId, String newPassword) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        auditLogService.logAction(adminUserId, adminEmail, "ADMIN_PASSWORD_RESET", "User", user.getId().toString(),
                "Administrator reset password for account: " + user.getEmail(), null);
    }

    private Set<Role> resolveRequestedRoles(List<String> rawRoles) {
        Set<String> normalizedNames = new LinkedHashSet<>();
        if (rawRoles != null) {
            for (String raw : rawRoles) {
                if (raw == null || raw.isBlank()) {
                    continue;
                }
                String upper = raw.trim().toUpperCase(Locale.ROOT);
                if ("ADMIN".equals(upper) || "ROLE_ADMIN".equals(upper)) {
                    normalizedNames.add("ROLE_ADMIN");
                } else if ("CUSTOMER".equals(upper) || "ROLE_CUSTOMER".equals(upper)) {
                    normalizedNames.add("ROLE_CUSTOMER");
                } else {
                    throw new BadRequestException("Unsupported role: " + raw);
                }
            }
        }
        if (normalizedNames.isEmpty()) {
            throw new BadRequestException("At least one valid role (ROLE_CUSTOMER or ROLE_ADMIN) is required");
        }
        Set<Role> roles = new HashSet<>();
        for (String name : normalizedNames) {
            String desc = "ROLE_ADMIN".equals(name) ? "Administrator" : "Customer";
            Role role = roleRepository.findByName(name)
                    .orElseGet(() -> roleRepository.save(new Role(name, desc)));
            roles.add(role);
        }
        return roles;
    }

    private boolean hasRole(User user, String roleName) {
        return user.getRoles().stream().anyMatch(r -> roleName.equals(r.getName()));
    }

    private AdminDTOs.CustomerSummaryDTO mapToCustomerSummaryDTO(User u, long orderCount, BigDecimal totalSpent) {
        AdminDTOs.CustomerSummaryDTO dto = new AdminDTOs.CustomerSummaryDTO();
        dto.setId(u.getId());
        dto.setFirstName(u.getFirstName());
        dto.setLastName(u.getLastName());
        dto.setEmail(u.getEmail());
        dto.setPhone(u.getPhone());
        dto.setRoles(u.getRoles().stream().map(Role::getName).sorted().collect(Collectors.toList()));
        dto.setIsActive(u.getIsActive());
        dto.setOrderCount(orderCount);
        dto.setTotalSpent(totalSpent);
        dto.setCreatedAt(u.getCreatedAt());
        return dto;
    }

    // Sales & Order Reports
    @Transactional(readOnly = true)
    public AdminDTOs.SalesReportDTO getSalesReport() {
        AdminDTOs.SalesReportDTO report = new AdminDTOs.SalesReportDTO();
        BigDecimal totalRevenue = orderRepository.sumSuccessfulRevenue();
        if (totalRevenue == null) totalRevenue = BigDecimal.ZERO;

        report.setTotalRevenue(totalRevenue);
        report.setTotalOrders(orderRepository.count());
        report.setTotalCustomers(userRepository.count());
        report.setTotalProducts(productRepository.count());

        long successfulOrders = 0;
        long cancelledOrders = 0;
        List<AdminDTOs.StatusSummaryDTO> statusList = new ArrayList<>();
        for (Object[] row : orderRepository.summarizeOrdersByStatus()) {
            String st = (String) row[0];
            long count = ((Number) row[1]).longValue();
            BigDecimal rev = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
            statusList.add(new AdminDTOs.StatusSummaryDTO(st, count, rev));
            if ("CANCELLED".equals(st)) {
                cancelledOrders += count;
            } else if (!"PAYMENT_FAILED".equals(st) && !"PENDING_PAYMENT".equals(st)) {
                successfulOrders += count;
            }
        }
        report.setOrdersByStatus(statusList);
        report.setSuccessfulOrders(successfulOrders);
        report.setCancelledOrders(cancelledOrders);
        report.setAverageOrderValue(successfulOrders > 0
                ? totalRevenue.divide(BigDecimal.valueOf(successfulOrders), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO);

        List<AdminDTOs.PaymentSummaryDTO> paymentList = new ArrayList<>();
        for (Object[] row : paymentRepository.summarizeByMethodAndStatus()) {
            String method = (String) row[0];
            String status = (String) row[1];
            long count = ((Number) row[2]).longValue();
            BigDecimal amt = row[3] != null ? (BigDecimal) row[3] : BigDecimal.ZERO;
            paymentList.add(new AdminDTOs.PaymentSummaryDTO(method, status, count, amt));
        }
        report.setPaymentBreakdown(paymentList);

        List<AdminDTOs.TopProductDTO> topProducts = new ArrayList<>();
        for (Object[] row : orderItemRepository.findTopSellingProducts(PageRequest.of(0, 10))) {
            String title = (String) row[0];
            String brand = (String) row[1];
            long units = ((Number) row[2]).longValue();
            BigDecimal rev = row[3] != null ? (BigDecimal) row[3] : BigDecimal.ZERO;
            topProducts.add(new AdminDTOs.TopProductDTO(title, brand, units, rev));
        }
        report.setTopProducts(topProducts);

        return report;
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

    private String toSlug(String rawSlug, String fallbackName) {
        String base = (rawSlug != null && !rawSlug.isBlank()) ? rawSlug : fallbackName;
        String normalized = base.toLowerCase(Locale.ROOT).trim().replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
        return normalized.isEmpty() ? "item-" + System.currentTimeMillis() : normalized;
    }
}
