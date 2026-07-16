package com.wavebench.gateway;

/**
 * Main — Entry point for the WaveBench Studio Java Gateway.
 *
 * <p>Startup sequence:
 * <ol>
 *   <li>Start the REST HTTP API server on port 8081 (auth, projects, exports)</li>
 *   <li>Create a {@link GatewayServer} (WebSocket on port 8080) — not started yet</li>
 *   <li>Connect {@link EngineClient} to the C++ engine (TCP localhost:5050),
 *       wiring the sample callback to {@code server.broadcastSample()} directly</li>
 *   <li>Start the WebSocket server so browsers can connect</li>
 *   <li>Register a JVM shutdown hook for graceful teardown</li>
 * </ol>
 *
 * <p>Run with:
 * <pre>
 *   mvn -f gateway/pom.xml exec:java
 * </pre>
 */
public class Main {

    /** WebSocket port that browsers connect to */
    public static final int WS_PORT     = 8080;

    /** REST API port for auth, projects, and exports */
    public static final int HTTP_PORT   = 8081;

    /** TCP port the C++ engine listens on */
    public static final int ENGINE_PORT = 5050;

    /** Hostname of the C++ engine (always localhost in this setup) */
    public static final String ENGINE_HOST = "localhost";

    public static void main(String[] args) throws Exception {
        System.out.println("============================================");
        System.out.println("  WaveBench Studio — Java Gateway v2.0");
        System.out.println("============================================");

        // ------------------------------------------------------------------
        // 1. Start the REST API server (auth, projects, exports)
        // ------------------------------------------------------------------
        HttpApiServer httpApi = new HttpApiServer();
        httpApi.start();

        // ------------------------------------------------------------------
        // 2. Create the WebSocket server (not started yet — we need the
        //    reference before connecting so we can wire the broadcast lambda)
        // ------------------------------------------------------------------
        EngineClient engine = new EngineClient();

        GatewayServer server = new GatewayServer(WS_PORT, engine);

        // ------------------------------------------------------------------
        // 3. Connect to the C++ engine.
        //    The onSample lambda runs on the reader thread and broadcasts
        //    each sample directly to all connected browser WebSocket clients.
        // ------------------------------------------------------------------
        System.out.println("[Gateway] Connecting to C++ engine at "
                + ENGINE_HOST + ":" + ENGINE_PORT + "...");

        engine.connect(ENGINE_HOST, ENGINE_PORT, sample -> {
            // Forward every sample from C++ to all browser clients
            server.broadcastSample(sample);
        });

        // ------------------------------------------------------------------
        // 4. Start the WebSocket server — browsers can now connect
        // ------------------------------------------------------------------
        server.start();
        System.out.println("[Gateway] Ready.");
        System.out.println("[Gateway]   WebSocket: ws://localhost:" + WS_PORT);
        System.out.println("[Gateway]   REST API:  http://localhost:" + HTTP_PORT);
        System.out.println("[Gateway]   C++ Engine: localhost:" + ENGINE_PORT);
        System.out.println("[Gateway] Awaiting browser connections...");

        // ------------------------------------------------------------------
        // 5. Shutdown hook — cleanly close everything on Ctrl+C / kill
        // ------------------------------------------------------------------
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("\n[Gateway] Shutting down...");
            try {
                server.stop(1000);    // wait up to 1 s for in-flight messages
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            engine.disconnect();
            httpApi.stop(2);
            System.out.println("[Gateway] Shutdown complete.");
        }, "shutdown-hook"));

        // Keep the main thread alive — the server and engine reader run on
        // daemon/background threads, so without this the JVM would exit.
        Thread.currentThread().join();
    }
}
