package com.vognix.config;

import com.vognix.entity.*;
import com.vognix.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserAddressRepository addressRepository;
    private final CartRepository cartRepository;
    private final WishlistRepository wishlistRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository,
                           RoleRepository roleRepository,
                           UserAddressRepository addressRepository,
                           CartRepository cartRepository,
                           WishlistRepository wishlistRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.addressRepository = addressRepository;
        this.cartRepository = cartRepository;
        this.wishlistRepository = wishlistRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        // Ensure default roles exist if not already seeded
        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_ADMIN", "Administrator")));
        Role customerRole = roleRepository.findByName("ROLE_CUSTOMER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_CUSTOMER", "Customer")));

        // 1. Seed default Admin user if not exists
        if (!userRepository.existsByEmail("admin@vognix.com")) {
            User admin = new User(
                    "admin@vognix.com",
                    passwordEncoder.encode("Admin@123"),
                    "VOGNIX",
                    "Admin",
                    "+91 9876543210"
            );
            admin.setRoles(new HashSet<>(Collections.singletonList(adminRole)));
            admin.setAvatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80");
            admin = userRepository.save(admin);

            // Initialize cart and wishlist
            cartRepository.save(new Cart(admin));
            wishlistRepository.save(new Wishlist(admin));
        }

        // 2. Seed default Customer user if not exists
        if (!userRepository.existsByEmail("customer@vognix.com")) {
            User customer = new User(
                    "customer@vognix.com",
                    passwordEncoder.encode("Customer@123"),
                    "Aarav",
                    "Sharma",
                    "+91 9812345678"
            );
            customer.setRoles(new HashSet<>(Collections.singletonList(customerRole)));
            customer.setAvatarUrl("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80");
            customer = userRepository.save(customer);

            // Create initial address
            UserAddress address = new UserAddress();
            address.setUser(customer);
            address.setFullName("Aarav Sharma");
            address.setPhone("+91 9812345678");
            address.setStreetAddress("Flat 402, Highline Residency, Bandra West");
            address.setLocality("Linking Road");
            address.setCity("Mumbai");
            address.setState("Maharashtra");
            address.setPostalCode("400050");
            address.setAddressType("HOME");
            address.setIsDefault(true);
            addressRepository.save(address);

            // Initialize cart and wishlist
            cartRepository.save(new Cart(customer));
            wishlistRepository.save(new Wishlist(customer));
        }
    }
}
