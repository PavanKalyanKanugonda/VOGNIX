package com.vognix.repository;

import com.vognix.entity.IdempotencyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface IdempotencyRecordRepository extends JpaRepository<IdempotencyRecord, Long> {
    Optional<IdempotencyRecord> findByIdempotencyKeyAndExpiresAtAfter(String idempotencyKey, LocalDateTime now);
    Optional<IdempotencyRecord> findByIdempotencyKey(String idempotencyKey);
}
