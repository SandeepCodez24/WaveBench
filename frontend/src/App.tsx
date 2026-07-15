import { useState, useCallback, useMemo } from 'react';
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
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Import UI layout components
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { ModelBrowser } from './components/ModelBrowser';
import { PropertiesPanel } from './components/PropertiesPanel';
import { StatusBar } from './components/StatusBar';
import { StepSizeDialog } from './components/StepSizeDialog';

// Import custom simulation nodes
import { ClockNode } from './nodes/ClockNode';
import { SineNode } from './nodes/SineNode';
import { CosineNode } from './nodes/CosineNode';
import { ScopeNode } from './nodes/ScopeNode';

// Import WebSocket communications hook
import { useSimulationSocket } from './hooks/useSimulationSocket';

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

function FlowWorkspace() {
  const { samplesRef, send, connectionState, clearSamples } = useSimulationSocket();
  const [showStepDialog, setShowStepDialog] = useState<boolean>(false);
  const [isModelBrowserOpen, setIsModelBrowserOpen] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [stepSize, setStepSize] = useState<number>(0.001);
  const [solver, setSolver] = useState<'Euler' | 'RK4'>('RK4');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  
  const { zoomIn, zoomOut, setCenter, fitView } = useReactFlow();

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

  // Zoom controls helper functions
  const handleResetZoom = useCallback(() => {
    setCenter(400, 200, { zoom: 1 });
    fitView({ padding: 0.2 });
  }, [setCenter, fitView]);

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Toolbar
        onStart={handleStart}
        onStop={handleStop}
        onOpenStepSettings={() => setShowStepDialog(true)}
        stepSize={stepSize}
        isPlaying={isPlaying}
        onToggleModelBrowser={() => setIsModelBrowserOpen(!isModelBrowserOpen)}
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
        <main className="canvas-area canvas-grid">
          <ReactFlow
            nodes={updatedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onSelectionChange={onSelectionChange}
            fitView
            snapToGrid
            snapGrid={[8, 8]}
            defaultMarkerColor="#0d9488"
          >
            <Background color="#bcc9c6" gap={40} size={1} />
            <Controls showZoom={false} showInteractive={false} showFitView={false} />
            <MiniMap 
              nodeColor={(n) => {
                if (n.type === 'clock') return '#dee8ff';
                if (n.type === 'sine') return 'rgba(13, 148, 136, 0.1)';
                if (n.type === 'cosine') return 'rgba(217, 119, 6, 0.1)';
                if (n.type === 'scope') return '#e7eeff';
                return '#ffffff';
              }} 
              maskColor="rgba(240, 243, 255, 0.6)" 
              style={{ bottom: 12, left: 12 }}
            />
          </ReactFlow>

          {/* Floating Zoom Action Toolbar */}
          <div className="floating-zoom-bar">
            <button className="icon-btn" title="Zoom In" onClick={() => zoomIn()}>
              <span className="material-symbols-outlined">zoom_in</span>
            </button>
            <button className="icon-btn" title="Zoom Out" onClick={() => zoomOut()}>
              <span className="material-symbols-outlined">zoom_out</span>
            </button>
            <span className="zoom-divider" />
            <button className="icon-btn" title="Reset Zoom" onClick={handleResetZoom}>
              <span className="material-symbols-outlined">center_focus_strong</span>
            </button>
            <button className="icon-btn" title="Grid Controls">
              <span className="material-symbols-outlined">grid_4x4</span>
            </button>
          </div>
        </main>

        {/* Right side parameters property sidebar */}
        <PropertiesPanel selectedNodeId={selectedNodeId} />
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
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowWorkspace />
    </ReactFlowProvider>
  );
}
