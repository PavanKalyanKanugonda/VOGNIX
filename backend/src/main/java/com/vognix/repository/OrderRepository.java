package com.vognix.repository;

import com.vognix.entity.Order;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByOrderNumber(String orderNumber);
    Optional<Order> findByIdAndUserId(Long id, Long userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id")
    Optional<Order> findByIdWithLock(Long id);
    Page<Order> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    Page<Order> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT o FROM Order o " +
           "WHERE LOWER(o.orderNumber) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "   OR LOWER(o.user.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "   OR LOWER(o.user.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "   OR LOWER(o.user.email) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "   OR EXISTS (SELECT 1 FROM OrderItem oi WHERE oi.order = o AND (" +
           "       LOWER(oi.productTitle) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "       OR LOWER(oi.brandName) LIKE LOWER(CONCAT('%', :search, '%')))) " +
           "ORDER BY o.createdAt DESC")
    Page<Order> searchOrdersForAdmin(@Param("search") String search, Pageable pageable);

    @Query("SELECT o FROM Order o " +
           "WHERE o.status = :status " +
           "AND (LOWER(o.orderNumber) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "  OR LOWER(o.user.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "  OR LOWER(o.user.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "  OR LOWER(o.user.email) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "  OR EXISTS (SELECT 1 FROM OrderItem oi WHERE oi.order = o AND (" +
           "      LOWER(oi.productTitle) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "      OR LOWER(oi.brandName) LIKE LOWER(CONCAT('%', :search, '%'))))) " +
           "ORDER BY o.createdAt DESC")
    Page<Order> searchOrdersByStatusForAdmin(@Param("status") String status, @Param("search") String search, Pageable pageable);

    long count();
    long countByStatus(String status);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED', 'PENDING_PAYMENT')")
    BigDecimal sumSuccessfulRevenue();

    @Query("SELECT o.status, COUNT(o), COALESCE(SUM(o.totalAmount), 0) FROM Order o GROUP BY o.status")
    List<Object[]> summarizeOrdersByStatus();

    @Query("SELECT o.user.id, COUNT(o), COALESCE(SUM(CASE WHEN o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED', 'PENDING_PAYMENT') THEN o.totalAmount ELSE 0 END), 0) FROM Order o GROUP BY o.user.id")
    List<Object[]> summarizeOrdersByCustomer();
}
