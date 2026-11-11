package com.vognix.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class AdminDTOs {

    public static class DashboardStatsDTO {
        private BigDecimal totalRevenue = BigDecimal.ZERO;
        private long totalOrders = 0;
        private long totalCustomers = 0;
        private long totalProducts = 0;
        private long pendingOrders = 0;
        private long deliveredOrders = 0;
        private long lowStockCount = 0;
        private List<LowStockItemDTO> lowStockItems = new ArrayList<>();
        private List<OrderDTOs.OrderResponse> recentOrders = new ArrayList<>();

        public DashboardStatsDTO() {}

        public BigDecimal getTotalRevenue() { return totalRevenue; }
        public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }

        public long getTotalOrders() { return totalOrders; }
        public void setTotalOrders(long totalOrders) { this.totalOrders = totalOrders; }

        public long getTotalCustomers() { return totalCustomers; }
        public void setTotalCustomers(long totalCustomers) { this.totalCustomers = totalCustomers; }

        public long getTotalProducts() { return totalProducts; }
        public void setTotalProducts(long totalProducts) { this.totalProducts = totalProducts; }

        public long getPendingOrders() { return pendingOrders; }
        public void setPendingOrders(long pendingOrders) { this.pendingOrders = pendingOrders; }

        public long getDeliveredOrders() { return deliveredOrders; }
        public void setDeliveredOrders(long deliveredOrders) { this.deliveredOrders = deliveredOrders; }

        public long getLowStockCount() { return lowStockCount; }
        public void setLowStockCount(long lowStockCount) { this.lowStockCount = lowStockCount; }

        public List<LowStockItemDTO> getLowStockItems() { return lowStockItems; }
        public void setLowStockItems(List<LowStockItemDTO> lowStockItems) { this.lowStockItems = lowStockItems; }

        public List<OrderDTOs.OrderResponse> getRecentOrders() { return recentOrders; }
        public void setRecentOrders(List<OrderDTOs.OrderResponse> recentOrders) { this.recentOrders = recentOrders; }
    }

    public static class LowStockItemDTO {
        private Long variantId;
        private Long productId;
        private String productTitle;
        private String sku;
        private String size;
        private String color;
        private Integer currentStock;
        private Integer threshold;

        public LowStockItemDTO() {}

        public LowStockItemDTO(Long variantId, Long productId, String productTitle, String sku, String size, String color, Integer currentStock, Integer threshold) {
            this.variantId = variantId;
            this.productId = productId;
            this.productTitle = productTitle;
            this.sku = sku;
            this.size = size;
            this.color = color;
            this.currentStock = currentStock;
            this.threshold = threshold;
        }

        public Long getVariantId() { return variantId; }
        public void setVariantId(Long variantId) { this.variantId = variantId; }

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }

        public String getProductTitle() { return productTitle; }
        public void setProductTitle(String productTitle) { this.productTitle = productTitle; }

        public String getSku() { return sku; }
        public void setSku(String sku) { this.sku = sku; }

        public String getSize() { return size; }
        public void setSize(String size) { this.size = size; }

        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }

        public Integer getCurrentStock() { return currentStock; }
        public void setCurrentStock(Integer currentStock) { this.currentStock = currentStock; }

        public Integer getThreshold() { return threshold; }
        public void setThreshold(Integer threshold) { this.threshold = threshold; }
    }

    public static class CouponRequest {
        @NotBlank(message = "Coupon code is required")
        private String code;

        @NotBlank(message = "Description is required")
        private String description;

        private String discountType = "PERCENTAGE"; // PERCENTAGE, FLAT

        @NotNull(message = "Discount value is required")
        @DecimalMin(value = "1.00", message = "Discount value must be at least 1.00")
        private BigDecimal discountValue;

        private BigDecimal minOrderAmount = BigDecimal.ZERO;
        private BigDecimal maxDiscountAmount;
        private Integer daysValid = 30;
        private Integer usageLimit = 1000;
        private Boolean isActive = true;

        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getDiscountType() { return discountType; }
        public void setDiscountType(String discountType) { this.discountType = discountType; }

        public BigDecimal getDiscountValue() { return discountValue; }
        public void setDiscountValue(BigDecimal discountValue) { this.discountValue = discountValue; }

        public BigDecimal getMinOrderAmount() { return minOrderAmount; }
        public void setMinOrderAmount(BigDecimal minOrderAmount) { this.minOrderAmount = minOrderAmount; }

        public BigDecimal getMaxDiscountAmount() { return maxDiscountAmount; }
        public void setMaxDiscountAmount(BigDecimal maxDiscountAmount) { this.maxDiscountAmount = maxDiscountAmount; }

        public Integer getDaysValid() { return daysValid; }
        public void setDaysValid(Integer daysValid) { this.daysValid = daysValid; }

        public Integer getUsageLimit() { return usageLimit; }
        public void setUsageLimit(Integer usageLimit) { this.usageLimit = usageLimit; }

        public Boolean getIsActive() { return isActive; }
        public void setIsActive(Boolean active) { isActive = active; }
    }

    public static class CouponResponse {
        private Long id;
        private String code;
        private String description;
        private String discountType;
        private BigDecimal discountValue;
        private BigDecimal minOrderAmount;
        private BigDecimal maxDiscountAmount;
        private LocalDateTime validUntil;
        private Integer usageLimit;
        private Integer usedCount;
        private Boolean isActive;

        public CouponResponse() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getDiscountType() { return discountType; }
        public void setDiscountType(String discountType) { this.discountType = discountType; }

        public BigDecimal getDiscountValue() { return discountValue; }
        public void setDiscountValue(BigDecimal discountValue) { this.discountValue = discountValue; }

        public BigDecimal getMinOrderAmount() { return minOrderAmount; }
        public void setMinOrderAmount(BigDecimal minOrderAmount) { this.minOrderAmount = minOrderAmount; }

        public BigDecimal getMaxDiscountAmount() { return maxDiscountAmount; }
        public void setMaxDiscountAmount(BigDecimal maxDiscountAmount) { this.maxDiscountAmount = maxDiscountAmount; }

        public LocalDateTime getValidUntil() { return validUntil; }
        public void setValidUntil(LocalDateTime validUntil) { this.validUntil = validUntil; }

        public Integer getUsageLimit() { return usageLimit; }
        public void setUsageLimit(Integer usageLimit) { this.usageLimit = usageLimit; }

        public Integer getUsedCount() { return usedCount; }
        public void setUsedCount(Integer usedCount) { this.usedCount = usedCount; }

        public Boolean getIsActive() { return isActive; }
        public void setIsActive(Boolean active) { isActive = active; }
    }

    public static class AuditLogDTO {
        private Long id;
        private Long userId;
        private String userEmail;
        private String actionType;
        private String entityName;
        private String entityId;
        private String details;
        private String ipAddress;
        private LocalDateTime createdAt;

        public AuditLogDTO() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }

        public String getUserEmail() { return userEmail; }
        public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

        public String getActionType() { return actionType; }
        public void setActionType(String actionType) { this.actionType = actionType; }

        public String getEntityName() { return entityName; }
        public void setEntityName(String entityName) { this.entityName = entityName; }

        public String getEntityId() { return entityId; }
        public void setEntityId(String entityId) { this.entityId = entityId; }

        public String getDetails() { return details; }
        public void setDetails(String details) { this.details = details; }

        public String getIpAddress() { return ipAddress; }
        public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }

    public static class UpdateStockRequest {
        @NotNull(message = "Stock quantity is required")
        private Integer stockQuantity;

        public Integer getStockQuantity() { return stockQuantity; }
        public void setStockQuantity(Integer stockQuantity) { this.stockQuantity = stockQuantity; }
    }

    public static class CategoryRequest {
        @NotBlank(message = "Category name is required")
        private String name;
        private String slug;
        private String description;
        private String imageUrl;
        private Long parentId;
        private Boolean isActive = true;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getSlug() { return slug; }
        public void setSlug(String slug) { this.slug = slug; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getImageUrl() { return imageUrl; }
        public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

        public Long getParentId() { return parentId; }
        public void setParentId(Long parentId) { this.parentId = parentId; }

        public Boolean getIsActive() { return isActive; }
        public void setIsActive(Boolean active) { isActive = active; }
    }

    public static class BrandRequest {
        @NotBlank(message = "Brand name is required")
        private String name;
        private String slug;
        private String logoUrl;
        private String description;
        private Boolean isActive = true;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getSlug() { return slug; }
        public void setSlug(String slug) { this.slug = slug; }

        public String getLogoUrl() { return logoUrl; }
        public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public Boolean getIsActive() { return isActive; }
        public void setIsActive(Boolean active) { isActive = active; }
    }

    public static class CustomerSummaryDTO {
        private Long id;
        private String firstName;
        private String lastName;
        private String email;
        private String phone;
        private List<String> roles = new ArrayList<>();
        private Boolean isActive;
        private long orderCount;
        private BigDecimal totalSpent = BigDecimal.ZERO;
        private LocalDateTime createdAt;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }

        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public List<String> getRoles() { return roles; }
        public void setRoles(List<String> roles) { this.roles = roles; }

        public Boolean getIsActive() { return isActive; }
        public void setIsActive(Boolean active) { isActive = active; }

        public long getOrderCount() { return orderCount; }
        public void setOrderCount(long orderCount) { this.orderCount = orderCount; }

        public BigDecimal getTotalSpent() { return totalSpent; }
        public void setTotalSpent(BigDecimal totalSpent) { this.totalSpent = totalSpent; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }

    public static class CustomerStatusRequest {
        @NotNull(message = "isActive status is required")
        private Boolean isActive;

        public Boolean getIsActive() { return isActive; }
        public void setIsActive(Boolean active) { isActive = active; }
    }

    public static class SalesReportDTO {
        private BigDecimal totalRevenue = BigDecimal.ZERO;
        private long totalOrders;
        private long successfulOrders;
        private long cancelledOrders;
        private BigDecimal averageOrderValue = BigDecimal.ZERO;
        private long totalCustomers;
        private long totalProducts;
        private List<StatusSummaryDTO> ordersByStatus = new ArrayList<>();
        private List<PaymentSummaryDTO> paymentBreakdown = new ArrayList<>();
        private List<TopProductDTO> topProducts = new ArrayList<>();

        public BigDecimal getTotalRevenue() { return totalRevenue; }
        public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }

        public long getTotalOrders() { return totalOrders; }
        public void setTotalOrders(long totalOrders) { this.totalOrders = totalOrders; }

        public long getSuccessfulOrders() { return successfulOrders; }
        public void setSuccessfulOrders(long successfulOrders) { this.successfulOrders = successfulOrders; }

        public long getCancelledOrders() { return cancelledOrders; }
        public void setCancelledOrders(long cancelledOrders) { this.cancelledOrders = cancelledOrders; }

        public BigDecimal getAverageOrderValue() { return averageOrderValue; }
        public void setAverageOrderValue(BigDecimal averageOrderValue) { this.averageOrderValue = averageOrderValue; }

        public long getTotalCustomers() { return totalCustomers; }
        public void setTotalCustomers(long totalCustomers) { this.totalCustomers = totalCustomers; }

        public long getTotalProducts() { return totalProducts; }
        public void setTotalProducts(long totalProducts) { this.totalProducts = totalProducts; }

        public List<StatusSummaryDTO> getOrdersByStatus() { return ordersByStatus; }
        public void setOrdersByStatus(List<StatusSummaryDTO> ordersByStatus) { this.ordersByStatus = ordersByStatus; }

        public List<PaymentSummaryDTO> getPaymentBreakdown() { return paymentBreakdown; }
        public void setPaymentBreakdown(List<PaymentSummaryDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

        public List<TopProductDTO> getTopProducts() { return topProducts; }
        public void setTopProducts(List<TopProductDTO> topProducts) { this.topProducts = topProducts; }
    }

    public static class StatusSummaryDTO {
        private String status;
        private long count;
        private BigDecimal revenue = BigDecimal.ZERO;

        public StatusSummaryDTO() {}
        public StatusSummaryDTO(String status, long count, BigDecimal revenue) {
            this.status = status;
            this.count = count;
            this.revenue = revenue;
        }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }

        public BigDecimal getRevenue() { return revenue; }
        public void setRevenue(BigDecimal revenue) { this.revenue = revenue; }
    }

    public static class PaymentSummaryDTO {
        private String paymentMethod;
        private String paymentStatus;
        private long count;
        private BigDecimal totalAmount = BigDecimal.ZERO;

        public PaymentSummaryDTO() {}
        public PaymentSummaryDTO(String paymentMethod, String paymentStatus, long count, BigDecimal totalAmount) {
            this.paymentMethod = paymentMethod;
            this.paymentStatus = paymentStatus;
            this.count = count;
            this.totalAmount = totalAmount;
        }

        public String getPaymentMethod() { return paymentMethod; }
        public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

        public String getPaymentStatus() { return paymentStatus; }
        public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }

        public BigDecimal getTotalAmount() { return totalAmount; }
        public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    }

    public static class TopProductDTO {
        private String productTitle;
        private String brandName;
        private long unitsSold;
        private BigDecimal totalRevenue = BigDecimal.ZERO;

        public TopProductDTO() {}
        public TopProductDTO(String productTitle, String brandName, long unitsSold, BigDecimal totalRevenue) {
            this.productTitle = productTitle;
            this.brandName = brandName;
            this.unitsSold = unitsSold;
            this.totalRevenue = totalRevenue;
        }

        public String getProductTitle() { return productTitle; }
        public void setProductTitle(String productTitle) { this.productTitle = productTitle; }

        public String getBrandName() { return brandName; }
        public void setBrandName(String brandName) { this.brandName = brandName; }

        public long getUnitsSold() { return unitsSold; }
        public void setUnitsSold(long unitsSold) { this.unitsSold = unitsSold; }

        public BigDecimal getTotalRevenue() { return totalRevenue; }
        public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }
    }
}
