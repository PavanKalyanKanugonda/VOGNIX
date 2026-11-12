package com.vognix.service;

import com.vognix.dto.AuthDTOs;
import com.vognix.entity.Role;
import com.vognix.entity.User;
import com.vognix.exception.BadRequestException;
import com.vognix.repository.CartRepository;
import com.vognix.repository.RoleRepository;
import com.vognix.repository.UserRepository;
import com.vognix.repository.WishlistRepository;
import com.vognix.security.JwtTokenProvider;
import com.vognix.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private CartRepository cartRepository;

    @Mock
    private WishlistRepository wishlistRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AuthService authService;

    private Role customerRole;

    @BeforeEach
    void setUp() {
        customerRole = new Role("ROLE_CUSTOMER", "Customer");
    }

    @Test
    @DisplayName("Should successfully register new customer, hash password, and return JWT")
    void testRegisterSuccess() {
        AuthDTOs.RegisterRequest request = new AuthDTOs.RegisterRequest();
        request.setFirstName("Rohan");
        request.setLastName("Verma");
        request.setEmail("rohan@example.com");
        request.setPassword("Secret@123");
        request.setPhone("9988776655");

        when(userRepository.existsByEmailIgnoreCase("rohan@example.com")).thenReturn(false);
        when(roleRepository.findByName("ROLE_CUSTOMER")).thenReturn(Optional.of(customerRole));
        when(passwordEncoder.encode("Secret@123")).thenReturn("$2a$10$hashedPassword");

        User savedUser = new User("rohan@example.com", "$2a$10$hashedPassword", "Rohan", "Verma", "9988776655");
        savedUser.setId(10L);
        savedUser.setRoles(Collections.singleton(customerRole));
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        Authentication auth = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(tokenProvider.generateToken(auth)).thenReturn("mocked.jwt.token");

        AuthDTOs.AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("mocked.jwt.token", response.getToken());
        assertEquals("rohan@example.com", response.getEmail());
        assertTrue(response.getRoles().contains("ROLE_CUSTOMER"));
        verify(passwordEncoder).encode("Secret@123");
        verify(cartRepository).save(any());
        verify(wishlistRepository).save(any());
    }

    @Test
    @DisplayName("Should throw BadRequestException when email already registered")
    void testRegisterDuplicateEmailThrowsException() {
        AuthDTOs.RegisterRequest request = new AuthDTOs.RegisterRequest();
        request.setEmail("existing@example.com");
        request.setPassword("Password@123");

        when(userRepository.existsByEmailIgnoreCase("existing@example.com")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should successfully login and return JWT token")
    void testLoginSuccess() {
        AuthDTOs.LoginRequest request = new AuthDTOs.LoginRequest();
        request.setEmail("customer@vognix.com");
        request.setPassword("Customer@123");

        User user = new User("customer@vognix.com", "$2a$10$hash", "Aarav", "Sharma", null);
        user.setId(2L);
        user.setRoles(Collections.singleton(customerRole));
        UserPrincipal principal = UserPrincipal.create(user);

        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(principal);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(tokenProvider.generateToken(auth)).thenReturn("mocked.jwt.token");

        AuthDTOs.AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mocked.jwt.token", response.getToken());
        assertEquals("customer@vognix.com", response.getEmail());
    }

    @Test
    @DisplayName("Should normalize mixed-case email with whitespace during registration and login")
    void testRegisterAndLoginNormalizeEmailCaseAndWhitespace() {
        AuthDTOs.RegisterRequest request = new AuthDTOs.RegisterRequest();
        request.setFirstName("  Pavan ");
        request.setLastName(" Kalyan ");
        request.setEmail("  Pavan@Gmail.COM ");
        request.setPassword("Pavan@123");

        when(userRepository.existsByEmailIgnoreCase("pavan@gmail.com")).thenReturn(false);
        when(roleRepository.findByName("ROLE_CUSTOMER")).thenReturn(Optional.of(customerRole));
        when(passwordEncoder.encode("Pavan@123")).thenReturn("$2a$10$hash");
        User saved = new User("pavan@gmail.com", "$2a$10$hash", "Pavan", "Kalyan", null);
        saved.setId(5L);
        saved.setRoles(Collections.singleton(customerRole));
        when(userRepository.save(any(User.class))).thenReturn(saved);

        Authentication auth = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(tokenProvider.generateToken(auth)).thenReturn("norm.jwt");

        AuthDTOs.AuthResponse res = authService.register(request);
        assertEquals("pavan@gmail.com", res.getEmail());
        verify(authenticationManager).authenticate(new UsernamePasswordAuthenticationToken("pavan@gmail.com", "Pavan@123"));
    }

    @Test
    @DisplayName("Should verify cryptographic reset token and reject invalid tokens")
    void testResetPasswordValidatesToken() {
        User user = new User("admin@vognix.com", "$2a$10$oldhash", "VOGNIX", "Admin", null);
        user.setId(1L);
        user.setIsActive(true);
        when(userRepository.findByEmailIgnoreCase("admin@vognix.com")).thenReturn(Optional.of(user));
        when(tokenProvider.validatePasswordResetToken("VOGNIX-INVALID", "admin@vognix.com", "$2a$10$oldhash")).thenReturn(false);

        AuthDTOs.ResetPasswordRequest badReq = new AuthDTOs.ResetPasswordRequest();
        badReq.setEmail("Admin@VOGNIX.com");
        badReq.setToken("VOGNIX-INVALID");
        badReq.setNewPassword("NewPass@123");

        assertThrows(BadRequestException.class, () -> authService.resetPassword(badReq));
        verify(userRepository, never()).save(any());

        when(tokenProvider.validatePasswordResetToken("VOGNIX-VALID123", "admin@vognix.com", "$2a$10$oldhash")).thenReturn(true);
        when(passwordEncoder.encode("NewPass@123")).thenReturn("$2a$10$newhash");

        AuthDTOs.ResetPasswordRequest goodReq = new AuthDTOs.ResetPasswordRequest();
        goodReq.setEmail("Admin@VOGNIX.com");
        goodReq.setToken("VOGNIX-VALID123");
        goodReq.setNewPassword("NewPass@123");

        authService.resetPassword(goodReq);
        assertEquals("$2a$10$newhash", user.getPasswordHash());
        verify(userRepository).save(user);
    }
}
