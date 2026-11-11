package com.vognix.repository;

import com.vognix.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByTransactionId(String transactionId);
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    Optional<Payment> findByRazorpayPaymentId(String razorpayPaymentId);
    List<Payment> findByOrderIdOrderByCreatedAtDesc(Long orderId);
    Optional<Payment> findByIdempotencyKey(String idempotencyKey);
    List<Payment> findByOrder_User_IdOrderByCreatedAtDesc(Long userId);
    Optional<Payment> findFirstByOrderIdAndPaymentStatusOrderByCreatedAtDesc(Long orderId, String paymentStatus);

    @Query("SELECT p.paymentMethod, p.paymentStatus, COUNT(p), COALESCE(SUM(p.amount), 0) " +
           "FROM Payment p GROUP BY p.paymentMethod, p.paymentStatus")
    List<Object[]> summarizeByMethodAndStatus();
}
