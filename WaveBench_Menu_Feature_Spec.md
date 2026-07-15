# WaveBench Studio — Menu & Sidebar Feature Specification

Companion to the main build plan. Covers what each menu (`File / Edit / Simulation / View / Tools / Help`) and the sidebar (`Pointer / Blocks / Signals / Logic`) should contain, with priority tags so you can tell what's worth building now vs. what's just good "Future Improvements" material for your report.

**Priority key:** 🔴 Core (expected baseline) · 🟡 High-value (strong payoff for the effort) · 🟢 Stretch (only if time remains)

---

## If You Only Have 2–3 Days Left

Since canvas, backend, gateway, and frontend are already wired up, this is the tightest path to a genuinely strong final submission without overextending:

1. **File → Export Report (PDF/HTML) + Export CSV** — do this first. It's exactly what you described wanting, and it's the single feature that reads as most "complete" to a recruiter.
2. **Simulation → surface the existing `StepSizeDialog` in the menu** — near-zero new code, just a menu entry that opens what you already built.
3. **View → Theme toggle + Minimap** — both are close to free given what you already have.
4. **Edit → Undo/Redo + Delete** — moderate effort, but expected baseline for anything calling itself an "editor."
5. **Sidebar → add 2 extra draggable blocks** (e.g. Gain, Constant) to the Blocks category.

Everything tagged 🟢 below is legitimate material for your report's "Future Improvements" section even if you never build it — scoping something and consciously deferring it under time pressure is itself a sign of good engineering judgment, and worth saying explicitly in the report.

---

## File Menu

| Feature | Priority | Description | Notes / MATLAB Parallel |
|---|---|---|---|
| New Project | 🔴 Core | Resets canvas to the default Clock→Sine/Cosine→Scope layout | Simulink's "New Model" |
| Save / Save As | 🔴 Core | Persists block positions + simulation settings as JSON | Simulink's "Save As .slx" |
| Open Project | 🔴 Core | Loads a previously saved JSON layout back onto the canvas | Simulink's "Open" |
| **Export Simulation Report** | 🟡 High-value | Downloadable PDF/HTML with run metadata (timestamp, step size, solver, stop time), a snapshot image of the scope graph, and a table of sampled values | Your strongest answer to "download the report" — build before anything else here |
| Export Scope Data (CSV) | 🟡 High-value | Raw `{t, sin, cos}` rows as a downloadable `.csv` | Mirrors Simulink's "To Workspace"/"To File" logging blocks |
| Export Scope Image (PNG) | 🟡 High-value | One-click snapshot of the chart | `canvas.toDataURL()` — a few lines for a lot of payoff |
| Recent Projects | 🟢 Stretch | Quick-access list of last saved diagrams | |
| Auto-save | 🟢 Stretch | Silent periodic save so work isn't lost | |
| Import Block Library | 🟢 Stretch | Load a `.json` file defining a custom block type | Ties into the sidebar's extensibility story |
| Print | 🟢 Stretch | Browser print-to-PDF of the canvas view | |

---

## Edit Menu

| Feature | Priority | Description | Notes |
|---|---|---|---|
| Undo / Redo | 🔴 Core | Command-stack over block moves, adds, deletes | Already on your Section 11 innovation list |
| Delete | 🔴 Core | Remove selected block(s) and their wires | |
| Cut / Copy / Paste | 🟡 High-value | Standard clipboard ops on selected blocks | |
| Duplicate | 🟡 High-value | Clone a block with a small position offset | |
| **Block Properties Panel** | 🟡 High-value | Right-click → editable parameters (e.g. Sine's frequency/amplitude) | Directly mirrors Simulink's block parameter dialogs — a strong "innovation" signal |
| Select All | 🟢 Stretch | Selects every block on canvas | |
| Rename Block | 🟢 Stretch | Inline-edit a block's display label | |
| Find Block | 🟢 Stretch | Search-and-jump by name — more useful once you have more block types | |
| Preferences | 🟢 Stretch | Grid size, autosave interval, default theme | |

---

## Simulation Menu

| Feature | Priority | Description | MATLAB Parallel |
|---|---|---|---|
| Run / Pause / Stop | 🔴 Core | Already on your toolbar — mirror the same actions here so menu and toolbar stay in sync | |
| Step Forward / Back | 🔴 Core | Same | |
| Reset Simulation | 🔴 Core | Zero out `t`, clear the scope buffer | |
| Simulation Parameters… | 🔴 Core | Opens your existing `StepSizeDialog` — just add a menu entry point | Simulink's "Model Configuration Parameters" |
| Fixed-Step vs Variable-Step Solver | 🟡 High-value | Your Euler/RK4 picker *is* fixed-step; adding an adaptive variable-step option (step size shrinks/grows based on how fast the signal is changing) is a genuinely advanced, technically accurate feature | Mirrors Simulink's fixed-step vs `ode45`-style variable-step solvers |
| Simulation Speed (0.25x / 1x / 4x / Max) | 🟡 High-value | Decouples simulated time from wall-clock time | Mirrors Simulink's Normal / Accelerator / Rapid Accelerator modes |
| Per-Block Sample Time | 🟢 Stretch | Let the Clock's own sample rate differ from the solver step size | Real Simulink concept — each block can carry its own sample time |
| Log Signals toggle | 🟢 Stretch | Turns sample buffering on/off, feeds the Export Report feature | Mirrors "To Workspace" logging |
| Compare Runs | 🟢 Stretch | Overlay a previous scope capture against the current one | Mirrors Simulink Data Inspector |

---

## View Menu

| Feature | Priority | Description | Notes |
|---|---|---|---|
| Zoom In / Out / Fit to Screen | 🔴 Core | React Flow gives you this almost free via its built-in `Controls` component | |
| **Theme Toggle (Light/Dark)** | 🟡 High-value | Reconciles your current light build with dark alternatives, and is a nice feature in its own right | |
| **Minimap** | 🟡 High-value | Small canvas overview in the corner | React Flow's built-in `<MiniMap />` — very low effort, high visual payoff |
| Toggle Grid | 🟡 High-value | Show/hide the dot-grid background | |
| Toggle Sidebar | 🟢 Stretch | Collapse the left panel for more canvas space | |
| Show/Hide Port & Wire Labels | 🟢 Stretch | Cleaner "presentation mode" view | |
| Full Screen / Presentation Mode | 🟢 Stretch | Hides all chrome — good for a demo recording | |
| Tidy Layout | 🟢 Stretch | Auto-arranges blocks into a clean horizontal flow | Directly reinforces your "alignment should be perfect" design goal |

---

## Tools Menu

| Feature | Priority | Description | MATLAB Parallel |
|---|---|---|---|
| Block Library Manager | 🟡 High-value | Browse/add new block types beyond the required 4 | Feeds directly into the sidebar's "Blocks" category |
| Diagnostics / Console | 🟡 High-value | Shows engine/gateway connection status, latency, dropped samples | Good to demo — proves you understand your own architecture, not just that it works |
| Signal Analyzer (FFT view) | 🟢 Stretch, high-impact if built | Frequency-domain plot of the Sine/Cosine signals | Real Simulink has an actual "Signal Analyzer" app; a basic DFT in C++ is moderate effort for strong payoff |
| Performance HUD | 🟢 Stretch | FPS, socket latency, samples/sec overlay | Already on your Section 11 list — Tools is a natural toggle location |
| Data Inspector | 🟢 Stretch | Spreadsheet-style table of logged samples | |
| Custom Block Creator | 🟢 Stretch, high-effort | Let the user type a formula (e.g. `2*sin(t)+1`) to define a new function block | Big creativity signal, but flag as optional given remaining time |

---

## Help Menu

| Feature | Priority | Description |
|---|---|---|
| Documentation | 🔴 Core | Link to your README/report |
| About | 🔴 Core | Version, credits, tech stack summary |
| Keyboard Shortcuts | 🟡 High-value | Modal listing shortcuts — cheap to build, reads as polished |
| Guided Tour / Getting Started | 🟢 Stretch | One-time onboarding overlay pointing at Clock → Sine/Cosine → Scope — reinforces the "user-friendly, easy to understand" goal |
| Sample Projects | 🟢 Stretch | Preloaded example diagrams, more useful once you add more block types |
| Report a Bug | 🟢 Stretch | Simple feedback form or mailto link |

---

## Sidebar (Pointer / Blocks / Signals / Logic)

| Category | Contains | MATLAB/Simulink Parallel |
|---|---|---|
| **Pointer** | Default select/move tool; consider adding a Pan (hand) tool for large diagrams | Standard cursor tool |
| **Blocks** | Your required Clock/Sine/Cosine/Scope, plus a couple of stretch additions: Constant, Step, Gain, Sum/Adder | Mirrors Simulink's "Sources" + "Math Operations" library categories |
| **Signals** | Signal Probe (drop onto any wire to inspect its live value without a full Scope), Mux/Demux for combining signals | Mirrors "Signal Routing" / "Signal Attributes" |
| **Logic** | Switch, Comparator (`>`, `<`, `==`), Saturation, basic logic gates (AND/OR/NOT) | Mirrors "Logic and Bit Operations" + "Discontinuities" |

Adding even 2–3 blocks per category (not all of them) is a low-risk way to show you understood Simulink's actual block taxonomy, rather than only satisfying the literal 4-block requirement — this is worth more to a recruiter than it costs to build.

---

## Why This Framing Matters for Your Report

Most of the 🟢 Stretch items above map to real, named MATLAB/Simulink concepts (solver types, sample time, Accelerator modes, Data Inspector, Signal Analyzer). Even the ones you don't build are worth listing explicitly in your report's "Future Improvements" section, phrased as: *"Recognized as a natural extension of [X real Simulink feature], scoped but deprioritized in favor of [Y] given the timeline."* That reads as engineering judgment, not as things you ran out of time for — which is exactly the distinction a technical reviewer is trying to separate candidates on.
