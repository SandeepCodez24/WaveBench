import { useState, useEffect, useRef } from 'react';
import type { User } from '../api/client';

interface Props {
  // Simulation controls
  onStart: () => void;
  onStop: () => void;
  onOpenStepSettings: () => void;
  stepSize: number;
  isPlaying: boolean;
  onResetSimulation: () => void;
  onSetSpeed: (multiplier: number) => void;
  simulationSpeed: number;
  onChangeSolver: (solver: 'Euler' | 'RK4') => void;
  solver: 'Euler' | 'RK4';
  onToggleLogging: () => void;
  isLogging: boolean;

  // Model browser
  onToggleModelBrowser: () => void;

  // File operations
  onNewProject: () => void;
  onSaveProject: (local: boolean) => void;
  onOpenLocalProject: () => void;
  onOpenServerProject: () => void;
  onExportReport: () => void;
  onExportCSV: () => void;
  onExportPNG: () => void;

  // View operations
  showMiniMap: boolean;
  onToggleMiniMap: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;

  // Tools operations
  onToggleDiagnostics: () => void;
  onToggleFFT: () => void;
  onTogglePerfHUD: () => void;
  showPerfHUD: boolean;

  // Help operations
  onToggleKeyboardShortcuts: () => void;
  onStartTour: () => void;

  // Auth
  user: User | null;
  onGoToDashboard: () => void;
  onLogout: () => void;

  // Edit actions
  canUndo: boolean;
  canRedo: boolean;
  canCopy: boolean;
  canPaste: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
}

type SpeedOption = { label: string; value: number };
const SPEED_OPTIONS: SpeedOption[] = [
  { label: '0.25×  Slow', value: 0.25 },
  { label: '1×  Real-time', value: 1 },
  { label: '4×  Fast', value: 4 },
  { label: 'MAX  No limit', value: 0 },
];

export function Toolbar({
  onStart, onStop, onOpenStepSettings, stepSize, isPlaying,
  onResetSimulation, onSetSpeed, simulationSpeed, onChangeSolver, solver,
  onToggleLogging, isLogging,
  onToggleModelBrowser,
  onNewProject, onSaveProject, onOpenLocalProject, onOpenServerProject,
  onExportReport, onExportCSV, onExportPNG,
  showMiniMap, onToggleMiniMap, onZoomIn, onZoomOut, onFitView,
  showGrid, onToggleGrid, isSidebarOpen, onToggleSidebar,
  isDarkTheme, onToggleTheme,
  onToggleDiagnostics, onToggleFFT, onTogglePerfHUD, showPerfHUD,
  onToggleKeyboardShortcuts, onStartTour,
  user, onGoToDashboard, onLogout,
  canUndo, canRedo, canCopy, canPaste,
  onUndo, onRedo, onDeleteSelected, onCut, onCopy, onPaste, onDuplicate,
}: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = () => setOpenMenu(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const speedLabel = simulationSpeed === 0 ? 'MAX'
    : simulationSpeed === 1 ? '1×'
    : simulationSpeed === 0.25 ? '¼×' : '4×';

  return (
    <header className="top-header">
      {/* Brand and Menus */}
      <div className="brand-section" ref={menuRef}>
        <span className="brand-title" style={{ cursor: 'pointer' }} onClick={onToggleModelBrowser}>
          WaveBench Studio
        </span>
        <nav className="main-nav">

          {/* ── FILE ── */}
          <div className="dropdown-menu-container">
            <button
              className={`nav-tab-btn ${openMenu === 'file' ? 'active' : ''}`}
              onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
            >
              File
            </button>
            {openMenu === 'file' && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={() => { onGoToDashboard(); close(); }}>
                  <span className="material-symbols-outlined">dashboard</span>My Dashboard
                </button>
                <div className="dropdown-separator" />
                <button className="dropdown-item" onClick={() => { onNewProject(); close(); }}>
                  <span className="material-symbols-outlined">add_circle</span>New Project
                </button>
                <button className="dropdown-item" onClick={() => { onOpenLocalProject(); close(); }}>
                  <span className="material-symbols-outlined">folder_open</span>Open Project...
                </button>
                <button className="dropdown-item" onClick={() => { onOpenServerProject(); close(); }}>
                  <span className="material-symbols-outlined">cloud_download</span>Open Server Project
                </button>
                <div className="dropdown-separator" />
                <button className="dropdown-item" onClick={() => { onSaveProject(false); close(); }}>
                  <span className="material-symbols-outlined">save</span>Save
                </button>
                <button className="dropdown-item" onClick={() => { onSaveProject(true); close(); }}>
                  <span className="material-symbols-outlined">download</span>Save As...
                </button>
                <div className="dropdown-separator" />
                <button className="dropdown-item" onClick={() => { onExportReport(); close(); }}>
                  <span className="material-symbols-outlined">summarize</span>Export Simulation Report
                </button>
                <button className="dropdown-item" onClick={() => { onExportCSV(); close(); }}>
                  <span className="material-symbols-outlined">description</span>Export Scope Data (CSV)
                </button>
                <button className="dropdown-item" onClick={() => { onExportPNG(); close(); }}>
                  <span className="material-symbols-outlined">image</span>Export Scope Image (PNG)
                </button>
              </div>
            )}
          </div>

          {/* ── EDIT ── */}
          <div className="dropdown-menu-container">
            <button
              className={`nav-tab-btn ${openMenu === 'edit' ? 'active' : ''}`}
              onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
            >
              Edit
            </button>
            {openMenu === 'edit' && (
              <div className="dropdown-menu" style={{ minWidth: 230 }}>
                <button className="dropdown-item"
                  onClick={() => { if (canUndo) { onUndo(); close(); } }}
                  style={{ opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'default', display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>undo</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Undo</span>
                  <span className="menu-shortcut">Ctrl+Z</span>
                </button>
                <button className="dropdown-item"
                  onClick={() => { if (canRedo) { onRedo(); close(); } }}
                  style={{ opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'default', display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>redo</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Redo</span>
                  <span className="menu-shortcut">Ctrl+Y</span>
                </button>
                <div className="dropdown-separator" />
                <button className="dropdown-item"
                  onClick={() => { if (canCopy) { onCut(); close(); } }}
                  style={{ opacity: canCopy ? 1 : 0.4, cursor: canCopy ? 'pointer' : 'default', display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>content_cut</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Cut</span>
                  <span className="menu-shortcut">Ctrl+X</span>
                </button>
                <button className="dropdown-item"
                  onClick={() => { if (canCopy) { onCopy(); close(); } }}
                  style={{ opacity: canCopy ? 1 : 0.4, cursor: canCopy ? 'pointer' : 'default', display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>content_copy</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Copy</span>
                  <span className="menu-shortcut">Ctrl+C</span>
                </button>
                <button className="dropdown-item"
                  onClick={() => { if (canPaste) { onPaste(); close(); } }}
                  style={{ opacity: canPaste ? 1 : 0.4, cursor: canPaste ? 'pointer' : 'default', display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>content_paste</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Paste</span>
                  <span className="menu-shortcut">Ctrl+V</span>
                </button>
                <button className="dropdown-item"
                  onClick={() => { if (canCopy) { onDuplicate(); close(); } }}
                  style={{ opacity: canCopy ? 1 : 0.4, cursor: canCopy ? 'pointer' : 'default', display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>control_point_duplicate</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Duplicate</span>
                  <span className="menu-shortcut">Ctrl+D</span>
                </button>
                <div className="dropdown-separator" />
                <button className="dropdown-item"
                  onClick={() => { if (canCopy) { onDeleteSelected(); close(); } }}
                  style={{ opacity: canCopy ? 1 : 0.4, cursor: canCopy ? 'pointer' : 'default', display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>delete</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Delete Selected</span>
                  <span className="menu-shortcut">Del</span>
                </button>
              </div>
            )}
          </div>

          {/* ── SIMULATION ── */}
          <div className="dropdown-menu-container">
            <button
              className={`nav-tab-btn ${openMenu === 'simulation' ? 'active' : ''}`}
              onClick={() => setOpenMenu(openMenu === 'simulation' ? null : 'simulation')}
            >
              Simulation
            </button>
            {openMenu === 'simulation' && (
              <div className="dropdown-menu" style={{ minWidth: 240 }}>
                {/* Run / Stop — synced with toolbar buttons */}
                <button className="dropdown-item"
                  onClick={() => { onStart(); close(); }}
                  style={{ opacity: isPlaying ? 0.45 : 1, cursor: isPlaying ? 'default' : 'pointer', display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>play_arrow</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Run Simulation</span>
                  <span className="menu-shortcut">Space</span>
                </button>
                <button className="dropdown-item"
                  onClick={() => { onStop(); close(); }}
                  style={{ opacity: !isPlaying ? 0.45 : 1, cursor: !isPlaying ? 'default' : 'pointer', display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>stop</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Stop Simulation</span>
                  <span className="menu-shortcut">Esc</span>
                </button>
                <button className="dropdown-item"
                  onClick={() => { onResetSimulation(); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>restart_alt</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Reset Simulation</span>
                </button>

                <div className="dropdown-separator" />

                {/* Simulation Parameters */}
                <button className="dropdown-item"
                  onClick={() => { onOpenStepSettings(); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>settings_input_component</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Simulation Parameters…</span>
                </button>

                <div className="dropdown-separator" />

                {/* Solver picker */}
                <div style={{ padding: '4px 10px 2px', fontSize: 10, fontWeight: 700, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Solver
                </div>
                {(['Euler', 'RK4'] as const).map(s => (
                  <button key={s} className="dropdown-item"
                    onClick={() => { onChangeSolver(s); close(); }}
                    style={{ display: 'flex', width: '100%', alignItems: 'center', paddingLeft: 18 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 8, color: solver === s ? 'var(--primary-teal)' : 'transparent' }}>
                      check
                    </span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{s === 'Euler' ? 'Euler (First-order)' : 'RK4 (Fourth-order)'}</span>
                  </button>
                ))}

                <div className="dropdown-separator" />

                {/* Speed submenu */}
                <div style={{ padding: '4px 10px 2px', fontSize: 10, fontWeight: 700, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Simulation Speed
                </div>
                {SPEED_OPTIONS.map(opt => (
                  <button key={opt.label} className="dropdown-item"
                    onClick={() => { onSetSpeed(opt.value); close(); }}
                    style={{ display: 'flex', width: '100%', alignItems: 'center', paddingLeft: 18 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 8, color: simulationSpeed === opt.value ? 'var(--primary-teal)' : 'transparent' }}>
                      check
                    </span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{opt.label}</span>
                  </button>
                ))}

                <div className="dropdown-separator" />

                {/* Log Signals toggle */}
                <button className="dropdown-item"
                  onClick={() => { onToggleLogging(); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 8, color: isLogging ? 'var(--primary-teal)' : 'var(--outline)' }}>
                    {isLogging ? 'toggle_on' : 'toggle_off'}
                  </span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Log Signals</span>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 99, fontWeight: 600,
                    background: isLogging ? 'rgba(0,104,95,0.12)' : 'rgba(109,122,119,0.12)',
                    color: isLogging ? 'var(--primary-teal)' : 'var(--outline)',
                    fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em',
                  }}>
                    {isLogging ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* ── VIEW ── */}
          <div className="dropdown-menu-container">
            <button
              className={`nav-tab-btn ${openMenu === 'view' ? 'active' : ''}`}
              onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
            >
              View
            </button>
            {openMenu === 'view' && (
              <div className="dropdown-menu" style={{ minWidth: 230 }}>
                {/* Zoom controls — live via useReactFlow */}
                <button className="dropdown-item" onClick={() => { onZoomIn(); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>zoom_in</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Zoom In</span>
                  <span className="menu-shortcut">Ctrl++</span>
                </button>
                <button className="dropdown-item" onClick={() => { onZoomOut(); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>zoom_out</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Zoom Out</span>
                  <span className="menu-shortcut">Ctrl+-</span>
                </button>
                <button className="dropdown-item" onClick={() => { onFitView(); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>fit_screen</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Fit to Screen</span>
                  <span className="menu-shortcut">Ctrl+0</span>
                </button>

                <div className="dropdown-separator" />

                {/* Grid */}
                <button className="dropdown-item" onClick={() => { onToggleGrid(); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>{showGrid ? 'grid_4x4' : 'grid_off'}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{showGrid ? 'Hide Grid' : 'Show Grid'}</span>
                  <span className="menu-shortcut">Ctrl+G</span>
                </button>

                {/* MiniMap */}
                <button className="dropdown-item" onClick={() => { onToggleMiniMap(); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>{showMiniMap ? 'layers_clear' : 'map'}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{showMiniMap ? 'Hide Mini Map' : 'Show Mini Map'}</span>
                  <span className="menu-shortcut">Ctrl+M</span>
                </button>

                {/* Sidebar */}
                <button className="dropdown-item" onClick={() => { onToggleSidebar(); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>{isSidebarOpen ? 'sidebar' : 'dock_to_right'}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}</span>
                  <span className="menu-shortcut">Ctrl+B</span>
                </button>

                <div className="dropdown-separator" />

                {/* Theme toggle */}
                <button className="dropdown-item" onClick={() => { onToggleTheme(); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>{isDarkTheme ? 'light_mode' : 'dark_mode'}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{isDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme'}</span>
                </button>
              </div>
            )}
          </div>

          {/* ── TOOLS ── */}
          <div className="dropdown-menu-container">
            <button
              className={`nav-tab-btn ${openMenu === 'tools' ? 'active' : ''}`}
              onClick={() => setOpenMenu(openMenu === 'tools' ? null : 'tools')}
            >
              Tools
            </button>
            {openMenu === 'tools' && (
              <div className="dropdown-menu" style={{ minWidth: 230 }}>
                {/* Block Library Manager — opens existing model browser */}
                <button className="dropdown-item" onClick={() => { onToggleModelBrowser(); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>extension</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Block Library Manager</span>
                </button>

                <div className="dropdown-separator" />

                {/* Signal Analyzer (DFT) */}
                <button className="dropdown-item" onClick={() => { onToggleFFT(); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>monitoring</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Signal Analyzer (FFT)</span>
                </button>

                {/* Diagnostics Console */}
                <button className="dropdown-item" onClick={() => { onToggleDiagnostics(); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>terminal</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Diagnostics Console</span>
                </button>

                <div className="dropdown-separator" />

                {/* Performance HUD */}
                <button className="dropdown-item" onClick={() => { onTogglePerfHUD(); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 8, color: showPerfHUD ? 'var(--primary-teal)' : 'var(--outline)' }}>
                    {showPerfHUD ? 'toggle_on' : 'toggle_off'}
                  </span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Performance HUD</span>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 99, fontWeight: 600,
                    background: showPerfHUD ? 'rgba(0,104,95,0.12)' : 'rgba(109,122,119,0.12)',
                    color: showPerfHUD ? 'var(--primary-teal)' : 'var(--outline)',
                    fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em',
                  }}>
                    {showPerfHUD ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* ── HELP ── */}
          <div className="dropdown-menu-container">
            <button
              className={`nav-tab-btn ${openMenu === 'help' ? 'active' : ''}`}
              onClick={() => setOpenMenu(openMenu === 'help' ? null : 'help')}
            >
              Help
            </button>
            {openMenu === 'help' && (
              <div className="dropdown-menu" style={{ minWidth: 220 }}>
                {/* Guided Tour */}
                <button className="dropdown-item" onClick={() => { onStartTour(); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>tour</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Getting Started Tour</span>
                </button>

                {/* Keyboard Shortcuts */}
                <button className="dropdown-item" onClick={() => { onToggleKeyboardShortcuts(); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>keyboard</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Keyboard Shortcuts</span>
                  <span className="menu-shortcut">Ctrl+?</span>
                </button>

                <div className="dropdown-separator" />

                {/* Documentation */}
                <button className="dropdown-item"
                  onClick={() => { window.open('https://github.com/SandeepCodez24/WaveBench', '_blank'); close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>menu_book</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Documentation</span>
                </button>

                {/* Sample Projects — listed as future */}
                <button className="dropdown-item"
                  style={{ opacity: 0.45, cursor: 'default', display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>folder_special</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Sample Projects</span>
                  <span style={{ fontSize: 9, color: 'var(--outline)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}>SOON</span>
                </button>

                {/* Report a Bug */}
                <button className="dropdown-item"
                  onClick={() => { window.location.href = 'mailto:?subject=WaveBench Bug Report'; close(); }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>bug_report</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Report a Bug</span>
                </button>

                <div className="dropdown-separator" />

                {/* About */}
                <button className="dropdown-item"
                  onClick={() => {
                    alert('WaveBench Studio v1.0\n\nA real-time signal simulation workbench.\n\nFrontend: React + TypeScript + ReactFlow\nGateway: Java (java-websocket)\nBackend: C++ (fixed-step solver)\n\nBuilt with the Lumina Engineering design system.');
                    close();
                  }}
                  style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ marginRight: 8 }}>info</span>
                  <span>About WaveBench</span>
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Right: Step size chip + playback controls + avatar */}
      <div className="top-actions">
        {/* Speed chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)',
          borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
          fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
          color: 'var(--outline)',
        }}
          onClick={() => {
            const next = simulationSpeed === 1 ? 4 : simulationSpeed === 4 ? 0 : simulationSpeed === 0 ? 0.25 : 1;
            onSetSpeed(next);
          }}
          title="Click to cycle speed"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>speed</span>
          {speedLabel}
        </div>

        {/* Step Size Config Chip */}
        <div className="step-size-chip" onClick={onOpenStepSettings}>
          <span className="step-size-label">Step Size:</span>
          <span className="step-size-val">{stepSize.toFixed(3)}s</span>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--outline)' }}>
            settings_input_component
          </span>
        </div>

        {/* Start / Stop / Settings / Avatar */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="icon-btn primary"
            title="Start Simulation (Space)"
            data-tour="play-btn"
            onClick={onStart}
            style={{ opacity: isPlaying ? 0.5 : 1, pointerEvents: isPlaying ? 'none' : 'auto' }}
          >
            <span className="material-symbols-outlined">play_arrow</span>
          </button>
          <button
            className="icon-btn error"
            title="Stop Simulation (Esc)"
            onClick={onStop}
            style={{ opacity: !isPlaying ? 0.5 : 1, pointerEvents: !isPlaying ? 'none' : 'auto' }}
          >
            <span className="material-symbols-outlined">stop</span>
          </button>
          <button className="icon-btn" title="Reset Simulation" onClick={onResetSimulation}>
            <span className="material-symbols-outlined">restart_alt</span>
          </button>
          <button className="icon-btn" title="Solver Settings" onClick={onOpenStepSettings}>
            <span className="material-symbols-outlined">settings</span>
          </button>
          {user ? (
            <button
              className="avatar-chip"
              title={`${user.displayName} — ${user.email}\nClick to sign out`}
              onClick={onLogout}
              id="toolbar-avatar-btn"
            >
              {user.displayName[0]?.toUpperCase() ?? '?'}
            </button>
          ) : (
            <button className="icon-btn" title="Account" onClick={onGoToDashboard}>
              <span className="material-symbols-outlined">account_circle</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
