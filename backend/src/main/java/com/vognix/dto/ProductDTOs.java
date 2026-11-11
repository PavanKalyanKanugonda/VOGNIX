package com.vognix.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class ProductDTOs {

    public static class ProductSummaryDTO {
        private Long id;
        private String title;
        private String slug;
        private String brandName;
        private Long brandId;
        private String brandSlug;
        private String categoryName;
        private Long categoryId;
        private String categorySlug;
        private String gender;
        private BigDecimal basePrice;
        private Integer discountPercent;
        private BigDecimal discountedPrice;
        private BigDecimal rating;
        private Integer reviewCount;
        private String primaryImageUrl;
        private Boolean isActive;
        private Boolean isFeatured;
        private List<String> availableSizes;
        private List<String> availableColors;

        public ProductSummaryDTO() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getSlug() { return slug; }
        public void setSlug(String slug) { this.slug = slug; }

        public String getBrandName() { return brandName; }
        public void setBrandName(String brandName) { this.brandName = brandName; }

        public Long getBrandId() { return brandId; }
        public void setBrandId(Long brandId) { this.brandId = brandId; }

        public String getBrandSlug() { return brandSlug; }
        public void setBrandSlug(String brandSlug) { this.brandSlug = brandSlug; }

        public String getCategoryName() { return categoryName; }
        public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

        public Long getCategoryId() { return categoryId; }
        public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

        public String getCategorySlug() { return categorySlug; }
        public void setCategorySlug(String categorySlug) { this.categorySlug = categorySlug; }

        public String getGender() { return gender; }
        public void setGender(String gender) { this.gender = gender; }

        public BigDecimal getBasePrice() { return basePrice; }
        public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }

        public Integer getDiscountPercent() { return discountPercent; }
        public void setDiscountPercent(Integer discountPercent) { this.discountPercent = discountPercent; }

        public BigDecimal getDiscountedPrice() { return discountedPrice; }
        public void setDiscountedPrice(BigDecimal discountedPrice) { this.discountedPrice = discountedPrice; }

        public BigDecimal getRating() { return rating; }
        public void setRating(BigDecimal rating) { this.rating = rating; }

        public Integer getReviewCount() { return reviewCount; }
        public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

        public String getPrimaryImageUrl() { return primaryImageUrl; }
        public void setPrimaryImageUrl(String primaryImageUrl) { this.primaryImageUrl = primaryImageUrl; }

        public Boolean getIsActive() { return isActive; }
        public void setIsActive(Boolean active) { isActive = active; }

        public Boolean getIsFeatured() { return isFeatured; }
        public void setIsFeatured(Boolean featured) { isFeatured = featured; }

        public List<String> getAvailableSizes() { return availableSizes; }
        public void setAvailableSizes(List<String> availableSizes) { this.availableSizes = availableSizes; }

        public List<String> getAvailableColors() { return availableColors; }
        public void setAvailableColors(List<String> availableColors) { this.availableColors = availableColors; }
    }

    public static class ProductDetailDTO {
        private Long id;
        private String title;
        private String slug;
        private String description;
        private String brandName;
        private Long brandId;
        private String brandSlug;
        private String categoryName;
        private Long categoryId;
        private String categorySlug;
        private String gender;
        private BigDecimal basePrice;
        private Integer discountPercent;
        private BigDecimal discountedPrice;
        private BigDecimal rating;
        private Integer reviewCount;
        private Boolean isActive;
        private Boolean isFeatured;
        private List<ProductImageDTO> images;
        private List<ProductVariantDTO> variants;
        private List<ReviewResponse> recentReviews;

        public ProductDetailDTO() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getSlug() { return slug; }
        public void setSlug(String slug) { this.slug = slug; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getBrandName() { return brandName; }
        public void setBrandName(String brandName) { this.brandName = brandName; }

        public Long getBrandId() { return brandId; }
        public void setBrandId(Long brandId) { this.brandId = brandId; }

        public String getBrandSlug() { return brandSlug; }
        public void setBrandSlug(String brandSlug) { this.brandSlug = brandSlug; }

        public String getCategoryName() { return categoryName; }
        public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

        public Long getCategoryId() { return categoryId; }
        public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

        public String getCategorySlug() { return categorySlug; }
        public void setCategorySlug(String categorySlug) { this.categorySlug = categorySlug; }

        public String getGender() { return gender; }
        public void setGender(String gender) { this.gender = gender; }

        public BigDecimal getBasePrice() { return basePrice; }
        public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }

        public Integer getDiscountPercent() { return discountPercent; }
        public void setDiscountPercent(Integer discountPercent) { this.discountPercent = discountPercent; }

        public BigDecimal getDiscountedPrice() { return discountedPrice; }
        public void setDiscountedPrice(BigDecimal discountedPrice) { this.discountedPrice = discountedPrice; }

        public BigDecimal getRating() { return rating; }
        public void setRating(BigDecimal rating) { this.rating = rating; }

        public Integer getReviewCount() { return reviewCount; }
        public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

        public Boolean getIsActive() { return isActive; }
        public void setIsActive(Boolean active) { isActive = active; }

        public Boolean getIsFeatured() { return isFeatured; }
        public void setIsFeatured(Boolean featured) { isFeatured = featured; }

        public List<ProductImageDTO> getImages() { return images; }
        public void setImages(List<ProductImageDTO> images) { this.images = images; }

        public List<ProductVariantDTO> getVariants() { return variants; }
        public void setVariants(List<ProductVariantDTO> variants) { this.variants = variants; }

        public List<ReviewResponse> getRecentReviews() { return recentReviews; }
        public void setRecentReviews(List<ReviewResponse> recentReviews) { this.recentReviews = recentReviews; }
    }

    public static class ProductImageDTO {
        private Long id;
        private String imageUrl;
        private Integer displayOrder;
        private Boolean isPrimary;

        public ProductImageDTO() {}

        public ProductImageDTO(Long id, String imageUrl, Integer displayOrder, Boolean isPrimary) {
            this.id = id;
            this.imageUrl = imageUrl;
            this.displayOrder = displayOrder;
            this.isPrimary = isPrimary;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getImageUrl() { return imageUrl; }
        public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

        public Integer getDisplayOrder() { return displayOrder; }
        public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }

        public Boolean getIsPrimary() { return isPrimary; }
        public void setIsPrimary(Boolean primary) { isPrimary = primary; }
    }

    public static class ProductVariantDTO {
        private Long id;
        private String sku;
        private String size;
        private String color;
        private String colorCode;
        private BigDecimal priceOverride;
        private Integer stockQuantity;
        private boolean inStock;

        public ProductVariantDTO() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getSku() { return sku; }
        public void setSku(String sku) { this.sku = sku; }

        public String getSize() { return size; }
        public void setSize(String size) { this.size = size; }

        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }

        public String getColorCode() { return colorCode; }
        public void setColorCode(String colorCode) { this.colorCode = colorCode; }

        public BigDecimal getPriceOverride() { return priceOverride; }
        public void setPriceOverride(BigDecimal priceOverride) { this.priceOverride = priceOverride; }

        public Integer getStockQuantity() { return stockQuantity; }
        public void setStockQuantity(Integer stockQuantity) { this.stockQuantity = stockQuantity; }

        public boolean isInStock() { return inStock; }
        public void setInStock(boolean inStock) { this.inStock = inStock; }
    }

    public static class ProductCreateRequest {
        @NotBlank(message = "Title is required")
        private String title;

        @NotBlank(message = "Description is required")
        private String description;

        @NotNull(message = "Brand ID is required")
        private Long brandId;

        @NotNull(message = "Category ID is required")
        private Long categoryId;

        private String gender = "UNISEX";

        @NotNull(message = "Base price is required")
        @DecimalMin(value = "0.01", message = "Base price must be greater than 0")
        private BigDecimal basePrice;

        private Integer discountPercent = 0;
        private Boolean isActive = true;
        private Boolean isFeatured = false;
        private List<String> imageUrls;
        private List<VariantCreateRequest> variants;

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public Long getBrandId() { return brandId; }
        public void setBrandId(Long brandId) { this.brandId = brandId; }

        public Long getCategoryId() { return categoryId; }
        public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

        public String getGender() { return gender; }
        public void setGender(String gender) { this.gender = gender; }

        public BigDecimal getBasePrice() { return basePrice; }
        public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }

        public Integer getDiscountPercent() { return discountPercent; }
        public void setDiscountPercent(Integer discountPercent) { this.discountPercent = discountPercent; }

        public Boolean getIsActive() { return isActive; }
        public void setIsActive(Boolean active) { isActive = active; }

        public Boolean getIsFeatured() { return isFeatured; }
        public void setIsFeatured(Boolean featured) { isFeatured = featured; }

        public List<String> getImageUrls() { return imageUrls; }
        public void setImageUrls(List<String> imageUrls) { this.imageUrls = imageUrls; }

        public List<VariantCreateRequest> getVariants() { return variants; }
        public void setVariants(List<VariantCreateRequest> variants) { this.variants = variants; }
    }

    public static class VariantCreateRequest {
        @NotBlank(message = "Size is required")
        private String size;

        @NotBlank(message = "Color is required")
        private String color;

        private String colorCode = "#000000";
        private Integer stockQuantity = 20;

        public String getSize() { return size; }
        public void setSize(String size) { this.size = size; }

        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }

        public String getColorCode() { return colorCode; }
        public void setColorCode(String colorCode) { this.colorCode = colorCode; }

        public Integer getStockQuantity() { return stockQuantity; }
        public void setStockQuantity(Integer stockQuantity) { this.stockQuantity = stockQuantity; }
    }

    public static class ReviewRequest {
        @NotNull(message = "Rating is required")
        private Integer rating;

        private String title;
        private String comment;

        public Integer getRating() { return rating; }
        public void setRating(Integer rating) { this.rating = rating; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getComment() { return comment; }
        public void setComment(String comment) { this.comment = comment; }
    }

    public static class ReviewResponse {
        private Long id;
        private String userName;
        private Integer rating;
        private String title;
        private String comment;
        private Boolean isVerifiedBuyer;
        private LocalDateTime createdAt;

        public ReviewResponse() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getUserName() { return userName; }
        public void setUserName(String userName) { this.userName = userName; }

        public Integer getRating() { return rating; }
        public void setRating(Integer rating) { this.rating = rating; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getComment() { return comment; }
        public void setComment(String comment) { this.comment = comment; }

        public Boolean getIsVerifiedBuyer() { return isVerifiedBuyer; }
        public void setIsVerifiedBuyer(Boolean verifiedBuyer) { isVerifiedBuyer = verifiedBuyer; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }
}
