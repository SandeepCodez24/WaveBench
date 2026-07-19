package com.wavebench.gateway.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import org.mindrot.jbcrypt.BCrypt;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * AuthHandler — HTTP handlers for authentication endpoints.
 *
 * <p>Routes handled:
 * <ul>
 *   <li>{@code POST /api/auth/signup} — create account, return JWT</li>
 *   <li>{@code POST /api/auth/login}  — verify credentials, return JWT</li>
 *   <li>{@code GET  /api/auth/me}     — return current user profile (requires Bearer token)</li>
 * </ul>
 */
public class AuthHandler implements HttpHandler {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        // Add CORS headers to every response
        HttpApiUtils.addCorsHeaders(exchange);

        String method = exchange.getRequestMethod();
        String path   = exchange.getRequestURI().getPath();

        // Handle preflight OPTIONS
        if ("OPTIONS".equalsIgnoreCase(method)) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        if ("POST".equalsIgnoreCase(method) && path.endsWith("/signup")) {
            handleSignup(exchange);
        } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/login")) {
            handleLogin(exchange);
        } else if ("GET".equalsIgnoreCase(method) && path.endsWith("/me")) {
            handleMe(exchange);
        } else {
            HttpApiUtils.sendJson(exchange, 404, "{\"error\":\"Not found\"}");
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/auth/signup
    // -------------------------------------------------------------------------

    private void handleSignup(HttpExchange exchange) throws IOException {
        Map<?, ?> body = parseBody(exchange);
        if (body == null) {
            HttpApiUtils.sendJson(exchange, 400, "{\"error\":\"Invalid JSON body\"}");
            return;
        }

        String email       = str(body, "email");
        String password    = str(body, "password");
        String displayName = str(body, "displayName");
        String organization = str(body, "organization");
        String role        = str(body, "role");

        if (email == null || email.isBlank() || !email.contains("@")) {
            HttpApiUtils.sendJson(exchange, 400, "{\"error\":\"Valid email required\"}");
            return;
        }
        if (password == null || password.length() < 6) {
            HttpApiUtils.sendJson(exchange, 400, "{\"error\":\"Password must be at least 6 characters\"}");
            return;
        }
        if (displayName == null || displayName.isBlank()) {
            HttpApiUtils.sendJson(exchange, 400, "{\"error\":\"Display name required\"}");
            return;
        }
        if (UserStore.existsByEmail(email)) {
            HttpApiUtils.sendJson(exchange, 409, "{\"error\":\"Email already registered\"}");
            return;
        }

        // Hash password with BCrypt (work factor 12)
        String hash = BCrypt.hashpw(password, BCrypt.gensalt(12));

        ObjectNode user = UserStore.createUser(email, hash, displayName, organization, role);
        String token = JwtUtil.generateToken(user.path("id").asText(), email);

        ObjectNode resp = MAPPER.createObjectNode();
        resp.put("token", token);
        resp.set("user", UserStore.toPublicProfile(user));

        System.out.println("[Auth] New user signed up: " + email);
        HttpApiUtils.sendJson(exchange, 201, resp.toString());
    }

    // -------------------------------------------------------------------------
    // POST /api/auth/login
    // -------------------------------------------------------------------------

    private void handleLogin(HttpExchange exchange) throws IOException {
        Map<?, ?> body = parseBody(exchange);
        if (body == null) {
            HttpApiUtils.sendJson(exchange, 400, "{\"error\":\"Invalid JSON body\"}");
            return;
        }

        String email    = str(body, "email");
        String password = str(body, "password");

        if (email == null || password == null) {
            HttpApiUtils.sendJson(exchange, 400, "{\"error\":\"Email and password required\"}");
            return;
        }

        ObjectNode user = UserStore.findByEmail(email);
        if (user == null) {
            HttpApiUtils.sendJson(exchange, 401, "{\"error\":\"Invalid email or password\"}");
            return;
        }

        String storedHash = user.path("passwordHash").asText();
        if (!BCrypt.checkpw(password, storedHash)) {
            HttpApiUtils.sendJson(exchange, 401, "{\"error\":\"Invalid email or password\"}");
            return;
        }

        String token = JwtUtil.generateToken(user.path("id").asText(), email);

        ObjectNode resp = MAPPER.createObjectNode();
        resp.put("token", token);
        resp.set("user", UserStore.toPublicProfile(user));

        System.out.println("[Auth] User logged in: " + email);
        HttpApiUtils.sendJson(exchange, 200, resp.toString());
    }

    // -------------------------------------------------------------------------
    // GET /api/auth/me
    // -------------------------------------------------------------------------

    private void handleMe(HttpExchange exchange) throws IOException {
        String authHeader = exchange.getRequestHeaders().getFirst("Authorization");
        String userId = JwtUtil.getUserIdFromHeader(authHeader);
        if (userId == null) {
            HttpApiUtils.sendJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
            return;
        }

        ObjectNode user = UserStore.findById(userId);
        if (user == null) {
            HttpApiUtils.sendJson(exchange, 404, "{\"error\":\"User not found\"}");
            return;
        }

        HttpApiUtils.sendJson(exchange, 200, UserStore.toPublicProfile(user).toString());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Map<?, ?> parseBody(HttpExchange exchange) {
        try (InputStream is = exchange.getRequestBody()) {
            String raw = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            return MAPPER.readValue(raw, Map.class);
        } catch (Exception e) {
            return null;
        }
    }

    private String str(Map<?, ?> map, String key) {
        Object val = map.get(key);
        return val instanceof String s ? s : null;
    }
}
