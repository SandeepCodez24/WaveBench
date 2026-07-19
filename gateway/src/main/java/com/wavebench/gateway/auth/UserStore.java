package com.wavebench.gateway.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.File;
import java.io.IOException;
import java.time.Instant;
import java.util.UUID;

/**
 * UserStore — flat-file user persistence using a JSON array in users.json.
 *
 * <p>
 * Format of users.json:
 *
 * <pre>
 * [
 *   {"id":"uuid","email":"a@b.com","passwordHash":"$2a$...","displayName":"Alice",
 *    "organization":"MIT","role":"student","createdAt":"2024-01-01T00:00:00Z"}
 * ]
 * </pre>
 *
 * <p>
 * Thread-safety: all public methods are synchronized on the file lock.
 * Suitable for a single-node dev/demo setup. Upgrade path: swap this class
 * for a Spring Data JPA repository without touching any call sites.
 */
public class UserStore {

    private static final String USERS_FILE = "users.json";
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Object FILE_LOCK = new Object();

    // -------------------------------------------------------------------------
    // Read helpers
    // -------------------------------------------------------------------------

    /**
     * Returns the entire users array, creating an empty one if the file is absent.
     */
    private static ArrayNode readAll() {
        File file = new File(USERS_FILE);
        if (!file.exists())
            return MAPPER.createArrayNode();
        try {
            byte[] bytes = java.nio.file.Files.readAllBytes(file.toPath());
            String content = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
            return (ArrayNode) MAPPER.readTree(content);
        } catch (IOException e) {
            System.err.println("[UserStore] Failed to read users.json: " + e.getMessage());
            return MAPPER.createArrayNode();
        }
    }

    /** Persists the given array back to users.json. */
    private static void writeAll(ArrayNode users) throws IOException {
        try (java.io.BufferedWriter writer = java.nio.file.Files.newBufferedWriter(java.nio.file.Paths.get(USERS_FILE),
                java.nio.charset.StandardCharsets.UTF_8)) {
            writer.write(MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(users));
        }
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /** Returns true if a user with the given email already exists. */
    public static boolean existsByEmail(String email) {
        synchronized (FILE_LOCK) {
            for (var node : readAll()) {
                if (email.equalsIgnoreCase(node.path("email").asText()))
                    return true;
            }
            return false;
        }
    }

    /**
     * Creates a new user and persists it.
     *
     * @param email        raw email (lowercased before storing)
     * @param passwordHash BCrypt hash of the password
     * @param displayName  user's display name
     * @param organization college / company (may be empty)
     * @param role         student / developer / researcher
     * @return the newly created user as an ObjectNode (includes generated id)
     */
    public static ObjectNode createUser(String email, String passwordHash,
            String displayName, String organization,
            String role) throws IOException {
        synchronized (FILE_LOCK) {
            ArrayNode users = readAll();

            ObjectNode user = MAPPER.createObjectNode();
            user.put("id", UUID.randomUUID().toString());
            user.put("email", email.toLowerCase().trim());
            user.put("passwordHash", passwordHash);
            user.put("displayName", displayName.trim());
            user.put("organization", organization == null ? "" : organization.trim());
            user.put("role", role == null ? "student" : role.trim());
            user.put("createdAt", Instant.now().toString());

            users.add(user);
            writeAll(users);
            return user;
        }
    }

    /**
     * Looks up a user by email (case-insensitive).
     *
     * @return the user ObjectNode, or {@code null} if not found
     */
    public static ObjectNode findByEmail(String email) {
        synchronized (FILE_LOCK) {
            for (var node : readAll()) {
                if (email.equalsIgnoreCase(node.path("email").asText())) {
                    return (ObjectNode) node;
                }
            }
            return null;
        }
    }

    /**
     * Looks up a user by ID.
     *
     * @return the user ObjectNode, or {@code null} if not found
     */
    public static ObjectNode findById(String id) {
        synchronized (FILE_LOCK) {
            for (var node : readAll()) {
                if (id.equals(node.path("id").asText())) {
                    return (ObjectNode) node;
                }
            }
            return null;
        }
    }

    /**
     * Returns a sanitized public view of a user (no passwordHash).
     */
    public static ObjectNode toPublicProfile(ObjectNode user) {
        ObjectNode pub = MAPPER.createObjectNode();
        pub.put("id", user.path("id").asText());
        pub.put("email", user.path("email").asText());
        pub.put("displayName", user.path("displayName").asText());
        pub.put("organization", user.path("organization").asText());
        pub.put("role", user.path("role").asText());
        pub.put("createdAt", user.path("createdAt").asText());
        return pub;
    }
}
