package com.vognix.repository;

import com.vognix.entity.OrderItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    List<OrderItem> findByOrderId(Long orderId);

    @Query("SELECT oi.productTitle, oi.brandName, SUM(oi.quantity), SUM(oi.totalPrice) " +
           "FROM OrderItem oi WHERE oi.order.status NOT IN ('CANCELLED', 'PAYMENT_FAILED', 'PENDING_PAYMENT') " +
           "GROUP BY oi.productTitle, oi.brandName ORDER BY SUM(oi.totalPrice) DESC")
    List<Object[]> findTopSellingProducts(Pageable pageable);
}
