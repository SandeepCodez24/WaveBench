package com.wavebench.gateway;

import java.io.*;

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
        // 0. Spawn C++ Simulation Engine subprocess
        // ------------------------------------------------------------------
        Process cppProcess = null;
        try {
            String os = System.getProperty("os.name").toLowerCase();
            File exeFile = new File("backend", os.contains("win") ? "build\\wavebench_engine.exe" : "build/wavebench_engine");
            
            if (!exeFile.exists()) {
                System.err.println("[Gateway] ERROR: C++ Engine executable not found at: " + exeFile.getAbsolutePath());
            } else {
                System.out.println("[Gateway] Starting C++ Engine subprocess at: " + exeFile.getAbsolutePath());
                ProcessBuilder pb = new ProcessBuilder(exeFile.getAbsolutePath());
                pb.directory(exeFile.getParentFile());
                pb.inheritIO();
                cppProcess = pb.start();
                System.out.println("[Gateway] C++ Engine subprocess spawned successfully.");
            }
        } catch (Exception e) {
            System.err.println("[Gateway] Failed to start C++ subprocess: " + e.getMessage());
        }

        final Process finalCppProcess = cppProcess;

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
        // 2.5 Start C++ standard error tailing thread
        // ------------------------------------------------------------------
        if (finalCppProcess != null) {
            Thread stderrThread = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(finalCppProcess.getErrorStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        server.broadcastLog(line);
                    }
                } catch (IOException e) {
                    System.err.println("[Gateway] Error reading C++ stderr: " + e.getMessage());
                }
            }, "cpp-stderr-reader");
            stderrThread.setDaemon(true);
            stderrThread.start();
        }

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
            if (finalCppProcess != null) {
                System.out.println("[Gateway] Stopping C++ engine subprocess...");
                finalCppProcess.destroy();
            }
            System.out.println("[Gateway] Shutdown complete.");
        }, "shutdown-hook"));

        // Keep the main thread alive — the server and engine reader run on
        // daemon/background threads, so without this the JVM would exit.
        Thread.currentThread().join();
    }
}
