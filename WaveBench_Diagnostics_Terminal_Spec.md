# WaveBench Studio — Diagnostics / Logs Terminal Specification

Covers the "Logs" sidebar item (terminal icon) — its responsibilities, competitor grounding, and the innovation angle unique to a 3-process architecture (React frontend, Java gateway, C++ engine).

**Priority key:** 🔴 Core (baseline) · 🟡 High-value (strong payoff for the effort) · 🟢 Stretch (only if time remains)

---

## Competitor Grounding

**Simulink's Diagnostic Viewer** organizes messages into stages representing a runtime operation such as model load, simulation, or build, color-codes them as errors/warnings/information, and lets you filter by component or model. When a fix is known, it shows a Suggested Actions section with a Fix button, and specific warnings can be individually suppressed and later restored. It can run docked to the model window or standalone, and can compare diagnostic messages between different model simulations.

**Node-RED's Debug sidebar** shows messages in a structured, expandable/collapsible view rather than raw text, and clicking a message's source reveals that node within the workspace — i.e., jumps to and highlights the block that generated it. It supports pausing the live output (with dropped messages counted while paused), can pop out into a separate browser window, lets you pin a message so it stays displayed, and copy its path or value. Its Debugger extension supports setting a breakpoint on a node's port so the runtime pauses when a message arrives there, then stepping through message-by-message.

Neither tool has to solve the problem this project actually has: **three separate processes** whose logs need to read as one coherent story, not three scattered streams.

---

## Responsibilities — What Belongs in the Logs Panel

✅ Should include:
- Connection lifecycle events for both socket hops (frontend↔gateway, gateway↔engine)
- Simulation lifecycle events (start / pause / stop / reset / step)
- Numerical warnings from the engine — NaN, overflow, saturation (Simulink's exact diagnostic category)
- Export operations (report generated, CSV saved) — doubles as a natural audit trail

❌ Should NOT include:
- Routine per-sample data (`t`, `sin`, `cos`) — floods the log; that data belongs in the Scope, not the Terminal

---

## Feature Table — Borrowed Ideas vs. Our Twist

| Feature | Borrowed from | Our twist | Priority |
|---|---|---|---|
| Color-coded severity (error/warning/info) | Simulink | Same 3-tier system, extended with a source badge (Engine/Gateway/Frontend) | 🔴 Core |
| Staged grouping | Simulink (load/build/simulation stages) | Stages become **per-run sessions** — each Run gets its own collapsible group | 🔴 Core |
| Click-to-jump-and-highlight | Node-RED | Clicking a log entry referencing a block highlights it on the canvas | 🟡 High-value |
| Pause + dropped-message counter | Node-RED | Same, applied to the merged 3-process stream | 🟡 High-value |
| Pop-out to separate window | Node-RED | Undock the terminal for a second-monitor debugging setup | 🟢 Stretch |
| Pin + copy value | Node-RED | Same | 🟡 High-value |
| Suggested Actions / Fix button | Simulink | For common failures ("backend not running," "port already in use"), a Fix button re-triggers the relevant process your one-click `tasks.json` already knows how to start | 🟡 High-value |
| **Cross-layer causality linking** | *New — neither competitor has this problem* | When something breaks, group the resulting Frontend + Gateway + Engine log lines together as one causal chain instead of three scattered entries | 🟢 Stretch — the standout feature |
| **Live health strip** | *New* | Persistent one-line strip above the log list: 3 colored dots (Engine/Gateway/Frontend) + current solver state, matching the "SOLVER RUNNING" indicator already in your sidebar. Visible even with the panel collapsed | 🟡 High-value |
| **Latency sparkline** | *New* | Tiny inline sparkline of gateway↔engine round-trip latency over the last ~30s | 🟢 Stretch |
| **Time-travel scrub** | Node-RED's breakpoint step-through, generalized | Scrub through a small timeline to replay what the logs (and even the scope) looked like at any earlier point in the current run — Node-RED steps through discrete messages, this steps through continuous simulated time | 🟢 Stretch |

---

## Log Entry Anatomy

Individual entry:
```
[12:04:31.204] 🔴 ENGINE   Sine block output: NaN detected     [Jump to block] [Fix ▾]
[12:04:31.198] 🟡 GATEWAY  Relay latency spike: 340ms
[12:04:30.001] 🔵 FRONTEND WebSocket connected (ws://localhost:8080)
```

Grouped as a causal chain when the events are correlated:
```
▼ Connection Drop — 12:04:29
   🔴 ENGINE   TCP connection reset
   🟡 GATEWAY  Lost connection to engine, buffering commands
   🔵 FRONTEND WebSocket closed (code 1006), retrying in 2s
```

---

## Implementation Sketch — Merging Three Log Sources

```
C++ Engine          →  writes structured JSON log lines to stderr, e.g.
                        {"level":"error","src":"engine","msg":"NaN in SineBlock","blockId":"sine"}

Java Gateway         →  tails the engine's stderr stream, tags its own
                        events the same way, and relays *all* of them
                        (engine's + its own) over the existing WebSocket
                        as a distinct message type:
                        {"type":"log","level":"warning","src":"gateway","msg":"..."}

React Frontend        →  a `useLogStream()` hook listens for {"type":"log"}
                        messages alongside the existing sample stream,
                        appends its own client-side events (connection
                        opened/closed, export triggered) into the same
                        in-memory log array, and the LogsPanel renders
                        the merged, time-sorted result.
```

This is the same WebSocket connection you already have for streaming samples — log messages are just a different `type` value on the same wire, no new infrastructure needed.

---

## Suggested Build Order

1. 🔴 Basic merged, color-coded, scrollable log list (Engine/Gateway/Frontend tagged)
2. 🔴 Live health strip with the 3 status dots + solver state
3. 🟡 Click-to-jump-and-highlight on canvas
4. 🟡 Pause + pin + copy
5. 🟡 Suggested Fix buttons for the 2–3 most common failures
6. 🟢 Causality linking, latency sparkline, time-travel scrub, pop-out window — pick one as the "impressive" feature if time allows, mention the rest in your report's Future Improvements section
