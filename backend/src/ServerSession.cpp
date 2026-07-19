// ============================================================================
// ServerSession.cpp — Winsock2 TCP server implementation.
//
// Handles the full lifecycle:
//   1. WSAStartup / WSACleanup
//   2. Socket creation, bind, listen
//   3. Blocking accept (waits for Java gateway)
//   4. Background receive thread (newline-delimited JSON parsing)
//   5. Thread-safe sendLine for pushing samples
//   6. Graceful shutdown with proper socket cleanup
//
// Error handling:
//   - All Winsock calls are checked for errors
//   - SO_REUSEADDR is set so the port can be rebound quickly after restart
//   - recv loop handles partial reads and TCP message framing correctly
// ============================================================================

#include "ServerSession.hpp"
#include <iostream>
#include <thread>

ServerSession::ServerSession() = default;

ServerSession::~ServerSession() {
    close();
}

bool ServerSession::listen(int port) {
    // Initialize Winsock
    WSADATA wsa;
    int result = WSAStartup(MAKEWORD(2, 2), &wsa);
    if (result != 0) {
        std::cerr << "[C++] WSAStartup failed with error: " << result << "\n";
        return false;
    }
    wsaInitialized_ = true;

    // Create the listening socket
    serverSock_ = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (serverSock_ == INVALID_SOCKET) {
        std::cerr << "[C++] socket() failed with error: "
                  << WSAGetLastError() << "\n";
        WSACleanup();
        wsaInitialized_ = false;
        return false;
    }

    // Allow quick port reuse after restart (avoids "Address already in use")
    int optVal = 1;
    setsockopt(serverSock_, SOL_SOCKET, SO_REUSEADDR,
               reinterpret_cast<const char*>(&optVal), sizeof(optVal));

    // Bind to the specified port on all interfaces
    sockaddr_in addr{};
    addr.sin_family      = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port        = htons(static_cast<u_short>(port));

    if (bind(serverSock_, reinterpret_cast<sockaddr*>(&addr),
             sizeof(addr)) == SOCKET_ERROR) {
        std::cerr << "[C++] bind() failed with error: "
                  << WSAGetLastError() << "\n";
        closesocket(serverSock_);
        serverSock_ = INVALID_SOCKET;
        WSACleanup();
        wsaInitialized_ = false;
        return false;
    }

    // Start listening (backlog of 1 — only one gateway connects)
    if (::listen(serverSock_, 1) == SOCKET_ERROR) {
        std::cerr << "[C++] listen() failed with error: "
                  << WSAGetLastError() << "\n";
        closesocket(serverSock_);
        serverSock_ = INVALID_SOCKET;
        WSACleanup();
        wsaInitialized_ = false;
        return false;
    }

    return true;
}

bool ServerSession::acceptClient() {
    if (serverSock_ == INVALID_SOCKET) {
        std::cerr << "[C++] Cannot accept — server socket not initialized.\n";
        return false;
    }

    clientSock_ = accept(serverSock_, nullptr, nullptr);
    if (clientSock_ == INVALID_SOCKET) {
        std::cerr << "[C++] accept() failed with error: "
                  << WSAGetLastError() << "\n";
        return false;
    }

    connected_ = true;

    // Disable Nagle's algorithm for low-latency sample streaming
    int flag = 1;
    setsockopt(clientSock_, IPPROTO_TCP, TCP_NODELAY,
               reinterpret_cast<const char*>(&flag), sizeof(flag));

    return true;
}

void ServerSession::startReceiving(MessageHandler handler) {
    std::thread([this, handler]() {
        constexpr int BUF_SIZE = 4096;
        char buf[BUF_SIZE];
        std::string partial;

        while (connected_) {
            int bytesRead = recv(clientSock_, buf, BUF_SIZE - 1, 0);

            if (bytesRead <= 0) {
                // Connection closed or error
                if (bytesRead == 0) {
                    std::cout << "[C++] Gateway disconnected gracefully.\n";
                } else {
                    int err = WSAGetLastError();
                    // WSAECONNRESET = 10054, normal during shutdown
                    if (err != WSAECONNRESET && err != WSAEINTR) {
                        std::cerr << "[C++] recv() error: " << err << "\n";
                    }
                }
                connected_ = false;
                break;
            }

            // Null-terminate and append to partial buffer
            buf[bytesRead] = '\0';
            partial += buf;

            // Process all complete newline-delimited messages
            size_t pos;
            while ((pos = partial.find('\n')) != std::string::npos) {
                std::string line = partial.substr(0, pos);
                partial = partial.substr(pos + 1);

                // Trim trailing \r if present (Windows line endings)
                if (!line.empty() && line.back() == '\r') {
                    line.pop_back();
                }

                // Skip empty lines
                if (!line.empty()) {
                    handler(line);
                }
            }
        }
    }).detach();
}

void ServerSession::sendLine(const std::string& json) {
    std::lock_guard<std::mutex> lock(sendMutex_);

    if (!connected_ || clientSock_ == INVALID_SOCKET) {
        return; // Silently drop if not connected
    }

    std::string msg = json + "\n";
    const char* data = msg.c_str();
    int remaining = static_cast<int>(msg.size());

    // Send loop handles partial sends (unlikely on localhost but correct)
    while (remaining > 0) {
        int sent = send(clientSock_, data, remaining, 0);
        if (sent == SOCKET_ERROR) {
            int err = WSAGetLastError();
            if (err != WSAECONNRESET) {
                std::cerr << "[C++] send() error: " << err << "\n";
            }
            connected_ = false;
            break;
        }
        data      += sent;
        remaining -= sent;
    }
}

void ServerSession::close() {
    connected_ = false;

    if (clientSock_ != INVALID_SOCKET) {
        // Graceful shutdown: signal no more sends, then close
        shutdown(clientSock_, SD_BOTH);
        closesocket(clientSock_);
        clientSock_ = INVALID_SOCKET;
    }

    if (serverSock_ != INVALID_SOCKET) {
        closesocket(serverSock_);
        serverSock_ = INVALID_SOCKET;
    }

    if (wsaInitialized_) {
        WSACleanup();
        wsaInitialized_ = false;
    }
}
