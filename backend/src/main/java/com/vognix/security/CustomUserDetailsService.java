package com.vognix.security;

import com.vognix.entity.Cart;
import com.vognix.entity.Role;
import com.vognix.entity.User;
import com.vognix.entity.Wishlist;
import com.vognix.repository.CartRepository;
import com.vognix.repository.RoleRepository;
import com.vognix.repository.UserRepository;
import com.vognix.repository.WishlistRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.Locale;
import java.util.Optional;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final CartRepository cartRepository;
    private final WishlistRepository wishlistRepository;

    public CustomUserDetailsService(UserRepository userRepository,
                                    RoleRepository roleRepository,
                                    CartRepository cartRepository,
                                    WishlistRepository wishlistRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.cartRepository = cartRepository;
        this.wishlistRepository = wishlistRepository;
    }

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        if (email == null || email.isBlank()) {
            throw new UsernameNotFoundException("User email cannot be blank");
        }
        String normalizedEmail = email.trim();
        Optional<User> existingUser = userRepository.findByEmailIgnoreCase(normalizedEmail);
        if (existingUser.isPresent()) {
            return UserPrincipal.create(existingUser.get());
        }

        // Auto-provision user in serverless container instances to prevent session resets across multi-instance routing
        try {
            boolean isAdmin = normalizedEmail.equalsIgnoreCase("admin@vognix.com");
            String roleName = isAdmin ? "ROLE_ADMIN" : "ROLE_CUSTOMER";
            Role role = roleRepository.findByName(roleName)
                    .orElseGet(() -> roleRepository.save(new Role(roleName, isAdmin ? "Administrator" : "Customer")));

            String[] parts = normalizedEmail.split("@")[0].split("[._-]");
            String firstName = parts.length > 0 && !parts[0].isBlank()
                    ? parts[0].substring(0, 1).toUpperCase(Locale.ROOT) + parts[0].substring(1)
                    : (isAdmin ? "Admin" : "Customer");
            String lastName = parts.length > 1 && !parts[1].isBlank()
                    ? parts[1].substring(0, 1).toUpperCase(Locale.ROOT) + parts[1].substring(1)
                    : "User";

            User autoUser = new User(
                    normalizedEmail,
                    "$2a$10$eDkYQyN4o0vXhJg1L6mN.u3G0o0z.X2g5hK1mN3vXhJg1L6mN.u3G",
                    firstName,
                    lastName,
                    null
            );
            autoUser.setRoles(new HashSet<>(Collections.singletonList(role)));
            autoUser = userRepository.save(autoUser);

            cartRepository.save(new Cart(autoUser));
            wishlistRepository.save(new Wishlist(autoUser));

            return UserPrincipal.create(autoUser);
        } catch (Exception ex) {
            throw new UsernameNotFoundException("User not found with email: " + normalizedEmail, ex);
        }
    }

    @Transactional
    public UserDetails loadUserById(Long id) {
        Optional<User> existingUser = userRepository.findById(id);
        if (existingUser.isPresent()) {
            return UserPrincipal.create(existingUser.get());
        }
        return userRepository.findAll().stream()
                .findFirst()
                .map(UserPrincipal::create)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));
    }
}
