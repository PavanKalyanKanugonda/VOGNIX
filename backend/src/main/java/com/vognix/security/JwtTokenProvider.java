package com.vognix.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Date;
import java.util.HexFormat;
import java.util.Locale;

@Component
public class JwtTokenProvider {

    private static final String RESET_TOKEN_PREFIX = "VOGNIX-";
    private static final long RESET_TOKEN_TTL_SECONDS = 1800L;
    private static final long RESET_CLOCK_SKEW_SECONDS = 60L;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final SecretKey signingKey;
    private final long jwtExpirationMs;

    public JwtTokenProvider(
            @Value("${vognix.jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}") String secret,
            @Value("${vognix.jwt.expiration-ms:86400000}") long jwtExpirationMs) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        this.jwtExpirationMs = jwtExpirationMs;
    }

    public String generateToken(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .subject(userPrincipal.getEmail())
                .claim("userId", userPrincipal.getId())
                .claim("roles", userPrincipal.getAuthorities().stream()
                        .map(a -> a.getAuthority())
                        .toList())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(signingKey)
                .compact();
    }

    public String generateTokenForEmail(String email, Long userId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .subject(email)
                .claim("userId", userId)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(signingKey)
                .compact();
    }

    public String getEmailFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    public String generatePasswordResetToken(String email, String passwordHash) {
        long epochSec = Instant.now().getEpochSecond();
        String tsHex = String.format(Locale.ROOT, "%08X", epochSec);
        byte[] nonceBytes = new byte[2];
        SECURE_RANDOM.nextBytes(nonceBytes);
        String nonceHex = HexFormat.of().withUpperCase().formatHex(nonceBytes);
        String macHex = computeResetMacHex(email, passwordHash, tsHex, nonceHex);
        return RESET_TOKEN_PREFIX + tsHex + nonceHex + macHex;
    }

    public boolean validatePasswordResetToken(String rawToken, String email, String passwordHash) {
        if (rawToken == null || email == null || passwordHash == null) {
            return false;
        }
        String normalized = rawToken.trim().toUpperCase(Locale.ROOT);
        if (!normalized.startsWith(RESET_TOKEN_PREFIX)) {
            return false;
        }
        String payload = normalized.substring(RESET_TOKEN_PREFIX.length());
        if (payload.length() != 24 || !payload.matches("[0-9A-F]{24}")) {
            return false;
        }

        String tsHex = payload.substring(0, 8);
        String nonceHex = payload.substring(8, 12);
        String providedMacHex = payload.substring(12, 24);

        long issuedAt = Long.parseUnsignedLong(tsHex, 16);
        long now = Instant.now().getEpochSecond();
        if (issuedAt > now + RESET_CLOCK_SKEW_SECONDS || (now - issuedAt) > RESET_TOKEN_TTL_SECONDS) {
            return false;
        }

        String expectedMacHex = computeResetMacHex(email, passwordHash, tsHex, nonceHex);
        return MessageDigest.isEqual(
                expectedMacHex.getBytes(StandardCharsets.US_ASCII),
                providedMacHex.getBytes(StandardCharsets.US_ASCII)
        );
    }

    private String computeResetMacHex(String email, String passwordHash, String tsHex, String nonceHex) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingKey.getEncoded(), "HmacSHA256"));
            String input = "VOGNIX-RESET|" + email.trim().toLowerCase(Locale.ROOT)
                    + "|" + passwordHash + "|" + tsHex + "|" + nonceHex;
            byte[] digest = mac.doFinal(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().withUpperCase().formatHex(digest, 0, 6);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Failed to compute password reset verification code", ex);
        }
    }
}
