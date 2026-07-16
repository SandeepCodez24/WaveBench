package com.wavebench.gateway.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JwtUtil — stateless JWT generation and validation using HMAC-SHA256.
 *
 * <p>The signing secret is read from the {@code WAVEBENCH_JWT_SECRET} environment
 * variable. If not set, a hard-coded development secret is used (safe for
 * local development; must be changed before production deployment).
 *
 * <p>Token lifetime: 24 hours (access token). Stateless — no refresh-token
 * table required for the MVP. Extend with a refresh-token store when needed.
 */
public class JwtUtil {

    /** Token validity: 24 hours in milliseconds. */
    private static final long EXPIRY_MS = 24L * 60 * 60 * 1000;

    private static final String DEV_SECRET =
        "WaveBenchStudioDevSecret2024XYZ!MustBe32Chars+";

    private static final SecretKey KEY;

    static {
        String secret = System.getenv("WAVEBENCH_JWT_SECRET");
        if (secret == null || secret.isBlank()) {
            secret = DEV_SECRET;
        }
        // jjwt requires the key to be at least 256 bits for HMAC-SHA256
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        KEY = Keys.hmacShaKeyFor(keyBytes);
    }

    // -------------------------------------------------------------------------
    // Token generation
    // -------------------------------------------------------------------------

    /**
     * Generates a signed JWT embedding the user's ID and email as claims.
     *
     * @param userId UUID string of the authenticated user
     * @param email  email address of the authenticated user
     * @return signed JWT string (compact serialization)
     */
    public static String generateToken(String userId, String email) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .issuedAt(new Date(now))
                .expiration(new Date(now + EXPIRY_MS))
                .signWith(KEY)
                .compact();
    }

    // -------------------------------------------------------------------------
    // Token validation
    // -------------------------------------------------------------------------

    /**
     * Parses and validates a JWT token.
     *
     * @param token the compact JWT string (without "Bearer " prefix)
     * @return the {@link Claims} payload, or {@code null} if invalid/expired
     */
    public static Claims validateToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(KEY)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * Extracts the user ID (subject claim) from a raw Authorization header value.
     * Accepts both {@code "Bearer <token>"} and bare token strings.
     *
     * @return userId string, or {@code null} if the token is invalid
     */
    public static String getUserIdFromHeader(String authHeader) {
        if (authHeader == null) return null;
        String token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
        Claims claims = validateToken(token);
        return claims != null ? claims.getSubject() : null;
    }

    /**
     * Extracts the email claim from a raw Authorization header value.
     *
     * @return email string, or {@code null} if the token is invalid
     */
    public static String getEmailFromHeader(String authHeader) {
        if (authHeader == null) return null;
        String token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
        Claims claims = validateToken(token);
        return claims != null ? claims.get("email", String.class) : null;
    }
}
