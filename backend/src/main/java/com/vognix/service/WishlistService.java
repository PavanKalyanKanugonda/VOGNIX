package com.vognix.service;

import com.vognix.dto.CartDTOs;
import com.vognix.dto.WishlistDTOs;
import com.vognix.entity.*;
import com.vognix.exception.BadRequestException;
import com.vognix.exception.ResourceNotFoundException;
import com.vognix.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final WishlistItemRepository wishlistItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CartService cartService;

    public WishlistService(WishlistRepository wishlistRepository,
                           WishlistItemRepository wishlistItemRepository,
                           ProductRepository productRepository,
                           UserRepository userRepository,
                           CartService cartService) {
        this.wishlistRepository = wishlistRepository;
        this.wishlistItemRepository = wishlistItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.cartService = cartService;
    }

    @Transactional
    public Wishlist getOrCreateWishlist(Long userId) {
        return wishlistRepository.findByUserId(userId).orElseGet(() -> {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
            return wishlistRepository.save(new Wishlist(user));
        });
    }

    @Transactional(readOnly = true)
    public WishlistDTOs.WishlistDTO getWishlist(Long userId) {
        Wishlist wishlist = getOrCreateWishlist(userId);
        List<WishlistItem> items = wishlistItemRepository.findByWishlistId(wishlist.getId());
        List<WishlistDTOs.WishlistItemDTO> itemDTOs = new ArrayList<>();

        for (WishlistItem item : items) {
            Product product = item.getProduct();
            WishlistDTOs.WishlistItemDTO dto = new WishlistDTOs.WishlistItemDTO();
            dto.setId(item.getId());
            dto.setProductId(product.getId());
            dto.setProductTitle(product.getTitle());
            dto.setProductSlug(product.getSlug());
            dto.setBrandName(product.getBrand().getName());
            dto.setBasePrice(product.getBasePrice());
            dto.setDiscountPercent(product.getDiscountPercent());
            dto.setDiscountedPrice(product.getDiscountedPrice());
            dto.setRating(product.getRating());
            dto.setReviewCount(product.getReviewCount());
            dto.setAddedAt(item.getCreatedAt());

            if (product.getImages() != null && !product.getImages().isEmpty()) {
                dto.setImageUrl(product.getImages().get(0).getImageUrl());
            }

            boolean inStock = false;
            List<WishlistDTOs.WishlistVariantDTO> variantDTOs = new ArrayList<>();
            if (product.getVariants() != null) {
                for (ProductVariant v : product.getVariants()) {
                    int qty = (v.getInventory() != null) ? v.getInventory().getAvailableQuantity() : 0;
                    boolean vInStock = qty > 0;
                    if (vInStock) {
                        inStock = true;
                    }
                    WishlistDTOs.WishlistVariantDTO vDto = new WishlistDTOs.WishlistVariantDTO();
                    vDto.setId(v.getId());
                    vDto.setSize(v.getSize());
                    vDto.setColor(v.getColor());
                    vDto.setColorCode(v.getColorCode());
                    vDto.setStockQuantity(qty);
                    vDto.setInStock(vInStock);
                    variantDTOs.add(vDto);
                }
            }
            dto.setInStock(inStock);
            dto.setVariants(variantDTOs);

            itemDTOs.add(dto);
        }

        WishlistDTOs.WishlistDTO dto = new WishlistDTOs.WishlistDTO();
        dto.setWishlistId(wishlist.getId());
        dto.setItems(itemDTOs);
        dto.setTotalCount(itemDTOs.size());
        return dto;
    }

    @Transactional
    public WishlistDTOs.WishlistDTO toggleWishlistItem(Long userId, Long productId) {
        Wishlist wishlist = getOrCreateWishlist(userId);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        if (wishlistItemRepository.existsByWishlistIdAndProductId(wishlist.getId(), productId)) {
            wishlistItemRepository.deleteByWishlistIdAndProductId(wishlist.getId(), productId);
        } else {
            WishlistItem item = new WishlistItem(wishlist, product);
            wishlistItemRepository.save(item);
        }

        return getWishlist(userId);
    }

    @Transactional
    public WishlistDTOs.WishlistDTO removeFromWishlist(Long userId, Long productId) {
        Wishlist wishlist = getOrCreateWishlist(userId);
        wishlistItemRepository.deleteByWishlistIdAndProductId(wishlist.getId(), productId);
        return getWishlist(userId);
    }

    @Transactional
    public void moveToCart(Long userId, Long productId, Long variantId) {
        Wishlist wishlist = getOrCreateWishlist(userId);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        if (!Boolean.TRUE.equals(product.getIsActive())) {
            throw new BadRequestException("This product is currently unavailable");
        }

        List<ProductVariant> variants = product.getVariants();
        if (variants == null || variants.isEmpty()) {
            throw new BadRequestException("No size or color variants are available for this product");
        }

        ProductVariant selectedVariant;
        if (variantId != null) {
            selectedVariant = variants.stream()
                    .filter(v -> v.getId().equals(variantId))
                    .findFirst()
                    .orElseThrow(() -> new BadRequestException("Selected variant does not belong to this product"));
        } else {
            selectedVariant = variants.stream()
                    .filter(v -> v.getInventory() != null && v.getInventory().getAvailableQuantity() > 0)
                    .findFirst()
                    .orElse(variants.get(0));
        }

        CartDTOs.AddToCartRequest cartRequest = new CartDTOs.AddToCartRequest();
        cartRequest.setVariantId(selectedVariant.getId());
        cartRequest.setQuantity(1);
        cartService.addItemToCart(userId, cartRequest);

        wishlistItemRepository.deleteByWishlistIdAndProductId(wishlist.getId(), productId);
    }
}
