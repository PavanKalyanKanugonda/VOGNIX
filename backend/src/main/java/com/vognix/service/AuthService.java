package com.vognix.service;

import com.vognix.dto.AuthDTOs;
import com.vognix.entity.Cart;
import com.vognix.entity.Role;
import com.vognix.entity.User;
import com.vognix.entity.Wishlist;
import com.vognix.exception.BadRequestException;
import com.vognix.exception.ResourceNotFoundException;
import com.vognix.repository.CartRepository;
import com.vognix.repository.RoleRepository;
import com.vognix.repository.UserRepository;
import com.vognix.repository.WishlistRepository;
import com.vognix.security.JwtTokenProvider;
import com.vognix.security.UserPrincipal;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final CartRepository cartRepository;
    private final WishlistRepository wishlistRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuditLogService auditLogService;

    public AuthService(AuthenticationManager authenticationManager,
                       UserRepository userRepository,
                       RoleRepository roleRepository,
                       CartRepository cartRepository,
                       WishlistRepository wishlistRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider,
                       AuditLogService auditLogService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.cartRepository = cartRepository;
        this.wishlistRepository = wishlistRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public AuthDTOs.AuthResponse register(AuthDTOs.RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail().toLowerCase().trim())) {
            throw new BadRequestException("An account with email " + request.getEmail() + " already exists");
        }

        Role customerRole = roleRepository.findByName("ROLE_CUSTOMER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_CUSTOMER", "Customer")));

        User user = new User(
                request.getEmail().toLowerCase().trim(),
                passwordEncoder.encode(request.getPassword()),
                request.getFirstName().trim(),
                request.getLastName().trim(),
                request.getPhone() != null ? request.getPhone().trim() : null
        );
        user.setRoles(new HashSet<>(Collections.singletonList(customerRole)));
        user = userRepository.save(user);

        // Initialize user cart and wishlist
        cartRepository.save(new Cart(user));
        wishlistRepository.save(new Wishlist(user));

        auditLogService.logAction(user.getId(), user.getEmail(), "CUSTOMER_REGISTERED", "User", user.getId().toString(), "Customer registered successfully", null);

        // Authenticate & create token
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getEmail(), request.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        List<String> roles = user.getRoles().stream().map(Role::getName).collect(Collectors.toList());
        return new AuthDTOs.AuthResponse(jwt, user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), roles);
    }

    public AuthDTOs.AuthResponse login(AuthDTOs.LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail().toLowerCase().trim(), request.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        List<String> roles = userPrincipal.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .collect(Collectors.toList());

        return new AuthDTOs.AuthResponse(jwt, userPrincipal.getId(), userPrincipal.getEmail(),
                userPrincipal.getFirstName(), userPrincipal.getLastName(), roles);
    }

    public String initiateForgotPassword(AuthDTOs.ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new ResourceNotFoundException("No account found with email: " + request.getEmail()));
        
        // Return a simulated OTP code for immediate user verification
        return "Simulated reset token generated for " + user.getEmail() + ": VOGNIX-782910";
    }

    @Transactional
    public void resetPassword(AuthDTOs.ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new ResourceNotFoundException("No account found with email: " + request.getEmail()));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        auditLogService.logAction(user.getId(), user.getEmail(), "PASSWORD_RESET", "User", user.getId().toString(), "Password reset successfully", null);
    }
}
