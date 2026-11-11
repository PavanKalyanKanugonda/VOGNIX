package com.vognix.service;

import com.vognix.dto.CartDTOs;
import com.vognix.entity.*;
import com.vognix.exception.InsufficientStockException;
import com.vognix.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private ProductVariantRepository variantRepository;

    @Mock
    private CouponRepository couponRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CartService cartService;

    private User testUser;
    private Cart testCart;
    private Product testProduct;
    private ProductVariant testVariant;
    private Inventory testInventory;

    @BeforeEach
    void setUp() {
        testUser = new User("user@example.com", "hash", "John", "Doe", null);
        testUser.setId(1L);

        testCart = new Cart(testUser);
        testCart.setId(10L);

        Brand brand = new Brand();
        brand.setName("VOGNIX Luxe");

        Category category = new Category();
        category.setName("Men Fashion");
        category.setSlug("men-fashion");

        testProduct = new Product();
        testProduct.setId(100L);
        testProduct.setTitle("Poplin Shirt");
        testProduct.setBrand(brand);
        testProduct.setCategory(category);
        testProduct.setBasePrice(BigDecimal.valueOf(2000.00));
        testProduct.setDiscountPercent(10); // Discounted price = 1800.00

        testVariant = new ProductVariant();
        testVariant.setId(200L);
        testVariant.setProduct(testProduct);
        testVariant.setSize("M");
        testVariant.setColor("White");

        testInventory = new Inventory(testVariant, 5, 2);
        testVariant.setInventory(testInventory);
    }

    @Test
    @DisplayName("Should successfully add item to cart when stock is available")
    void testAddToCartSuccess() {
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(testCart));
        when(variantRepository.findById(200L)).thenReturn(Optional.of(testVariant));
        when(cartItemRepository.findByCartIdAndVariantId(10L, 200L)).thenReturn(Optional.empty());

        CartDTOs.AddToCartRequest request = new CartDTOs.AddToCartRequest();
        request.setVariantId(200L);
        request.setQuantity(2);

        when(cartItemRepository.findByCartId(10L)).thenReturn(Collections.emptyList());

        CartDTOs.CartDTO result = cartService.addItemToCart(1L, request);

        assertNotNull(result);
        verify(cartItemRepository).save(any(CartItem.class));
    }

    @Test
    @DisplayName("Should reject adding item when requested quantity exceeds available stock")
    void testAddToCartInsufficientStockThrowsException() {
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(testCart));
        when(variantRepository.findById(200L)).thenReturn(Optional.of(testVariant));

        CartDTOs.AddToCartRequest request = new CartDTOs.AddToCartRequest();
        request.setVariantId(200L);
        request.setQuantity(10); // Only 5 in stock

        assertThrows(InsufficientStockException.class, () -> cartService.addItemToCart(1L, request));
        verify(cartItemRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should accurately calculate subtotal, percentage coupon discount, and free shipping")
    void testCartCalculationsWithPercentageCoupon() {
        CartItem item = new CartItem(testCart, testVariant, 2); // 2 * 1800.00 = 3600.00
        when(cartItemRepository.findByCartId(10L)).thenReturn(Collections.singletonList(item));

        Coupon coupon = new Coupon();
        coupon.setCode("VOGNIX10");
        coupon.setDiscountType("PERCENTAGE");
        coupon.setDiscountValue(BigDecimal.valueOf(10.00));
        coupon.setMinOrderAmount(BigDecimal.valueOf(1000.00));
        coupon.setMaxDiscountAmount(BigDecimal.valueOf(500.00));
        coupon.setValidFrom(LocalDateTime.now().minusDays(1));
        coupon.setValidUntil(LocalDateTime.now().plusDays(10));
        coupon.setIsActive(true);

        when(couponRepository.findByCodeIgnoreCase("VOGNIX10")).thenReturn(Optional.of(coupon));

        CartDTOs.CartDTO cartDTO = cartService.buildCartDTO(testCart, "VOGNIX10");

        assertNotNull(cartDTO);
        // Subtotal = 2 * 1800 = 3600.00
        assertEquals(0, BigDecimal.valueOf(3600.00).compareTo(cartDTO.getSubtotal()));
        // 10% of 3600 = 360.00
        assertEquals(0, BigDecimal.valueOf(360.00).compareTo(cartDTO.getCouponDiscount()));
        // Subtotal > 999, so shipping is free (0.00)
        assertEquals(0, BigDecimal.ZERO.compareTo(cartDTO.getShippingFee()));
        // Final Total = 3600 - 360 = 3240.00
        assertEquals(0, BigDecimal.valueOf(3240.00).compareTo(cartDTO.getTotalAmount()));
        assertEquals("VOGNIX10", cartDTO.getAppliedCoupon());
    }
}
