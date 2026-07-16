package com.wavebench.gateway.auth;

import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * HttpApiUtils — shared utilities for the HTTP REST layer.
 *
 * <p>Provides CORS header injection and JSON response helpers used by all
 * handler classes ({@link AuthHandler}, ProjectHandler, ExportHandler).
 */
public class HttpApiUtils {

    /** Allowed origins for CORS (Vite dev + preview). */
    private static final String[] ALLOWED_ORIGINS = {
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173"
    };

    /**
     * Adds CORS headers to the response, permitting the Vite dev server and
     * production preview server to call the REST API.
     */
    public static void addCorsHeaders(HttpExchange exchange) {
        String origin = exchange.getRequestHeaders().getFirst("Origin");
        String allowed = "http://localhost:5173"; // default
        if (origin != null) {
            for (String o : ALLOWED_ORIGINS) {
                if (o.equalsIgnoreCase(origin)) { allowed = o; break; }
            }
        }
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin",  allowed);
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
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
