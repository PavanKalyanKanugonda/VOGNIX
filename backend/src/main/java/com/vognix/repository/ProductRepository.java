package com.vognix.repository;

import com.vognix.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    Optional<Product> findBySlug(String slug);
    List<Product> findByIsFeaturedTrueAndIsActiveTrue();
    Page<Product> findByIsActiveTrue(Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.isActive = true AND " +
           "(LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(p.brand.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Product> searchProducts(String query, Pageable pageable);

    Page<Product> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT p FROM Product p WHERE " +
           "(COALESCE(:search, '') = '' OR " +
           " LOWER(p.title) LIKE LOWER(CONCAT('%', COALESCE(:search, ''), '%')) OR " +
           " LOWER(p.brand.name) LIKE LOWER(CONCAT('%', COALESCE(:search, ''), '%')) OR " +
           " LOWER(p.category.name) LIKE LOWER(CONCAT('%', COALESCE(:search, ''), '%'))) " +
           "ORDER BY p.createdAt DESC")
    Page<Product> findAllForAdmin(@Param("search") String search, Pageable pageable);

    long count();
}
