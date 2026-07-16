import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  addEdge,
  Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Auth
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { apiSaveProject, apiLoadProject, apiListProjects } from './api/client';

// Import UI layout components
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { ModelBrowser } from './components/ModelBrowser';
import { PropertiesPanel } from './components/PropertiesPanel';
import { StatusBar } from './components/StatusBar';
import { StepSizeDialog } from './components/StepSizeDialog';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { FFTModal } from './components/FFTModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { GuidedTour } from './components/GuidedTour';
import { PerfHUD } from './components/PerfHUD';
import { SaveProjectDialog } from './components/SaveProjectDialog';

// Import custom simulation nodes
import { ClockNode } from './nodes/ClockNode';
import { SineNode } from './nodes/SineNode';
import { CosineNode } from './nodes/CosineNode';
import { ScopeNode } from './nodes/ScopeNode';

// Import WebSocket communications hook
import { useSimulationSocket } from './hooks/useSimulationSocket';

type Page = 'login' | 'signup' | 'dashboard' | 'app';

// Custom node registry mapping types to components
const nodeTypes = {
  clock: ClockNode,
  sine: SineNode,
  cosine: CosineNode,
  scope: ScopeNode,
};

// Initial nodes layout (Simulink diagram representation)
const initialNodes: Node[] = [
  { id: 'clock', type: 'clock', position: { x: 80, y: 140 }, data: {} },
  { id: 'sine', type: 'sine', position: { x: 320, y: 50 }, data: {} },
  { id: 'cosine', type: 'cosine', position: { x: 320, y: 260 }, data: {} },
  { id: 'scope', type: 'scope', position: { x: 580, y: 110 }, data: { samplesRef: { current: [] } } },
];

// Connection lines layout (animated flow representation)
const initialEdges: Edge[] = [
  { id: 'e1', source: 'clock', sourceHandle: 'out', target: 'sine', targetHandle: 'in', animated: true },
  { id: 'e2', source: 'clock', sourceHandle: 'out', target: 'cosine', targetHandle: 'in', animated: true },
  { id: 'e3', source: 'sine', sourceHandle: 'out', target: 'scope', targetHandle: 'in', animated: true },
  { id: 'e4', source: 'cosine', sourceHandle: 'out', target: 'scope', targetHandle: 'in', animated: true },
];

function FlowWorkspace({ 
  onGoToDashboard,
  activeProjectName,
  setActiveProjectName
}: { 
  onGoToDashboard: () => void;
  activeProjectName: string | null;
  setActiveProjectName: (name: string | null) => void;
}) {
  const { user, logout } = useAuth();
  const { samplesRef, send, connectionState, clearSamples } = useSimulationSocket();
  const [showStepDialog, setShowStepDialog] = useState<boolean>(false);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [isModelBrowserOpen, setIsModelBrowserOpen] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [stepSize, setStepSize] = useState<number>(0.001);
  const [solver, setSolver] = useState<'Euler' | 'RK4'>('RK4');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // --- Simulation menu new state ---
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [isLogging, setIsLogging] = useState<boolean>(true);

  // --- View menu state ---
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // --- Tools menu state ---
  const [showPerfHUD, setShowPerfHUD] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [showFFT, setShowFFT] = useState<boolean>(false);

  // --- Help menu state ---
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState<boolean>(false);
  const [showGuidedTour, setShowGuidedTour] = useState<boolean>(false);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // --- Edit Menu: Undo/Redo & Clipboard state ---
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [clipboard, setClipboard] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);

  // Handle simulation Start
  const handleStart = useCallback(() => {
    clearSamples();
    send({ type: 'start' });
    setIsPlaying(true);
  }, [send, clearSamples]);

  // Handle simulation Stop
  const handleStop = useCallback(() => {
    send({ type: 'stop' });
    setIsPlaying(false);
  }, [send]);

  // Track the current loaded project name to prevent infinite fetch loop
  const loadedProjectRef = useRef<string | null>(null);

  // Initialize history on mount / load active project
  useEffect(() => {
    if (activeProjectName) {
      if (loadedProjectRef.current === activeProjectName) return;
      loadedProjectRef.current = activeProjectName;

      apiLoadProject(activeProjectName)
        .then((response: any) => {
          const loadedData = response.diagram || response;
          if (loadedData) {
            if (isPlaying) {
              handleStop();
            }
            clearSamples();
            if (loadedData.nodes) {
              setNodes(loadedData.nodes);
              setHistory([{ nodes: loadedData.nodes, edges: loadedData.edges || [] }]);
              setHistoryIndex(0);
            }
            if (loadedData.edges) setEdges(loadedData.edges);
            if (loadedData.stepSize) setStepSize(loadedData.stepSize);
            if (loadedData.solver) setSolver(loadedData.solver);
            
            // Sync loaded parameters with C++ engine
            send({
              type: 'config',
              stepSize: loadedData.stepSize || stepSize,
              solver: loadedData.solver || solver
            });
          }
        })
        .catch((err: Error) => {
          console.error("Failed to load project from server:", err);
          alert(`Failed to load project: ${err.message}`);
        });
    } else {
      loadedProjectRef.current = null;
      setNodes(initialNodes);
      setEdges(initialEdges);
      setStepSize(0.001);
      setSolver('RK4');
      setHistory([{ nodes: initialNodes, edges: initialEdges }]);
      setHistoryIndex(0);
    }
  }, [activeProjectName, setNodes, setEdges, clearSamples, send, isPlaying, handleStop]);

  const pushToHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    const cleanNodes = JSON.parse(JSON.stringify(newNodes));
    const cleanEdges = JSON.parse(JSON.stringify(newEdges));

    setHistory((prevHistory) => {
      // If index is not at the end of the history array (e.g. after undoing), discard subsequent entries
      const nextHistory = prevHistory.slice(0, historyIndex + 1);
      
      // Prevent duplicate pushes if the states are identical
      if (nextHistory.length > 0) {
        const last = nextHistory[nextHistory.length - 1];
        if (JSON.stringify(last.nodes) === JSON.stringify(cleanNodes) && 
            JSON.stringify(last.edges) === JSON.stringify(cleanEdges)) {
          return prevHistory;
        }
      }
      
      const updated = [...nextHistory, { nodes: cleanNodes, edges: cleanEdges }];
      setHistoryIndex(updated.length - 1);
      return updated;
    });
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const { nodes: prevNodes, edges: prevEdges } = history[prevIndex];
      setNodes(JSON.parse(JSON.stringify(prevNodes)));
      setEdges(JSON.parse(JSON.stringify(prevEdges)));
      setHistoryIndex(prevIndex);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const { nodes: nextNodes, edges: nextEdges } = history[nextIndex];
      setNodes(JSON.parse(JSON.stringify(nextNodes)));
      setEdges(JSON.parse(JSON.stringify(nextEdges)));
      setHistoryIndex(nextIndex);
    }
  }, [history, historyIndex, setNodes, setEdges]);
  
  const [serverProjects, setServerProjects] = useState<string[]>([]);
  const [showServerProjectsModal, setShowServerProjectsModal] = useState<boolean>(false);

  const { zoomIn, zoomOut, fitView, screenToFlowPosition } = useReactFlow();

  // Wire samplesRef into the Scope node's data
  const updatedNodes = useMemo(() => {
    return nodes.map((node) => {
      if (node.type === 'scope') {
        return {
          ...node,
          data: {
            ...node.data,
            samplesRef,
          },
        };
      }
      return node;
    });
  }, [nodes, samplesRef]);

  // Handle settings config apply
  const handleApplySettings = useCallback((newStepSize: number, newSolver: 'Euler' | 'RK4') => {
    setStepSize(newStepSize);
    setSolver(newSolver);
    send({
      type: 'config',
      stepSize: newStepSize,
      solver: newSolver
    });
  }, [send]);

  // Handle node selection events
  const onSelectionChange = useCallback((params: { nodes: Node[] }) => {
    if (params.nodes.length > 0) {
      setSelectedNodeId(params.nodes[0].id);
    } else {
      setSelectedNodeId(null);
    }
  }, []);


  // Drag and Drop event handlers
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      const defaultData = type === 'scope' ? { samplesRef: { current: [] } } : {};

      const newNode = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: defaultData,
      };

      setNodes((nds) => {
        const next = nds.concat(newNode);
        pushToHistory(next, edges);
        return next;
      });
    },
    [screenToFlowPosition, setNodes, edges, pushToHistory]
  );

  // Connection mapping handler
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const next = addEdge(params, eds);
        pushToHistory(nodes, next);
        return next;
      });
    },
    [nodes, setEdges, pushToHistory]
  );

  // Property inspector update handler (amplitude, frequency, etc.)
  const onUpdateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) => {
      const next = nds.map((node) => {
        if (node.id === nodeId) {
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              ...newData,
            },
          };

          // Sync parameters dynamically to C++ backend
          if (['sine', 'cosine'].includes(node.type || '')) {
            const amplitude = updatedNode.data.amplitude ?? 1.0;
            const frequency = updatedNode.data.frequency ?? 1.0;
            
            send({
              type: 'setBlockParam',
              blockId: node.type,
              amplitude,
              frequency
            });
          }
          
          return updatedNode;
        }
        return node;
      });
      pushToHistory(next, edges);
      return next;
    });
  }, [setNodes, edges, pushToHistory, send]);

  // Delete selected nodes and edges
  const handleDeleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    const selectedEdges = edges.filter(e => e.selected);
    
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;

    const newNodes = nodes.filter(n => !n.selected);
    const newEdges = edges.filter(e => {
      const isSourceDeleted = selectedNodes.some(sn => sn.id === e.source);
      const isTargetDeleted = selectedNodes.some(sn => sn.id === e.target);
      return !e.selected && !isSourceDeleted && !isTargetDeleted;
    });

    setNodes(newNodes);
    setEdges(newEdges);
    pushToHistory(newNodes, newEdges);
    setSelectedNodeId(null);
  }, [nodes, edges, setNodes, setEdges, pushToHistory]);

  // Copy selected nodes & internal edges
  const handleCopy = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return;

    const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
    const connectedEdges = edges.filter(e => 
      e.selected || (selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target))
    );

    setClipboard({
      nodes: JSON.parse(JSON.stringify(selectedNodes)),
      edges: JSON.parse(JSON.stringify(connectedEdges))
    });
  }, [nodes, edges]);

  // Cut selected
  const handleCut = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return;

    handleCopy();
    handleDeleteSelected();
  }, [handleCopy, handleDeleteSelected]);

  // Paste nodes from clipboard
  const handlePaste = useCallback(() => {
    if (!clipboard || clipboard.nodes.length === 0) return;

    const idMap: Record<string, string> = {};
    const newNodes = clipboard.nodes.map(node => {
      const newId = `${node.type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      idMap[node.id] = newId;

      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 40,
          y: node.position.y + 40
        },
        selected: true
      };
    });

    const newEdges = clipboard.edges.map(edge => {
      return {
        ...edge,
        id: `e_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        source: idMap[edge.source] || edge.source,
        target: idMap[edge.target] || edge.target,
        selected: true
      };
    });

    const updatedNodes = nodes.map(n => ({ ...n, selected: false })).concat(newNodes);
    const updatedEdges = edges.map(e => ({ ...e, selected: false })).concat(newEdges);

    setNodes(updatedNodes);
    setEdges(updatedEdges);
    pushToHistory(updatedNodes, updatedEdges);
  }, [clipboard, nodes, edges, setNodes, setEdges, pushToHistory]);

  // Duplicate selected elements
  const handleDuplicate = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return;

    const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
    const connectedEdges = edges.filter(e => 
      e.selected || (selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target))
    );

    const tempClipboard: { nodes: Node[]; edges: Edge[] } = {
      nodes: JSON.parse(JSON.stringify(selectedNodes)),
      edges: JSON.parse(JSON.stringify(connectedEdges))
    };

    const idMap: Record<string, string> = {};
    const duplicatedNodes = tempClipboard.nodes.map((node: Node) => {
      const newId = `${node.type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      idMap[node.id] = newId;

      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 30,
          y: node.position.y + 30
        },
        selected: true
      };
    });

    const duplicatedEdges = tempClipboard.edges.map((edge: Edge) => {
      return {
        ...edge,
        id: `e_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        source: idMap[edge.source] || edge.source,
        target: idMap[edge.target] || edge.target,
        selected: true
      };
    });

    const updatedNodes = nodes.map(n => ({ ...n, selected: false })).concat(duplicatedNodes);
    const updatedEdges = edges.map(e => ({ ...e, selected: false })).concat(duplicatedEdges);

    setNodes(updatedNodes);
    setEdges(updatedEdges);
    pushToHistory(updatedNodes, updatedEdges);
  }, [nodes, edges, setNodes, setEdges, pushToHistory]);

  // React Flow node drag and delete triggers
  const onNodeDragStop = useCallback(() => {
    pushToHistory(nodes, edges);
  }, [nodes, edges, pushToHistory]);

  const onNodesDelete = useCallback((deletedNodes: Node[]) => {
    const remainingNodes = nodes.filter(n => !deletedNodes.some(dn => dn.id === n.id));
    const remainingEdges = edges.filter(e => 
      !deletedNodes.some(dn => dn.id === e.source || dn.id === e.target)
    );
    pushToHistory(remainingNodes, remainingEdges);
  }, [nodes, edges, pushToHistory]);

  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    const remainingEdges = edges.filter(e => !deletedEdges.some(de => de.id === e.id));
    pushToHistory(nodes, remainingEdges);
  }, [nodes, edges, pushToHistory]);

  // Keyboard shortcut listener hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA' || 
        document.activeElement?.hasAttribute('contenteditable')
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Modifier-free shortcuts
      if (!modifier) {
        if (e.key === ' ') { e.preventDefault(); if (!isPlaying) handleStart(); }
        if (e.key === 'Escape') { e.preventDefault(); if (isPlaying) handleStop(); }
        return;
      }

      // Ctrl/Cmd combos
      switch (e.key.toLowerCase()) {
        case 'z':
          e.preventDefault();
          if (e.shiftKey) handleRedo(); else handleUndo();
          break;
        case 'y':
          e.preventDefault(); handleRedo();
          break;
        case 'c':
          e.preventDefault(); handleCopy();
          break;
        case 'x':
          e.preventDefault(); handleCut();
          break;
        case 'v':
          e.preventDefault(); handlePaste();
          break;
        case 'd':
          e.preventDefault(); handleDuplicate();
          break;
        case 'm':
          e.preventDefault(); setShowMiniMap(prev => !prev);
          break;
        case 'g':
          e.preventDefault(); setShowGrid(prev => !prev);
          break;
        case 'b':
          e.preventDefault(); setIsSidebarOpen(prev => !prev);
          break;
        case '?':
        case '/':
          e.preventDefault(); setShowKeyboardShortcuts(true);
          break;
        case '0':
          e.preventDefault(); fitView({ padding: 0.2 });
          break;
        case '+':
        case '=':
          e.preventDefault(); zoomIn();
          break;
        case '-':
          e.preventDefault(); zoomOut();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleCopy, handleCut, handlePaste, handleDuplicate,
      isPlaying, handleStart, handleStop, fitView, zoomIn, zoomOut]);

  // Client-side recursive signal-flow evaluation engine
  const getNodeOutput = useCallback((nodeId: string, t: number, currentNodes: Node[], currentEdges: Edge[]): number => {
    const node = currentNodes.find(n => n.id === nodeId);
    if (!node) return 0.0;

    if (node.type === 'clock') {
      return t;
    }

    if (['sine', 'cosine'].includes(node.type || '')) {
      const edge = currentEdges.find(e => e.target === nodeId && e.targetHandle === 'in');
      if (!edge) return 0.0;

      const inputVal = getNodeOutput(edge.source, t, currentNodes, currentEdges);
      const amp = (node.data as any).amplitude ?? 1.0;
      const freq = (node.data as any).frequency ?? 1.0;

      if (node.type === 'sine') {
        return amp * Math.sin(freq * inputVal);
      } else {
        return amp * Math.cos(freq * inputVal);
      }
    }

    return 0.0;
  }, []);

  // Intercept socket ticks and solve the active canvas graph layout in real-time
  useEffect(() => {
    const handleSampleTick = (e: Event) => {
      const msg = (e as CustomEvent).detail;
      if (!msg || typeof msg.t !== 'number') return;

      const scopeNode = nodes.find(n => n.type === 'scope');
      if (!scopeNode) return;

      const scopeEdges = edges.filter(ed => ed.target === scopeNode.id);
      
      let ch1Val = 0.0;
      let ch2Val = 0.0;

      if (scopeEdges.length > 0) {
        ch1Val = getNodeOutput(scopeEdges[0].source, msg.t, nodes, edges);
      }
      if (scopeEdges.length > 1) {
        ch2Val = getNodeOutput(scopeEdges[1].source, msg.t, nodes, edges);
      }

      const samples = samplesRef.current;
      if (samples.length > 0) {
        const lastSample = samples[samples.length - 1];
        if (lastSample && lastSample.t === msg.t) {
          lastSample.sin = ch1Val;
          lastSample.cos = ch2Val;
        }
      }
    };

    window.addEventListener('simulation-sample', handleSampleTick);
    return () => window.removeEventListener('simulation-sample', handleSampleTick);
  }, [nodes, edges, getNodeOutput, samplesRef]);

  // Minimap draggable HUD widget state
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true);
  const [minimapPos, setMinimapPos] = useState({ x: 24, y: 24 });
  const isDraggingMinimap = useRef(false);
  const minimapDragStart = useRef({ x: 0, y: 0 });
  const minimapPositionStart = useRef({ x: 24, y: 24 });

  const handleMinimapDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingMinimap.current = true;
    minimapDragStart.current = { x: e.clientX, y: e.clientY };
    minimapPositionStart.current = { ...minimapPos };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingMinimap.current) return;
      const dx = moveEvent.clientX - minimapDragStart.current.x;
      const dy = minimapDragStart.current.y - moveEvent.clientY;
      
      setMinimapPos({
        x: Math.max(10, minimapPositionStart.current.x + dx),
        y: Math.max(10, minimapPositionStart.current.y + dy),
      });
    };

    const handleMouseUp = () => {
      isDraggingMinimap.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [minimapPos]);

  // --- FILE MENU OPERATIONS ---

  // 1. New Project
  const handleNewProject = useCallback(() => {
    if (isPlaying) {
      handleStop();
    }
    clearSamples();
    setNodes(initialNodes);
    setEdges(initialEdges);
    setStepSize(0.001);
    setSolver('RK4');
    setSelectedNodeId(null);
    setActiveProjectName(null);
  }, [isPlaying, handleStop, clearSamples, setNodes, setEdges, setActiveProjectName]);

  // 2. Save Project (Local or Server)
  const handleSaveProject = useCallback((isSaveAs: boolean) => {
    if (isSaveAs || !activeProjectName) {
      setShowSaveDialog(true);
      return;
    }

    const projectData = {
      nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
      edges: edges.map(e => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle, target: e.target, targetHandle: e.targetHandle })),
      stepSize,
      solver
    };

    // Auto-generate high-quality technical description
    const description = `${nodes.length} blocks, ${edges.length} connections · ${solver} (${stepSize}s)`;

    apiSaveProject(activeProjectName, projectData, description)
      .then(() => {
        alert(`Project "${activeProjectName}" saved successfully.`);
      })
      .catch((err: Error) => alert(`Save failed: ${err.message}`));
  }, [nodes, edges, stepSize, solver, activeProjectName]);

  // Callback to handle modal save submission
  const handleSaveWithNewName = useCallback(async (name: string) => {
    const projectData = {
      nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
      edges: edges.map(e => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle, target: e.target, targetHandle: e.targetHandle })),
      stepSize,
      solver
    };
    const description = `${nodes.length} blocks, ${edges.length} connections · ${solver} (${stepSize}s)`;

    await apiSaveProject(name, projectData, description);
    // Mark as already loaded to prevent redundant network fetch and potential reload loop
    loadedProjectRef.current = name;
    setActiveProjectName(name);
  }, [nodes, edges, stepSize, solver, setActiveProjectName]);

  // 3. Open Local Project
  const handleOpenLocalProject = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const content = evt.target?.result as string;
          const parsed = JSON.parse(content);
          const loadedData = parsed.diagram || parsed;
          if (loadedData.nodes && loadedData.edges) {
            if (isPlaying) {
              handleStop();
            }
            clearSamples();
            setNodes(loadedData.nodes);
            setEdges(loadedData.edges);
            if (loadedData.stepSize) setStepSize(loadedData.stepSize);
            if (loadedData.solver) setSolver(loadedData.solver);
            
            // Sync settings to gateway/backend
            send({
              type: 'config',
              stepSize: loadedData.stepSize || stepSize,
              solver: loadedData.solver || solver
            });
            alert('Project successfully loaded!');
          } else {
            alert('Invalid project file structure.');
          }
        } catch (err) {
          console.error(err);
          alert('Failed to parse project file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [isPlaying, handleStop, clearSamples, setNodes, setEdges, send, stepSize, solver]);

  // 4. Open Server Project
  const handleOpenServerProject = useCallback(() => {
    apiListProjects()
      .then((projectsList) => {
        setServerProjects(projectsList.map(p => p.name));
        setShowServerProjectsModal(true);
      })
      .catch((err: Error) => {
        console.error('Failed to list server projects:', err);
        alert(`Failed to list projects: ${err.message}`);
      });
  }, []);

  const handleLoadServerProject = useCallback((name: string) => {
    apiLoadProject(name)
      .then((response: any) => {
        const loadedData = response.diagram || response;
        if (loadedData) {
          if (isPlaying) {
            handleStop();
          }
          clearSamples();
          if (loadedData.nodes) setNodes(loadedData.nodes);
          if (loadedData.edges) setEdges(loadedData.edges);
          if (loadedData.stepSize) setStepSize(loadedData.stepSize);
          if (loadedData.solver) setSolver(loadedData.solver);
          
          // Sync loaded parameters with engine
          send({
            type: 'config',
            stepSize: loadedData.stepSize || stepSize,
            solver: loadedData.solver || solver
          });
          
          setActiveProjectName(name);
          setShowServerProjectsModal(false);
          alert(`Project "${name}" loaded successfully!`);
        }
      })
      .catch((err: Error) => {
        console.error('Failed to load project from server:', err);
        alert(`Failed to load project: ${err.message}`);
      });
  }, [isPlaying, handleStop, clearSamples, send, stepSize, solver, setActiveProjectName]);

  // 5. Export CSV
  const handleExportCSV = useCallback(() => {
    const samples = samplesRef.current;
    if (samples.length === 0) {
      alert('No simulation sample data available to export.');
      return;
    }
    let csv = 't,sin,cos\n';
    samples.forEach(s => {
      csv += `${s.t.toFixed(6)},${s.sin.toFixed(6)},${s.cos.toFixed(6)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wavebench-scope-data-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [samplesRef]);

  // 6. Export PNG
  const handleExportPNG = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('Scope canvas element not found.');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `wavebench-scope-capture-${Date.now()}.png`;
    link.click();
  }, []);

  // 7. Export Simulation Report
  const handleExportReport = useCallback(() => {
    const canvas = document.querySelector('canvas');
    const scopeImgData = canvas ? canvas.toDataURL('image/png') : '';

    const samples = samplesRef.current;
    // Take up to last 100 samples to keep the report lightweight but descriptive
    const reportSamples = samples.slice(-100);
    const tableRows = reportSamples.map(s => `
      <tr>
        <td style="font-family: 'JetBrains Mono', monospace; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${s.t.toFixed(4)}</td>
        <td style="font-family: 'JetBrains Mono', monospace; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0d9488; font-weight: 500;">${s.sin.toFixed(6)}</td>
        <td style="font-family: 'JetBrains Mono', monospace; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #d97706; font-weight: 500;">${s.cos.toFixed(6)}</td>
      </tr>
    `).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WaveBench Studio — Simulation Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body {
      background-color: #f8fafc;
      color: #1e293b;
      font-family: 'Hanken Grotesk', sans-serif;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
    }
    .report-container {
      max-width: 900px;
      width: 100%;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 4px 20px rgba(30, 41, 59, 0.05);
    }
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .title {
      font-size: 28px;
      font-weight: 700;
      color: #00685f;
      margin: 0 0 6px 0;
    }
    .subtitle {
      font-size: 14px;
      color: #6d7a77;
      margin: 0;
      font-family: 'JetBrains Mono', monospace;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .meta-card {
      background-color: #f0f3ff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 16px;
    }
    .meta-label {
      font-size: 11px;
      font-weight: 600;
      color: #6d7a77;
      text-transform: uppercase;
      margin-bottom: 4px;
      letter-spacing: 0.05em;
    }
    .meta-value {
      font-size: 16px;
      font-weight: 700;
      color: #111c2d;
      font-family: 'JetBrains Mono', monospace;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #1e293b;
      border-left: 4px solid #0d9488;
      padding-left: 10px;
    }
    .scope-container {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      background-color: #ffffff;
      text-align: center;
      margin-bottom: 32px;
    }
    .scope-image {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      background-color: #ffffff;
    }
    .legend {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-top: 12px;
      font-size: 13px;
      font-weight: 500;
    }
    .legend-badge {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      font-weight: 600;
      padding: 12px;
      background-color: #f8fafc;
      border-bottom: 2px solid #e2e8f0;
      color: #6d7a77;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .table-container {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      margin-bottom: 24px;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #6d7a77;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <h1 class="title">WaveBench Studio</h1>
      <p class="subtitle">SIMULATION REPORT // TELEMETRY LOG</p>
    </div>

    <div class="meta-grid">
      <div class="meta-card">
        <div class="meta-label">Generated On</div>
        <div class="meta-value">${new Date().toLocaleString()}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Solver Type</div>
        <div class="meta-value">${solver}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Solver Step Size</div>
        <div class="meta-value">${stepSize.toFixed(4)}s</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Total Sample Size</div>
        <div class="meta-value">${samples.length} pts</div>
      </div>
    </div>

    <div class="section-title">Scope Visualization</div>
    <div class="scope-container">
      ${scopeImgData ? `<img src="${scopeImgData}" class="scope-image" alt="Scope Waveform" />` : '<div style="color: #6d7a77; padding: 40px;">No waveform data captured. Start simulation to plot signals.</div>'}
      <div class="legend">
        <div class="legend-badge">
          <div class="badge-dot" style="background-color: #0d9488;"></div>
          <span>Ch1: Sine Wave</span>
        </div>
        <div class="legend-badge">
          <div class="badge-dot" style="background-color: #d97706; border: 1px dashed #d97706;"></div>
          <span>Ch2: Cosine Wave</span>
        </div>
      </div>
    </div>

    <div class="section-title">Sampled Value Log (Last 100 Steps)</div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Time (s)</th>
            <th>Sine (Ch1)</th>
            <th>Cosine (Ch2)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || '<tr><td colspan="3" style="text-align: center; color: #6d7a77; padding: 20px;">No sample data logged.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="footer">
      Generated automatically by WaveBench Studio. Internal Telemetry Engine.
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wavebench-simulation-report-${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }, [solver, stepSize, samplesRef]);

  // ─── NEW HANDLERS FOR SIMULATION / VIEW / TOOLS MENUS ───────────────────

  // Reset simulation: stop, clear samples, tell C++ backend to reset
  const handleResetSimulation = useCallback(() => {
    if (isPlaying) handleStop();
    clearSamples();
    send({ type: 'reset' });
  }, [isPlaying, handleStop, clearSamples, send]);

  // Simulation speed (0 = MAX, 0.25, 1, 4)
  const handleSetSpeed = useCallback((multiplier: number) => {
    setSimulationSpeed(multiplier);
    send({ type: 'set_speed', value: multiplier });
  }, [send]);

  // Solver change (also sends to C++)
  const handleChangeSolver = useCallback((newSolver: 'Euler' | 'RK4') => {
    setSolver(newSolver);
    send({ type: 'setSolver', value: newSolver });
  }, [send]);

  // Dark/light theme toggle (adds/removes 'dark' class on <html>)
  const handleToggleTheme = useCallback(() => {
    setIsDarkTheme(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  }, []);

  // Grid visibility toggle
  const handleToggleGrid = useCallback(() => {
    setShowGrid(prev => !prev);
  }, []);

  // Sidebar collapsed/expanded
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Log signals toggle
  const handleToggleLogging = useCallback(() => {
    setIsLogging(prev => !prev);
  }, []);

  // Listener for WebSocket custom messages (project lists/loaded success)
  useEffect(() => {
    const handleServerMessage = (e: Event) => {
      const msg = (e as CustomEvent).detail;
      if (!msg) return;

      if (msg.type === 'project_list') {
        setServerProjects(msg.projects || []);
      } else if (msg.type === 'project_loaded') {
        try {
          const loadedData = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
          if (loadedData) {
            if (isPlaying) {
              handleStop();
            }
            clearSamples();
            if (loadedData.nodes) setNodes(loadedData.nodes);
            if (loadedData.edges) setEdges(loadedData.edges);
            if (loadedData.stepSize) setStepSize(loadedData.stepSize);
            if (loadedData.solver) setSolver(loadedData.solver);
            
            // Sync loaded parameters with engine
            send({
              type: 'config',
              stepSize: loadedData.stepSize || stepSize,
              solver: loadedData.solver || solver
            });
            
            alert(`Project "${msg.name}" loaded successfully from the server!`);
          }
        } catch (err) {
          console.error('Failed to parse loaded server project:', err);
          alert('Failed to load project from server.');
        }
      } else if (msg.type === 'save_success') {
        alert(`Project "${msg.name}" saved successfully to the server!`);
      } else if (msg.type === 'error') {
        alert(`Server error: ${msg.message}`);
      }
    };

    window.addEventListener('simulation-message', handleServerMessage);
    return () => window.removeEventListener('simulation-message', handleServerMessage);
  }, [setNodes, setEdges, isPlaying, handleStop, clearSamples, send, stepSize, solver]);

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Toolbar
        onStart={handleStart}
        onStop={handleStop}
        onOpenStepSettings={() => setShowStepDialog(true)}
        stepSize={stepSize}
        isPlaying={isPlaying}
        onResetSimulation={handleResetSimulation}
        onSetSpeed={handleSetSpeed}
        simulationSpeed={simulationSpeed}
        onChangeSolver={handleChangeSolver}
        solver={solver}
        onToggleLogging={handleToggleLogging}
        isLogging={isLogging}
        onToggleModelBrowser={() => setIsModelBrowserOpen(!isModelBrowserOpen)}
        onNewProject={handleNewProject}
        onSaveProject={handleSaveProject}
        onOpenLocalProject={handleOpenLocalProject}
        onOpenServerProject={handleOpenServerProject}
        onExportReport={handleExportReport}
        onExportCSV={handleExportCSV}
        onExportPNG={handleExportPNG}
        showMiniMap={showMiniMap}
        onToggleMiniMap={() => setShowMiniMap(!showMiniMap)}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onFitView={() => fitView({ padding: 0.2 })}
        showGrid={showGrid}
        onToggleGrid={handleToggleGrid}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        isDarkTheme={isDarkTheme}
        onToggleTheme={handleToggleTheme}
        onToggleDiagnostics={() => setShowDiagnostics(v => !v)}
        onToggleFFT={() => setShowFFT(v => !v)}
        onTogglePerfHUD={() => setShowPerfHUD(v => !v)}
        showPerfHUD={showPerfHUD}
        onToggleKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
        onStartTour={() => setShowGuidedTour(true)}
        user={user}
        onGoToDashboard={onGoToDashboard}
        onLogout={logout}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        canCopy={nodes.some(n => n.selected)}
        canPaste={!!clipboard && clipboard.nodes.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDeleteSelected={handleDeleteSelected}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onDuplicate={handleDuplicate}
      />

      <div className="workspace-container">
        {/* Left sidebar navigation rail */}
        <Sidebar 
          isModelBrowserOpen={isModelBrowserOpen}
          onToggleModelBrowser={() => setIsModelBrowserOpen(!isModelBrowserOpen)}
        />

        {/* Slide-out block library panel */}
        <ModelBrowser 
          isOpen={isModelBrowserOpen}
          onClose={() => setIsModelBrowserOpen(false)}
        />

        {/* Central interactive canvas */}
        <main className={`canvas-area${showGrid ? ' canvas-grid' : ''}`}>
          <ReactFlow
            nodes={updatedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onSelectionChange={onSelectionChange}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            fitView
            snapToGrid
            snapGrid={[8, 8]}
            defaultMarkerColor="#0d9488"
          >
            {showGrid && <Background color="#bcc9c6" gap={40} size={1} />}
            <Controls showZoom={false} showInteractive={false} showFitView={false} />

            {/* Draggable Square HUD Mini Map Container (Inside ReactFlow Context) */}
            {showMiniMap && (
              <div
                className="minimap-drag-container"
                style={{
                  position: 'absolute',
                  bottom: minimapPos.y,
                  left: minimapPos.x,
                  zIndex: 1000,
                  cursor: isDraggingMinimap.current ? 'grabbing' : 'grab',
                  backgroundColor: '#ffffff',
                  border: '2px solid #cbd5e1',
                  borderRadius: 8,
                  padding: 4,
                  width: 140,
                  height: 140,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  userSelect: 'none',
                  pointerEvents: 'all'
                }}
                onMouseDown={handleMinimapDragStart}
              >
                <div 
                  style={{ 
                    fontSize: 10, 
                    fontWeight: 'bold', 
                    color: '#475569', 
                    textAlign: 'center', 
                    padding: '2px 0 4px 0', 
                    borderBottom: '1px solid #e2e8f0',
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>map</span>
                  MINI MAP
                </div>
                <div style={{ width: '100%', height: 110, position: 'relative' }}>
                  <MiniMap
                    nodeColor={(n) => {
                      if (n.type === 'clock') return '#dee8ff';
                      if (n.type === 'sine') return 'rgba(13, 148, 136, 0.1)';
                      if (n.type === 'cosine') return 'rgba(217, 119, 6, 0.1)';
                      if (n.type === 'scope') return '#e7eeff';
                      return '#ffffff';
                    }}
                    maskColor="rgba(240, 243, 255, 0.6)"
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      margin: 0,
                      left: 0,
                      top: 0,
                      background: 'transparent',
                      border: 'none',
                    }}
                  />
                </div>
              </div>
            )}
          </ReactFlow>

          {/* Floating Zoom Action Toolbar */}
          <div className="floating-zoom-bar">
            <button className="icon-btn" title="Zoom In (Ctrl++)" onClick={() => zoomIn()}>
              <span className="material-symbols-outlined">zoom_in</span>
            </button>
            <button className="icon-btn" title="Zoom Out (Ctrl+-)" onClick={() => zoomOut()}>
              <span className="material-symbols-outlined">zoom_out</span>
            </button>
            <span className="zoom-divider" />
            <button className="icon-btn" title="Fit to Screen (Ctrl+0)" onClick={() => fitView({ padding: 0.2 })}>
              <span className="material-symbols-outlined">fit_screen</span>
            </button>
            <button className="icon-btn" title={showGrid ? 'Hide Grid (Ctrl+G)' : 'Show Grid (Ctrl+G)'}
              onClick={handleToggleGrid}
              style={{ color: showGrid ? 'var(--primary-teal)' : 'var(--on-surface-variant)' }}
            >
              <span className="material-symbols-outlined">{showGrid ? 'grid_4x4' : 'grid_off'}</span>
            </button>
          </div>
        </main>

        {/* Right side parameters property sidebar */}
        <PropertiesPanel selectedNodeId={selectedNodeId} nodes={nodes} onUpdateNodeData={onUpdateNodeData} />
      </div>

      {/* Bottom Status bar */}
      <StatusBar connectionState={connectionState} />

      {/* Solver Settings Modal */}
      {showStepDialog && (
        <StepSizeDialog
          initialStepSize={stepSize}
          initialSolver={solver}
          onClose={() => setShowStepDialog(false)}
          onApply={handleApplySettings}
        />
      )}

      {/* Save Project Modal */}
      {showSaveDialog && (
        <SaveProjectDialog
          initialName={activeProjectName || ''}
          onClose={() => setShowSaveDialog(false)}
          onSave={handleSaveWithNewName}
        />
      )}

      {/* Performance HUD overlay */}
      {showPerfHUD && (
        <PerfHUD samplesRef={samplesRef} connectionState={connectionState} isPlaying={isPlaying} />
      )}

      {/* Diagnostics Console Modal */}
      {showDiagnostics && (
        <DiagnosticsModal
          onClose={() => setShowDiagnostics(false)}
          samplesRef={samplesRef}
          connectionState={connectionState}
          send={send}
        />
      )}

      {/* Signal Analyzer (FFT) Modal */}
      {showFFT && (
        <FFTModal
          onClose={() => setShowFFT(false)}
          samplesRef={samplesRef}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <KeyboardShortcutsModal onClose={() => setShowKeyboardShortcuts(false)} />
      )}

      {/* Guided Tour */}
      {showGuidedTour && (
        <GuidedTour onClose={() => setShowGuidedTour(false)} />
      )}

      {/* Server Projects Modal */}
      {showServerProjectsModal && (
        <div className="modal-overlay" onClick={() => setShowServerProjectsModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, width: '90%' }}>
            <div className="modal-header">
              <h3>Load Server Project</h3>
              <button type="button" className="icon-btn" onClick={() => setShowServerProjectsModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '16px 0' }}>
              {serverProjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--outline)' }}>
                  No saved projects found on server.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 250, overflowY: 'auto', padding: '0 4px' }}>
                  {serverProjects.map(name => (
                    <button
                      key={name}
                      onClick={() => handleLoadServerProject(name)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        border: '1px solid var(--outline-variant)',
                        borderRadius: 4,
                        backgroundColor: 'var(--surface-container-lowest)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 14,
                        color: 'var(--on-surface)'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-container-low)')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-container-lowest)')}
                    >
                      <span style={{ fontWeight: 500 }}>{name}</span>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary-teal)' }}>
                        arrow_forward
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowServerProjectsModal(false)}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { user, isLoading } = useAuth();
  const [page, setPage] = useState<Page>('login');
  const [activeProjectName, setActiveProjectName] = useState<string | null>(null);

  // Once auth resolves — redirect appropriately
  useEffect(() => {
    if (!isLoading) {
      setPage(user ? 'dashboard' : 'login');
    }
  }, [isLoading, user]);

  // After logout, always go back to login
  useEffect(() => {
    if (!isLoading && !user && page !== 'signup') {
      setPage('login');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="auth-page">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--outline)' }}>
          <span className="auth-spinner auth-spinner--lg" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>Loading workspace…</span>
        </div>
      </div>
    );
  }

  if (page === 'signup') {
    return <SignupPage onNavigateLogin={() => setPage('login')} />;
  }

  if (!user || page === 'login') {
    return <LoginPage onNavigateSignup={() => setPage('signup')} />;
  }

  if (page === 'dashboard') {
    return (
      <DashboardPage
        onNewProject={() => {
          setActiveProjectName(null);
          setPage('app');
        }}
        onOpenProject={(name) => {
          setActiveProjectName(name);
          setPage('app');
        }}
      />
    );
  }

  // Main simulation workspace
  return (
    <ReactFlowProvider>
      <FlowWorkspace 
        onGoToDashboard={() => setPage('dashboard')} 
        activeProjectName={activeProjectName}
        setActiveProjectName={setActiveProjectName}
      />
    </ReactFlowProvider>
  );
}
