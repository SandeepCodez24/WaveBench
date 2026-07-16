// ============================================================================
// main.cpp — Entry point for the WaveBench Studio C++ simulation engine.
//
// Flow:
//   1. Start TCP server on port 5050
//   2. Wait for Java gateway to connect
//   3. Listen for JSON commands: start, stop, config, setStepSize, setSolver,
//      setBlockParam, reset, set_speed, set_stop_time, get_status, ping
//   4. Stream {type:"sample", t, sin, cos} samples back to the gateway
//   5. Keep alive until Enter is pressed, then shut down gracefully
//
// JSON parsing:
//   Hand-rolled minimal helpers — no external dependency required.
//   The protocol is simple enough that a full JSON library is overkill.
// ============================================================================

#include "SimulationEngine.hpp"
#include "ServerSession.hpp"
#include <iostream>
#include <string>
#include <cstdio>
#include <cstdlib>

// ---- Minimal hand-rolled JSON helpers (no external dependency) ----

// Extract a string value for a given key from a JSON object.
// Example: jsonGetString(R"({"type":"start"})", "type") -> "start"
static std::string jsonGetString(const std::string& json, const std::string& key) {
    std::string needle = "\"" + key + "\"";
    size_t pos = json.find(needle);
    if (pos == std::string::npos) return "";

    // Skip past the key, colon, and opening quote
    pos = json.find(':', pos + needle.size());
    if (pos == std::string::npos) return "";
    pos = json.find('"', pos + 1);
    if (pos == std::string::npos) return "";
    pos++; // skip opening quote

    size_t end = json.find('"', pos);
    if (end == std::string::npos) return "";
    return json.substr(pos, end - pos);
}

// Extract a numeric value for a given key from a JSON object.
// Example: jsonGetNumber(R"({"stepSize":0.02})", "stepSize") -> 0.02
static double jsonGetNumber(const std::string& json, const std::string& key) {
    std::string needle = "\"" + key + "\"";
    size_t pos = json.find(needle);
    if (pos == std::string::npos) return 0.0;

    pos = json.find(':', pos + needle.size());
    if (pos == std::string::npos) return 0.0;
    pos++; // skip colon

    // Skip whitespace
    while (pos < json.size() && (json[pos] == ' ' || json[pos] == '\t')) pos++;
    return std::atof(json.c_str() + pos);
}

// Format a simulation sample as a compact JSON string with clean precision.
static std::string formatSample(double t, double sinV, double cosV) {
    char buf[256];
    std::snprintf(buf, sizeof(buf),
        R"({"type":"sample","t":%.6f,"sin":%.6f,"cos":%.6f})",
        t, sinV, cosV);
    return std::string(buf);
}

// ---- Main entry point ----

int main() {
    ServerSession session;
    SimulationEngine engine;

    std::cout << "[C++] WaveBench Studio Engine v1.0\n";
    std::cout << "[C++] Listening on TCP port 5050...\n";

    if (!session.listen(5050)) {
        std::cerr << "[C++] Failed to start server. Exiting.\n";
        return 1;
    }

    std::cout << "[C++] Waiting for Java gateway connection...\n";
    if (!session.acceptClient()) {
        std::cerr << "[C++] Failed to accept client. Exiting.\n";
        return 1;
    }
    std::cout << "[C++] Java gateway connected.\n";

    // Handle incoming JSON commands from the gateway
    session.startReceiving([&](const std::string& msg) {
        std::string type = jsonGetString(msg, "type");
        std::cout << "[C++] Received: " << msg << "\n";

        if (type == "start") {
            // Start the simulation loop, streaming samples back over TCP
            engine.start([&](double t, double s, double c) {
                if (session.isConnected()) {
                    session.sendLine(formatSample(t, s, c));
                }
            });

        } else if (type == "stop") {
            engine.stop();

        } else if (type == "config") {
            // Full configuration: {"type":"config","stepSize":0.02,"solver":"RK4"}
            double stepSize = jsonGetNumber(msg, "stepSize");
            std::string solver = jsonGetString(msg, "solver");
            engine.configure(
                stepSize > 0.0 ? stepSize : 0.02,
                solver.empty() ? "RK4" : solver
            );

        } else if (type == "setStepSize") {
            // Hot-update step size: {"type":"setStepSize","value":0.05}
            double value = jsonGetNumber(msg, "value");
            if (value > 0.0) {
                engine.setStepSize(value);
            } else {
                std::cerr << "[C++] Invalid setStepSize value.\n";
            }

        } else if (type == "setSolver") {
            // Hot-update solver: {"type":"setSolver","value":"Euler"}
            std::string solver = jsonGetString(msg, "value");
            if (!solver.empty()) {
                engine.setSolver(solver);
            }

        } else if (type == "setBlockParam") {
            // Hot-update block parameters: {"type":"setBlockParam","blockId":"sine","amplitude":1.5,"frequency":10.0}
            std::string blockId = jsonGetString(msg, "blockId");
            double amplitude = jsonGetNumber(msg, "amplitude");
            double frequency = jsonGetNumber(msg, "frequency");
            engine.updateBlockParam(blockId, amplitude, frequency);

        } else if (type == "reset") {
            // Reset simulation: zero time, clear scope buffer, restart if running
            engine.reset([&](double t, double s, double c) {
                if (session.isConnected()) {
                    if (t < 0.0) {
                        // Sentinel: send reset acknowledgement instead of a sample
                        session.sendLine(R"({"type":"reset_ack"})");
                    } else {
                        session.sendLine(formatSample(t, s, c));
                    }
                }
            });

        } else if (type == "set_speed") {
            // Simulation speed multiplier: {"type":"set_speed","value":4.0}
            // 0 = MAX (no sleep), 0.25 = quarter speed, 1 = real-time, 4 = 4x
            double value = jsonGetNumber(msg, "value");
            engine.setSpeed(value);

        } else if (type == "set_stop_time") {
            // Auto-halt when sim time reaches this value: {"type":"set_stop_time","value":10.0}
            double value = jsonGetNumber(msg, "value");
            engine.setStopTime(value);

        } else if (type == "get_status") {
            // Return engine status JSON to the gateway
            std::string status = engine.getStatus();
            session.sendLine(status);

        } else if (type == "ping") {
            // Health check — respond immediately
            session.sendLine(R"({"type":"pong"})");

        } else {
            std::cout << "[C++] Unknown command type: " << type << "\n";
        }
    });

    // Keep main thread alive until Enter is pressed
    std::cout << "[C++] Engine ready. Press Enter to shut down.\n";
    std::cin.get();

    engine.stop();
    session.close();
    std::cout << "[C++] Shutdown complete.\n";
    return 0;
}
