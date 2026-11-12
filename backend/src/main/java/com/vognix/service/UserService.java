package com.vognix.service;

import com.vognix.dto.AddressDTOs;
import com.vognix.dto.AuthDTOs;
import com.vognix.entity.Role;
import com.vognix.entity.User;
import com.vognix.entity.UserAddress;
import com.vognix.exception.BadRequestException;
import com.vognix.exception.ResourceNotFoundException;
import com.vognix.repository.UserAddressRepository;
import com.vognix.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final UserAddressRepository addressRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public UserService(UserRepository userRepository,
                       UserAddressRepository addressRepository,
                       PasswordEncoder passwordEncoder,
                       AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.addressRepository = addressRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public AuthDTOs.UserProfileResponse getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        AuthDTOs.UserProfileResponse response = new AuthDTOs.UserProfileResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setPhone(user.getPhone());
        response.setAvatarUrl(user.getAvatarUrl());
        response.setRoles(user.getRoles().stream().map(Role::getName).collect(Collectors.toList()));
        return response;
    }

    @Transactional
    public AuthDTOs.UserProfileResponse updateProfile(Long userId, AuthDTOs.UserUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (request.getFirstName() != null) user.setFirstName(request.getFirstName().trim());
        if (request.getLastName() != null) user.setLastName(request.getLastName().trim());
        if (request.getPhone() != null) user.setPhone(request.getPhone().trim());
        if (request.getAvatarUrl() != null) user.setAvatarUrl(request.getAvatarUrl().trim());

        user = userRepository.save(user);
        return getProfile(user.getId());
    }

    @Transactional
    public void changePassword(Long userId, AuthDTOs.ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BadRequestException("New password must be different from your current password");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        auditLogService.logAction(user.getId(), user.getEmail(), "PASSWORD_CHANGED", "User",
                user.getId().toString(), "User changed account password", null);
    }

    @Transactional(readOnly = true)
    public List<AddressDTOs.AddressResponse> getAddresses(Long userId) {
        return addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId).stream()
                .map(this::mapAddressToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public AddressDTOs.AddressResponse addAddress(Long userId, AddressDTOs.AddressRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        List<UserAddress> existingAddresses = addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
        boolean shouldBeDefault = Boolean.TRUE.equals(request.getIsDefault()) || existingAddresses.isEmpty();

        if (shouldBeDefault && !existingAddresses.isEmpty()) {
            existingAddresses.forEach(a -> a.setIsDefault(false));
            addressRepository.saveAll(existingAddresses);
        }

        UserAddress address = new UserAddress();
        address.setUser(user);
        copyAddressFields(request, address);
        address.setIsDefault(shouldBeDefault);

        address = addressRepository.save(address);
        return mapAddressToDTO(address);
    }

    @Transactional
    public AddressDTOs.AddressResponse updateAddress(Long userId, Long addressId, AddressDTOs.AddressRequest request) {
        UserAddress address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found with id: " + addressId));

        if (Boolean.TRUE.equals(request.getIsDefault())) {
            List<UserAddress> addresses = addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
            addresses.forEach(a -> a.setIsDefault(false));
            addressRepository.saveAll(addresses);
            address.setIsDefault(true);
        }

        copyAddressFields(request, address);
        address = addressRepository.save(address);
        return mapAddressToDTO(address);
    }

    @Transactional
    public void deleteAddress(Long userId, Long addressId) {
        UserAddress address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found with id: " + addressId));
        addressRepository.delete(address);
    }

    @Transactional
    public AddressDTOs.AddressResponse setDefaultAddress(Long userId, Long addressId) {
        List<UserAddress> addresses = addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
        UserAddress targetAddress = null;
        for (UserAddress a : addresses) {
            if (a.getId().equals(addressId)) {
                a.setIsDefault(true);
                targetAddress = a;
            } else {
                a.setIsDefault(false);
            }
        }
        if (targetAddress == null) {
            throw new ResourceNotFoundException("Address not found with id: " + addressId);
        }
        addressRepository.saveAll(addresses);
        return mapAddressToDTO(targetAddress);
    }

    private void copyAddressFields(AddressDTOs.AddressRequest request, UserAddress address) {
        address.setFullName(request.getFullName().trim());
        address.setPhone(request.getPhone().trim());
        address.setStreetAddress(request.getStreetAddress().trim());
        address.setLocality(request.getLocality() != null ? request.getLocality().trim() : null);
        address.setCity(request.getCity().trim());
        address.setState(request.getState().trim());
        address.setPostalCode(request.getPostalCode().trim());
        if (request.getAddressType() != null) {
            address.setAddressType(request.getAddressType());
        }
    }

    private AddressDTOs.AddressResponse mapAddressToDTO(UserAddress address) {
        AddressDTOs.AddressResponse dto = new AddressDTOs.AddressResponse();
        dto.setId(address.getId());
        dto.setFullName(address.getFullName());
        dto.setPhone(address.getPhone());
        dto.setStreetAddress(address.getStreetAddress());
        dto.setLocality(address.getLocality());
        dto.setCity(address.getCity());
        dto.setState(address.getState());
        dto.setPostalCode(address.getPostalCode());
        dto.setAddressType(address.getAddressType());
        dto.setIsDefault(address.getIsDefault());
        dto.setCreatedAt(address.getCreatedAt());
        return dto;
    }
}
