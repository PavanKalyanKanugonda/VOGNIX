package com.vognix.service;

import com.vognix.dto.CartDTOs;
import com.vognix.entity.*;
import com.vognix.exception.BadRequestException;
import com.vognix.exception.InsufficientStockException;
import com.vognix.exception.ResourceNotFoundException;
import com.vognix.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductVariantRepository variantRepository;
    private final CouponRepository couponRepository;
    private final UserRepository userRepository;

    public CartService(CartRepository cartRepository,
                       CartItemRepository cartItemRepository,
                       ProductVariantRepository variantRepository,
                       CouponRepository couponRepository,
                       UserRepository userRepository) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.variantRepository = variantRepository;
        this.couponRepository = couponRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Cart getOrCreateCart(Long userId) {
        return cartRepository.findByUserId(userId).orElseGet(() -> {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
            return cartRepository.save(new Cart(user));
        });
    }

    @Transactional
    public CartDTOs.CartDTO getCart(Long userId, String couponCode) {
        Cart cart = getOrCreateCart(userId);
        return buildCartDTO(cart, couponCode);
    }

    @Transactional
    public CartDTOs.CartDTO addItemToCart(Long userId, CartDTOs.AddToCartRequest request) {
        return addItemToCart(userId, request, null);
    }

    @Transactional
    public CartDTOs.CartDTO addItemToCart(Long userId, CartDTOs.AddToCartRequest request, String couponCode) {
        Cart cart = getOrCreateCart(userId);
        ProductVariant variant = variantRepository.findById(request.getVariantId())
                .orElseThrow(() -> new ResourceNotFoundException("Product variant not found with id: " + request.getVariantId()));

        if (variant.getProduct() != null && !Boolean.TRUE.equals(variant.getProduct().getIsActive())) {
            throw new BadRequestException("This product is currently unavailable");
        }

        int availableStock = (variant.getInventory() != null) ? variant.getInventory().getAvailableQuantity() : 0;
        if (availableStock < request.getQuantity()) {
            throw new InsufficientStockException("Only " + availableStock + " units available for this variant");
        }

        Optional<CartItem> existingItemOpt = cartItemRepository.findByCartIdAndVariantId(cart.getId(), variant.getId());
        if (existingItemOpt.isPresent()) {
            CartItem existing = existingItemOpt.get();
            int newQuantity = existing.getQuantity() + request.getQuantity();
            if (newQuantity > availableStock) {
                throw new InsufficientStockException("Cannot add more. Total in cart (" + newQuantity + ") exceeds available stock (" + availableStock + ")");
            }
            existing.setQuantity(newQuantity);
            cartItemRepository.save(existing);
        } else {
            CartItem newItem = new CartItem(cart, variant, request.getQuantity());
            cartItemRepository.save(newItem);
        }

        return getCart(userId, couponCode);
    }

    @Transactional
    public CartDTOs.CartDTO updateCartItemQuantity(Long userId, Long cartItemId, int newQuantity) {
        return updateCartItemQuantity(userId, cartItemId, newQuantity, null);
    }

    @Transactional
    public CartDTOs.CartDTO updateCartItemQuantity(Long userId, Long cartItemId, int newQuantity, String couponCode) {
        Cart cart = getOrCreateCart(userId);
        CartItem item = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found with id: " + cartItemId));

        if (!item.getCart().getId().equals(cart.getId())) {
            throw new BadRequestException("Unauthorized access to cart item");
        }

        if (newQuantity <= 0) {
            cartItemRepository.delete(item);
        } else {
            int availableStock = (item.getVariant().getInventory() != null) ? item.getVariant().getInventory().getAvailableQuantity() : 0;
            if (newQuantity > availableStock) {
                throw new InsufficientStockException("Requested quantity (" + newQuantity + ") exceeds available stock (" + availableStock + ")");
            }
            item.setQuantity(newQuantity);
            cartItemRepository.save(item);
        }

        return getCart(userId, couponCode);
    }

    @Transactional
    public CartDTOs.CartDTO removeCartItem(Long userId, Long cartItemId) {
        return removeCartItem(userId, cartItemId, null);
    }

    @Transactional
    public CartDTOs.CartDTO removeCartItem(Long userId, Long cartItemId, String couponCode) {
        Cart cart = getOrCreateCart(userId);
        CartItem item = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found with id: " + cartItemId));

        if (!item.getCart().getId().equals(cart.getId())) {
            throw new BadRequestException("Unauthorized access to cart item");
        }

        cartItemRepository.delete(item);
        return getCart(userId, couponCode);
    }

    @Transactional
    public void clearCart(Long userId) {
        Cart cart = getOrCreateCart(userId);
        cartItemRepository.deleteByCartId(cart.getId());
    }

    public CartDTOs.CartDTO buildCartDTO(Cart cart, String couponCode) {
        List<CartItem> items = cartItemRepository.findByCartId(cart.getId());
        List<CartDTOs.CartItemDTO> itemDTOs = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        int totalItemsCount = 0;

        for (CartItem item : items) {
            ProductVariant variant = item.getVariant();
            Product product = variant.getProduct();
            BigDecimal unitPrice = (variant.getPriceOverride() != null) ? variant.getPriceOverride() : product.getDiscountedPrice();
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(item.getQuantity())).setScale(2, RoundingMode.HALF_UP);
            subtotal = subtotal.add(lineTotal);
            totalItemsCount += item.getQuantity();

            CartDTOs.CartItemDTO dto = new CartDTOs.CartItemDTO();
            dto.setId(item.getId());
            dto.setVariantId(variant.getId());
            dto.setProductId(product.getId());
            dto.setProductTitle(product.getTitle());
            dto.setProductSlug(product.getSlug());
            dto.setBrandName(product.getBrand().getName());
            dto.setSize(variant.getSize());
            dto.setColor(variant.getColor());
            dto.setUnitPrice(unitPrice);
            dto.setOriginalPrice(product.getBasePrice());
            dto.setDiscountPercent(product.getDiscountPercent());
            dto.setQuantity(item.getQuantity());
            dto.setTotalPrice(lineTotal);

            int stock = (variant.getInventory() != null) ? variant.getInventory().getAvailableQuantity() : 0;
            dto.setAvailableStock(stock);
            dto.setInStock(stock >= item.getQuantity());

            if (product.getImages() != null && !product.getImages().isEmpty()) {
                dto.setImageUrl(product.getImages().get(0).getImageUrl());
            }

            itemDTOs.add(dto);
        }

        BigDecimal couponDiscount = BigDecimal.ZERO;
        String appliedCode = null;
        if (couponCode != null && !couponCode.trim().isEmpty()) {
            Optional<Coupon> couponOpt = couponRepository.findByCodeIgnoreCase(couponCode.trim());
            if (couponOpt.isPresent() && couponOpt.get().isValid(subtotal)) {
                couponDiscount = couponOpt.get().calculateDiscount(subtotal);
                appliedCode = couponOpt.get().getCode();
            }
        }

        // Shipping logic: Free shipping on orders above ₹999 or empty cart, else flat ₹99
        BigDecimal shippingFee = BigDecimal.ZERO;
        if (subtotal.compareTo(BigDecimal.ZERO) > 0 && subtotal.compareTo(BigDecimal.valueOf(999)) < 0) {
            shippingFee = BigDecimal.valueOf(99.00);
        }

        // Standard 5% GST tax included in calculation
        BigDecimal taxAmount = subtotal.multiply(BigDecimal.valueOf(0.05)).setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalAmount = subtotal.subtract(couponDiscount).add(shippingFee);
        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            totalAmount = BigDecimal.ZERO;
        }

        CartDTOs.CartDTO cartDTO = new CartDTOs.CartDTO();
        cartDTO.setCartId(cart.getId());
        cartDTO.setItems(itemDTOs);
        cartDTO.setSubtotal(subtotal);
        cartDTO.setCouponDiscount(couponDiscount);
        cartDTO.setShippingFee(shippingFee);
        cartDTO.setTaxAmount(taxAmount);
        cartDTO.setTotalAmount(totalAmount);
        cartDTO.setAppliedCoupon(appliedCode);
        cartDTO.setTotalItemsCount(totalItemsCount);

        return cartDTO;
    }
}
