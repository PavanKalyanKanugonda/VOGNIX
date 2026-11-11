package com.vognix.controller;

import com.vognix.dto.ApiResponse;
import com.vognix.dto.PagedResponse;
import com.vognix.dto.ProductDTOs;
import com.vognix.entity.Brand;
import com.vognix.entity.Category;
import com.vognix.security.UserPrincipal;
import com.vognix.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api")
@Tag(name = "Product Catalogue", description = "Product discovery, filtering, search, and reviews")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping("/products")
    @Operation(summary = "Search and filter products catalog")
    public ResponseEntity<ApiResponse<PagedResponse<ProductDTOs.ProductSummaryDTO>>> getProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) List<String> sizes,
            @RequestParam(required = false) List<String> colors,
            @RequestParam(required = false, defaultValue = "newest") String sortBy,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "12") int size) {

        PagedResponse<ProductDTOs.ProductSummaryDTO> result = productService.getProducts(
                search, category, brand, gender, minPrice, maxPrice, sizes, colors, sortBy, page, size);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/products/featured")
    @Operation(summary = "Get featured and trending products for homepage")
    public ResponseEntity<ApiResponse<List<ProductDTOs.ProductSummaryDTO>>> getFeaturedProducts() {
        List<ProductDTOs.ProductSummaryDTO> featured = productService.getFeaturedProducts();
        return ResponseEntity.ok(ApiResponse.success(featured));
    }

    @GetMapping("/products/{id}")
    @Operation(summary = "Get detailed product specifications by ID")
    public ResponseEntity<ApiResponse<ProductDTOs.ProductDetailDTO>> getProductById(@PathVariable Long id) {
        ProductDTOs.ProductDetailDTO product = productService.getProductById(id);
        return ResponseEntity.ok(ApiResponse.success(product));
    }

    @GetMapping("/products/slug/{slug}")
    @Operation(summary = "Get product by unique URL slug")
    public ResponseEntity<ApiResponse<ProductDTOs.ProductDetailDTO>> getProductBySlug(@PathVariable String slug) {
        ProductDTOs.ProductDetailDTO product = productService.getProductBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success(product));
    }

    @GetMapping("/categories")
    @Operation(summary = "Get all active categories")
    public ResponseEntity<ApiResponse<List<Category>>> getCategories() {
        List<Category> categories = productService.getCategories();
        return ResponseEntity.ok(ApiResponse.success(categories));
    }

    @GetMapping("/brands")
    @Operation(summary = "Get all active brands")
    public ResponseEntity<ApiResponse<List<Brand>>> getBrands() {
        List<Brand> brands = productService.getBrands();
        return ResponseEntity.ok(ApiResponse.success(brands));
    }

    @PostMapping("/products/{id}/reviews")
    @Operation(summary = "Submit product rating and review")
    public ResponseEntity<ApiResponse<ProductDTOs.ReviewResponse>> addReview(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable Long id,
            @Valid @RequestBody ProductDTOs.ReviewRequest request) {
        ProductDTOs.ReviewResponse review = productService.addReview(currentUser.getId(), id, request);
        return new ResponseEntity<>(ApiResponse.success("Review submitted successfully", review), HttpStatus.CREATED);
    }
}
