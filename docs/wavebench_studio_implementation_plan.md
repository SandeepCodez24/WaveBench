# 🎛️ WaveBench Studio — Complete Implementation Plan

> **Project:** Graphical Programming Environment (PASS Technical Team Assignment)  
> **Stack:** React 18 + TypeScript · Java 17 (WebSocket Gateway) · C++17 (Simulation Engine)  
> **Deadline:** July 21, 2026 (treat as hard deadline; July 28 is buffer)  
> **IDE:** VS Code with Extension Pack for Java, C/C++, and TypeScript tooling  

---

## 📐 Project Overview

WaveBench Studio is a **three-layer graphical simulation environment** inspired by Simulink:

- A **browser-based React frontend** — drag-and-drop node editor rendering a live signal-flow graph
- A **Java WebSocket Gateway** — the architectural bridge between browser (WebSocket-only) and native engine (TCP)
- A **C++17 Simulation Engine** — computes sin/cos waveforms on a fixed/RK4 solver loop, streams results over TCP

```
┌────────────────────┐  WebSocket (ws://:8080)  ┌──────────────────┐  TCP (localhost:5050)  ┌──────────────────────┐
│  React Frontend    │ ◄──────────────────────► │  Java Gateway    │ ◄────────────────────► │  C++ Backend Engine  │
│  (Vite dev server) │       JSON messages       │  (Maven process) │    JSON messages        │  (g++ / MinGW)       │
└────────────────────┘                           └──────────────────┘                         └──────────────────────┘
```

---

## 🗂️ Table of Contents

1. [Tech Stack Summary](#tech-stack)
2. [Repository Structure](#repo-structure)
3. [Communication Protocol](#protocol)
4. [Block-to-Code Mapping](#block-mapping)
5. [Backend (C++) — Step-by-Step](#backend)
6. [Java Gateway — Step-by-Step](#gateway)
7. [Frontend (React) — Step-by-Step](#frontend)
8. [VS Code One-Click Run Setup](#vscode)
9. [Day-by-Day Sprint Timeline](#timeline)
10. [Innovation Checklist](#innovations)
11. [Risk Register & Mitigations](#risks)
12. [Submission Checklist](#checklist)
13. [Final Report Outline](#report)

---

<a id="tech-stack"></a>
## 1. 🧰 Tech Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 18 + TypeScript (Vite scaffold) | UI shell, component rendering, state management |
| **Diagram Canvas** | `@xyflow/react` (React Flow) | Drag-and-drop nodes, animated bezier-curve edges out-of-the-box |
| **Scope Rendering** | Native `<canvas>` + `useRef` (imperative draw) | 60fps waveform plotting without React re-render overhead |
| **Frontend Transport** | Native browser `WebSocket` API | Sends commands, receives streamed samples from Java gateway |
| **Bridge Language** | Java 17 | Architecturally necessary: browsers can't open raw TCP sockets |
| **Bridge WebSocket Lib** | `org.java-websocket` (Java-WebSocket) | Single Maven dep — `WebSocketServer` subclass, minimal boilerplate |
| **Bridge Build** | Maven (`pom.xml`) | `mvn exec:java` launches the gateway |
| **Backend Language** | C++17 | Block graph computation, fixed-step / RK4 solver loop |
| **Compiler** | MinGW-w64 `g++` | Windows compilation as specified in assignment PDF |
| **Backend Networking** | Winsock2 (`<winsock2.h>`, linked with `-lws2_32`) | Raw TCP server on localhost:5050 |
| **JSON** | Hand-rolled encode/decode (C++), `JSON.parse`/`JSON.stringify` (React) | Schema is simple enough — no heavy dependency needed |
| **IDE** | VS Code | Extension Pack for Java + C/C++ (ms-vscode.cpptools) + TS/JS built-in |
| **Automation** | `.vscode/tasks.json` | Sequences all 3 processes in one Ctrl+Shift+B action |

---

<a id="repo-structure"></a>
## 2. 📁 Repository Structure

```
wavebench-studio/
├── backend/                          ← C++ simulation engine
│   └── src/
│       ├── main.cpp
│       ├── Block.hpp
│       ├── SimulationEngine.hpp
│       ├── SimulationEngine.cpp
│       ├── ServerSession.hpp
│       └── ServerSession.cpp
│
├── gateway/                          ← Java WebSocket ↔ TCP bridge
│   ├── pom.xml
│   └── src/main/java/com/wavebench/gateway/
│       ├── Main.java
│       ├── GatewayServer.java
│       └── EngineClient.java
│
├── frontend/                         ← React app (Vite)
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── Toolbar.tsx
│       │   └── StepSizeDialog.tsx
│       ├── nodes/
│       │   ├── ClockNode.tsx
│       │   ├── SineNode.tsx
│       │   ├── CosineNode.tsx
│       │   └── ScopeNode.tsx
│       ├── canvas/
│       │   └── ScopeCanvas.tsx
│       └── hooks/
│           └── useSimulationSocket.ts
│
├── .vscode/
│   └── tasks.json
├── docs/
│   └── report.docx
└── README.md
```

---

<a id="protocol"></a>
## 3. 📡 Communication Protocol (JSON over WebSocket / TCP)

All messages are **newline-delimited JSON strings**. The Java gateway relays them verbatim in both directions — no transformation.

### Frontend (React) → Gateway (Java) → Engine (C++)

```json
{ "type": "config",       "stepSize": 0.02, "solver": "RK4" }
{ "type": "start" }
{ "type": "setStepSize",  "value": 0.05 }
{ "type": "stop" }
```

### Engine (C++) → Gateway (Java) → Frontend (React) — streamed continuously

```json
{ "type": "sample", "t": 0.42, "sin": 0.4078, "cos": 0.9130 }
```

**Key protocol rules:**
- Gateway connects to C++ **first**, then opens WebSocket for browsers
- C++ engine runs its loop on an independent thread, pushes samples to a thread-safe queue
- React `ScopeNode` keeps only the last 500 samples in a **ref-backed ring buffer** — never in React state

---

<a id="block-mapping"></a>
## 4. 🧩 Block-to-Code Mapping

| Required Block | C++ Class | React Node | Behavior |
|---|---|---|---|
| **Clock** (Signal Generator) | `ClockBlock : Block` | `ClockNode` | `compute(t) = t` — master time reference |
| **Sine** (Function Processor) | `SineBlock : Block` | `SineNode` | `compute(t) = sin(source->compute(t))` |
| **Cosine** (Function Processor) | `CosineBlock : Block` | `CosineNode` | `compute(t) = cos(source->compute(t))` |
| **Scope** (Visualizer / Sink) | *(aggregated server-side)* | `ScopeNode` wrapping `<canvas>` | Plots both live sin/cos traces from streamed `{t, sin, cos}` samples |

**Fixed wiring (static, per spec):**
- Clock → Sine
- Clock → Cosine
- Sine → Scope
- Cosine → Scope

> Node **positions** are draggable; re-wiring the graph is not required.

---

<a id="backend"></a>
## 5. ⚙️ Backend (C++) — Step-by-Step Implementation

### 5.1 Prerequisites & Setup

- [x] Install **MinGW-w64** (g++ with C++17 support) and verify: `g++ --version`
- [x] Install **VS Code** with the `C/C++` extension (`ms-vscode.cpptools`)
- [x] Create `backend/src/` directory
- [x] Verify Winsock2 is available (standard on Windows, linked via `-lws2_32`)

---

### 5.2 Step 1 — Define the Abstract `Block` Base Class

**File:** `backend/src/Block.hpp`

```cpp
#pragma once
class Block {
public:
    virtual double compute(double t) = 0;
    virtual ~Block() = default;
};
```

**What this achieves:** All simulation blocks share a unified interface. The engine can call `compute(t)` on any block without caring what it is.

---

### 5.3 Step 2 — Implement Concrete Block Types

**File:** `backend/src/Block.hpp` (extend the same file)

```cpp
#include <cmath>

// Clock: emits raw time value as the signal
class ClockBlock : public Block {
public:
    double compute(double t) override { return t; }
};

// Sine: takes signal from upstream block, applies sin()
class SineBlock : public Block {
    Block* source;
public:
    explicit SineBlock(Block* src) : source(src) {}
    double compute(double t) override { return std::sin(source->compute(t)); }
};

// Cosine: takes signal from upstream block, applies cos()
class CosineBlock : public Block {
    Block* source;
public:
    explicit CosineBlock(Block* src) : source(src) {}
    double compute(double t) override { return std::cos(source->compute(t)); }
};
```

**Verification:** At this point you can write a standalone `main.cpp` that chains the blocks and prints `{t, sin, cos}` to the console. Do this first to prove the graph logic before touching networking.

---

### 5.4 Step 3 — Implement the Simulation Engine

**File:** `backend/src/SimulationEngine.hpp`

```cpp
#pragma once
#include "Block.hpp"
#include <functional>
#include <atomic>
#include <thread>

class SimulationEngine {
public:
    using SampleCallback = std::function<void(double t, double sinV, double cosV)>;

    SimulationEngine();
    void configure(double stepSize, const std::string& solver);
    void start(SampleCallback cb);
    void stop();

private:
    double stepSize_  = 0.02;
    std::string solver_ = "RK4";
    std::atomic<bool> running_{false};
    std::thread loopThread_;
};
```

**File:** `backend/src/SimulationEngine.cpp`

```cpp
#include "SimulationEngine.hpp"
#include <chrono>

SimulationEngine::SimulationEngine() = default;

void SimulationEngine::configure(double stepSize, const std::string& solver) {
    stepSize_ = stepSize;
    solver_   = solver;
}

void SimulationEngine::start(SampleCallback cb) {
    running_ = true;
    loopThread_ = std::thread([this, cb]() {
        ClockBlock clock;
        SineBlock  sine(&clock);
        CosineBlock cosine(&clock);

        double t = 0.0;
        while (running_) {
            cb(t, sine.compute(t), cosine.compute(t));
            t += stepSize_;
            std::this_thread::sleep_for(
                std::chrono::milliseconds(static_cast<int>(stepSize_ * 1000)));
        }
    });
}

void SimulationEngine::stop() {
    running_ = false;
    if (loopThread_.joinable()) loopThread_.join();
}
```

**Key design decisions:**
- `std::atomic<bool> running_` — safe cross-thread flag
- `SampleCallback` — decouples the loop from the network layer
- Sleep duration matches the configured step size so the simulation runs in real-time

---

### 5.5 Step 4 — Implement the TCP Server Session

**File:** `backend/src/ServerSession.hpp`

```cpp
#pragma once
#include <winsock2.h>
#include <string>
#include <functional>

class ServerSession {
public:
    using MessageHandler = std::function<void(const std::string&)>;

    bool listen(int port);
    bool acceptClient();
    void startReceiving(MessageHandler handler);
    void sendLine(const std::string& json);
    void close();

private:
    SOCKET serverSock_ = INVALID_SOCKET;
    SOCKET clientSock_ = INVALID_SOCKET;
};
```

**File:** `backend/src/ServerSession.cpp`

```cpp
#include "ServerSession.hpp"
#include <ws2tcpip.h>
#include <thread>
#include <stdexcept>

bool ServerSession::listen(int port) {
    WSADATA wsa;
    WSAStartup(MAKEWORD(2,2), &wsa);

    serverSock_ = socket(AF_INET, SOCK_STREAM, 0);
    sockaddr_in addr{};
    addr.sin_family      = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port        = htons(port);
    bind(serverSock_, (sockaddr*)&addr, sizeof(addr));
    ::listen(serverSock_, 1);
    return true;
}

bool ServerSession::acceptClient() {
    clientSock_ = accept(serverSock_, nullptr, nullptr);
    return clientSock_ != INVALID_SOCKET;
}

void ServerSession::startReceiving(MessageHandler handler) {
    std::thread([this, handler]() {
        char buf[4096];
        std::string partial;
        while (true) {
            int n = recv(clientSock_, buf, sizeof(buf)-1, 0);
            if (n <= 0) break;
            buf[n] = '\0';
            partial += buf;
            size_t pos;
            while ((pos = partial.find('\n')) != std::string::npos) {
                handler(partial.substr(0, pos));
                partial = partial.substr(pos + 1);
            }
        }
    }).detach();
}

void ServerSession::sendLine(const std::string& json) {
    std::string msg = json + "\n";
    send(clientSock_, msg.c_str(), (int)msg.size(), 0);
}

void ServerSession::close() {
    closesocket(clientSock_);
    closesocket(serverSock_);
    WSACleanup();
}
```

---

### 5.6 Step 5 — Wire Everything in `main.cpp`

**File:** `backend/src/main.cpp`

```cpp
#include "SimulationEngine.hpp"
#include "ServerSession.hpp"
#include <iostream>
#include <nlohmann/json.hpp>  // or hand-rolled parser

int main() {
    ServerSession session;
    SimulationEngine engine;

    std::cout << "[C++] Listening on TCP port 5050...\n";
    session.listen(5050);
    session.acceptClient();
    std::cout << "[C++] Java gateway connected.\n";

    // Handle incoming commands from the gateway
    session.startReceiving([&](const std::string& msg) {
        // Parse JSON: {"type":"start"}, {"type":"stop"}, {"type":"config",...}
        // (hand-rolled or with a small JSON lib)
        if (msg.find("\"start\"") != std::string::npos) {
            engine.start([&](double t, double s, double c) {
                // Format and send sample
                std::string json = "{\"type\":\"sample\",\"t\":" + std::to_string(t)
                    + ",\"sin\":" + std::to_string(s)
                    + ",\"cos\":" + std::to_string(c) + "}";
                session.sendLine(json);
            });
        } else if (msg.find("\"stop\"") != std::string::npos) {
            engine.stop();
        }
        // handle "config" and "setStepSize" similarly
    });

    // Keep main thread alive
    std::cin.get();
    engine.stop();
    session.close();
    return 0;
}
```

---

### 5.7 Step 6 — Compile & Test the Backend Alone

```bash
# From the wavebench-studio root:
g++ -std=c++17 -O2 backend/src/*.cpp -lws2_32 -o backend/build/wavebench_engine.exe
./backend/build/wavebench_engine.exe
```

**Verification checklist:**
- [x] Process starts and prints `[C++] Listening on TCP port 5050...`
- [x] You can connect with `netcat` or a raw TCP client and it prints `[C++] Java gateway connected.`
- [x] Sending `{"type":"start"}` followed by enter begins streaming `{"type":"sample",...}` lines
- [x] Sending `{"type":"stop"}` stops the stream cleanly

---

<a id="gateway"></a>
## 6. ☕ Java Gateway — Step-by-Step Implementation

### 6.1 Prerequisites & Setup

- [x] Install **Java 17 JDK** and verify: `java --version`
- [x] Install **Maven** and verify: `mvn --version`
- [x] Install VS Code **Extension Pack for Java**

---

### 6.2 Step 1 — Create Maven Project Structure

```
gateway/
├── pom.xml
└── src/main/java/com/wavebench/gateway/
    ├── Main.java
    ├── GatewayServer.java
    └── EngineClient.java
```

**File:** `gateway/pom.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
           http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.wavebench</groupId>
  <artifactId>gateway</artifactId>
  <version>1.0-SNAPSHOT</version>
  <packaging>jar</packaging>

  <properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.java-websocket</groupId>
      <artifactId>Java-WebSocket</artifactId>
      <version>1.5.4</version>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.codehaus.mojo</groupId>
        <artifactId>exec-maven-plugin</artifactId>
        <version>3.1.0</version>
        <configuration>
          <mainClass>com.wavebench.gateway.Main</mainClass>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

---

### 6.3 Step 2 — Implement `EngineClient` (TCP client to C++)

**File:** `gateway/src/main/java/com/wavebench/gateway/EngineClient.java`

```java
package com.wavebench.gateway;

import java.io.*;
import java.net.Socket;
import java.util.function.Consumer;

/**
 * Plain TCP client that connects to the C++ simulation engine.
 * Receives streamed JSON samples and relays them upstream.
 */
public class EngineClient {
    private PrintWriter out;
    private boolean connected = false;

    /**
     * Connects to the C++ engine with a retry loop.
     * @param host      usually "localhost"
     * @param port      5050 (C++ engine port)
     * @param onSample  callback invoked for every JSON line received from C++
     */
    public void connect(String host, int port, Consumer<String> onSample)
            throws IOException, InterruptedException {

        Socket socket = null;
        // Retry loop — gateway must start after C++ engine, but in case of timing issues:
        for (int attempt = 0; attempt < 10; attempt++) {
            try {
                socket = new Socket(host, port);
                break;
            } catch (IOException e) {
                System.out.println("[Gateway] Waiting for C++ engine... attempt " + (attempt + 1));
                Thread.sleep(500);
            }
        }
        if (socket == null) throw new IOException("Cannot connect to C++ engine on port " + port);

        out = new PrintWriter(socket.getOutputStream(), true);
        connected = true;
        System.out.println("[Gateway] Connected to C++ engine.");

        // Start a background thread to read samples from C++
        final Socket finalSocket = socket;
        new Thread(() -> {
            try (var in = new BufferedReader(
                    new InputStreamReader(finalSocket.getInputStream()))) {
                String line;
                while ((line = in.readLine()) != null) {
                    onSample.accept(line);
                }
            } catch (IOException ignored) {
                System.out.println("[Gateway] C++ engine disconnected.");
            }
        }, "engine-reader").start();
    }

    /** Send a JSON command string to the C++ engine. */
    public void send(String json) {
        if (connected && out != null) {
            out.println(json);
        }
    }

    public boolean isConnected() { return connected; }
}
```

---

### 6.4 Step 3 — Implement `GatewayServer` (WebSocket server for browsers)

**File:** `gateway/src/main/java/com/wavebench/gateway/GatewayServer.java`

```java
package com.wavebench.gateway;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import java.net.InetSocketAddress;

/**
 * WebSocket server — accepts browser connections and relays JSON
 * commands to the C++ engine, and C++ samples back to all browsers.
 */
public class GatewayServer extends WebSocketServer {
    private final EngineClient engine;

    public GatewayServer(int port, EngineClient engine) {
        super(new InetSocketAddress(port));
        this.engine = engine;
        setReuseAddr(true);
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        System.out.println("[Gateway] Browser connected: " + conn.getRemoteSocketAddress());
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        System.out.println("[Gateway] Browser disconnected.");
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        System.out.println("[Gateway] Browser → C++: " + message);
        engine.send(message);   // relay command directly to C++
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        ex.printStackTrace();
    }

    @Override
    public void onStart() {
        System.out.println("[Gateway] WebSocket server started on port " + getPort());
    }

    /** Push a sample received from C++ to every connected browser. */
    public void broadcastSample(String json) {
        broadcast(json);
    }
}
```

---

### 6.5 Step 4 — Implement `Main.java` (Entry Point)

**File:** `gateway/src/main/java/com/wavebench/gateway/Main.java`

```java
package com.wavebench.gateway;

public class Main {
    public static void main(String[] args) throws Exception {
        System.out.println("[Gateway] Starting...");

        EngineClient engine = new EngineClient();

        // Step 1: Connect to C++ engine FIRST (retry loop built in)
        engine.connect("localhost", 5050, sample -> {
            // Step 2: Every sample received from C++ is broadcast to all browsers
            // (GatewayServer reference set after construction below)
        });

        // Step 3: Start WebSocket server for browsers
        GatewayServer server = new GatewayServer(8080, engine);

        // Rewire the sample callback now that we have the server reference
        EngineClient engineWithBroadcast = new EngineClient();
        engineWithBroadcast.connect("localhost", 5050,
            sample -> server.broadcastSample(sample));

        // Note: cleaner pattern is to pass the broadcast lambda directly — refactor as needed
        server.start();
        System.out.println("[Gateway] Ready. Accepting browser connections on ws://localhost:8080");
    }
}
```

> **Implementation note:** Refactor `Main.java` to pass the `broadcastSample` lambda to `EngineClient.connect()` before constructing `GatewayServer` to avoid the dual-connect pattern shown above. This is simplified for clarity.

---

### 6.6 Step 5 — Build & Test the Gateway Alone

```bash
# From the wavebench-studio root:
mvn -f gateway/pom.xml exec:java
```

**Verification checklist:**
- [x] Maven downloads `Java-WebSocket` dependency on first run
- [x] Gateway prints `[Gateway] Connected to C++ engine.` (requires C++ to already be running)
- [x] Gateway prints `[Gateway] WebSocket server started on port 8080`
- [x] You can connect from a browser `new WebSocket("ws://localhost:8080")` in the DevTools console
- [x] Sending `JSON.stringify({type:"start"})` from DevTools triggers C++ samples flowing through

---

<a id="frontend"></a>
## 7. ⚛️ Frontend (React + TypeScript) — Step-by-Step Implementation

### 7.1 Prerequisites & Setup

- [ ] Install **Node.js** (LTS, v20+) and verify: `node --version`
- [ ] Scaffold the React app with Vite:

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install @xyflow/react
npm run dev     # verify Vite dev server starts at localhost:5173
```

---

### 7.2 Step 1 — Design System & Global Styles

**File:** `frontend/src/index.css`

Establish a dark, Simulink-inspired theme using CSS custom properties:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  /* Color Palette — dark Simulink aesthetic */
  --bg-primary:      #0d0f14;
  --bg-secondary:    #151820;
  --bg-panel:        #1a1d26;
  --bg-toolbar:      #12151e;
  --border:          #252a38;
  --border-active:   #3d4760;

  --accent-blue:     #4a9eff;
  --accent-green:    #3dd68c;
  --accent-orange:   #ff8c42;
  --accent-red:      #ff5757;

  --text-primary:    #e8eaf0;
  --text-secondary:  #8b92a8;
  --text-muted:      #545b73;

  /* Node colors */
  --node-clock:      #1e2a45;
  --node-sine:       #1a2e2a;
  --node-cosine:     #2a1e2e;
  --node-scope:      #1e1e2a;

  --font-sans:       'Inter', system-ui, sans-serif;
  --font-mono:       'JetBrains Mono', monospace;
  --radius:          8px;
  --shadow:          0 4px 24px rgba(0,0,0,0.4);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-sans);
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
  height: 100vh;
}

/* React Flow canvas background */
.react-flow__background { background: var(--bg-secondary); }
.react-flow__edge-path  { stroke: var(--accent-blue); stroke-width: 2; }
```

---

### 7.3 Step 2 — WebSocket Hook (`useSimulationSocket.ts`)

**File:** `frontend/src/hooks/useSimulationSocket.ts`

```typescript
import { useEffect, useRef } from 'react';

export interface Sample {
  type: 'sample';
  t: number;
  sin: number;
  cos: number;
}

export interface SimulationSocket {
  samplesRef: React.MutableRefObject<Sample[]>;
  send: (obj: object) => void;
  isConnected: () => boolean;
}

export function useSimulationSocket(): SimulationSocket {
  const wsRef      = useRef<WebSocket | null>(null);
  const samplesRef = useRef<Sample[]>([]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
      console.log('[WS] Connected to Java gateway');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as Sample;
        if (msg.type === 'sample') {
          // Ring buffer: keep last 500 samples; avoid React state to prevent re-renders
          const samples = samplesRef.current;
          if (samples.length >= 500) samples.shift();
          samples.push(msg);
        }
      } catch (e) {
        console.warn('[WS] Bad JSON:', event.data);
      }
    };

    ws.onerror  = (e) => console.error('[WS] Error:', e);
    ws.onclose  = ()  => console.log('[WS] Disconnected');

    wsRef.current = ws;
    return () => ws.close();
  }, []);

  const send = (obj: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
    }
  };

  const isConnected = () =>
    wsRef.current?.readyState === WebSocket.OPEN;

  return { samplesRef, send, isConnected };
}
```

---

### 7.4 Step 3 — Scope Canvas Component (`ScopeCanvas.tsx`)

**File:** `frontend/src/canvas/ScopeCanvas.tsx`

This is the most performance-critical component. It uses imperative `<canvas>` drawing triggered by `requestAnimationFrame` — **never** React state.

```typescript
import { useEffect, useRef } from 'react';
import type { Sample } from '../hooks/useSimulationSocket';

interface Props {
  samplesRef: React.MutableRefObject<Sample[]>;
  width?: number;
  height?: number;
}

export function ScopeCanvas({ samplesRef, width = 320, height = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animId: number;

    const draw = () => {
      const samples = samplesRef.current;
      ctx.clearRect(0, 0, width, height);

      // Background grid
      ctx.strokeStyle = '#1e2235';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      if (samples.length < 2) { animId = requestAnimationFrame(draw); return; }

      const mid = height / 2;
      const amp = height / 2 - 8;
      const step = width / samples.length;

      // Draw sin trace (blue)
      ctx.beginPath();
      ctx.strokeStyle = '#4a9eff';
      ctx.lineWidth = 1.5;
      samples.forEach((s, i) => {
        const x = i * step;
        const y = mid - s.sin * amp;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw cos trace (green)
      ctx.beginPath();
      ctx.strokeStyle = '#3dd68c';
      ctx.lineWidth = 1.5;
      samples.forEach((s, i) => {
        const x = i * step;
        const y = mid - s.cos * amp;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [samplesRef, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ borderRadius: 4, background: '#0a0c12' }}
    />
  );
}
```

---

### 7.5 Step 4 — Custom Node Components

#### `ClockNode.tsx`

**File:** `frontend/src/nodes/ClockNode.tsx`

```typescript
import { Handle, Position } from '@xyflow/react';

export function ClockNode() {
  return (
    <div className="flow-node node-clock">
      <div className="node-header">🕐 Clock</div>
      <div className="node-body">Signal Generator</div>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
```

#### `SineNode.tsx`

**File:** `frontend/src/nodes/SineNode.tsx`

```typescript
import { Handle, Position } from '@xyflow/react';

export function SineNode() {
  return (
    <div className="flow-node node-sine">
      <Handle type="target" position={Position.Left}  id="in"  />
      <div className="node-header">〜 Sine</div>
      <div className="node-body">sin(x)</div>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
```

#### `CosineNode.tsx`

**File:** `frontend/src/nodes/CosineNode.tsx`

```typescript
import { Handle, Position } from '@xyflow/react';

export function CosineNode() {
  return (
    <div className="flow-node node-cosine">
      <Handle type="target" position={Position.Left}  id="in"  />
      <div className="node-header">◎ Cosine</div>
      <div className="node-body">cos(x)</div>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
```

#### `ScopeNode.tsx`

**File:** `frontend/src/nodes/ScopeNode.tsx`

```typescript
import { Handle, Position } from '@xyflow/react';
import { ScopeCanvas } from '../canvas/ScopeCanvas';
import type { Sample } from '../hooks/useSimulationSocket';

interface Props {
  data: { samplesRef: React.MutableRefObject<Sample[]> };
}

export function ScopeNode({ data }: Props) {
  return (
    <div className="flow-node node-scope" style={{ padding: 8 }}>
      <Handle type="target" position={Position.Left} id="in" />
      <div className="node-header">📊 Scope</div>
      <ScopeCanvas samplesRef={data.samplesRef} width={320} height={160} />
      <div className="scope-legend">
        <span style={{ color: '#4a9eff' }}>● sin</span>
        <span style={{ color: '#3dd68c', marginLeft: 12 }}>● cos</span>
      </div>
    </div>
  );
}
```

---

### 7.6 Step 5 — Toolbar Component

**File:** `frontend/src/components/Toolbar.tsx`

Reproduces the Simulink-style top ribbon with tabs and all four toolbar groups:

```typescript
interface Props {
  onStart: () => void;
  onStop:  () => void;
  onOpenStepSize: () => void;
}

export function Toolbar({ onStart, onStop, onOpenStepSize }: Props) {
  return (
    <header className="toolbar">
      {/* Tab row */}
      <nav className="toolbar-tabs">
        {['Simulation','Debug','Modeling','Format','Apps','Scope'].map(tab => (
          <button key={tab} className={`tab-btn ${tab === 'Simulation' ? 'active' : ''}`}>
            {tab}
          </button>
        ))}
      </nav>

      {/* Action row — four groups */}
      <div className="toolbar-actions">
        <div className="toolbar-group">
          <span className="group-label">File</span>
          <button className="tb-btn">📄 New</button>
          <button className="tb-btn">📂 Open</button>
          <button className="tb-btn">🖨️ Print</button>
        </div>
        <div className="toolbar-group">
          <span className="group-label">Library</span>
          <button className="tb-btn">📚 Library Browser</button>
        </div>
        <div className="toolbar-group">
          <span className="group-label">Prepare</span>
          <button className="tb-btn">📝 Log Signals</button>
          <button className="tb-btn">👁️ Add Viewer</button>
          <button className="tb-btn">📊 Signal Table</button>
        </div>
        <div className="toolbar-group">
          <span className="group-label">Simulate</span>
          <input
            className="tb-input"
            defaultValue="10.0"
            title="Stop Time"
            style={{ width: 60 }}
          />
          <button className="tb-btn">▶ Run" onClick={onStart}</button>
          <button className="tb-btn" onClick={onStop}>⏹ Stop</button>
          <button className="tb-btn" onClick={onOpenStepSize}>⚙ Step Size</button>
        </div>
      </div>

      {/* Title bar */}
      <div className="window-title">untitled* — WaveBench Studio (academic use)</div>
    </header>
  );
}
```

---

### 7.7 Step 6 — StepSize Dialog (Innovation Feature)

**File:** `frontend/src/components/StepSizeDialog.tsx`

This is the **core innovation target** — a modal popup with step-size slider, solver selector, and a small live preview:

```typescript
import { useState } from 'react';

interface Props {
  onClose:  () => void;
  onApply:  (stepSize: number, solver: string) => void;
}

export function StepSizeDialog({ onClose, onApply }: Props) {
  const [stepSize, setStepSize] = useState(0.02);
  const [solver,   setSolver]   = useState<'Euler' | 'RK4'>('RK4');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">⚙️ Simulation Configuration</h2>

        <label className="modal-label">
          Step Size: <strong>{stepSize.toFixed(3)}s</strong>
        </label>
        <input
          type="range"
          min={0.001} max={0.1} step={0.001}
          value={stepSize}
          onChange={e => setStepSize(Number(e.target.value))}
          className="slider"
        />

        <label className="modal-label">Solver</label>
        <div className="solver-options">
          {(['Euler', 'RK4'] as const).map(s => (
            <button
              key={s}
              className={`solver-btn ${solver === s ? 'selected' : ''}`}
              onClick={() => setSolver(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn-cancel"  onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => { onApply(stepSize, solver); onClose(); }}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 7.8 Step 7 — Main App Assembly (`App.tsx`)

**File:** `frontend/src/App.tsx`

```typescript
import { useState, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Toolbar }          from './components/Toolbar';
import { StepSizeDialog }   from './components/StepSizeDialog';
import { ClockNode }        from './nodes/ClockNode';
import { SineNode }         from './nodes/SineNode';
import { CosineNode }       from './nodes/CosineNode';
import { ScopeNode }        from './nodes/ScopeNode';
import { useSimulationSocket } from './hooks/useSimulationSocket';

// Register custom node types
const nodeTypes = {
  clock:  ClockNode,
  sine:   SineNode,
  cosine: CosineNode,
  scope:  ScopeNode,
};

// Fixed 4-node diagram (per spec — positions draggable, wiring static)
const initialNodes = [
  { id: 'clock',  type: 'clock',  position: { x:  50, y: 150 }, data: {} },
  { id: 'sine',   type: 'sine',   position: { x: 300, y:  80 }, data: {} },
  { id: 'cosine', type: 'cosine', position: { x: 300, y: 240 }, data: {} },
  { id: 'scope',  type: 'scope',  position: { x: 570, y: 130 }, data: {} },
];

// Animated edges = "data flowing" visual — React Flow gives this for free
const initialEdges = [
  { id: 'e1', source: 'clock',  target: 'sine',   animated: true },
  { id: 'e2', source: 'clock',  target: 'cosine', animated: true },
  { id: 'e3', source: 'sine',   target: 'scope',  animated: true },
  { id: 'e4', source: 'cosine', target: 'scope',  animated: true },
];

export default function App() {
  const { samplesRef, send } = useSimulationSocket();
  const [showStepDialog, setShowStepDialog] = useState(false);

  // Pass samplesRef into ScopeNode via data prop
  const nodes = initialNodes.map(n =>
    n.type === 'scope' ? { ...n, data: { samplesRef } } : n
  );

  const handleStart = useCallback(() => send({ type: 'start' }), [send]);
  const handleStop  = useCallback(() => send({ type: 'stop'  }), [send]);
  const handleApply = useCallback((stepSize: number, solver: string) => {
    send({ type: 'config', stepSize, solver });
  }, [send]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        onStart={handleStart}
        onStop={handleStop}
        onOpenStepSize={() => setShowStepDialog(true)}
      />

      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={initialEdges}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
        >
          <Background color="#1e2235" gap={32} />
          <Controls />
          <MiniMap nodeColor={() => '#3d4760'} maskColor="rgba(0,0,0,0.5)" />
        </ReactFlow>
      </div>

      {showStepDialog && (
        <StepSizeDialog
          onClose={() => setShowStepDialog(false)}
          onApply={handleApply}
        />
      )}
    </div>
  );
}
```

---

### 7.9 Step 8 — Test the Full Pipeline End-to-End

1. Start the C++ engine → `wavebench_engine.exe`
2. Start the Java gateway → `mvn -f gateway/pom.xml exec:java`
3. Start the React frontend → `npm --prefix frontend run dev`
4. Open `http://localhost:5173` in a browser
5. Click **Run** in the toolbar

**Verification checklist:**
- [ ] All 4 nodes appear on the canvas, draggable independently
- [ ] Animated edges show signal-flow motion
- [ ] Clicking Run → ScopeCanvas starts plotting live sin (blue) and cos (green) traces
- [ ] Clicking Stop → traces freeze
- [ ] Opening Step Size dialog → changing slider + Apply → simulation updates speed
- [ ] Window title reads `untitled* — WaveBench Studio (academic use)`

---

<a id="vscode"></a>
## 8. 🖱️ VS Code One-Click Run Setup

**File:** `.vscode/tasks.json`

```jsonc
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build Backend",
      "type": "shell",
      "command": "g++ -std=c++17 -O2 backend/src/*.cpp -lws2_32 -o backend/build/wavebench_engine.exe",
      "group": "build"
    },
    {
      "label": "Run Backend",
      "type": "shell",
      "command": "backend/build/wavebench_engine.exe",
      "isBackground": true,
      "dependsOn": "Build Backend",
      "problemMatcher": []
    },
    {
      "label": "Run Gateway",
      "type": "shell",
      "command": "mvn -f gateway/pom.xml exec:java",
      "isBackground": true,
      "dependsOn": "Run Backend",
      "problemMatcher": []
    },
    {
      "label": "Run Frontend",
      "type": "shell",
      "command": "npm --prefix frontend run dev",
      "isBackground": true,
      "dependsOn": "Run Gateway",
      "problemMatcher": []
    },
    {
      "label": "▶ Run WaveBench (One Click)",
      "dependsOn": ["Run Backend", "Run Gateway", "Run Frontend"],
      "dependsOrder": "sequence",
      "group": { "kind": "build", "isDefault": true },
      "problemMatcher": []
    }
  ]
}
```

**Reviewer workflow:**
1. Open `wavebench-studio/` folder in VS Code
2. Press **Ctrl+Shift+B**
3. Three integrated terminal panels open sequentially
4. Vite prints `➜  Local: http://localhost:5173/` — click to open in browser

---

<a id="timeline"></a>
## 9. 📅 Day-by-Day Sprint Timeline (9 Days → July 21)

| Day | Date | Layer | Focus | Deliverable |
|---|---|---|---|---|
| **1** | Jul 13 | All | Environment + repo scaffold | C++, Java (Maven), React (Vite) each print a "hello" independently; MinGW/Winsock validated |
| **2** | Jul 14 | Backend | Block graph + SimulationEngine | `Block` class hierarchy wired; engine prints `{t, sin, cos}` to console at configured step size |
| **3** | Jul 15 | Backend + Gateway | TCP server + gateway TCP client | C++ streams JSON over TCP; Java `EngineClient` connects and logs incoming samples |
| **4** | Jul 16 | Gateway | WebSocket server | Browser-testable via DevTools console: `new WebSocket("ws://localhost:8080")` relays commands + samples |
| **5** | Jul 17 | Frontend | React scaffold + React Flow canvas | Toolbar (green-annotation compliant) + 4 nodes rendered, draggable, connected by animated edges |
| **6** | Jul 18 | Frontend | Live integration | `useSimulationSocket` wired; `ScopeCanvas` plots live sin/cos traces from the real pipeline |
| **7** | Jul 19 | Frontend | StepSizeDialog | Modal popup functional, `config`/`setStepSize` messages sent to engine on Apply |
| **8** | Jul 20 | All | Polish + innovation extras | Dark theme finalized, FPS/latency HUD, snap-to-grid confirmed, save/load JSON if time permits |
| **9** | Jul 21 | All | Packaging + report + submit | `tasks.json` one-click flow verified; README.md complete; `report.docx` done; email sent |

---

<a id="innovations"></a>
## 10. 💡 Innovation Checklist

Pick 2–3 polished extras (quality over quantity):

| Feature | Priority | Notes |
|---|---|---|
| **Solver-selection popup** | 🔴 Core target | StepSizeDialog with slider + Euler/RK4 dropdown + live preview curve |
| **Signal-flow animation** | 🟢 Free via React Flow | `animated: true` on edges — call out explicitly in report |
| **Dark Simulink-inspired theme** | 🟢 High-impact | CSS custom properties (Section 7.2) |
| FPS / gateway-latency HUD overlay | 🟡 Medium | Small overlay in ScopeNode header |
| Save/load diagram layout as JSON | 🟡 Medium | React Flow exposes node positions natively |
| Export scope data to CSV | 🟡 Medium | Dump `samplesRef.current` to a downloadable CSV |
| Snap-to-grid dragging | 🟢 Free via React Flow | `snapToGrid` + `snapGrid={[16,16]}` prop |
| Keyboard shortcuts (Delete, Ctrl+Z) | 🟡 Medium | React Flow has built-in `deleteKeyCode` |

---

<a id="risks"></a>
## 11. ⚠️ Risk Register & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Gateway starts before C++ engine is ready | High | Retry-connect loop (10 × 500ms) in `EngineClient.connect()` |
| Browser connects before engine link established | Medium | Gateway queues/rejects `onMessage` calls until `EngineClient.isConnected()` is true |
| Three-process orchestration fails silently | Medium | Each process logs clearly to its own terminal panel; test each hop independently (Day 3–4) |
| `ScopeNode` re-rendering too often → dropped frames | High | **Never** store per-sample data in React state; use `useRef` ring buffer + imperative canvas draws |
| MinGW/Winsock linking errors | Medium | Validate a minimal hello-socket program on Day 1 before touching engine code |
| `@xyflow/react` version compatibility issues | Low | Pin exact version in `package.json`; check docs for React 18 compatibility |
| Deadline ambiguity (21 vs 28 July) | Confirmed | Email `sivaraman.s@alumni.iitm.ac.in` immediately to confirm; plan targets July 21 |

---

<a id="checklist"></a>
## 12. ✅ Submission Checklist

### Code & Build
- [ ] Code compiles and runs from a clean clone via one command (Ctrl+Shift+B)
- [ ] All three processes (C++, Java, React) start in the correct order and connect
- [ ] All 4 blocks present, correctly wired, individually draggable on the canvas
- [ ] Scope shows live, simultaneous sine (blue) and cosine (green) traces
- [ ] Step-size popup functional (solver selector + step-size slider + Apply)
- [ ] Green toolbar elements fully reproduced (tabs + all 4 toolbar groups)
- [ ] Window/tab title: `untitled* — WaveBench Studio (academic use)`
- [ ] `backend/build/` directory created before compilation

### Documentation
- [ ] `README.md` explains the one-click run process and the 3-layer architecture
- [ ] `docs/report.docx` included — explicitly explains why Java's role is technically necessary
- [ ] Report contains architecture diagram + feature walkthrough screenshots

### Submission
- [ ] Repo zipped or GitHub link prepared
- [ ] Email sent to `sivaraman.s@alumni.iitm.ac.in` with:
  - [ ] Full name
  - [ ] Department
  - [ ] College
  - [ ] Mobile number
- [ ] Deadline confirmed with recruiter (21 vs 28 July)

---

<a id="report"></a>
## 13. 📄 Final Report Outline

The `docs/report.docx` should cover:

1. **Overview & Problem Statement** — What is WaveBench Studio? What problem does it solve?
2. **Architecture Diagram + Explanation** — Lead with *why Java's role is technically necessary*, not just compliant
3. **Tech Stack & Justification** — React Flow's fit for node/edge editors; Java bridge vs C++ speaking WebSocket directly
4. **Feature Walkthrough** — Screenshots or a short GIF of: canvas, drag-and-drop, live scope, step-size dialog
5. **How to Run** — The one-click Ctrl+Shift+B steps (copy from README)
6. **Design Decisions & Trade-offs** — Imperative canvas vs React state; static wiring vs full dynamic rewiring
7. **Innovations Added** — List only features you actually built (from Section 10)
8. **Challenges Faced & Solutions** — e.g., browser TCP limitation → Java gateway; frame-rate optimization → ref-based ring buffer
9. **Future Improvements** — Full dynamic graph editing, multi-scope support, hardware-in-the-loop
10. **Appendix** — Class diagram, full protocol spec (reuse Section 3 of this document)

---

## 📋 Quick Reference: Key Ports & Commands

| What | Port / Command |
|---|---|
| C++ engine TCP server | `localhost:5050` |
| Java gateway WebSocket | `ws://localhost:8080` |
| React dev server | `http://localhost:5173` |
| Build backend | `g++ -std=c++17 -O2 backend/src/*.cpp -lws2_32 -o backend/build/wavebench_engine.exe` |
| Run backend | `./backend/build/wavebench_engine.exe` |
| Run gateway | `mvn -f gateway/pom.xml exec:java` |
| Run frontend dev | `npm --prefix frontend run dev` |
| One-click all | VS Code **Ctrl+Shift+B** → `▶ Run WaveBench (One Click)` |

---

*Generated from `WaveBench_Studio_Build_Plan.md` — July 14, 2026*
