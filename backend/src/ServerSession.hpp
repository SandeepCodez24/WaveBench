#pragma once
// ============================================================================
// ServerSession.hpp — TCP server for communicating with the Java gateway.
//
// Uses Winsock2 for Windows TCP networking.
// The server:
//   1. Binds to a port (5050) and waits for the Java gateway to connect.
//   2. Receives newline-delimited JSON commands on a background thread.
//   3. Sends newline-delimited JSON samples back to the gateway.
//
// Thread safety:
//   - sendMutex_ guards the send socket so the simulation thread and the
//     main thread can both send without corrupting each other's data.
//   - The receive thread is detached — it runs until the socket closes.
// ============================================================================

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif

#include <winsock2.h>
#include <ws2tcpip.h>
#include <string>
#include <functional>
#include <mutex>
#include <atomic>

class ServerSession {
public:
    using MessageHandler = std::function<void(const std::string&)>;

    ServerSession();
    ~ServerSession();

    // Bind and listen on the given TCP port. Returns false on failure.
    bool listen(int port);

    // Block until a client connects (the Java gateway). Returns false on failure.
    bool acceptClient();

    // Start a background thread that reads newline-delimited JSON from the client.
    // Each complete line is passed to `handler`.
    void startReceiving(MessageHandler handler);

    // Send a single JSON line to the connected client (appends '\n').
    // Thread-safe — can be called from the simulation thread.
    void sendLine(const std::string& json);

    // Gracefully close all sockets and clean up Winsock.
    void close();

    // Check if a client is currently connected
    bool isConnected() const { return connected_.load(); }

private:
    SOCKET serverSock_ = INVALID_SOCKET;
    SOCKET clientSock_ = INVALID_SOCKET;
    std::mutex sendMutex_;
    std::atomic<bool> connected_{false};
    bool wsaInitialized_ = false;
};
