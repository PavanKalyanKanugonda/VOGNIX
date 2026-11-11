package com.vognix.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vognix.dto.CartDTOs;
import com.vognix.dto.OrderDTOs;
import com.vognix.entity.*;
import com.vognix.exception.BadRequestException;
import com.vognix.exception.InsufficientStockException;
import com.vognix.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private CartService cartService;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private UserAddressRepository addressRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private CouponRepository couponRepository;

    @Mock
    private IdempotencyRecordRepository idempotencyRecordRepository;

    @Mock
    private AuditLogService auditLogService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private OrderService orderService;

    private User testUser;
    private UserAddress testAddress;
    private Cart testCart;
    private ProductVariant testVariant;
    private Inventory testInventory;
    private CartItem testCartItem;

    @BeforeEach
    void setUp() {
        testUser = new User("customer@vognix.com", "pass", "Aarav", "Sharma", "9812345678");
        testUser.setId(1L);

        testAddress = new UserAddress();
        testAddress.setId(10L);
        testAddress.setUser(testUser);
        testAddress.setFullName("Aarav Sharma");
        testAddress.setPhone("9812345678");
        testAddress.setStreetAddress("123 Fashion Ave");
        testAddress.setCity("Mumbai");
        testAddress.setState("Maharashtra");
        testAddress.setPostalCode("400001");

        testCart = new Cart(testUser);
        testCart.setId(5L);

        Brand brand = new Brand();
        brand.setName("VOGNIX");

        Product product = new Product();
        product.setId(20L);
        product.setTitle("Denim Jacket");
        product.setBrand(brand);
        product.setBasePrice(BigDecimal.valueOf(3000));
        product.setDiscountPercent(0);

        testVariant = new ProductVariant();
        testVariant.setId(100L);
        testVariant.setSku("VOG-JCK-L");
        testVariant.setProduct(product);
        testVariant.setSize("L");
        testVariant.setColor("Blue");

        testInventory = new Inventory(testVariant, 10, 2);
        testVariant.setInventory(testInventory);

        testCartItem = new CartItem(testCart, testVariant, 2);
    }

    @Test
    @DisplayName("Should successfully place order and atomically deduct inventory")
    void testPlaceOrderSuccess() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(addressRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testAddress));
        when(cartService.getOrCreateCart(1L)).thenReturn(testCart);
        when(cartItemRepository.findByCartId(5L)).thenReturn(Collections.singletonList(testCartItem));
        when(inventoryRepository.findByVariantIdWithLock(100L)).thenReturn(Optional.of(testInventory));

        CartDTOs.CartDTO cartDTO = new CartDTOs.CartDTO();
        cartDTO.setSubtotal(BigDecimal.valueOf(6000));
        cartDTO.setCouponDiscount(BigDecimal.ZERO);
        cartDTO.setShippingFee(BigDecimal.ZERO);
        cartDTO.setTaxAmount(BigDecimal.valueOf(300));
        cartDTO.setTotalAmount(BigDecimal.valueOf(6000));
        when(cartService.buildCartDTO(any(), any())).thenReturn(cartDTO);

        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            o.setId(500L);
            return o;
        });

        OrderDTOs.OrderPlacementRequest request = new OrderDTOs.OrderPlacementRequest();
        request.setAddressId(10L);
        request.setPaymentMethod("COD");

        OrderDTOs.OrderResponse response = orderService.placeOrder(1L, request, "key-uuid-12345");

        assertNotNull(response);
        assertEquals(500L, response.getId());
        assertEquals("PLACED", response.getStatus());

        // Verify stock deducted from 10 to 8
        assertEquals(8, testInventory.getStockQuantity());
        verify(inventoryRepository).save(testInventory);
        verify(cartService).clearCart(1L);
    }

    @Test
    @DisplayName("Idempotency: Re-submitting identical key returns cached order without duplicate deduction")
    void testIdempotencyKeyReturnsCachedResponse() throws Exception {
        OrderDTOs.OrderResponse cachedResponse = new OrderDTOs.OrderResponse();
        cachedResponse.setId(999L);
        cachedResponse.setOrderNumber("VOG-CACHED-999");
        cachedResponse.setTotalAmount(BigDecimal.valueOf(4500));

        String cachedJson = objectMapper.writeValueAsString(cachedResponse);
        IdempotencyRecord record = new IdempotencyRecord("dup-key-001", "hash", cachedJson, 200, LocalDateTime.now().plusHours(1));

        when(idempotencyRecordRepository.findByIdempotencyKeyAndExpiresAtAfter(eq("dup-key-001"), any(LocalDateTime.class)))
                .thenReturn(Optional.of(record));

        OrderDTOs.OrderPlacementRequest request = new OrderDTOs.OrderPlacementRequest();
        request.setAddressId(10L);
        request.setPaymentMethod("COD");

        OrderDTOs.OrderResponse response = orderService.placeOrder(1L, request, "dup-key-001");

        assertNotNull(response);
        assertEquals(999L, response.getId());
        assertEquals("VOG-CACHED-999", response.getOrderNumber());

        // Ensure no stock deduction or new order created
        verify(orderRepository, never()).save(any());
        verify(inventoryRepository, never()).findByVariantIdWithLock(any());
    }

    @Test
    @DisplayName("Should throw InsufficientStockException when item stock is insufficient during checkout")
    void testPlaceOrderInsufficientStockThrowsException() {
        testInventory.setStockQuantity(1); // Cart has 2, only 1 in stock

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(addressRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testAddress));
        when(cartService.getOrCreateCart(1L)).thenReturn(testCart);
        when(cartItemRepository.findByCartId(5L)).thenReturn(Collections.singletonList(testCartItem));
        when(inventoryRepository.findByVariantIdWithLock(100L)).thenReturn(Optional.of(testInventory));

        OrderDTOs.OrderPlacementRequest request = new OrderDTOs.OrderPlacementRequest();
        request.setAddressId(10L);
        request.setPaymentMethod("COD");

        assertThrows(InsufficientStockException.class, () -> orderService.placeOrder(1L, request, "any-key"));
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should cancel eligible order and restore variant inventory")
    void testCancelOrderRestoresInventory() {
        Order order = new Order();
        order.setId(88L);
        order.setOrderNumber("VOG-88");
        order.setUser(testUser);
        order.setStatus("PLACED");

        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setVariant(testVariant);
        item.setQuantity(3);
        item.setUnitPrice(BigDecimal.valueOf(1500));
        item.setTotalPrice(BigDecimal.valueOf(4500));

        when(orderRepository.findByIdAndUserId(88L, 1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenReturn(order);
        when(orderItemRepository.findByOrderId(88L)).thenReturn(Collections.singletonList(item));
        when(inventoryRepository.findByVariantIdWithLock(100L)).thenReturn(Optional.of(testInventory));

        // Before cancellation stock is 10
        assertEquals(10, testInventory.getStockQuantity());

        OrderDTOs.CancelOrderRequest request = new OrderDTOs.CancelOrderRequest();
        request.setReason("Ordered wrong size");

        OrderDTOs.OrderResponse response = orderService.cancelOrder(1L, 88L, request);

        assertEquals("CANCELLED", response.getStatus());
        // After cancellation stock restored from 10 to 13 (10 + 3)
        assertEquals(13, testInventory.getStockQuantity());
        verify(inventoryRepository).save(testInventory);
    }

    @Test
    @DisplayName("Should reject cancellation for orders already SHIPPED or DELIVERED")
    void testCancelShippedOrderThrowsBadRequestException() {
        Order order = new Order();
        order.setId(99L);
        order.setUser(testUser);
        order.setStatus("SHIPPED"); // Ineligible state

        when(orderRepository.findByIdAndUserId(99L, 1L)).thenReturn(Optional.of(order));

        OrderDTOs.CancelOrderRequest request = new OrderDTOs.CancelOrderRequest();
        request.setReason("Change of mind");

        assertThrows(BadRequestException.class, () -> orderService.cancelOrder(1L, 99L, request));
        verify(inventoryRepository, never()).save(any());
    }

    @Test
    @DisplayName("mapToOrderResponse should load DB items when in-memory list is empty and include SKU and productId")
    void testMapToOrderResponseLoadsFallbackItemsAndPopulatesSku() {
        Order order = new Order();
        order.setId(77L);
        order.setOrderNumber("VOG-MAP-77");
        order.setUser(testUser);
        order.setStatus("PAID");
        order.setTotalAmount(BigDecimal.valueOf(6000));

        OrderItem item = new OrderItem();
        item.setId(501L);
        item.setOrder(order);
        item.setVariant(testVariant);
        item.setProductTitle("Denim Jacket");
        item.setBrandName("VOGNIX");
        item.setSize("L");
        item.setColor("Blue");
        item.setUnitPrice(BigDecimal.valueOf(3000));
        item.setQuantity(2);
        item.setTotalPrice(BigDecimal.valueOf(6000));

        when(orderItemRepository.findByOrderId(77L)).thenReturn(Collections.singletonList(item));

        OrderDTOs.OrderResponse response = orderService.mapToOrderResponse(order, null);

        assertEquals(1, response.getItems().size());
        OrderDTOs.OrderItemResponseDTO mappedItem = response.getItems().get(0);
        assertEquals(20L, mappedItem.getProductId());
        assertEquals(100L, mappedItem.getVariantId());
        assertEquals("VOG-JCK-L", mappedItem.getSku());
        assertEquals("Denim Jacket", mappedItem.getProductTitle());
        assertEquals(2, mappedItem.getQuantity());
    }
}
