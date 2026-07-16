package com.wavebench.gateway;

import com.sun.net.httpserver.HttpServer;
import com.wavebench.gateway.api.ExportHandler;
import com.wavebench.gateway.api.ProjectHandler;
import com.wavebench.gateway.auth.AuthHandler;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

/**
 * HttpApiServer — lightweight REST API server for WaveBench Studio.
 *
 * <p>Uses the built-in {@code com.sun.net.httpserver.HttpServer} (JDK 11+),
 * so no extra Maven dependencies are required beyond the auth/JWT libs.
 * Runs on port 8081, keeping it separate from the WebSocket server on 8080.
 *
 * <p>Routes registered:
 * <ul>
 *   <li>{@code /api/auth/}     → {@link AuthHandler}</li>
 *   <li>{@code /api/projects}  → {@link ProjectHandler}</li>
 *   <li>{@code /api/exports}   → {@link ExportHandler}</li>
 * </ul>
 *
 * <p>A thread pool of 4 workers handles concurrent requests, which is more
 * than sufficient for a single-user or small-team setup.
 */
public class HttpApiServer {

    public static final int HTTP_PORT = 8081;

    private final HttpServer server;

    // -------------------------------------------------------------------------
    // Construction
    // -------------------------------------------------------------------------

    /**
     * Creates and configures the HTTP server. Call {@link #start()} to begin
     * accepting connections.
     *
     * @throws IOException if the port is already in use or another I/O error occurs
     */
    public HttpApiServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress(HTTP_PORT), 0);

        // Auth endpoints: signup, login, me
        server.createContext("/api/auth/", new AuthHandler());

        // Project CRUD — note: also handles /api/projects/{name} via prefix routing in the handler
        server.createContext("/api/projects", new ProjectHandler());

        // Export history log
        server.createContext("/api/exports", new ExportHandler());

        // Use a fixed thread pool for parallel request handling
        server.setExecutor(Executors.newFixedThreadPool(4));
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    /**
     * Starts the HTTP server and begins accepting REST requests.
     */
    public void start() {
        server.start();
        System.out.println("[HttpAPI] REST API server started — listening on http://localhost:" + HTTP_PORT);
        System.out.println("[HttpAPI]   Auth:     http://localhost:" + HTTP_PORT + "/api/auth/");
        System.out.println("[HttpAPI]   Projects: http://localhost:" + HTTP_PORT + "/api/projects");
        System.out.println("[HttpAPI]   Exports:  http://localhost:" + HTTP_PORT + "/api/exports");
    }

    /**
     * Gracefully stops the HTTP server, waiting up to {@code delaySeconds}
     * for in-flight requests to complete.
     *
     * @param delaySeconds seconds to wait for active requests before forcing shutdown
     */
    public void stop(int delaySeconds) {
        server.stop(delaySeconds);
        System.out.println("[HttpAPI] REST API server stopped.");
    }
}
