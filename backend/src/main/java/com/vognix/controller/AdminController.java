package com.vognix.controller;

import com.vognix.dto.AdminDTOs;
import com.vognix.dto.ApiResponse;
import com.vognix.dto.OrderDTOs;
import com.vognix.dto.PagedResponse;
import com.vognix.dto.ProductDTOs;
import com.vognix.entity.Brand;
import com.vognix.entity.Category;
import com.vognix.security.UserPrincipal;
import com.vognix.service.AdminService;
import com.vognix.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@Tag(name = "Admin Management", description = "Admin dashboard metrics, catalog CRUD, order lifecycle management, and audit logs")
public class AdminController {

    private final AdminService adminService;
    private final AuditLogService auditLogService;

    public AdminController(AdminService adminService, AuditLogService auditLogService) {
        this.adminService = adminService;
        this.auditLogService = auditLogService;
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Get administrator dashboard metrics and statistics")
    public ResponseEntity<ApiResponse<AdminDTOs.DashboardStatsDTO>> getDashboardStats() {
        AdminDTOs.DashboardStatsDTO stats = adminService.getDashboardStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/products")
    @Operation(summary = "List all products (active and inactive) for admin management")
    public ResponseEntity<ApiResponse<PagedResponse<ProductDTOs.ProductSummaryDTO>>> getAdminProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(adminService.getAdminProducts(search, page, size)));
    }

    @PostMapping("/products")
    @Operation(summary = "Create new product in catalog with variants and inventory")
    public ResponseEntity<ApiResponse<ProductDTOs.ProductDetailDTO>> createProduct(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody ProductDTOs.ProductCreateRequest request) {
        ProductDTOs.ProductDetailDTO product = adminService.createProduct(currentUser.getId(), currentUser.getEmail(), request);
        return new ResponseEntity<>(ApiResponse.success("Product created successfully", product), HttpStatus.CREATED);
    }

    @PutMapping("/products/{id}")
    @Operation(summary = "Update product details")
    public ResponseEntity<ApiResponse<ProductDTOs.ProductDetailDTO>> updateProduct(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody ProductDTOs.ProductCreateRequest request) {
        ProductDTOs.ProductDetailDTO product = adminService.updateProduct(currentUser.getId(), currentUser.getEmail(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Product updated successfully", product));
    }

    @DeleteMapping("/products/{id}")
    @Operation(summary = "Deactivate product from catalog")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id) {
        adminService.deleteProduct(currentUser.getId(), currentUser.getEmail(), id);
        return ResponseEntity.ok(ApiResponse.success("Product deactivated", null));
    }

    @PutMapping("/inventory/{variantId}")
    @Operation(summary = "Update variant inventory stock quantity")
    public ResponseEntity<ApiResponse<Void>> updateStock(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long variantId,
            @Valid @RequestBody AdminDTOs.UpdateStockRequest request) {
        adminService.updateVariantStock(currentUser.getId(), currentUser.getEmail(), variantId, request.getStockQuantity());
        return ResponseEntity.ok(ApiResponse.success("Inventory stock updated", null));
    }

    @GetMapping("/orders")
    @Operation(summary = "Get all customer orders with optional status and search filter")
    public ResponseEntity<ApiResponse<PagedResponse<OrderDTOs.OrderResponse>>> getAllOrders(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "10") int size) {
        PagedResponse<OrderDTOs.OrderResponse> response = adminService.getAllOrders(status, search, page, size);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/orders/{id}/status")
    @Operation(summary = "Update order lifecycle status (PLACED -> PAID -> PACKED -> SHIPPED -> DELIVERED, CANCELLED)")
    public ResponseEntity<ApiResponse<OrderDTOs.OrderResponse>> updateOrderStatus(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody OrderDTOs.OrderStatusUpdateRequest request) {
        OrderDTOs.OrderResponse response = adminService.updateOrderStatus(currentUser.getId(), currentUser.getEmail(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Order status updated", response));
    }

    @PutMapping("/payments/{paymentId}/cod-collected")
    @Operation(summary = "Mark a cash-on-delivery payment as collected")
    public ResponseEntity<ApiResponse<Void>> markCodPaymentCollected(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long paymentId) {
        adminService.markCodPaymentCollected(currentUser.getId(), currentUser.getEmail(), paymentId);
        return ResponseEntity.ok(ApiResponse.success("COD payment marked as collected", null));
    }

    @GetMapping("/coupons")
    @Operation(summary = "Get all promotional coupons")
    public ResponseEntity<ApiResponse<List<AdminDTOs.CouponResponse>>> getCoupons() {
        List<AdminDTOs.CouponResponse> coupons = adminService.getCoupons();
        return ResponseEntity.ok(ApiResponse.success(coupons));
    }

    @PostMapping("/coupons")
    @Operation(summary = "Create new discount coupon")
    public ResponseEntity<ApiResponse<AdminDTOs.CouponResponse>> createCoupon(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody AdminDTOs.CouponRequest request) {
        AdminDTOs.CouponResponse coupon = adminService.createCoupon(currentUser.getId(), currentUser.getEmail(), request);
        return new ResponseEntity<>(ApiResponse.success("Coupon created successfully", coupon), HttpStatus.CREATED);
    }

    @GetMapping("/audit-logs")
    @Operation(summary = "Get administrative audit trails with pagination")
    public ResponseEntity<ApiResponse<PagedResponse<AdminDTOs.AuditLogDTO>>> getAuditLogs(
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size) {
        PagedResponse<AdminDTOs.AuditLogDTO> response = auditLogService.getAuditLogs(PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/categories")
    @Operation(summary = "Get all categories (active and inactive)")
    public ResponseEntity<ApiResponse<List<Category>>> getAllCategories() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getAllCategories()));
    }

    @PostMapping("/categories")
    @Operation(summary = "Create a new category")
    public ResponseEntity<ApiResponse<Category>> createCategory(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody AdminDTOs.CategoryRequest request) {
        Category created = adminService.createCategory(currentUser.getId(), currentUser.getEmail(), request);
        return new ResponseEntity<>(ApiResponse.success("Category created successfully", created), HttpStatus.CREATED);
    }

    @PutMapping("/categories/{id}")
    @Operation(summary = "Update an existing category")
    public ResponseEntity<ApiResponse<Category>> updateCategory(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody AdminDTOs.CategoryRequest request) {
        Category updated = adminService.updateCategory(currentUser.getId(), currentUser.getEmail(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Category updated successfully", updated));
    }

    @DeleteMapping("/categories/{id}")
    @Operation(summary = "Deactivate a category")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id) {
        adminService.deleteCategory(currentUser.getId(), currentUser.getEmail(), id);
        return ResponseEntity.ok(ApiResponse.success("Category deactivated", null));
    }

    @GetMapping("/brands")
    @Operation(summary = "Get all brands")
    public ResponseEntity<ApiResponse<List<Brand>>> getAllBrands() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getAllBrands()));
    }

    @PostMapping("/brands")
    @Operation(summary = "Create a new brand")
    public ResponseEntity<ApiResponse<Brand>> createBrand(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody AdminDTOs.BrandRequest request) {
        Brand created = adminService.createBrand(currentUser.getId(), currentUser.getEmail(), request);
        return new ResponseEntity<>(ApiResponse.success("Brand created successfully", created), HttpStatus.CREATED);
    }

    @PutMapping("/brands/{id}")
    @Operation(summary = "Update an existing brand")
    public ResponseEntity<ApiResponse<Brand>> updateBrand(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody AdminDTOs.BrandRequest request) {
        Brand updated = adminService.updateBrand(currentUser.getId(), currentUser.getEmail(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Brand updated successfully", updated));
    }

    @GetMapping("/customers")
    @Operation(summary = "Get registered customers with order summary metrics")
    public ResponseEntity<ApiResponse<PagedResponse<AdminDTOs.CustomerSummaryDTO>>> getCustomers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "15") int size) {
        return ResponseEntity.ok(ApiResponse.success(adminService.getCustomers(search, page, size)));
    }

    @PutMapping("/customers/{id}/status")
    @Operation(summary = "Activate or deactivate a user account")
    public ResponseEntity<ApiResponse<AdminDTOs.CustomerSummaryDTO>> updateCustomerStatus(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody AdminDTOs.CustomerStatusRequest request) {
        AdminDTOs.CustomerSummaryDTO updated = adminService.updateCustomerStatus(
                currentUser.getId(), currentUser.getEmail(), id, Boolean.TRUE.equals(request.getIsActive()));
        return ResponseEntity.ok(ApiResponse.success("Account status updated", updated));
    }

    @GetMapping("/reports")
    @Operation(summary = "Get comprehensive sales, order status, payment method, and top product reports")
    public ResponseEntity<ApiResponse<AdminDTOs.SalesReportDTO>> getSalesReport() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getSalesReport()));
    }
}
