# WaveBench Studio — Pointer Tool Specification

Covers the "Pointer" sidebar tool — its interaction states on the canvas, its behavior in other areas of the app, and the innovation angle vs. Simulink's actual pointer mechanics.

---

## Competitor Grounding — What Simulink's Pointer Actually Does

Selecting a block then holding Ctrl and clicking a destination block auto-connects them, with Simulink routing the line around any blocks in the way — this is the real mechanism behind its "auto-connect," not just a decorative shortcut. Manual wire-drawing works by dragging from a port to empty canvas, where the cursor turns into a circle with directional guide arrows for each additional line segment. Dragging a selection box around multiple blocks enables the Format tab's Distribute and Match tools, and pausing the pointer on a block reveals resize handles at its four corners. Holding Ctrl while dragging a block duplicates it, and blocks can be rotated in 90-degree increments or flipped to simplify feedback loops.

---

## Pointer Behavior on the Canvas

| Interaction | Action | Innovation vs. Simulink |
|---|---|---|
| Hover a block | Highlight outline, resize handles fade in | Same idea, modernized styling |
| Hover a wire | Live value tooltip showing what's flowing through it right now | Simulink has no equivalent — only makes sense on a *running* simulation |
| Click | Select; shows a small floating action toolbar above it (Duplicate / Delete / Properties / Connect) | |
| Drag block | Moves it; connected wires auto-reroute | Matches Simulink |
| Drag on empty canvas | Rubber-band / marquee select | Matches Simulink |
| Shift+click | Add/remove a block from the current selection | |
| **Select, then Ctrl+click a second block** | Auto-connects them, routed around obstacles | Borrowed near-directly from Simulink — a real time-saver as diagrams grow |
| Drag from a port | Manual wire-draw mode | **Twist:** magnetic port-snapping within ~20px, instead of Simulink's directional-arrow-guide system — smoother, closer to modern node-editor UX (React Flow supports this natively, low implementation cost) |
| Double-click empty canvas | Opens a quick "Add Block" search right where you clicked | Mirrors Simulink's quick-insert menu |
| Double-click a block | Opens its Properties panel inline, not a separate modal | Ties into the Edit menu's Block Properties Panel feature |
| Right-click | Context menu — Rename / Duplicate / Delete / Properties | |
| Ctrl+drag a block | Duplicates it at the drop point | Matches Simulink |
| Hover + drag a corner | Resize (mainly useful on the Scope block) | |
| Hold Space | Temporarily switches to Pan/hand mode | Simulink predates this convention — standard in Figma/Miro-era tools |
| Scroll / pinch | Zoom centered under the cursor | |

---

## Pointer Behavior Outside the Canvas

| Area | Behavior |
|---|---|
| **Scope panel** | Hover shows a MATLAB-Data-Cursor-style value tooltip directly on the waveform; click pins it in place; drag-select brushes/zooms into a time range |
| **Logs panel** | Click a log entry jumps to and highlights its source block on the canvas (ties directly into the Diagnostics Terminal spec) |
| **Sidebar (Blocks palette)** | Dragging a block from the palette shows a ghost preview of exactly where it will land before release — reduces misplacement |
| **Toolbar / menus** | Consistent hover highlight + shortcut tooltip everywhere, so the pointer's feedback language stays identical across the whole app, not just the canvas |

---

## The Standout Addition

**Command palette (Ctrl+K)** — a fuzzy-search launcher reachable from anywhere: "add block," "jump to that NaN warning," "open settings." This is a distinctly modern-tool pattern (VS Code, Linear, Notion) that Simulink's traditional menu-driven interface lacks entirely, and it's a strong "premium" signal relative to its implementation cost if a command-menu component is already available in your UI library.

---

## Suggested Build Order

1. 🔴 Core click/drag/select/move (baseline — likely already working given your canvas is done)
2. 🟡 Ctrl+click auto-connect — high value, moderate effort, directly borrowed from a real Simulink workflow
3. 🟡 Magnetic port-snapping on manual wire-draw — React Flow gives you most of this for free
4. 🟡 Live wire-hover tooltip — reuses the same live sample stream already powering the Scope
5. 🟢 Space-bar pan, double-click quick-add, ghost drag-preview — polish tier
6. 🟢 Command palette — the standout stretch feature if time allows
