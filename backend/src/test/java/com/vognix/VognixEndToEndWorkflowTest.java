package com.vognix;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vognix.entity.Inventory;
import com.vognix.repository.InventoryRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class VognixEndToEndWorkflowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private InventoryRepository inventoryRepository;

    private JsonNode registerCustomer(String email, String firstName, String lastName) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "firstName", firstName,
                                "lastName", lastName,
                                "email", email,
                                "password", "TestPass@123",
                                "phone", "9876543210"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();
        return objectMapper.readTree(res.getResponse().getContentAsString()).get("data");
    }

    private String loginUser(String email, String password) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "password", password
                        ))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(res.getResponse().getContentAsString()).path("data").path("token").asText();
    }

    private Long addDefaultAddress(String jwt) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/users/addresses")
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "fullName", "Test Buyer",
                                "phone", "+91 9811112222",
                                "streetAddress", "42 Atelier Street",
                                "locality", "Kala Ghoda",
                                "city", "Mumbai",
                                "state", "Maharashtra",
                                "postalCode", "400001",
                                "addressType", "HOME",
                                "isDefault", true
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(res.getResponse().getContentAsString()).path("data").path("id").asLong();
    }

    private JsonNode createTestProduct(String adminJwt, String title, double price, int stock) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", title,
                                "description", "Crafted luxury test garment for automated end-to-end verification.",
                                "brandId", 1,
                                "categoryId", 1,
                                "gender", "UNISEX",
                                "basePrice", price,
                                "discountPercent", 0,
                                "isFeatured", false,
                                "imageUrls", List.of("https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80"),
                                "variants", List.of(Map.of(
                                        "size", "M",
                                        "color", "Onyx Black",
                                        "colorCode", "#111111",
                                        "stockQuantity", stock
                                ))
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(res.getResponse().getContentAsString()).get("data");
    }

    @Test
    @DisplayName("Auth, RBAC, duplicate email negative check, and account deactivation enforcement")
    void testAuthRbacAndAccountStatusLifecycle() throws Exception {
        String uniqueEmail = "auth.user." + UUID.randomUUID() + "@example.com";
        JsonNode regData = registerCustomer(uniqueEmail, "Riya", "Kapoor");
        String userJwt = regData.get("token").asText();
        Long userId = regData.get("userId").asLong();
        assertTrue(regData.get("roles").toString().contains("ROLE_CUSTOMER"));

        // Negative: Duplicate email registration rejected
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "firstName", "Riya",
                                "lastName", "Kapoor",
                                "email", uniqueEmail,
                                "password", "TestPass@123"
                        ))))
                .andExpect(status().isBadRequest());

        // Negative: Wrong password rejected with 401
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", uniqueEmail,
                                "password", "WrongPassword!"
                        ))))
                .andExpect(status().isUnauthorized());

        // Negative: Customer JWT cannot invoke admin routes
        mockMvc.perform(get("/api/admin/customers")
                        .header("Authorization", "Bearer " + userJwt))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/reports")
                        .header("Authorization", "Bearer " + userJwt))
                .andExpect(status().isForbidden());

        // Admin disables customer
        String adminJwt = loginUser("admin@vognix.com", "Admin@123");
        mockMvc.perform(put("/api/admin/customers/" + userId + "/status")
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isActive\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(false));

        // Disabled customer login and existing JWT both blocked
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", uniqueEmail,
                                "password", "TestPass@123"
                        ))))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/cart")
                        .header("Authorization", "Bearer " + userJwt))
                .andExpect(status().isForbidden());

        // Reactivate customer -> succeeds again
        mockMvc.perform(put("/api/admin/customers/" + userId + "/status")
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isActive\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(true));

        String freshJwt = loginUser(uniqueEmail, "TestPass@123");
        mockMvc.perform(get("/api/cart")
                        .header("Authorization", "Bearer " + freshJwt))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Catalog filtering, wishlist move-to-cart fallback, cart coupon preservation, and review negative check")
    void testCatalogWishlistMoveToCartAndCouponPreservation() throws Exception {
        // Search, category, size, color, sort & pagination
        mockMvc.perform(get("/api/products")
                        .param("search", "Oxford")
                        .param("category", "men-fashion")
                        .param("sizes", "M")
                        .param("colors", "Pure White")
                        .param("sortBy", "price_asc")
                        .param("page", "0")
                        .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].brandSlug").value("vognix-luxe"))
                .andExpect(jsonPath("$.data.content[0].isActive").value(true));

        String customerEmail = "catalog.user." + UUID.randomUUID() + "@example.com";
        String userJwt = registerCustomer(customerEmail, "Kabir", "Mehta").get("token").asText();

        // Wishlist toggle + verify nested variants returned
        mockMvc.perform(post("/api/wishlist/1")
                        .header("Authorization", "Bearer " + userJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].productId").value(1))
                .andExpect(jsonPath("$.data.items[0].variants[0].id").exists());

        // Move to cart WITHOUT specifying variantId (auto-picks first in-stock variant)
        mockMvc.perform(post("/api/wishlist/1/move-to-cart")
                        .header("Authorization", "Bearer " + userJwt))
                .andExpect(status().isOk());

        // Wishlist is now empty and cart has 1 item
        mockMvc.perform(get("/api/wishlist")
                        .header("Authorization", "Bearer " + userJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(0));

        MvcResult cartRes = mockMvc.perform(get("/api/cart")
                        .header("Authorization", "Bearer " + userJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].productId").value(1))
                .andReturn();
        Long cartItemId = objectMapper.readTree(cartRes.getResponse().getContentAsString())
                .path("data").path("items").get(0).path("id").asLong();

        // Negative: exceeding available stock returns 409 Conflict
        mockMvc.perform(put("/api/cart/items/" + cartItemId)
                        .header("Authorization", "Bearer " + userJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantity\":999}"))
                .andExpect(status().isConflict());

        // Apply VOGNIX10 and increment quantity passing couponCode -> discount preserved
        mockMvc.perform(post("/api/cart/apply-coupon")
                        .header("Authorization", "Bearer " + userJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"couponCode\":\"VOGNIX10\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.appliedCoupon").value("VOGNIX10"));

        mockMvc.perform(put("/api/cart/items/" + cartItemId)
                        .param("couponCode", "VOGNIX10")
                        .header("Authorization", "Bearer " + userJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantity\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.appliedCoupon").value("VOGNIX10"))
                .andExpect(jsonPath("$.data.totalItemsCount").value(2));

        // Product review + baseline rating preservation + duplicate review rejection
        MvcResult beforeReviewRes = mockMvc.perform(get("/api/products/1"))
                .andExpect(status().isOk())
                .andReturn();
        int priorReviewCount = objectMapper.readTree(beforeReviewRes.getResponse().getContentAsString())
                .path("data").path("reviewCount").asInt();

        mockMvc.perform(post("/api/products/1/reviews")
                        .header("Authorization", "Bearer " + userJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"title\":\"Tailored fit\",\"comment\":\"Crisp poplin weave.\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/products/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reviewCount").value(priorReviewCount + 1))
                .andExpect(jsonPath("$.data.recentReviews[0].title").value("Tailored fit"));

        mockMvc.perform(post("/api/products/1/reviews")
                        .header("Authorization", "Bearer " + userJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":4,\"title\":\"Again\",\"comment\":\"Duplicate\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("COD checkout idempotency and cancellation with inventory restoration")
    void testCodCheckoutIdempotencyAndCancelStockRestore() throws Exception {
        String adminJwt = loginUser("admin@vognix.com", "Admin@123");
        JsonNode product = createTestProduct(adminJwt, "COD Idempotency Blazer " + UUID.randomUUID(), 2000.00, 5);
        Long productId = product.get("id").asLong();
        Long variantId = product.get("variants").get(0).get("id").asLong();

        String buyerJwt = registerCustomer("cod." + UUID.randomUUID() + "@example.com", "Vikram", "Rao").get("token").asText();
        Long addressId = addDefaultAddress(buyerJwt);

        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + buyerJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("variantId", variantId, "quantity", 2))))
                .andExpect(status().isOk());

        String idemKey = "cod-idem-" + UUID.randomUUID();
        String orderBody = objectMapper.writeValueAsString(Map.of(
                "addressId", addressId,
                "paymentMethod", "COD"
        ));

        MvcResult firstOrderRes = mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + buyerJwt)
                        .header("X-Idempotency-Key", idemKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PLACED"))
                .andExpect(jsonPath("$.data.paymentMethod").value("COD"))
                .andReturn();

        JsonNode firstOrder = objectMapper.readTree(firstOrderRes.getResponse().getContentAsString()).get("data");
        Long orderId = firstOrder.get("id").asLong();
        String orderNumber = firstOrder.get("orderNumber").asText();

        // Repeat with identical X-Idempotency-Key -> returns same order without deducting stock again
        mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + buyerJwt)
                        .header("X-Idempotency-Key", idemKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(orderId))
                .andExpect(jsonPath("$.data.orderNumber").value(orderNumber));

        // Stock deducted once: 5 - 2 = 3
        mockMvc.perform(get("/api/products/" + productId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.variants[0].stockQuantity").value(3));

        // Cancel order -> stock restored back to 5
        mockMvc.perform(put("/api/orders/" + orderId + "/cancel")
                        .header("Authorization", "Bearer " + buyerJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Ordered wrong size\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.paymentStatus").value("CANCELLED"));

        mockMvc.perform(get("/api/products/" + productId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.variants[0].stockQuantity").value(5));

        // Negative: Re-cancelling cancelled order rejected
        mockMvc.perform(put("/api/orders/" + orderId + "/cancel")
                        .header("Authorization", "Bearer " + buyerJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Duplicate cancel\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Sandbox online payment lifecycle: fail -> retry -> capture -> strict admin transitions")
    void testSandboxPaymentLifecycleAndOrderStateTransitions() throws Exception {
        String adminJwt = loginUser("admin@vognix.com", "Admin@123");
        JsonNode product = createTestProduct(adminJwt, "Sandbox Silk Shirt " + UUID.randomUUID(), 1800.00, 4);
        Long variantId = product.get("variants").get(0).get("id").asLong();

        String buyerJwt = registerCustomer("sandbox." + UUID.randomUUID() + "@example.com", "Ananya", "Sen").get("token").asText();
        Long addressId = addDefaultAddress(buyerJwt);

        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + buyerJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("variantId", variantId, "quantity", 1))))
                .andExpect(status().isOk());

        // Initiate Sandbox UPI payment
        MvcResult initRes = mockMvc.perform(post("/api/payments/initiate")
                        .header("Authorization", "Bearer " + buyerJwt)
                        .header("X-Idempotency-Key", "pay-init-" + UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "addressId", addressId,
                                "paymentMethod", "UPI",
                                "couponCode", "VOGNIX10"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.gatewayMode").value("SANDBOX"))
                .andExpect(jsonPath("$.data.paymentStatus").value("PENDING"))
                .andReturn();

        JsonNode initPayment = objectMapper.readTree(initRes.getResponse().getContentAsString()).get("data");
        Long paymentId = initPayment.get("paymentId").asLong();
        Long orderId = initPayment.get("orderId").asLong();
        assertTrue(initPayment.get("razorpayOrderId").asText().startsWith("SANDBOX_ORD_"));

        Inventory afterReserve = inventoryRepository.findByVariantId(variantId).orElseThrow();
        assertEquals(4, afterReserve.getStockQuantity());
        assertEquals(1, afterReserve.getReservedQuantity());

        // Negative: cannot cancel PENDING_PAYMENT order before resolving payment
        mockMvc.perform(put("/api/orders/" + orderId + "/cancel")
                        .header("Authorization", "Bearer " + buyerJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Too early\"}"))
                .andExpect(status().isBadRequest());

        // Simulate failure -> reservation released
        mockMvc.perform(post("/api/payments/confirm")
                        .header("Authorization", "Bearer " + buyerJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "paymentId", paymentId,
                                "paymentStatus", "FAILED",
                                "failureReason", "UPI PIN declined"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paymentStatus").value("FAILED"));

        Inventory afterFail = inventoryRepository.findByVariantId(variantId).orElseThrow();
        assertEquals(0, afterFail.getReservedQuantity());
        assertEquals(4, afterFail.getStockQuantity());

        // Negative: cannot confirm failed attempt directly without retry
        mockMvc.perform(post("/api/payments/confirm")
                        .header("Authorization", "Bearer " + buyerJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "paymentId", paymentId,
                                "paymentStatus", "PAID"
                        ))))
                .andExpect(status().isBadRequest());

        // Retry -> creates new PENDING attempt and reserves again
        MvcResult retryRes = mockMvc.perform(post("/api/payments/" + paymentId + "/retry")
                        .header("Authorization", "Bearer " + buyerJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.gatewayMode").value("SANDBOX"))
                .andExpect(jsonPath("$.data.paymentStatus").value("PENDING"))
                .andReturn();
        Long retryPaymentId = objectMapper.readTree(retryRes.getResponse().getContentAsString()).path("data").path("paymentId").asLong();
        assertNotEquals(paymentId, retryPaymentId);

        // Confirm retry as PAID using CARD
        mockMvc.perform(post("/api/payments/confirm")
                        .header("Authorization", "Bearer " + buyerJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "paymentId", retryPaymentId,
                                "paymentStatus", "PAID",
                                "paymentMethod", "CARD"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.data.paymentMethod").value("CARD"));

        Inventory afterPaid = inventoryRepository.findByVariantId(variantId).orElseThrow();
        assertEquals(3, afterPaid.getStockQuantity());
        assertEquals(0, afterPaid.getReservedQuantity());

        // Cart cleared after capture
        mockMvc.perform(get("/api/cart")
                        .header("Authorization", "Bearer " + buyerJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalItemsCount").value(0));

        // Admin invalid state transition PAID -> DELIVERED rejected
        mockMvc.perform(put("/api/admin/orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DELIVERED\",\"remarks\":\"Skip\"}"))
                .andExpect(status().isBadRequest());

        // Admin Dashboard and Admin Orders (including product search) expose full ordered product details
        String orderedTitle = product.get("title").asText();
        mockMvc.perform(get("/api/admin/dashboard")
                        .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recentOrders[?(@.id == " + orderId + ")].items[0].productTitle").value(orderedTitle))
                .andExpect(jsonPath("$.data.recentOrders[?(@.id == " + orderId + ")].items[0].size").value("M"))
                .andExpect(jsonPath("$.data.recentOrders[?(@.id == " + orderId + ")].items[0].color").value("Onyx Black"))
                .andExpect(jsonPath("$.data.recentOrders[?(@.id == " + orderId + ")].items[0].quantity").value(1));

        mockMvc.perform(get("/api/admin/orders")
                        .param("search", orderedTitle)
                        .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].id").value(orderId))
                .andExpect(jsonPath("$.data.content[0].items[0].productTitle").value(orderedTitle))
                .andExpect(jsonPath("$.data.content[0].items[0].sku").isNotEmpty());

        // Valid admin lifecycle transitions: PAID -> PACKED -> SHIPPED -> DELIVERED
        for (String nextStatus : List.of("PACKED", "SHIPPED", "DELIVERED")) {
            mockMvc.perform(put("/api/admin/orders/" + orderId + "/status")
                            .header("Authorization", "Bearer " + adminJwt)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "status", nextStatus,
                                    "remarks", "Moved to " + nextStatus
                            ))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value(nextStatus));
        }

        // Negative: delivered order cannot be cancelled
        mockMvc.perform(put("/api/orders/" + orderId + "/cancel")
                        .header("Authorization", "Bearer " + buyerJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Late cancel\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Concurrent checkout on single remaining unit prevents overselling via pessimistic lock")
    void testConcurrentCheckoutPreventsOverselling() throws Exception {
        String adminJwt = loginUser("admin@vognix.com", "Admin@123");
        JsonNode product = createTestProduct(adminJwt, "Limited Drop Coat " + UUID.randomUUID(), 4500.00, 1);
        Long variantId = product.get("variants").get(0).get("id").asLong();

        String buyer1Jwt = registerCustomer("race1." + UUID.randomUUID() + "@example.com", "Buyer", "One").get("token").asText();
        String buyer2Jwt = registerCustomer("race2." + UUID.randomUUID() + "@example.com", "Buyer", "Two").get("token").asText();
        Long addr1 = addDefaultAddress(buyer1Jwt);
        Long addr2 = addDefaultAddress(buyer2Jwt);

        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + buyer1Jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("variantId", variantId, "quantity", 1))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + buyer2Jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("variantId", variantId, "quantity", 1))))
                .andExpect(status().isOk());

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch startGate = new CountDownLatch(1);

        Future<Integer> future1 = pool.submit(() -> {
            startGate.await(5, TimeUnit.SECONDS);
            return mockMvc.perform(post("/api/orders")
                            .header("Authorization", "Bearer " + buyer1Jwt)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of("addressId", addr1, "paymentMethod", "COD"))))
                    .andReturn().getResponse().getStatus();
        });

        Future<Integer> future2 = pool.submit(() -> {
            startGate.await(5, TimeUnit.SECONDS);
            return mockMvc.perform(post("/api/orders")
                            .header("Authorization", "Bearer " + buyer2Jwt)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of("addressId", addr2, "paymentMethod", "COD"))))
                    .andReturn().getResponse().getStatus();
        });

        startGate.countDown();
        int status1 = future1.get(15, TimeUnit.SECONDS);
        int status2 = future2.get(15, TimeUnit.SECONDS);
        pool.shutdown();

        List<Integer> statuses = List.of(status1, status2);
        assertEquals(1, statuses.stream().filter(s -> s == 201).count(), "Exactly one concurrent buyer should succeed: " + statuses);
        assertEquals(1, statuses.stream().filter(s -> s == 409).count(), "Exactly one concurrent buyer should get 409 conflict: " + statuses);

        Inventory finalInv = inventoryRepository.findByVariantId(variantId).orElseThrow();
        assertEquals(0, finalInv.getStockQuantity());
        assertEquals(0, finalInv.getReservedQuantity());
    }

    @Test
    @DisplayName("Admin CRUD (Brand, Category, Product Edit), Sales Reports, Audit Logs, and OpenAPI Docs")
    void testAdminCrudReportsAuditLogsAndOpenApi() throws Exception {
        String adminJwt = loginUser("admin@vognix.com", "Admin@123");

        // Brand Create + Update
        String brandName = "Atelier-" + UUID.randomUUID().toString().substring(0, 6);
        MvcResult brandRes = mockMvc.perform(post("/api/admin/brands")
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", brandName,
                                "description", "Boutique partner brand",
                                "isActive", true
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        Long brandId = objectMapper.readTree(brandRes.getResponse().getContentAsString()).path("data").path("id").asLong();

        mockMvc.perform(put("/api/admin/brands/" + brandId)
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", brandName + " Studio",
                                "description", "Updated boutique brand",
                                "isActive", true
                        ))))
                .andExpect(status().isOk());

        // Category Create + Update + Deactivate
        String catName = "Resort-" + UUID.randomUUID().toString().substring(0, 6);
        MvcResult catRes = mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", catName,
                                "description", "Summer resort edit",
                                "isActive", true
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        Long categoryId = objectMapper.readTree(catRes.getResponse().getContentAsString()).path("data").path("id").asLong();

        mockMvc.perform(put("/api/admin/categories/" + categoryId)
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", catName + " Capsule",
                                "description", "Updated capsule",
                                "isActive", true
                        ))))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/admin/categories/" + categoryId)
                        .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk());

        // Product Create + Update + Admin Search
        JsonNode created = createTestProduct(adminJwt, "Editable Trench " + UUID.randomUUID(), 5000.00, 10);
        Long prodId = created.get("id").asLong();

        mockMvc.perform(put("/api/admin/products/" + prodId)
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Updated Trench Coat",
                                "description", "Updated trench specification with storm flap.",
                                "brandId", brandId,
                                "categoryId", 1,
                                "gender", "WOMEN",
                                "basePrice", 5499.00,
                                "discountPercent", 10,
                                "isActive", true,
                                "variants", List.of(
                                        Map.of("size", "M", "color", "Onyx Black", "colorCode", "#111111", "stockQuantity", 15),
                                        Map.of("size", "L", "color", "Camel", "colorCode", "#C19A6B", "stockQuantity", 8)
                                )
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Updated Trench Coat"))
                .andExpect(jsonPath("$.data.variants.length()").value(2));

        mockMvc.perform(get("/api/admin/products")
                        .param("search", "Updated Trench")
                        .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].title").value("Updated Trench Coat"));

        // Reports, Customers, Audit Logs & Swagger API Docs
        mockMvc.perform(get("/api/admin/reports")
                        .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalProducts").isNumber())
                .andExpect(jsonPath("$.data.ordersByStatus").isArray());

        mockMvc.perform(get("/api/admin/customers")
                        .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray());

        mockMvc.perform(get("/api/admin/audit-logs")
                        .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray());

        mockMvc.perform(get("/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openapi").exists());
    }

    @Test
    @DisplayName("Case-insensitive login, stateless password reset token verification, change-password, and admin role management")
    void testDualSideAccountManagementAndPasswordLifecycle() throws Exception {
        String adminJwt = loginUser("admin@vognix.com", "Admin@123");

        // 1. Admin creates a brand-new Customer account & promotes/creates a second Admin account
        String createdCustomerEmail = "new.buyer." + UUID.randomUUID() + "@example.com";
        MvcResult createCustRes = mockMvc.perform(post("/api/admin/customers")
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "firstName", "Pavan",
                                "lastName", "Kalyan",
                                "email", "  " + createdCustomerEmail.toUpperCase() + " ",
                                "password", "Initial@123",
                                "phone", "+91 9876543211",
                                "roles", List.of("ROLE_CUSTOMER")
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.email").value(createdCustomerEmail))
                .andExpect(jsonPath("$.data.roles[0]").value("ROLE_CUSTOMER"))
                .andReturn();
        Long createdCustomerId = objectMapper.readTree(createCustRes.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Newly created customer can log in with mixed case + whitespace and has Cart initialized
        String mixedCaseJwt = loginUser(" " + createdCustomerEmail.toUpperCase() + " ", "Initial@123");
        mockMvc.perform(get("/api/cart").header("Authorization", "Bearer " + mixedCaseJwt))
                .andExpect(status().isOk());

        // Customer changes their own password via /api/users/change-password (wrong current password rejected)
        mockMvc.perform(put("/api/users/change-password")
                        .header("Authorization", "Bearer " + mixedCaseJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "currentPassword", "WrongPass!",
                                "newPassword", "Updated@123"
                        ))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/users/change-password")
                        .header("Authorization", "Bearer " + mixedCaseJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "currentPassword", "Initial@123",
                                "newPassword", "Updated@123"
                        ))))
                .andExpect(status().isOk());

        // Old password fails, new password succeeds
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", createdCustomerEmail,
                                "password", "Initial@123"
                        ))))
                .andExpect(status().isUnauthorized());
        String afterChangeJwt = loginUser(createdCustomerEmail, "Updated@123");

        // 2. Forgot-password token generation & single-use cryptographic validation
        MvcResult forgotRes = mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", createdCustomerEmail.toUpperCase()))))
                .andExpect(status().isOk())
                .andReturn();
        String hint = objectMapper.readTree(forgotRes.getResponse().getContentAsString()).path("data").asText();
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("VOGNIX-[A-Z0-9]+").matcher(hint);
        assertTrue(matcher.find(), "Expected VOGNIX-* verification token in response: " + hint);
        String validToken = matcher.group();

        // Reject bogus token
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", createdCustomerEmail,
                                "token", "VOGNIX-000000000000000000000000",
                                "newPassword", "Hacked@123"
                        ))))
                .andExpect(status().isBadRequest());

        // Valid token resets password once
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", createdCustomerEmail,
                                "token", validToken,
                                "newPassword", "ResetPass@123"
                        ))))
                .andExpect(status().isOk());

        // Single-use check: reusing the same token fails after password changed
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", createdCustomerEmail,
                                "token", validToken,
                                "newPassword", "AnotherPass@123"
                        ))))
                .andExpect(status().isBadRequest());

        loginUser(createdCustomerEmail, "ResetPass@123");

        // 3. Admin promotes user to ROLE_ADMIN -> gains admin dashboard access -> demotes back to ROLE_CUSTOMER
        mockMvc.perform(put("/api/admin/customers/" + createdCustomerId + "/roles")
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("roles", List.of("ROLE_ADMIN", "ROLE_CUSTOMER")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roles").isArray());

        String promotedJwt = loginUser(createdCustomerEmail, "ResetPass@123");
        mockMvc.perform(get("/api/admin/dashboard")
                        .header("Authorization", "Bearer " + promotedJwt))
                .andExpect(status().isOk());

        // Promoted admin cannot remove their own ROLE_ADMIN
        mockMvc.perform(put("/api/admin/customers/" + createdCustomerId + "/roles")
                        .header("Authorization", "Bearer " + promotedJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("roles", List.of("ROLE_CUSTOMER")))))
                .andExpect(status().isBadRequest());

        // Primary admin can demote back to ROLE_CUSTOMER and reset their password
        mockMvc.perform(put("/api/admin/customers/" + createdCustomerId + "/roles")
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("roles", List.of("ROLE_CUSTOMER")))))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/admin/customers/" + createdCustomerId + "/password")
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("newPassword", "AdminReset@999"))))
                .andExpect(status().isOk());

        String demotedJwt = loginUser(createdCustomerEmail, "AdminReset@999");
        mockMvc.perform(get("/api/admin/dashboard")
                        .header("Authorization", "Bearer " + demotedJwt))
                .andExpect(status().isForbidden());
        assertNotNull(afterChangeJwt);
    }
}
