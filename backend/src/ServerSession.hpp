#pragma once
// ============================================================================
// ServerSession.hpp — Cross-platform TCP server for the Java gateway.
//
// Uses POSIX sockets on Linux/macOS and Winsock2 on Windows.
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

#ifdef _WIN32
  #ifndef WIN32_LEAN_AND_MEAN
  #define WIN32_LEAN_AND_MEAN
  #endif
  #include <winsock2.h>
  #include <ws2tcpip.h>
  // On Windows, SOCKET is a UINT_PTR; INVALID_SOCKET and SOCKET_ERROR are defined.
  using socket_t = SOCKET;
  static constexpr socket_t INVALID_SOCK = INVALID_SOCKET;
#else
  // POSIX (Linux / macOS)
  #include <sys/types.h>
  #include <sys/socket.h>
  #include <netinet/in.h>
  #include <netinet/tcp.h>
  #include <unistd.h>
  #include <cerrno>
  #include <cstring>
  using socket_t = int;
  static constexpr socket_t INVALID_SOCK = -1;
#endif

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

    // Close only the client socket, keeping the server socket alive so
    // acceptClient() can be called again when the gateway reconnects.
    void disconnect();

    // Gracefully close all sockets and clean up resources (full shutdown).
    void close();

    // Check if a client is currently connected
    bool isConnected() const { return connected_.load(); }

private:
    socket_t serverSock_ = INVALID_SOCK;
    socket_t clientSock_ = INVALID_SOCK;
    std::mutex sendMutex_;
    std::atomic<bool> connected_{false};

#ifdef _WIN32
    bool wsaInitialized_ = false;
#endif

    // Cross-platform socket close helper
    static void closeSocket(socket_t s);
};
