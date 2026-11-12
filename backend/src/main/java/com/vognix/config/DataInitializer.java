package com.vognix.config;

import com.vognix.entity.*;
import com.vognix.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Collections;
import java.util.HashSet;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserAddressRepository addressRepository;
    private final CartRepository cartRepository;
    private final WishlistRepository wishlistRepository;
    private final PasswordEncoder passwordEncoder;
    private final TransactionTemplate requiresNewTransaction;
    private final Environment environment;

    public DataInitializer(UserRepository userRepository,
                           RoleRepository roleRepository,
                           UserAddressRepository addressRepository,
                           CartRepository cartRepository,
                           WishlistRepository wishlistRepository,
                           PasswordEncoder passwordEncoder,
                           PlatformTransactionManager transactionManager,
                           Environment environment) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.addressRepository = addressRepository;
        this.cartRepository = cartRepository;
        this.wishlistRepository = wishlistRepository;
        this.passwordEncoder = passwordEncoder;
        this.requiresNewTransaction = new TransactionTemplate(transactionManager);
        this.requiresNewTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.environment = environment;
    }

    @Override
    public void run(String... args) {
        logDatabaseMode();

        Role adminRole = ensureRole("ROLE_ADMIN", "Administrator");
        Role customerRole = ensureRole("ROLE_CUSTOMER", "Customer");

        ensureDefaultAdmin(adminRole);
        ensureDefaultCustomer(customerRole);
    }

    private Role ensureRole(String roleName, String description) {
        try {
            return requiresNewTransaction.execute(status ->
                    roleRepository.findByName(roleName)
                            .orElseGet(() -> roleRepository.saveAndFlush(new Role(roleName, description))));
        } catch (DataIntegrityViolationException concurrentInsert) {
            return requiresNewTransaction.execute(status ->
                    roleRepository.findByName(roleName).orElseThrow(() -> concurrentInsert));
        }
    }

    private void ensureDefaultAdmin(Role adminRole) {
        final String email = "admin@vognix.com";
        try {
            requiresNewTransaction.executeWithoutResult(status -> {
                if (userRepository.existsByEmailIgnoreCase(email)) {
                    return;
                }
                Role attachedRole = roleRepository.findByName(adminRole.getName()).orElse(adminRole);
                User admin = new User(
                        email,
                        passwordEncoder.encode("Admin@123"),
                        "VOGNIX",
                        "Admin",
                        "+91 9876543210"
                );
                admin.setRoles(new HashSet<>(Collections.singletonList(attachedRole)));
                admin.setAvatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80");
                admin = userRepository.saveAndFlush(admin);

                cartRepository.save(new Cart(admin));
                wishlistRepository.save(new Wishlist(admin));
            });
        } catch (DataIntegrityViolationException ignored) {
            // Another instance seeded admin@vognix.com concurrently on startup
        }
    }

    private void ensureDefaultCustomer(Role customerRole) {
        final String email = "customer@vognix.com";
        try {
            requiresNewTransaction.executeWithoutResult(status -> {
                if (userRepository.existsByEmailIgnoreCase(email)) {
                    return;
                }
                Role attachedRole = roleRepository.findByName(customerRole.getName()).orElse(customerRole);
                User customer = new User(
                        email,
                        passwordEncoder.encode("Customer@123"),
                        "Aarav",
                        "Sharma",
                        "+91 9812345678"
                );
                customer.setRoles(new HashSet<>(Collections.singletonList(attachedRole)));
                customer.setAvatarUrl("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80");
                customer = userRepository.saveAndFlush(customer);

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

                cartRepository.save(new Cart(customer));
                wishlistRepository.save(new Wishlist(customer));
            });
        } catch (DataIntegrityViolationException ignored) {
            // Another instance seeded customer@vognix.com concurrently on startup
        }
    }

    private void logDatabaseMode() {
        String jdbcUrl = environment.getProperty("spring.datasource.url", "");
        String sanitizedUrl = sanitizeJdbcUrl(jdbcUrl);
        if (jdbcUrl.contains("h2:file:/tmp")) {
            log.warn("VOGNIX datasource is using ephemeral /tmp H2 ({}). Customer and admin changes will not persist across container restarts unless DATABASE_URL/POSTGRES_URL is configured.", sanitizedUrl);
        } else {
            log.info("VOGNIX datasource initialized: {}", sanitizedUrl);
        }
    }

    private static String sanitizeJdbcUrl(String jdbcUrl) {
        if (jdbcUrl == null || jdbcUrl.isBlank()) {
            return "<unset>";
        }
        int queryIdx = jdbcUrl.indexOf('?');
        String base = queryIdx >= 0 ? jdbcUrl.substring(0, queryIdx) : jdbcUrl;
        int schemeIdx = base.indexOf("://");
        if (schemeIdx >= 0) {
            int atIdx = base.indexOf('@', schemeIdx + 3);
            if (atIdx >= 0) {
                return base.substring(0, schemeIdx + 3) + base.substring(atIdx + 1);
            }
        }
        return base;
    }
}
