package com.vognix.service;

import com.vognix.dto.PagedResponse;
import com.vognix.dto.ProductDTOs;
import com.vognix.entity.*;
import com.vognix.exception.BadRequestException;
import com.vognix.exception.ResourceNotFoundException;
import com.vognix.repository.*;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;

    public ProductService(ProductRepository productRepository,
                          CategoryRepository categoryRepository,
                          BrandRepository brandRepository,
                          ReviewRepository reviewRepository,
                          UserRepository userRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.brandRepository = brandRepository;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public PagedResponse<ProductDTOs.ProductSummaryDTO> getProducts(
            String search,
            String categorySlug,
            String brandSlug,
            String gender,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            List<String> sizes,
            List<String> colors,
            String sortBy,
            int page,
            int size) {

        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        if ("price_asc".equalsIgnoreCase(sortBy)) {
            sort = Sort.by(Sort.Direction.ASC, "basePrice");
        } else if ("price_desc".equalsIgnoreCase(sortBy)) {
            sort = Sort.by(Sort.Direction.DESC, "basePrice");
        } else if ("rating".equalsIgnoreCase(sortBy)) {
            sort = Sort.by(Sort.Direction.DESC, "rating");
        } else if ("popularity".equalsIgnoreCase(sortBy)) {
            sort = Sort.by(Sort.Direction.DESC, "reviewCount");
        } else if ("newest".equalsIgnoreCase(sortBy)) {
            sort = Sort.by(Sort.Direction.DESC, "createdAt");
        }

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("isActive")));

            if (StringUtils.hasText(search)) {
                String searchPattern = "%" + search.toLowerCase().trim() + "%";
                Predicate titlePred = cb.like(cb.lower(root.get("title")), searchPattern);
                Predicate descPred = cb.like(cb.lower(root.get("description")), searchPattern);
                Predicate brandPred = cb.like(cb.lower(root.get("brand").get("name")), searchPattern);
                predicates.add(cb.or(titlePred, descPred, brandPred));
            }

            if (StringUtils.hasText(categorySlug)) {
                predicates.add(cb.equal(root.get("category").get("slug"), categorySlug.trim()));
            }

            if (StringUtils.hasText(brandSlug)) {
                predicates.add(cb.equal(root.get("brand").get("slug"), brandSlug.trim()));
            }

            if (StringUtils.hasText(gender) && !"ALL".equalsIgnoreCase(gender)) {
                predicates.add(cb.or(
                        cb.equal(root.get("gender"), gender.toUpperCase().trim()),
                        cb.equal(root.get("gender"), "UNISEX")
                ));
            }

            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("basePrice"), minPrice));
            }

            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("basePrice"), maxPrice));
            }

            if (sizes != null && !sizes.isEmpty()) {
                Join<Product, ProductVariant> variantJoin = root.join("variants", JoinType.INNER);
                predicates.add(variantJoin.get("size").in(sizes));
                query.distinct(true);
            }

            if (colors != null && !colors.isEmpty()) {
                Join<Product, ProductVariant> variantJoin = root.join("variants", JoinType.INNER);
                predicates.add(variantJoin.get("color").in(colors));
                query.distinct(true);
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Product> productPage = productRepository.findAll(spec, pageable);
        List<ProductDTOs.ProductSummaryDTO> content = productPage.getContent().stream()
                .map(this::mapToSummaryDTO)
                .collect(Collectors.toList());

        return new PagedResponse<>(content, productPage.getNumber(), productPage.getSize(),
                productPage.getTotalElements(), productPage.getTotalPages(), productPage.isLast());
    }

    @Transactional(readOnly = true)
    public List<ProductDTOs.ProductSummaryDTO> getFeaturedProducts() {
        return productRepository.findByIsFeaturedTrueAndIsActiveTrue().stream()
                .map(this::mapToSummaryDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductDTOs.ProductDetailDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
        return mapToDetailDTO(product);
    }

    @Transactional(readOnly = true)
    public ProductDTOs.ProductDetailDTO getProductBySlug(String slug) {
        Product product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with slug: " + slug));
        return mapToDetailDTO(product);
    }

    @Transactional(readOnly = true)
    public List<Category> getCategories() {
        return categoryRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public List<Brand> getBrands() {
        return brandRepository.findByIsActiveTrue();
    }

    @Transactional
    public ProductDTOs.ReviewResponse addReview(Long userId, Long productId, ProductDTOs.ReviewRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        if (reviewRepository.existsByProductIdAndUserId(productId, userId)) {
            throw new BadRequestException("You have already reviewed this product");
        }

        List<Review> priorReviews = reviewRepository.findByProductId(productId);
        int priorDisplayedCount = product.getReviewCount() != null ? product.getReviewCount() : 0;
        int baselineCount = Math.max(0, priorDisplayedCount - priorReviews.size());
        double priorTotalSum = (product.getRating() != null ? product.getRating().doubleValue() : 0.0) * priorDisplayedCount;
        double priorWrittenSum = priorReviews.stream().mapToInt(Review::getRating).sum();
        double baselineSum = Math.max(baselineCount * 1.0, Math.min(baselineCount * 5.0, priorTotalSum - priorWrittenSum));

        Review review = new Review();
        review.setUser(user);
        review.setProduct(product);
        review.setRating(request.getRating());
        review.setTitle(request.getTitle() != null ? request.getTitle().trim() : null);
        review.setComment(request.getComment() != null ? request.getComment().trim() : null);
        review.setIsVerifiedBuyer(true);
        review = reviewRepository.save(review);

        // Update product overall rating and review count while preserving baseline seeded ratings
        int newTotalCount = baselineCount + priorReviews.size() + 1;
        double newTotalSum = baselineSum + priorWrittenSum + review.getRating();
        product.setRating(BigDecimal.valueOf(newTotalSum / newTotalCount).setScale(2, RoundingMode.HALF_UP));
        product.setReviewCount(newTotalCount);
        productRepository.save(product);

        return mapReviewToDTO(review);
    }

    public ProductDTOs.ProductSummaryDTO mapToSummaryDTO(Product p) {
        ProductDTOs.ProductSummaryDTO dto = new ProductDTOs.ProductSummaryDTO();
        dto.setId(p.getId());
        dto.setTitle(p.getTitle());
        dto.setSlug(p.getSlug());
        dto.setBrandName(p.getBrand().getName());
        dto.setBrandId(p.getBrand().getId());
        dto.setBrandSlug(p.getBrand().getSlug());
        dto.setCategoryName(p.getCategory().getName());
        dto.setCategoryId(p.getCategory().getId());
        dto.setCategorySlug(p.getCategory().getSlug());
        dto.setGender(p.getGender());
        dto.setBasePrice(p.getBasePrice());
        dto.setDiscountPercent(p.getDiscountPercent());
        dto.setDiscountedPrice(p.getDiscountedPrice());
        dto.setRating(p.getRating());
        dto.setReviewCount(p.getReviewCount());
        dto.setIsActive(p.getIsActive());
        dto.setIsFeatured(p.getIsFeatured());

        if (p.getImages() != null && !p.getImages().isEmpty()) {
            dto.setPrimaryImageUrl(p.getImages().get(0).getImageUrl());
        }

        if (p.getVariants() != null) {
            dto.setAvailableSizes(p.getVariants().stream()
                    .map(ProductVariant::getSize)
                    .distinct()
                    .collect(Collectors.toList()));
            dto.setAvailableColors(p.getVariants().stream()
                    .map(ProductVariant::getColor)
                    .distinct()
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    public ProductDTOs.ProductDetailDTO mapToDetailDTO(Product p) {
        ProductDTOs.ProductDetailDTO dto = new ProductDTOs.ProductDetailDTO();
        dto.setId(p.getId());
        dto.setTitle(p.getTitle());
        dto.setSlug(p.getSlug());
        dto.setDescription(p.getDescription());
        dto.setBrandName(p.getBrand().getName());
        dto.setBrandId(p.getBrand().getId());
        dto.setBrandSlug(p.getBrand().getSlug());
        dto.setCategoryName(p.getCategory().getName());
        dto.setCategoryId(p.getCategory().getId());
        dto.setCategorySlug(p.getCategory().getSlug());
        dto.setGender(p.getGender());
        dto.setBasePrice(p.getBasePrice());
        dto.setDiscountPercent(p.getDiscountPercent());
        dto.setDiscountedPrice(p.getDiscountedPrice());
        dto.setRating(p.getRating());
        dto.setReviewCount(p.getReviewCount());
        dto.setIsActive(p.getIsActive());
        dto.setIsFeatured(p.getIsFeatured());

        if (p.getImages() != null) {
            dto.setImages(p.getImages().stream()
                    .map(img -> new ProductDTOs.ProductImageDTO(img.getId(), img.getImageUrl(), img.getDisplayOrder(), img.getIsPrimary()))
                    .collect(Collectors.toList()));
        }

        if (p.getVariants() != null) {
            dto.setVariants(p.getVariants().stream()
                    .map(v -> {
                        ProductDTOs.ProductVariantDTO varDto = new ProductDTOs.ProductVariantDTO();
                        varDto.setId(v.getId());
                        varDto.setSku(v.getSku());
                        varDto.setSize(v.getSize());
                        varDto.setColor(v.getColor());
                        varDto.setColorCode(v.getColorCode());
                        varDto.setPriceOverride(v.getPriceOverride());
                        int stock = (v.getInventory() != null) ? v.getInventory().getAvailableQuantity() : 0;
                        varDto.setStockQuantity(stock);
                        varDto.setInStock(stock > 0);
                        return varDto;
                    })
                    .collect(Collectors.toList()));
        }

        List<Review> reviews = reviewRepository.findByProductId(p.getId());
        dto.setRecentReviews(reviews.stream()
                .sorted(Comparator.comparing(Review::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(this::mapReviewToDTO)
                .collect(Collectors.toList()));

        return dto;
    }

    private ProductDTOs.ReviewResponse mapReviewToDTO(Review r) {
        ProductDTOs.ReviewResponse dto = new ProductDTOs.ReviewResponse();
        dto.setId(r.getId());
        String firstName = r.getUser().getFirstName() != null ? r.getUser().getFirstName().trim() : "VOGNIX";
        String lastName = r.getUser().getLastName() != null ? r.getUser().getLastName().trim() : "";
        String lastInitial = !lastName.isEmpty() ? " " + lastName.substring(0, 1) + "." : "";
        dto.setUserName(firstName + lastInitial);
        dto.setRating(r.getRating());
        dto.setTitle(r.getTitle());
        dto.setComment(r.getComment());
        dto.setIsVerifiedBuyer(r.getIsVerifiedBuyer());
        dto.setCreatedAt(r.getCreatedAt());
        return dto;
    }
}
