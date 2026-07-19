# 🎛️ WaveBench Studio

> **A browser-based block-diagram simulation editor** — inspired by MATLAB Simulink's interaction model, rebuilt as a modern three-language system: a React frontend, a Java WebSocket gateway, and a C++ simulation engine.
>
> Built for the **PASS Technical Team** graphical-programming assignment.

---

## ✨ What Is This?

WaveBench Studio lets you **build and run a live signal-processing simulation** on a drag-and-drop canvas. A **Clock** block drives a **Sine** and a **Cosine** block, both of which feed into a **Scope** that plots a live dual-trace waveform — all computed by a real C++ numerical engine running on your machine, not simulated in the browser.

The project deliberately spans **three languages and three processes** to demonstrate full-stack systems thinking:

```
┌─────────────────────────────────────────────────────────────────────────┐
│   React Frontend        Java Gateway           C++ Engine               │
│   (browser)    ─WS──►  ws://8080      ─TCP──►  :5050                   │
│                         (protocol bridge)       (simulation core)        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture — Three Layers, One Pipeline

### Layer 1 — C++ Simulation Engine (`backend/`)
The mathematical core. Owns the block graph, runs the solver loop on a **dedicated thread**, and streams `{ t, sin, cos }` JSON samples over raw TCP to whoever is connected.

- **Block hierarchy**: `Block` (abstract) → `ClockBlock`, `SineBlock`, `CosineBlock`
- **Solvers**: Euler (fast) and RK4 (accurate) — switchable live during simulation
- **Hot-reconfiguration**: step size, speed multiplier, amplitude and frequency can all be changed while the engine is running without restarting
- **Key files**: `SimulationEngine.cpp/.hpp`, `ServerSession.cpp/.hpp`, `Block.hpp`, `main.cpp`

### Layer 2 — Java WebSocket Gateway (`gateway/`)
The required protocol bridge. Browsers cannot open raw TCP sockets, so this Java process sits in the middle, relaying WebSocket ↔ TCP.

- **`GatewayServer.java`** — WebSocket server (port 8080), accepts browser connections, routes commands to the engine
- **`EngineClient.java`** — TCP client (port 5050), maintains the connection to the C++ engine and feeds samples back to all connected browsers
- **`HttpApiServer.java`** — REST API for project save/load and export endpoints
- **`auth/`** — JWT-based auth (`JwtUtil`, `UserStore`, `AuthHandler`)
- **`api/`** — REST handlers (`ProjectHandler`, `ExportHandler`)

### Layer 3 — React Frontend (`frontend/`)
The interactive canvas. Built with **React 18 + TypeScript + Vite + React Flow**.

- **Canvas** — drag-and-drop block diagram editor powered by React Flow
- **Scope** — live dual-trace waveform rendered on an HTML Canvas element (`ScopeCanvas.tsx`)
- **Toolbar** — simulation controls: play / pause / stop / step-size / solver / speed (`Toolbar.tsx`)
- **`useSimulationSocket.ts`** — the custom hook that owns the WebSocket connection and feeds samples into the Scope in real time
- **Block nodes**: `ClockNode`, `SineNode`, `CosineNode`, `ScopeNode`, `GainNode`, `ConstantNode`, `SumNode`, `ComparatorNode`, `MuxNode`, `SwitchNode`, `ProbeNode`
- **Modals / panels**: `StepSizeDialog`, `DiagnosticsModal`, `FFTModal`, `LogsTerminalPanel`, `PropertiesPanel`, `ModelBrowser`, `CommandPalette`, `KeyboardShortcutsModal`, `GuidedTour`, `PerfHUD`

---

## 🚀 Quick Start — One-Click Run

> **This is the recommended path.** Everything is wired into VS Code tasks.

### Prerequisites

Make sure the following tools are installed **and available in your terminal** before opening VS Code. Run each `Verify` command in a fresh terminal window.

| Tool | Purpose | Install | Verify |
|---|---|---|---|
| **VS Code** | IDE | [code.visualstudio.com](https://code.visualstudio.com) | — |
| **Extension Pack for Java** | Java / Maven support | Extensions panel `Ctrl+Shift+X` | — |
| **C/C++ (ms-vscode.cpptools)** | C++ IntelliSense | Extensions panel | — |
| **JDK 17+** | Runs the Java gateway | [Adoptium Temurin 17](https://adoptium.net) | `java -version` |
| **Maven** | Builds the gateway | [maven.apache.org](https://maven.apache.org) — add `bin/` to PATH | `mvn -version` |
| **MinGW-w64 g++ (POSIX threads)** | Compiles the C++ engine | Via MSYS2: `pacman -S mingw-w64-ucrt-x86_64-gcc` | `g++ --version` |
| **Node.js LTS** | Runs the React frontend | [nodejs.org](https://nodejs.org) | `node -v` && `npm -v` |

> ⚠️ **Important:** Always close and reopen your terminal (and VS Code) after installing any tool. PATH changes are not picked up by already-open sessions.

### Run with One Click

1. **Clone or unzip** this repository.
2. **Open the project root** in VS Code — the Explorer should show `backend/`, `gateway/`, `frontend/` at the top level.
3. Press **`Ctrl+Shift+B`** (or `Cmd+Shift+B` on Mac).

VS Code will sequentially:
1. **Build the C++ engine** — compiles `backend/src/*.cpp` with MinGW-w64, outputs `backend/build/wavebench_engine.exe`
2. **Run the Java gateway** — `mvn exec:java` in the `gateway/` directory
3. **Run the React frontend** — `npm install && npm run dev` in the `frontend/` directory

Once the last terminal prints a local URL (typically `http://localhost:5173`), open it in your browser. The Scope should begin plotting as soon as all three processes are connected.

**To stop everything:** `Command Palette (Ctrl+Shift+P)` → `Terminal: Kill All Terminals`

---

## 🛠️ Manual Run (Fallback)

If the one-click build does not work, run each step in its own terminal **in this exact order**:

```bash
# ── Step 1: Build and run the C++ engine ──────────────────────────────────
g++ -std=c++17 -O2 -static backend/src/*.cpp -lws2_32 -o backend/build/wavebench_engine.exe
backend\build\wavebench_engine.exe
# Expected output:
#   [C++] WaveBench Studio Engine v1.0
#   [C++] Listening on TCP port 5050...
#   [C++] Waiting for Java gateway connection...

# ── Step 2: Run the Java gateway (new terminal) ───────────────────────────
mvn -f gateway/pom.xml exec:java
# Expected output:
#   [Gateway] Connecting to C++ engine at localhost:5050...
#   [Gateway] WebSocket server started on port 8080

# ── Step 3: Run the React frontend (new terminal) ─────────────────────────
cd frontend
npm install        # first time only
npm run dev
# Open the URL printed (usually http://localhost:5173)
```

---

## 📁 Project Structure

```
wavebench-studio/
│
├── backend/                        # ── Layer 1: C++ Simulation Engine ──
│   ├── src/
│   │   ├── main.cpp                #   Entry point — TCP server, session loop
│   │   ├── SimulationEngine.hpp    #   Engine API (configure/start/stop/reset)
│   │   ├── SimulationEngine.cpp    #   Solver loop (Euler / RK4), threaded
│   │   ├── ServerSession.cpp/.hpp  #   Per-connection session handler
│   │   ├── Block.hpp               #   Block graph: Clock, Sine, Cosine
│   │   └── Logger.hpp              #   Timestamped console logger
│   └── build/                      #   Compiled .exe (git-ignored)
│
├── gateway/                        # ── Layer 2: Java WebSocket Gateway ──
│   ├── pom.xml                     #   Maven build (Java-WebSocket, Jackson, JWT)
│   └── src/main/java/com/wavebench/gateway/
│       ├── Main.java               #   Entry point — wires all servers together
│       ├── GatewayServer.java      #   WebSocket server on :8080
│       ├── EngineClient.java       #   TCP client to C++ engine on :5050
│       ├── HttpApiServer.java      #   REST API for project save/load/export
│       ├── auth/
│       │   ├── AuthHandler.java    #   Login / signup endpoints
│       │   ├── UserStore.java      #   JSON-backed user store
│       │   └── JwtUtil.java        #   JWT sign/verify
│       └── api/
│           ├── ProjectHandler.java #   Save / load / list / delete projects
│           └── ExportHandler.java  #   Simulation data export
│
├── frontend/                       # ── Layer 3: React Frontend ──
│   ├── package.json                #   Node dependencies (React Flow, Vite, TS)
│   └── src/
│       ├── App.tsx                 #   Root component — canvas, routing, state
│       ├── main.tsx                #   React entry point
│       ├── index.css               #   Global design system & tokens
│       ├── nodes/                  #   Custom React Flow block nodes
│       │   ├── ClockNode.tsx       #     ⏱  Master time reference
│       │   ├── SineNode.tsx        #     〜  sin() processor
│       │   ├── CosineNode.tsx      #     〜  cos() processor
│       │   ├── ScopeNode.tsx       #     📈  Live waveform display
│       │   ├── GainNode.tsx        #     ×  Scalar multiplier
│       │   ├── ConstantNode.tsx    #     #  Constant signal source
│       │   ├── SumNode.tsx         #     +  Signal adder
│       │   ├── ComparatorNode.tsx  #     >  Threshold comparator
│       │   ├── MuxNode.tsx         #        Multiplexer
│       │   ├── SwitchNode.tsx      #        On/off switch
│       │   └── ProbeNode.tsx       #        Numeric probe display
│       ├── canvas/
│       │   └── ScopeCanvas.tsx     #   HTML Canvas waveform renderer + DFT
│       ├── components/
│       │   ├── Toolbar.tsx         #   Simulation control bar
│       │   ├── StepSizeDialog.tsx  #   Solver config popup (dt + Euler/RK4)
│       │   ├── DiagnosticsModal.tsx#   Live engine diagnostics overlay
│       │   ├── FFTModal.tsx        #   Frequency-domain (FFT) view
│       │   ├── LogsTerminalPanel.tsx#  Unified logs from all 3 processes
│       │   ├── PropertiesPanel.tsx #   Block property editor
│       │   ├── ModelBrowser.tsx    #   Block palette / library browser
│       │   ├── CommandPalette.tsx  #   ⌘K command palette
│       │   ├── KeyboardShortcutsModal.tsx
│       │   ├── GuidedTour.tsx      #   First-run interactive tour
│       │   ├── PerfHUD.tsx         #   Performance heads-up display
│       │   ├── SaveProjectDialog.tsx
│       │   ├── Sidebar.tsx         #   Left rail navigation
│       │   └── StatusBar.tsx       #   Connection indicator / status bar
│       ├── hooks/
│       │   └── useSimulationSocket.ts  # WebSocket hook — owns WS lifecycle
│       ├── api/
│       │   └── client.ts           #   REST API client (login, projects, export)
│       ├── contexts/               #   React context providers (auth, etc.)
│       └── pages/                  #   Login / Signup pages
│
├── .vscode/
│   ├── tasks.json                  # ✅ One-click Ctrl+Shift+B build config
│   ├── launch.json                 #   Debug launch configs
│   └── settings.json               #   Workspace editor settings
│
├── docs/                           # Design docs, specs, build plans
│   ├── WaveBench_Studio_Build_Plan.md
│   ├── WaveBench_Menu_Feature_Spec.md
│   ├── WaveBench_Diagnostics_Terminal_Spec.md
│   ├── WaveBench_Pointer_Tool_Spec.md
│   ├── troubleshooting_guide.md
│   └── wavebench_studio_implementation_plan.md
│
├── graphify-out/                   # Knowledge graph (auto-generated)
├── .clang-format                   # C++ code style
├── .clang-tidy                     # C++ static analysis
└── README.md                       # This file
```

---

## ✅ Features

### Core (Assignment Requirements)

- [x] **Clock → Sine / Cosine → Scope** block graph with correct signal routing
- [x] Freely **draggable blocks** on a React Flow canvas
- [x] **Live dual-trace waveform** on the Scope, rendered from real C++ samples
- [x] **Step-size / solver popup** — configure `dt` and choose Euler or RK4 at runtime
- [x] **Simulink-style toolbar** with play, pause, stop, speed, and stop-time controls
- [x] **One-click build** via `Ctrl+Shift+B` in VS Code

### Extended Block Library

- [x] **Gain**, **Constant**, **Sum**, **Comparator**, **Mux**, **Switch**, **Probe** nodes

### Advanced Features

- [x] **FFT modal** — frequency-domain view of the live signal
- [x] **Diagnostics modal** — real-time engine status, uptime, thread info
- [x] **Unified logs terminal** — merged log streams from all three processes
- [x] **Command palette** (`Ctrl+K`) — keyboard-driven access to all actions
- [x] **Guided tour** — first-run interactive walkthrough
- [x] **Performance HUD** — frame timing and sample throughput overlay
- [x] **JWT auth** — login / signup with a JSON-backed user store
- [x] **Project save / load** — persist and restore diagram layouts via REST API
- [x] **Export handler** — foundation for CSV/PDF simulation data export

### Roadmap

- [ ] Export simulation report (PDF / CSV) and scope image
- [ ] Undo / Redo history
- [ ] Phase (XY) plot view on the Scope
- [ ] Integrator block and extended solver options

---

## 🔌 Communication Protocol

All messages are plain JSON, delivered over WebSocket (browser ↔ gateway) or TCP (gateway ↔ engine).

**Browser → Gateway → Engine (commands)**

```json
{ "type": "start" }
{ "type": "stop" }
{ "type": "reset" }
{ "type": "set_step_size", "value": 0.01 }
{ "type": "set_solver",    "solver": "RK4" }
{ "type": "set_speed",     "multiplier": 2.0 }
{ "type": "update_block",  "blockId": "sine", "amplitude": 1.5, "frequency": 2.0 }
```

**Engine → Gateway → Browser (samples, streamed continuously)**

```json
{ "type": "sample", "t": 0.020, "sin": 0.1987, "cos": 0.9802 }
{ "type": "status", "running": true, "solver": "RK4", "stepSize": 0.02 }
{ "type": "reset_ack" }
```

---

## 🐛 Troubleshooting

### `g++` not found / wrong version

**Symptom:** Build Backend task fails immediately, or you see threading errors:
```
error: 'thread' in namespace 'std' does not name a type
error: 'mutex' in namespace 'std' does not name a type
```
**Cause:** The `g++` on your PATH is the legacy MinGW (win32 threads), which does not support C++17 `<thread>` or `<mutex>`.
**Fix:** Install the **POSIX thread model** MinGW-w64 via MSYS2:
```bash
pacman -S mingw-w64-ucrt-x86_64-gcc
```
Add `C:\msys64\ucrt64\bin` to your system PATH, then **fully restart VS Code**.

---

### C++ engine exits immediately with no output

**Symptom:** `wavebench_engine.exe` runs and closes instantly, printing nothing.
**Cause:** The binary was dynamically linked and cannot find runtime DLLs (`libstdc++-6.dll`, `libwinpthread-1.dll`) at launch.
**Fix:** The VS Code task already passes `-static` to embed all runtimes. If you compiled manually, add `-static`:
```bash
g++ -std=c++17 -O2 -static backend/src/*.cpp -lws2_32 -o backend/build/wavebench_engine.exe
```

---

### Java gateway fails to connect / times out

**Symptom:**
```
[Gateway] Connecting to C++ engine at localhost:5050...
[Gateway] Could not connect to C++ engine after 15 attempts.
```
**Cause:** The gateway started before the engine, or the engine crashed.
**Fix:** Check the **Build Backend** terminal — the engine must print `Listening on TCP port 5050...` before you start the gateway. Kill all terminals (`Ctrl+Shift+P` → `Terminal: Kill All Terminals`) and restart in order.

---

### Frontend loads but Scope stays empty / shows a flat line

**Symptom:** The canvas renders and the toolbar is visible, but no waveform appears on the Scope.

| Check | What to look for |
|---|---|
| **Engine terminal** | Should print `[C++] Client connected` when the gateway connects |
| **Gateway terminal** | Should print `[Gateway] WebSocket server started on :8080` |
| **Browser console** (`F12`) | Look for WebSocket errors — `ws://localhost:8080` refused |
| **Scope block connections** | The Scope must be wired to a Sine or Cosine output — an unconnected Scope shows nothing |
| **Simulation running?** | Click ▶ Play in the toolbar — the scope only renders while the engine streams |

---

### `Address already in use` on port 5050 or 8080

**Symptom:** One of the processes fails to bind its port on startup.
**Fix:** A previous run left a process alive. Kill all terminals:
- `Command Palette` → `Terminal: Kill All Terminals`
- Or in PowerShell: `Get-Process -Name "wavebench_engine","java" | Stop-Process`

Then re-run `Ctrl+Shift+B`.

---

### `mvn` not found

**Symptom:** Run Java Gateway task errors immediately.
**Fix:** Download Maven from [maven.apache.org](https://maven.apache.org/download.cgi), extract it, and add the `bin/` directory to your system PATH. Restart VS Code completely after updating PATH.

---

### `npm` or `node` not found

**Symptom:** Run React Frontend task errors immediately.
**Fix:** Install [Node.js LTS](https://nodejs.org). The Windows installer adds `node` and `npm` to PATH automatically. Restart VS Code after installing.

---

### `'.'` is not recognized (manual run only)

**Symptom:** In Command Prompt, `./build/wavebench_engine.exe` prints:
```
'.' is not recognized as an internal or external command
```
**Cause:** Windows `cmd.exe` does not accept `./` prefix for local execution.
**Fix:** Use backslash syntax:
```cmd
backend\build\wavebench_engine.exe
```
Or switch to PowerShell, where `./` works correctly.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, React Flow (`@xyflow/react`) |
| Gateway | Java 17, Java-WebSocket, Jackson (JSON), JJWT, Maven |
| Engine | C++17, MinGW-w64 (POSIX threads), Winsock2 |
| Protocol | JSON over WebSocket (browser ↔ gateway) and TCP (gateway ↔ engine) |
| IDE | VS Code |

---

## 📄 Documentation

Full design and specification documents live in [`/docs`](./docs/):

| Document | Contents |
|---|---|
| `WaveBench_Studio_Build_Plan.md` | Architecture decisions, tech stack rationale, build plan |
| `wavebench_studio_implementation_plan.md` | Step-by-step implementation guide for all three layers |
| `WaveBench_Menu_Feature_Spec.md` | Menu bar and sidebar feature specification |
| `WaveBench_Diagnostics_Terminal_Spec.md` | Diagnostics / logs terminal specification |
| `WaveBench_Pointer_Tool_Spec.md` | Pointer tool and canvas interaction spec |
| `troubleshooting_guide.md` | Detailed compilation issues encountered and resolved on Windows |

---

## 📬 Submission Info

| | |
|---|---|
| **Submitted to** | sivaraman.s@alumni.iitm.ac.in |
| **PASS Technical Team** | Graphical Programming Assignment |

---

<p align="center">Built with C++17 · Java 17 · React 18</p>
