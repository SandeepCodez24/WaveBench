package com.wavebench.gateway;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;
import java.util.Collection;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * GatewayServer — WebSocket server that acts as the protocol bridge between
 * browser clients and the C++ simulation engine.
 *
 * <p>Data flow:
 * <pre>
 *   Browser  --[WS JSON command]-->  GatewayServer.onMessage()  --> EngineClient.send()  --> C++
 *   C++      --[TCP JSON sample]-->  EngineClient reader thread  --> GatewayServer.broadcastSample()  --> All browsers
 * </pre>
 *
 * <p>The server listens on {@code ws://localhost:8080}.  Multiple browser tabs
 * can connect simultaneously; all receive the same sample stream.
 */
public class GatewayServer extends WebSocketServer {

    private final EngineClient engine;
    private final long startTimeMs = System.currentTimeMillis();

    // -------------------------------------------------------------------------
    // Construction
    // -------------------------------------------------------------------------

    /**
     * @param port    WebSocket port (8080)
     * @param engine  connected {@link EngineClient} — must already be connected
     *                (or connecting) before {@link #start()} is called
     */
    public GatewayServer(int port, EngineClient engine) {
        super(new InetSocketAddress(port));
        this.engine = engine;
        setReuseAddr(true);          // allow quick restart without "address already in use"
        setConnectionLostTimeout(30); // ping browsers every 30 s to keep connections alive
    }

    // -------------------------------------------------------------------------
    // WebSocketServer callbacks
    // -------------------------------------------------------------------------

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        System.out.println("[Gateway] Browser connected:    " + conn.getRemoteSocketAddress());
        System.out.println("[Gateway] Active connections: " + getConnections().size());
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        System.out.printf("[Gateway] Browser disconnected  (code=%d reason='%s' remote=%b)%n",
                code, reason, remote);
        System.out.println("[Gateway] Active connections: " + getConnections().size());
    }

    /**
     * Called whenever a browser sends a JSON message.
     * All commands are forwarded verbatim to the C++ engine over TCP.
     *
     * <p>Expected message types:
     * <ul>
     *   <li>{@code {"type":"start"}}</li>
     *   <li>{@code {"type":"stop"}}</li>
     *   <li>{@code {"type":"config","stepSize":0.02,"solver":"RK4"}}</li>
     *   <li>{@code {"type":"setStepSize","value":0.05}}</li>
     *   <li>{@code {"type":"setSolver","value":"Euler"}}</li>
     *   <li>{@code {"type":"ping"}}</li>
     * </ul>
     */
    @Override
    public void onMessage(WebSocket conn, String message) {
        if (message.contains("\"type\":\"save_project\"")) {
            handleSaveProject(conn, message);
        } else if (message.contains("\"type\":\"load_project\"")) {
            handleLoadProject(conn, message);
        } else if (message.contains("\"type\":\"list_projects\"")) {
            handleListProjects(conn);
        } else if (message.contains("\"type\":\"get_diagnostics\"")) {
            // Diagnostics: reply inline (no C++ round-trip needed for gateway stats)
            handleGetDiagnostics(conn);
        } else if (message.contains("\"type\":\"reset\"")
                || message.contains("\"type\":\"set_speed\"")
                || message.contains("\"type\":\"set_stop_time\"")
                || message.contains("\"type\":\"get_status\"")) {
            // New engine-control commands — forward directly to C++
            System.out.println("[Gateway] Browser → C++ (engine cmd): " + message);
            engine.send(message);
        } else {
            System.out.println("[Gateway] Browser → C++: " + message);
            engine.send(message);
        }
    }

    private void handleGetDiagnostics(WebSocket conn) {
        long uptimeMs = System.currentTimeMillis() - startTimeMs;
        int clients = getConnections().size();
        String response = String.format(
            "{\"type\":\"diagnostics\",\"gatewayUptimeMs\":%d,\"connectedClients\":%d,\"gatewayVersion\":\"1.0.0\"}",
            uptimeMs, clients
        );
        conn.send(response);
        System.out.println("[Gateway] Sent diagnostics to client.");
    }

    private void handleSaveProject(WebSocket conn, String message) {
        System.out.println("[Gateway] Handling save_project request");
        String name = extractJsonValue(message, "name");
        if (name == null || name.trim().isEmpty()) {
            conn.send("{\"type\":\"error\",\"message\":\"Project name is empty\"}");
            return;
        }

        // Clean name to avoid directory traversal
        name = name.replaceAll("[^a-zA-Z0-9_\\-\\s]", "").trim();
        if (name.isEmpty()) {
            conn.send("{\"type\":\"error\",\"message\":\"Invalid project name\"}");
            return;
        }

        try {
            File dir = new File("saved_projects");
            if (!dir.exists()) {
                dir.mkdir();
            }

            File file = new File(dir, name + ".json");
            try (FileWriter writer = new FileWriter(file)) {
                writer.write(message);
            }
            System.out.println("[Gateway] Saved project: " + file.getAbsolutePath());
            conn.send("{\"type\":\"save_success\",\"name\":\"" + name + "\"}");
        } catch (IOException e) {
            System.err.println("[Gateway] Save project failed: " + e.getMessage());
            conn.send("{\"type\":\"error\",\"message\":\"Failed to write project file\"}");
        }
    }

    private void handleLoadProject(WebSocket conn, String message) {
        System.out.println("[Gateway] Handling load_project request");
        String name = extractJsonValue(message, "name");
        if (name == null || name.trim().isEmpty()) {
            conn.send("{\"type\":\"error\",\"message\":\"Project name is empty\"}");
            return;
        }

        name = name.replaceAll("[^a-zA-Z0-9_\\-\\s]", "").trim();
        File file = new File("saved_projects", name + ".json");
        if (!file.exists()) {
            conn.send("{\"type\":\"error\",\"message\":\"Project not found: " + name + "\"}");
            return;
        }

        try {
            String content = new String(Files.readAllBytes(Paths.get(file.getPath())));
            content = content.replaceFirst("\"type\":\"save_project\"", "\"type\":\"project_loaded\"");
            conn.send(content);
            System.out.println("[Gateway] Loaded project: " + file.getAbsolutePath());
        } catch (IOException e) {
            System.err.println("[Gateway] Load project failed: " + e.getMessage());
            conn.send("{\"type\":\"error\",\"message\":\"Failed to read project file\"}");
        }
    }

    private void handleListProjects(WebSocket conn) {
        System.out.println("[Gateway] Handling list_projects request");
        File dir = new File("saved_projects");
        List<String> projectNames = new ArrayList<>();
        if (dir.exists() && dir.isDirectory()) {
            File[] files = dir.listFiles((d, name) -> name.endsWith(".json"));
            if (files != null) {
                for (File f : files) {
                    String filename = f.getName();
                    projectNames.add(filename.substring(0, filename.length() - 5)); // strip ".json"
                }
            }
        }

        StringBuilder sb = new StringBuilder();
        sb.append("{\"type\":\"project_list\",\"projects\":[");
        for (int i = 0; i < projectNames.size(); i++) {
            sb.append("\"").append(projectNames.get(i)).append("\"");
            if (i < projectNames.size() - 1) {
                sb.append(",");
            }
        }
        sb.append("]}");
        conn.send(sb.toString());
    }

    private String extractJsonValue(String json, String key) {
        String needle = "\"" + key + "\":\"";
        int pos = json.indexOf(needle);
        if (pos == -1) {
            return null;
        }
        pos += needle.length();
        int end = json.indexOf("\"", pos);
        if (end == -1) return null;
        return json.substring(pos, end);
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        String remote = (conn != null) ? conn.getRemoteSocketAddress().toString() : "unknown";
        System.err.println("[Gateway] WebSocket error from " + remote + ": " + ex.getMessage());
        ex.printStackTrace();
    }

    @Override
    public void onStart() {
        System.out.println("[Gateway] WebSocket server started — listening on ws://localhost:" + getPort());
    }

    // -------------------------------------------------------------------------
    // Outbound broadcasting
    // -------------------------------------------------------------------------

    /**
     * Broadcast a JSON sample string to every connected browser.
     * Called from the EngineClient's reader thread each time C++ sends a sample.
     *
     * @param json  a complete JSON sample, e.g.
     *              {@code {"type":"sample","t":0.02,"sin":0.02,"cos":0.9998}}
     */
    public void broadcastSample(String json) {
        Collection<WebSocket> clients = getConnections();
        if (clients.isEmpty()) return;   // no browsers — avoid unnecessary work

        broadcast(json);                 // thread-safe broadcast provided by java_websocket
    }

    /**
     * Returns the number of currently connected browser clients.
     */
    public int connectedClientCount() {
        return getConnections().size();
    }
}
