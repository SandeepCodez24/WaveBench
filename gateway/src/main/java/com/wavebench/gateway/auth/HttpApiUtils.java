package com.wavebench.gateway.auth;

import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * HttpApiUtils — shared utilities for the HTTP REST layer.
 *
 * <p>Provides CORS header injection and JSON response helpers used by all
 * handler classes ({@link AuthHandler}, ProjectHandler, ExportHandler).
 *
 * <p>CORS origins: always allows localhost dev ports. Additionally, if the
 * {@code CORS_ORIGIN} environment variable is set (e.g. to the Netlify URL),
 * that origin is also permitted.
 */
public class HttpApiUtils {

    /** Base allowed origins for local development. */
    private static final List<String> ALLOWED_ORIGINS = buildAllowedOrigins();

    private static List<String> buildAllowedOrigins() {
        List<String> origins = new ArrayList<>(Arrays.asList(
            "http://localhost:5173",
            "http://localhost:4173",
            "http://127.0.0.1:5173"
        ));
        // Add production Netlify URL from environment (set in Render dashboard)
        String corsOrigin = System.getenv("CORS_ORIGIN");
        if (corsOrigin != null && !corsOrigin.isBlank()) {
            // Strip trailing slash — browsers send Origin without it
            String trimmed = corsOrigin.trim().replaceAll("/+$", "");
            origins.add(trimmed);
            System.out.println("[CORS] Production origin allowed: " + trimmed);
        }
        return origins;
    }

    /**
     * Adds CORS headers to the response.
     * Reflects the request's Origin back if it is in the allowed list,
     * so credentials and preflight requests work correctly.
     */
    public static void addCorsHeaders(HttpExchange exchange) {
        String origin = exchange.getRequestHeaders().getFirst("Origin");
        String allowed = "http://localhost:5173"; // safe default
        if (origin != null) {
            for (String o : ALLOWED_ORIGINS) {
                if (o.equalsIgnoreCase(origin)) { allowed = o; break; }
            }
        }
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin",  allowed);
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        exchange.getResponseHeaders().set("Access-Control-Allow-Credentials", "true");
        exchange.getResponseHeaders().set("Access-Control-Max-Age",       "86400");
    }

    /**
     * Sends a JSON string response with the given HTTP status code.
     *
     * @param exchange    the active HTTP exchange
     * @param statusCode  HTTP status (200, 201, 400, 401, 409, 500, …)
     * @param jsonBody    the response body as a JSON string
     */
    public static void sendJson(HttpExchange exchange, int statusCode, String jsonBody) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        byte[] bytes = jsonBody.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    /**
     * Validates the Authorization header and returns the user ID, or sends
     * a 401 response and returns {@code null} if the token is missing/invalid.
     *
     * <p>Handlers should {@code return} immediately if this returns {@code null}.
     */
    public static String requireAuth(HttpExchange exchange) throws IOException {
        String authHeader = exchange.getRequestHeaders().getFirst("Authorization");
        String userId = JwtUtil.getUserIdFromHeader(authHeader);
        if (userId == null) {
            sendJson(exchange, 401, "{\"error\":\"Unauthorized — valid Bearer token required\"}");
            return null;
        }
        return userId;
    }
}
