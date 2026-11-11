package com.vognix.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class WishlistDTOs {

    public static class WishlistDTO {
        private Long wishlistId;
        private List<WishlistItemDTO> items = new ArrayList<>();
        private int totalCount = 0;

        public WishlistDTO() {}

        public Long getWishlistId() { return wishlistId; }
        public void setWishlistId(Long wishlistId) { this.wishlistId = wishlistId; }

        public List<WishlistItemDTO> getItems() { return items; }
        public void setItems(List<WishlistItemDTO> items) { this.items = items; }

        public int getTotalCount() { return totalCount; }
        public void setTotalCount(int totalCount) { this.totalCount = totalCount; }
    }

    public static class WishlistItemDTO {
        private Long id;
        private Long productId;
        private String productTitle;
        private String productSlug;
        private String brandName;
        private String imageUrl;
        private BigDecimal basePrice;
        private Integer discountPercent;
        private BigDecimal discountedPrice;
        private BigDecimal rating;
        private Integer reviewCount;
        private LocalDateTime addedAt;
        private boolean inStock;
        private List<WishlistVariantDTO> variants = new ArrayList<>();

        public WishlistItemDTO() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }

        public String getProductTitle() { return productTitle; }
        public void setProductTitle(String productTitle) { this.productTitle = productTitle; }

        public String getProductSlug() { return productSlug; }
        public void setProductSlug(String productSlug) { this.productSlug = productSlug; }

        public String getBrandName() { return brandName; }
        public void setBrandName(String brandName) { this.brandName = brandName; }

        public String getImageUrl() { return imageUrl; }
        public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

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

        public LocalDateTime getAddedAt() { return addedAt; }
        public void setAddedAt(LocalDateTime addedAt) { this.addedAt = addedAt; }

        public boolean isInStock() { return inStock; }
        public void setInStock(boolean inStock) { this.inStock = inStock; }

        public List<WishlistVariantDTO> getVariants() { return variants; }
        public void setVariants(List<WishlistVariantDTO> variants) { this.variants = variants; }
    }

    public static class WishlistVariantDTO {
        private Long id;
        private String size;
        private String color;
        private String colorCode;
        private Integer stockQuantity;
        private boolean inStock;

        public WishlistVariantDTO() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getSize() { return size; }
        public void setSize(String size) { this.size = size; }

        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }

        public String getColorCode() { return colorCode; }
        public void setColorCode(String colorCode) { this.colorCode = colorCode; }

        public Integer getStockQuantity() { return stockQuantity; }
        public void setStockQuantity(Integer stockQuantity) { this.stockQuantity = stockQuantity; }

        public boolean isInStock() { return inStock; }
        public void setInStock(boolean inStock) { this.inStock = inStock; }
    }
}
