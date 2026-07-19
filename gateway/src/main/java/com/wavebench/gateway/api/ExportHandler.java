package com.wavebench.gateway.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.wavebench.gateway.auth.HttpApiUtils;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * ExportHandler — REST endpoints for logging and retrieving export history.
 *
 * <p>
 * Each export record (scope PNG, data CSV, HTML report) is appended as a
 * newline-delimited JSON entry to {@code exports.log}. Records are indexed
 * by {@code userId} so each user sees only their own history.
 *
 * <p>
 * Routes:
 * <ul>
 * <li>{@code POST /api/exports} — append a new export record</li>
 * <li>{@code GET  /api/exports} — return last 50 export records for the
 * user</li>
 * </ul>
 */
public class ExportHandler implements HttpHandler {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String LOG_FILE = "exports.log";
    private static final int MAX_RECORDS = 50;
    private static final Object FILE_LOCK = new Object();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        HttpApiUtils.addCorsHeaders(exchange);

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        String userId = HttpApiUtils.requireAuth(exchange);
        if (userId == null)
            return;

        String method = exchange.getRequestMethod();

        if ("POST".equalsIgnoreCase(method)) {
            handleAppend(exchange, userId);
        } else if ("GET".equalsIgnoreCase(method)) {
            handleList(exchange, userId);
        } else {
            HttpApiUtils.sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/exports
    // -------------------------------------------------------------------------

    private void handleAppend(HttpExchange exchange, String userId) throws IOException {
        String raw = readBody(exchange);
        Map<?, ?> body;
        try {
            body = MAPPER.readValue(raw, Map.class);
        } catch (Exception e) {
            HttpApiUtils.sendJson(exchange, 400, "{\"error\":\"Invalid JSON\"}");
            return;
        }

        String type = str(body, "type"); // scope_png / data_csv / report_html
        String projectId = str(body, "projectId"); // project name/id
        String fileUrl = str(body, "fileUrl"); // URL or path reference

        if (type == null || fileUrl == null) {
            HttpApiUtils.sendJson(exchange, 400, "{\"error\":\"type and fileUrl required\"}");
            return;
        }

        ObjectNode record = MAPPER.createObjectNode();
        record.put("userId", userId);
        record.put("type", type);
        record.put("projectId", projectId == null ? "" : projectId);
        record.put("fileUrl", fileUrl);
        record.put("createdAt", Instant.now().toString());

        // Append record to log file (thread-safe)
        synchronized (FILE_LOCK) {
            try (java.io.PrintWriter pw = new java.io.PrintWriter(
                    java.nio.file.Files.newBufferedWriter(
                            java.nio.file.Paths.get(LOG_FILE),
                            java.nio.charset.StandardCharsets.UTF_8,
                            java.nio.file.StandardOpenOption.CREATE,
                            java.nio.file.StandardOpenOption.APPEND))) {
                pw.println(record);
            }
        }

        System.out.println("[Exports] Logged export type=" + type + " user=" + userId);
        HttpApiUtils.sendJson(exchange, 201, "{\"status\":\"logged\"}");
    }

    // -------------------------------------------------------------------------
    // GET /api/exports
    // -------------------------------------------------------------------------

    private void handleList(HttpExchange exchange, String userId) throws IOException {
        ArrayNode results = MAPPER.createArrayNode();

        File log = new File(LOG_FILE);
        if (log.exists()) {
            synchronized (FILE_LOCK) {
                List<String> lines = Files.readAllLines(log.toPath(), StandardCharsets.UTF_8);
                // Collect user's records (most recent last — read all, filter, take tail)
                List<ObjectNode> userRecords = new ArrayList<>();
                for (String line : lines) {
                    if (line.isBlank())
                        continue;
                    try {
                        ObjectNode rec = (ObjectNode) MAPPER.readTree(line);
                        if (userId.equals(rec.path("userId").asText())) {
                            userRecords.add(rec);
                        }
                    } catch (Exception ignored) {
                    }
                }

                // Return at most MAX_RECORDS from the end
                int start = Math.max(0, userRecords.size() - MAX_RECORDS);
                for (int i = userRecords.size() - 1; i >= start; i--) {
                    results.add(userRecords.get(i));
                }
            }
        }

        ObjectNode resp = MAPPER.createObjectNode();
        resp.set("exports", results);
        HttpApiUtils.sendJson(exchange, 200, resp.toString());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private String readBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private String str(Map<?, ?> map, String key) {
        Object val = map.get(key);
        return val instanceof String s ? s : null;
    }
}
