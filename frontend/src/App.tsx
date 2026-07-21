import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
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
import { LogsTerminalPanel } from './components/LogsTerminalPanel';
import { FFTModal } from './components/FFTModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { GuidedTour } from './components/GuidedTour';
import { PerfHUD } from './components/PerfHUD';
import { SaveProjectDialog } from './components/SaveProjectDialog';
import { CommandPalette } from './components/CommandPalette';
import { useLogStream } from './hooks/useLogStream';

// Import custom simulation nodes
import { ClockNode } from './nodes/ClockNode';
import { SineNode } from './nodes/SineNode';
import { CosineNode } from './nodes/CosineNode';
import { ScopeNode } from './nodes/ScopeNode';
// New block nodes
import { GainNode } from './nodes/GainNode';
import { ConstantNode } from './nodes/ConstantNode';
import { SumNode } from './nodes/SumNode';
import { ProbeNode } from './nodes/ProbeNode';
import { MuxNode } from './nodes/MuxNode';
import { ComparatorNode } from './nodes/ComparatorNode';
import { SwitchNode } from './nodes/SwitchNode';

// Import WebSocket communications hook
import { useSimulationSocket } from './hooks/useSimulationSocket';

type Page = 'login' | 'signup' | 'dashboard' | 'app';

// Custom node registry mapping types to components
const nodeTypes = {
  clock: ClockNode,
  sine: SineNode,
  cosine: CosineNode,
  scope: ScopeNode,
  // Blocks — Sources/Math
  gain: GainNode,
  constant: ConstantNode,
  sum: SumNode,
  // Signals
  probe: ProbeNode,
  mux: MuxNode,
  // Logic
  comparator: ComparatorNode,
  switch: SwitchNode,
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
  const logStream = useLogStream();
  const [showStepDialog, setShowStepDialog] = useState<boolean>(false);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [isSaveAsMode, setIsSaveAsMode] = useState<boolean>(false);
  const [activePanelCategory, setActivePanelCategory] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [stepSize, setStepSize] = useState<number>(0.001);
  const [solver, setSolver] = useState<'Euler' | 'RK4'>('RK4');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // --- Simulation menu new state ---
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [isLogging, setIsLogging] = useState<boolean>(true);

  // --- View menu state ---
  // 'off' | 'lines' | 'dots'  — cycles through on each toggle
  const [showGrid, setShowGrid] = useState<'off' | 'lines' | 'dots'>('dots');
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

  // --- Spec-driven Pointer and Command states ---
  const [spacePressed, setSpacePressed] = useState<boolean>(false);
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const [quickAddMenu, setQuickAddMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null);
  const [hoveredEdgeInfo, setHoveredEdgeInfo] = useState<{ edgeId: string; x: number; y: number } | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);

  // Space-bar Pan Mode key down/up listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setSpacePressed(true);
      }
      // Ctrl+K toggles Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);



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
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  const handleStopRef = useRef(handleStop);
  useEffect(() => { handleStopRef.current = handleStop; }, [handleStop]);

  useEffect(() => {
    if (activeProjectName) {
      if (loadedProjectRef.current === activeProjectName) return;
      loadedProjectRef.current = activeProjectName;

      apiLoadProject(activeProjectName)
        .then((response: any) => {
          const loadedData = response.diagram || response;
          if (loadedData) {
            if (isPlayingRef.current) {
              handleStopRef.current();
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
  }, [activeProjectName, setNodes, setEdges, clearSamples, send]);

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

  // Ensure each Scope node has its own unique samplesRef and sequential label
  const updatedNodes = useMemo(() => {
    const seenRefs = new Set();
    let scopeCount = 0;
    return nodes.map((node) => {
      if (node.type === 'scope') {
        scopeCount++;
        const indexStr = String(scopeCount).padStart(2, '0');
        const expectedLabel = `SCOPE_VIEW_${indexStr}`;

        if (!node.data) {
          node.data = {};
        }
        let localRef = (node.data as any).samplesRef;
        if (!localRef || !Array.isArray(localRef.current) || seenRefs.has(localRef)) {
          localRef = { current: [] };
          node.data = {
            ...node.data,
            samplesRef: localRef,
            label: expectedLabel,
          } as any;
        } else if ((node.data as any).label !== expectedLabel) {
          node.data = {
            ...node.data,
            label: expectedLabel,
          } as any;
        }
        seenRefs.add(localRef);
      }
      return node;
    });
  }, [nodes]);
  // Log gateway connection changes
  useEffect(() => {
    logStream.appendLog({
      level: 'info',
      src: 'frontend',
      msg: `Gateway connection state changed to: ${connectionState}`
    });
  }, [connectionState, logStream.appendLog]);
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

    // Gain — multiplies its upstream signal by K
    if (node.type === 'gain') {
      const edge = currentEdges.find(e => e.target === nodeId && e.targetHandle === 'in');
      if (!edge) return 0.0;
      const k = (node.data as any).gain ?? 2.0;
      return k * getNodeOutput(edge.source, t, currentNodes, currentEdges);
    }

    // Constant — always emits a fixed scalar
    if (node.type === 'constant') {
      return (node.data as any).value ?? 1.0;
    }

    // Sum — adds two upstream signals
    if (node.type === 'sum') {
      const in1 = currentEdges.find(e => e.target === nodeId && e.targetHandle === 'in1');
      const in2 = currentEdges.find(e => e.target === nodeId && e.targetHandle === 'in2');
      const v1 = in1 ? getNodeOutput(in1.source, t, currentNodes, currentEdges) : 0;
      const v2 = in2 ? getNodeOutput(in2.source, t, currentNodes, currentEdges) : 0;
      return v1 + v2;
    }

    // Comparator — outputs 1 if condition met, else 0
    if (node.type === 'comparator') {
      const edge = currentEdges.find(e => e.target === nodeId && e.targetHandle === 'in');
      if (!edge) return 0.0;
      const val = getNodeOutput(edge.source, t, currentNodes, currentEdges);
      const op = (node.data as any).operator ?? '>';
      const thr = (node.data as any).threshold ?? 0.5;
      if (op === '>') return val > thr ? 1 : 0;
      if (op === '<') return val < thr ? 1 : 0;
      if (op === '==') return Math.abs(val - thr) < 0.01 ? 1 : 0;
      return 0;
    }

    // Switch — passes A when control > 0.5, else B
    if (node.type === 'switch') {
      const edgeA = currentEdges.find(e => e.target === nodeId && e.targetHandle === 'inA');
      const edgeCtrl = currentEdges.find(e => e.target === nodeId && e.targetHandle === 'ctrl');
      const edgeB = currentEdges.find(e => e.target === nodeId && e.targetHandle === 'inB');
      const ctrl = edgeCtrl ? getNodeOutput(edgeCtrl.source, t, currentNodes, currentEdges) : 0;
      if (ctrl > 0.5) {
        return edgeA ? getNodeOutput(edgeA.source, t, currentNodes, currentEdges) : 0;
      } else {
        return edgeB ? getNodeOutput(edgeB.source, t, currentNodes, currentEdges) : 0;
      }
    }

    return 0.0;
  }, []);

  // Intercept socket ticks and solve the active canvas graph layout in real-time
  useEffect(() => {
    const handleSampleTick = (e: Event) => {
      const msg = (e as CustomEvent).detail;
      if (!msg || typeof msg.t !== 'number') return;

      const scopeNodes = nodes.filter(n => n.type === 'scope');

      // Update each individual scope node's local samples buffer
      scopeNodes.forEach((scopeNode) => {
        const localRef = (scopeNode.data as any)?.samplesRef;
        if (!localRef) return;

        const scopeEdges = edges.filter(ed => ed.target === scopeNode.id);
        let ch1Val = 0.0;
        let ch2Val = 0.0;

        if (scopeEdges.length > 0) {
          ch1Val = getNodeOutput(scopeEdges[0].source, msg.t, nodes, edges);
        }
        if (scopeEdges.length > 1) {
          ch2Val = getNodeOutput(scopeEdges[1].source, msg.t, nodes, edges);
        }

        const samples = localRef.current;
        if (!Array.isArray(samples)) return;

        const lastSample = samples[samples.length - 1];
        if (lastSample && lastSample.t === msg.t) {
          lastSample.sin = ch1Val;
          lastSample.cos = ch2Val;
        } else {
          if (samples.length >= 500) {
            samples.shift();
          }
          samples.push({
            type: 'sample',
            t: msg.t,
            sin: ch1Val,
            cos: ch2Val
          });
        }
      });

      // Keep the global samplesRef in sync for backward compatibility (e.g. PerfHUD, CSV download, etc.)
      const firstScope = scopeNodes[0];
      let firstCh1 = 0.0;
      let firstCh2 = 0.0;
      if (firstScope) {
        const scopeEdges = edges.filter(ed => ed.target === firstScope.id);
        if (scopeEdges.length > 0) {
          firstCh1 = getNodeOutput(scopeEdges[0].source, msg.t, nodes, edges);
        }
        if (scopeEdges.length > 1) {
          firstCh2 = getNodeOutput(scopeEdges[1].source, msg.t, nodes, edges);
        }
      }

      const globalSamples = samplesRef.current;
      if (globalSamples.length > 0) {
        const lastSample = globalSamples[globalSamples.length - 1];
        if (lastSample && lastSample.t === msg.t) {
          lastSample.sin = firstCh1;
          lastSample.cos = firstCh2;
        }
      }
    };

    window.addEventListener('simulation-sample', handleSampleTick);
    return () => window.removeEventListener('simulation-sample', handleSampleTick);
  }, [nodes, edges, getNodeOutput, samplesRef]);

  // Minimap visibility state
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true);

  // --- FILE MENU OPERATIONS ---

  // 1. New Project
  const handleNewProject = useCallback(() => {
    if (isPlaying) {
      handleStop();
    }
    clearSamples();
    nodes.forEach(n => {
      if (n.type === 'scope' && (n.data as any)?.samplesRef) {
        (n.data as any).samplesRef.current = [];
      }
    });
    setNodes(initialNodes);
    setEdges(initialEdges);
    setStepSize(0.001);
    setSolver('RK4');
    setSelectedNodeId(null);
    setActiveProjectName(null);
  }, [isPlaying, handleStop, clearSamples, setNodes, setEdges, setActiveProjectName, nodes]);

  // 2. Save Project (Local or Server)
  const handleSaveProject = useCallback((isSaveAs: boolean) => {
    if (isSaveAs || !activeProjectName) {
      setIsSaveAsMode(isSaveAs);
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
          e.preventDefault();
          setShowGrid(prev => prev === 'off' ? 'lines' : prev === 'lines' ? 'dots' : 'off');
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
        case 's':
          e.preventDefault();
          if (e.shiftKey) {
            handleSaveProject(true);
          } else {
            handleSaveProject(false);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleCopy, handleCut, handlePaste, handleDuplicate,
    isPlaying, handleStart, handleStop, fitView, zoomIn, zoomOut, handleSaveProject]);

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
    let targetSamples = samplesRef.current;
    if (selectedNodeId) {
      const selectedNode = nodes.find(n => n.id === selectedNodeId);
      if (selectedNode && selectedNode.type === 'scope' && (selectedNode.data as any)?.samplesRef) {
        targetSamples = (selectedNode.data as any).samplesRef.current;
      }
    } else {
      const firstScope = nodes.find(n => n.type === 'scope');
      if (firstScope && (firstScope.data as any)?.samplesRef) {
        targetSamples = (firstScope.data as any).samplesRef.current;
      }
    }

    if (!targetSamples || targetSamples.length === 0) {
      alert('No simulation sample data available to export.');
      return;
    }
    let csv = 't,sin,cos\n';
    targetSamples.forEach(s => {
      csv += `${s.t.toFixed(6)},${s.sin.toFixed(6)},${s.cos.toFixed(6)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wavebench-scope-data-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    logStream.appendLog({ level: 'info', src: 'frontend', msg: 'Exported scope data to CSV' });
  }, [samplesRef, selectedNodeId, nodes, logStream.appendLog]);

  // 6. Export PNG
  const handleExportPNG = useCallback(() => {
    let canvas: HTMLCanvasElement | null = null;
    if (selectedNodeId) {
      canvas = document.querySelector(`[data-id="${selectedNodeId}"] canvas`);
    }
    if (!canvas) {
      canvas = document.querySelector('canvas');
    }
    if (!canvas) {
      alert('Scope canvas element not found.');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `wavebench-scope-capture-${Date.now()}.png`;
    link.click();
    logStream.appendLog({ level: 'info', src: 'frontend', msg: 'Exported scope image to PNG' });
  }, [selectedNodeId, logStream.appendLog]);

  // 7. Export Simulation Report
  const handleExportReport = useCallback(() => {
    let canvas: HTMLCanvasElement | null = null;
    let targetSamples = samplesRef.current;

    if (selectedNodeId) {
      canvas = document.querySelector(`[data-id="${selectedNodeId}"] canvas`);
      const selectedNode = nodes.find(n => n.id === selectedNodeId);
      if (selectedNode && selectedNode.type === 'scope' && (selectedNode.data as any)?.samplesRef) {
        targetSamples = (selectedNode.data as any).samplesRef.current;
      }
    }
    if (!canvas) {
      canvas = document.querySelector('canvas');
    }
    if (!targetSamples || targetSamples.length === 0) {
      const firstScope = nodes.find(n => n.type === 'scope');
      if (firstScope && (firstScope.data as any)?.samplesRef) {
        targetSamples = (firstScope.data as any).samplesRef.current;
      }
    }

    const scopeImgData = canvas ? canvas.toDataURL('image/png') : '';
    const reportSamples = targetSamples.slice(-100);
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
        <div class="meta-value">${targetSamples.length} pts</div>
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
    logStream.appendLog({ level: 'info', src: 'frontend', msg: 'Exported simulation report' });
  }, [solver, stepSize, samplesRef, selectedNodeId, nodes, logStream.appendLog]);

  // ─── NEW HANDLERS FOR SIMULATION / VIEW / TOOLS MENUS ───────────────────

  // Reset simulation: stop, clear samples, tell C++ backend to reset
  const handleResetSimulation = useCallback(() => {
    if (isPlaying) handleStop();
    clearSamples();
    nodes.forEach(n => {
      if (n.type === 'scope' && (n.data as any)?.samplesRef) {
        (n.data as any).samplesRef.current = [];
      }
    });
    send({ type: 'reset' });
  }, [isPlaying, handleStop, clearSamples, send, nodes]);

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

  // Grid visibility toggle — cycles: off → lines → dots → off
  const handleToggleGrid = useCallback(() => {
    setShowGrid(prev => prev === 'off' ? 'lines' : prev === 'lines' ? 'dots' : 'off');
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

  // --- Pointer Tool & Command Palette callback helpers ---
  const getTargetHandle = useCallback((nodeType: string, targetNodeId: string, currentEdges: Edge[]) => {
    if (['sum', 'mux'].includes(nodeType)) {
      const hasIn1 = currentEdges.some(e => e.target === targetNodeId && e.targetHandle === 'in1');
      return hasIn1 ? 'in2' : 'in1';
    }
    if (nodeType === 'switch') {
      const hasInA = currentEdges.some(e => e.target === targetNodeId && e.targetHandle === 'inA');
      if (!hasInA) return 'inA';
      const hasInB = currentEdges.some(e => e.target === targetNodeId && e.targetHandle === 'inB');
      if (!hasInB) return 'inB';
      return 'ctrl';
    }
    return 'in';
  }, []);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    if (event.ctrlKey && selectedNodeId && selectedNodeId !== node.id) {
      const targetHandle = getTargetHandle(node.type || '', node.id, edges);
      const newEdge: Connection = {
        source: selectedNodeId,
        target: node.id,
        sourceHandle: 'out',
        targetHandle,
      };
      const exists = edges.some(e =>
        e.source === newEdge.source &&
        e.target === newEdge.target &&
        e.sourceHandle === newEdge.sourceHandle &&
        e.targetHandle === newEdge.targetHandle
      );
      if (!exists) {
        setEdges((eds) => {
          const next = addEdge(newEdge, eds);
          pushToHistory(nodes, next);
          return next;
        });
      }
    }
  }, [selectedNodeId, nodes, edges, setEdges, pushToHistory, getTargetHandle]);

  const handlePaneClick = useCallback(() => {
    setQuickAddMenu(null);
  }, []);

  const handlePaneDoubleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const target = event.target as HTMLElement;
    if (target.closest('.react-flow__node') || target.closest('.react-flow__edge') || target.closest('.floating-zoom-bar') || target.closest('.floating-tools')) {
      return;
    }
    setIsPanMode((prev) => {
      const next = !prev;
      if (next) {
        setQuickAddMenu(null);
      } else {
        const flowPos = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        setQuickAddMenu({
          x: event.clientX,
          y: event.clientY,
          flowX: flowPos.x,
          flowY: flowPos.y,
        });
      }
      return next;
    });
  }, [screenToFlowPosition]);

  const handleEdgeMouseEnter = useCallback((event: React.MouseEvent, edge: Edge) => {
    setHoveredEdgeInfo({
      edgeId: edge.id,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const handleEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeInfo(null);
  }, []);

  const getEdgeValueString = (edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return '';
    const srcNode = nodes.find(n => n.id === edge.source);
    if (!srcNode) return '';

    const latest = samplesRef.current[samplesRef.current.length - 1];
    if (!latest) return '0.0000';

    if (srcNode.type === 'clock') {
      return `Time: ${latest.t.toFixed(4)}s`;
    }
    if (srcNode.type === 'sine') {
      return `Sine (Ch1): ${latest.sin.toFixed(4)}`;
    }
    if (srcNode.type === 'cosine') {
      return `Cosine (Ch2): ${latest.cos.toFixed(4)}`;
    }
    return `Value: ${latest.sin.toFixed(4)}`;
  };

  const spawnNodeAtCenter = useCallback((type: string) => {
    const viewCenter = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const defaultData = type === 'scope' ? { samplesRef: { current: [] } } : {};
    const newNode = {
      id: `${type}_${Date.now()}`,
      type,
      position: viewCenter,
      data: defaultData,
    };
    setNodes((nds) => {
      const next = nds.concat(newNode);
      pushToHistory(next, edges);
      return next;
    });
  }, [screenToFlowPosition, setNodes, edges, pushToHistory]);

  const commandPaletteList = useMemo(() => {
    return [
      { id: 'add_clock', category: 'Block', name: 'Insert Clock Block', action: () => spawnNodeAtCenter('clock') },
      { id: 'add_sine', category: 'Block', name: 'Insert Sine Wave Block', action: () => spawnNodeAtCenter('sine') },
      { id: 'add_cosine', category: 'Block', name: 'Insert Cosine Wave Block', action: () => spawnNodeAtCenter('cosine') },
      { id: 'add_scope', category: 'Block', name: 'Insert Scope View Block', action: () => spawnNodeAtCenter('scope') },
      { id: 'add_gain', category: 'Block', name: 'Insert Gain Block', action: () => spawnNodeAtCenter('gain') },
      { id: 'add_constant', category: 'Block', name: 'Insert Constant Block', action: () => spawnNodeAtCenter('constant') },
      { id: 'add_sum', category: 'Block', name: 'Insert Sum Block', action: () => spawnNodeAtCenter('sum') },
      
      { id: 'sim_start', category: 'Simulation', name: 'Start Simulation', shortcut: 'Spacebar', action: handleStart },
      { id: 'sim_stop', category: 'Simulation', name: 'Stop Simulation', shortcut: 'Escape', action: handleStop },
      { id: 'sim_reset', category: 'Simulation', name: 'Reset Simulation', action: handleResetSimulation },
      { id: 'sim_settings', category: 'Simulation', name: 'Open Solver Settings', action: () => setShowStepDialog(true) },

      { id: 'exp_csv', category: 'Export', name: 'Export scope data to CSV', action: handleExportCSV },
      { id: 'exp_png', category: 'Export', name: 'Export scope image to PNG', action: handleExportPNG },
      { id: 'exp_report', category: 'Export', name: 'Generate Simulation Report', action: handleExportReport },

      { id: 'tog_logs', category: 'View', name: 'Toggle Logs Terminal', shortcut: 'Ctrl+Shift+L', action: () => setShowDiagnostics(v => !v) },
      { id: 'tog_minimap', category: 'View', name: 'Toggle MiniMap', shortcut: 'Ctrl+M', action: () => setShowMiniMap(v => !v) },
      { id: 'tog_sidebar', category: 'View', name: 'Toggle Sidebar Rail', shortcut: 'Ctrl+B', action: () => setIsSidebarOpen(v => !v) },
    ];
  }, [spawnNodeAtCenter, handleStart, handleStop, handleResetSimulation, handleExportCSV, handleExportPNG, handleExportReport]);

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
        onToggleModelBrowser={() => setActivePanelCategory(activePanelCategory ? null : 'all')}
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
        showGrid={showGrid !== 'off'}
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
        {isSidebarOpen && (
          <Sidebar
            activePanelCategory={activePanelCategory as any}
            onOpenPanel={(cat) => setActivePanelCategory(cat)}
            onClosePanel={() => setActivePanelCategory(null)}
            onToggleDiagnostics={() => setShowDiagnostics(v => !v)}
            isPanMode={isPanMode}
            onTogglePanMode={() => setIsPanMode(v => !v)}
          />
        )}

        {/* Slide-out block library panel */}
        <ModelBrowser
          isOpen={activePanelCategory !== null}
          onClose={() => setActivePanelCategory(null)}
          initialCategory={(activePanelCategory as any) ?? 'all'}
          style={{ left: isSidebarOpen ? 64 : 0 }}
        />

        {/* Central interactive canvas */}
        <main className={`canvas-area${showGrid !== 'off' ? ' canvas-grid' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
          <div 
            style={{ flex: 1, position: 'relative', width: '100%' }}
            onDoubleClick={handlePaneDoubleClick}
          >
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
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            panOnDrag={spacePressed || isPanMode}
            selectionOnDrag={!(spacePressed || isPanMode)}
            connectionRadius={20}
            onEdgeMouseEnter={handleEdgeMouseEnter}
            onEdgeMouseLeave={handleEdgeMouseLeave}
            className={spacePressed || isPanMode ? 'pan-mode-active' : ''}
          >
            {showGrid === 'lines' && (
              <Background
                variant={BackgroundVariant.Lines}
                gap={40}
                lineWidth={1}
                color={isDarkTheme ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)'}
              />
            )}
            {showGrid === 'dots' && (
              <Background
                variant={BackgroundVariant.Dots}
                gap={28}
                size={2}
                color={isDarkTheme ? 'rgba(255,255,255,0.55)' : '#000000'}
              />
            )}
            <Controls showZoom={false} showInteractive={false} showFitView={false} />

            {/* MiniMap — rendered directly as a ReactFlow child so the panel system works correctly.
                panelPosition is not available in @xyflow/react v12; use style bottom/left/right instead. */}
            {showMiniMap && !showDiagnostics && (
              <MiniMap
                nodeColor={(n) => {
                  if (n.type === 'clock') return '#6366f1';
                  if (n.type === 'sine') return '#0d9488';
                  if (n.type === 'cosine') return '#d97706';
                  if (n.type === 'scope') return '#8b5cf6';
                  return '#94a3b8';
                }}
                nodeStrokeWidth={2}
                maskColor={isDarkTheme ? 'rgba(30,45,66,0.55)' : 'rgba(224,232,255,0.5)'}
                zoomable
                pannable
                style={{
                  width: 180,
                  height: 140,
                  backgroundColor: isDarkTheme
                    ? 'var(--surface-container)'
                    : '#ffffff',
                  border: `2px solid ${isDarkTheme ? 'var(--outline-variant)' : '#cbd5e1'}`,
                  borderRadius: 10,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
                  // Position at bottom-left (override default bottom-right panel CSS)
                  bottom: 8,
                  left: 8,
                  right: 'auto',
                }}
              />
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
            <button
              className="icon-btn"
              title={
                showGrid === 'off' ? 'Show Grid Lines (Ctrl+G)'
                  : showGrid === 'lines' ? 'Switch to Dot Grid (Ctrl+G)'
                    : 'Hide Grid (Ctrl+G)'
              }
              onClick={handleToggleGrid}
              style={{ color: showGrid !== 'off' ? 'var(--primary-teal)' : 'var(--on-surface-variant)' }}
            >
              <span className="material-symbols-outlined">
                {showGrid === 'off' ? 'grid_off' : showGrid === 'lines' ? 'grid_4x4' : 'grain'}
              </span>
            </button>
          </div>
          </div>

          {/* Bottom VS-Code style terminal panel */}
          {showDiagnostics && (
            <LogsTerminalPanel
              onClose={() => setShowDiagnostics(false)}
              samplesRef={samplesRef}
              connectionState={connectionState}
              send={send}
              onSelectNode={(nodeId) => {
                setSelectedNodeId(nodeId);
              }}
              logStream={logStream}
            />
          )}
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
          isSaveAs={isSaveAsMode}
        />
      )}

      {/* Performance HUD overlay */}
      {showPerfHUD && (
        <PerfHUD samplesRef={samplesRef} connectionState={connectionState} isPlaying={isPlaying} />
      )}

      {/* Diagnostics Console Modal removed (now rendered as docked Bottom panel) */}

      {/* Signal Analyzer (FFT) Modal */}
      {showFFT && (
        <FFTModal
          onClose={() => setShowFFT(false)}
          samplesRef={samplesRef}
        />
      )}

      {/* Command Palette Overlay */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commandPaletteList}
      />

      {/* Live Wire Hover Tooltip */}
      {hoveredEdgeInfo && (
        <div
          style={{
            position: 'fixed',
            left: hoveredEdgeInfo.x + 12,
            top: hoveredEdgeInfo.y + 12,
            zIndex: 200,
            background: '#252526',
            border: '1px solid #3c3c3c',
            borderRadius: 4,
            padding: '6px 10px',
            color: '#fff',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {getEdgeValueString(hoveredEdgeInfo.edgeId)}
        </div>
      )}

      {/* Quick Add Menu (Double-click Canvas) */}
      {quickAddMenu && (
        <div
          style={{
            position: 'fixed',
            left: quickAddMenu.x,
            top: quickAddMenu.y,
            zIndex: 150,
            background: '#1e1e1e',
            border: '1px solid #3c3c3c',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            padding: '4px',
            width: '180px',
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          }}
          onClick={e => e.stopPropagation()}
        >
          <input
            autoFocus
            type="text"
            placeholder="Search block to add..."
            style={{
              width: '100%',
              background: '#252526',
              border: '1px solid #3c3c3c',
              borderRadius: 3,
              color: '#fff',
              fontSize: '11px',
              padding: '4px 8px',
              outline: 'none',
              marginBottom: '4px',
              boxSizing: 'border-box',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setQuickAddMenu(null);
              } else if (e.key === 'Enter') {
                const targetVal = (e.target as HTMLInputElement).value.toLowerCase();
                const matched = [
                  { type: 'clock', label: 'Clock' },
                  { type: 'sine', label: 'Sine Wave' },
                  { type: 'cosine', label: 'Cosine Wave' },
                  { type: 'scope', label: 'Scope View' },
                  { type: 'gain', label: 'Gain' },
                  { type: 'constant', label: 'Constant' },
                  { type: 'sum', label: 'Sum' },
                  { type: 'mux', label: 'Mux' },
                  { type: 'switch', label: 'Switch' },
                  { type: 'comparator', label: 'Comparator' },
                  { type: 'probe', label: 'Probe' }
                ].find(item => item.label.toLowerCase().includes(targetVal) || item.type.includes(targetVal));
                
                if (matched) {
                  const defaultData = matched.type === 'scope' ? { samplesRef: { current: [] } } : {};
                  const newNode = {
                    id: `${matched.type}_${Date.now()}`,
                    type: matched.type,
                    position: { x: quickAddMenu.flowX, y: quickAddMenu.flowY },
                    data: defaultData,
                  };
                  setNodes((nds) => {
                    const next = nds.concat(newNode);
                    pushToHistory(next, edges);
                    return next;
                  });
                }
                setQuickAddMenu(null);
              }
            }}
          />
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {[
              { type: 'clock', label: 'Clock' },
              { type: 'sine', label: 'Sine Wave' },
              { type: 'cosine', label: 'Cosine Wave' },
              { type: 'scope', label: 'Scope View' },
              { type: 'gain', label: 'Gain' },
              { type: 'constant', label: 'Constant' },
              { type: 'sum', label: 'Sum (Σ)' },
              { type: 'mux', label: 'Mux 2:1' },
              { type: 'switch', label: 'Switch' },
              { type: 'comparator', label: 'Comparator' },
              { type: 'probe', label: 'Signal Probe' }
            ].map(item => (
              <div
                key={item.type}
                onClick={() => {
                  const defaultData = item.type === 'scope' ? { samplesRef: { current: [] } } : {};
                  const newNode = {
                    id: `${item.type}_${Date.now()}`,
                    type: item.type,
                    position: { x: quickAddMenu.flowX, y: quickAddMenu.flowY },
                    data: defaultData,
                  };
                  setNodes((nds) => {
                    const next = nds.concat(newNode);
                    pushToHistory(next, edges);
                    return next;
                  });
                  setQuickAddMenu(null);
                }}
                className="quick-add-item"
                style={{
                  padding: '4px 8px',
                  cursor: 'pointer',
                  color: '#ccc',
                  fontSize: '11px',
                  borderRadius: 3,
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>
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
