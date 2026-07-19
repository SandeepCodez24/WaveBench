package com.wavebench.gateway;

import java.io.*;
import java.net.Socket;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

/**
 * EngineClient — Plain TCP client that connects to the C++ simulation engine
 * on localhost:5050.
 *
 * <p>Responsibilities:
 * <ul>
 *   <li>Establish a TCP connection with a retry loop (C++ may not be up yet)</li>
 *   <li>Receive newline-delimited JSON samples from C++ on a background thread</li>
 *   <li>Forward each sample to an {@code onSample} callback (→ WebSocket broadcast)</li>
 *   <li>Send JSON command strings (start/stop/config) to C++ from any thread</li>
 * </ul>
 *
 * <p>Thread safety: {@code send()} is synchronised so the WebSocket handler
 * thread and any other callers can call it concurrently without interleaving.
 */
public class EngineClient {

    private volatile PrintWriter   out;
    private volatile Socket        socket;
    private final AtomicBoolean    connected = new AtomicBoolean(false);
    private volatile Consumer<String> onLog;

    public void setLogCallback(Consumer<String> onLog) {
        this.onLog = onLog;
    }

    private void log(String level, String msg) {
        if (onLog != null) {
            onLog.accept(String.format(
                "{\"type\":\"log\",\"level\":\"%s\",\"src\":\"gateway\",\"msg\":\"%s\"}",
                level, msg.replace("\\", "\\\\").replace("\"", "\\\"")
            ));
        }
        System.out.printf("[%s] GATEWAY  %s%n", level.toUpperCase(), msg);
    }

    // -------------------------------------------------------------------------
    // Connection
    // -------------------------------------------------------------------------

    /**
     * Attempts to connect to the C++ engine, retrying up to {@code maxRetries}
     * times with a 500 ms gap.  Once connected, starts a daemon reader thread
     * that invokes {@code onSample} for every complete JSON line received.
     *
     * @param host       hostname of the C++ engine  (typically "localhost")
     * @param port       TCP port of the C++ engine  (5050)
     * @param onSample   callback invoked on the reader thread for every sample line
     */
    public void connect(String host, int port, Consumer<String> onSample)
            throws IOException, InterruptedException {

        final int maxRetries    = 15;
        final int retryDelayMs  = 500;

        socket = null;
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                socket = new Socket(host, port);
                break;
            } catch (IOException e) {
                log("info", String.format("Waiting for C++ engine... (attempt %d/%d)", attempt, maxRetries));
                Thread.sleep(retryDelayMs);
            }
        }

        if (socket == null) {
            throw new IOException(
                "Could not connect to C++ engine at " + host + ":" + port
                + " after " + maxRetries + " attempts.");
        }

        // Auto-flush PrintWriter sends each println() immediately (no buffering)
        out = new PrintWriter(new BufferedWriter(
                new OutputStreamWriter(socket.getOutputStream())), true);
        connected.set(true);
        log("info", "Connected to C++ engine at " + host + ":" + port);

        // ---- background reader ----
        final Socket finalSocket = socket;
        Thread reader = new Thread(() -> {
            try (var in = new BufferedReader(
                    new InputStreamReader(finalSocket.getInputStream()))) {
                String line;
                while ((line = in.readLine()) != null) {
                    onSample.accept(line);
                }
            } catch (IOException e) {
                // Normal path when C++ closes the connection
                log("warning", "C++ engine disconnected.");
            } finally {
                connected.set(false);
            }
        }, "engine-reader");
        reader.setDaemon(true);
        reader.start();
    }

    // -------------------------------------------------------------------------
    // Sending commands to C++
    // -------------------------------------------------------------------------

    /**
     * Sends a JSON command string to the C++ engine, appending a newline.
     * This method is thread-safe; it does nothing if not currently connected.
     *
     * @param json  a complete JSON object string, e.g. {@code {"type":"start"}}
     */
    public synchronized void send(String json) {
        if (connected.get() && out != null) {
            out.println(json);   // println appends '\n'; auto-flush sends it immediately
        } else {
            log("warning", "send() ignored — not connected to C++ engine.");
        }
    }

    // -------------------------------------------------------------------------
    // State query
    // -------------------------------------------------------------------------

    /** @return true if the TCP connection to the C++ engine is established */
    public boolean isConnected() {
        return connected.get();
    }

    /** Closes the underlying socket, stopping the reader thread. */
    public void disconnect() {
        try {
            if (socket != null && !socket.isClosed()) {
                socket.close();
            }
        } catch (IOException e) {
            log("error", "Error closing engine socket: " + e.getMessage());
        }
        connected.set(false);
    }
}
