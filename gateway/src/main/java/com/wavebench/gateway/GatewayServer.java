package com.wavebench.gateway;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;
import java.util.Collection;

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
        System.out.println("[Gateway] Browser → C++: " + message);
        engine.send(message);
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
