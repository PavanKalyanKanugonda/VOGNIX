package com.vognix.service;

import com.vognix.dto.AdminDTOs;
import com.vognix.dto.PagedResponse;
import com.vognix.entity.AuditLog;
import com.vognix.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAction(Long userId, String userEmail, String actionType, String entityName, String entityId, String details, String ipAddress) {
        try {
            AuditLog log = new AuditLog(userId, userEmail, actionType, entityName, entityId, details, ipAddress);
            auditLogRepository.save(log);
        } catch (Exception e) {
            // Log failure without breaking main transaction
        }
    }

    @Transactional(readOnly = true)
    public PagedResponse<AdminDTOs.AuditLogDTO> getAuditLogs(Pageable pageable) {
        Page<AuditLog> page = auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
        List<AdminDTOs.AuditLogDTO> dtos = page.getContent().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
        return new PagedResponse<>(dtos, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    private AdminDTOs.AuditLogDTO mapToDTO(AuditLog log) {
        AdminDTOs.AuditLogDTO dto = new AdminDTOs.AuditLogDTO();
        dto.setId(log.getId());
        dto.setUserId(log.getUserId());
        dto.setUserEmail(log.getUserEmail());
        dto.setActionType(log.getActionType());
        dto.setEntityName(log.getEntityName());
        dto.setEntityId(log.getEntityId());
        dto.setDetails(log.getDetails());
        dto.setIpAddress(log.getIpAddress());
        dto.setCreatedAt(log.getCreatedAt());
        return dto;
    }
}
