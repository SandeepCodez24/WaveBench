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
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Instant;

/**
 * ProjectHandler — REST endpoints for per-user project persistence.
 *
 * <p>Projects are stored as JSON files in {@code saved_projects/{userId}/{name}.json}.
 * This reuses the same directory structure as the existing flat-file WebSocket
 * save/load, but now scoped to the authenticated user's ID.
 *
 * <p>Routes:
 * <ul>
 *   <li>{@code GET  /api/projects}        — list all projects for the user</li>
 *   <li>{@code POST /api/projects}        — save (upsert) a project</li>
 *   <li>{@code GET  /api/projects/{name}} — load a specific project</li>
 *   <li>{@code DELETE /api/projects/{name}} — delete a specific project</li>
 * </ul>
 *
 * <p>All endpoints require a valid Bearer JWT token.
 */
public class ProjectHandler implements HttpHandler {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String BASE_DIR = "saved_projects";

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        HttpApiUtils.addCorsHeaders(exchange);

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        String userId = HttpApiUtils.requireAuth(exchange);
        if (userId == null) return; // 401 already sent

        String method = exchange.getRequestMethod();
        String path   = exchange.getRequestURI().getPath(); // e.g. /api/projects or /api/projects/MyCircuit

        // Strip /api/projects prefix
        String sub = path.replaceFirst("^/api/projects/?", "");
        String projectName = sub.isBlank() ? null : sub;

        if ("GET".equalsIgnoreCase(method) && projectName == null) {
            handleList(exchange, userId);
        } else if ("POST".equalsIgnoreCase(method) && projectName == null) {
            handleSave(exchange, userId);
        } else if ("GET".equalsIgnoreCase(method) && projectName != null) {
            handleLoad(exchange, userId, projectName);
        } else if ("DELETE".equalsIgnoreCase(method) && projectName != null) {
            handleDelete(exchange, userId, projectName);
        } else {
            HttpApiUtils.sendJson(exchange, 404, "{\"error\":\"Not found\"}");
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/projects
    // -------------------------------------------------------------------------

    private void handleList(HttpExchange exchange, String userId) throws IOException {
        File dir = userDir(userId);
        ArrayNode projects = MAPPER.createArrayNode();

        if (dir.exists() && dir.isDirectory()) {
            File[] files = dir.listFiles((d, name) -> name.endsWith(".json"));
            if (files != null) {
                for (File f : files) {
                    try {
                        ObjectNode proj = (ObjectNode) MAPPER.readTree(f);
                        // Return lightweight metadata only (no full diagram blob)
                        ObjectNode meta = MAPPER.createObjectNode();
                        meta.put("name",        f.getName().replace(".json", ""));
                        meta.put("description", proj.path("description").asText(""));
                        meta.put("updatedAt",   proj.path("updatedAt").asText(Instant.now().toString()));
                        projects.add(meta);
                    } catch (Exception e) {
                        // Skip corrupt files silently
                    }
                }
            }
        }

        ObjectNode resp = MAPPER.createObjectNode();
        resp.set("projects", projects);
        HttpApiUtils.sendJson(exchange, 200, resp.toString());
    }

    // -------------------------------------------------------------------------
    // POST /api/projects
    // -------------------------------------------------------------------------

    private void handleSave(HttpExchange exchange, String userId) throws IOException {
        String raw = readBody(exchange);
        ObjectNode body;
        try {
            body = (ObjectNode) MAPPER.readTree(raw);
        } catch (Exception e) {
            HttpApiUtils.sendJson(exchange, 400, "{\"error\":\"Invalid JSON\"}");
            return;
        }

        String name = body.path("name").asText("").trim();
        if (name.isBlank()) {
            HttpApiUtils.sendJson(exchange, 400, "{\"error\":\"Project name required\"}");
            return;
        }

        // Sanitize name — allow alphanumeric, spaces, hyphens, underscores
        name = name.replaceAll("[^a-zA-Z0-9_\\-\\s]", "").trim();
        if (name.isBlank()) {
            HttpApiUtils.sendJson(exchange, 400, "{\"error\":\"Invalid project name\"}");
            return;
        }

        body.put("updatedAt", Instant.now().toString());
        if (!body.has("createdAt")) body.put("createdAt", Instant.now().toString());

        File dir = userDir(userId);
        if (!dir.exists()) dir.mkdirs();

        File file = new File(dir, name + ".json");
        try (FileWriter fw = new FileWriter(file)) {
            fw.write(MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(body));
        }

        System.out.println("[Projects] Saved project '" + name + "' for user " + userId);
        HttpApiUtils.sendJson(exchange, 200,
            "{\"status\":\"saved\",\"name\":\"" + name + "\"}");
    }

    // -------------------------------------------------------------------------
    // GET /api/projects/{name}
    // -------------------------------------------------------------------------

    private void handleLoad(HttpExchange exchange, String userId, String name) throws IOException {
        name = name.replaceAll("[^a-zA-Z0-9_\\-\\s]", "").trim();
        File file = new File(userDir(userId), name + ".json");
        if (!file.exists()) {
            HttpApiUtils.sendJson(exchange, 404, "{\"error\":\"Project not found: " + name + "\"}");
            return;
        }

        String content = Files.readString(file.toPath(), StandardCharsets.UTF_8);
        System.out.println("[Projects] Loaded project '" + name + "' for user " + userId);
        HttpApiUtils.sendJson(exchange, 200, content);
    }

    // -------------------------------------------------------------------------
    // DELETE /api/projects/{name}
    // -------------------------------------------------------------------------

    private void handleDelete(HttpExchange exchange, String userId, String name) throws IOException {
        name = name.replaceAll("[^a-zA-Z0-9_\\-\\s]", "").trim();
        File file = new File(userDir(userId), name + ".json");
        if (!file.exists()) {
            HttpApiUtils.sendJson(exchange, 404, "{\"error\":\"Project not found\"}");
            return;
        }
        file.delete();
        System.out.println("[Projects] Deleted project '" + name + "' for user " + userId);
        HttpApiUtils.sendJson(exchange, 200, "{\"status\":\"deleted\"}");
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private File userDir(String userId) {
        return new File(BASE_DIR, userId);
    }

    private String readBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
