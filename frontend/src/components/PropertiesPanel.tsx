import { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';

interface Props {
  selectedNodeId: string | null;
  nodes: Node[];
  onUpdateNodeData: (id: string, data: any) => void;
}

export function PropertiesPanel({ selectedNodeId, nodes, onUpdateNodeData }: Props) {
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const [amplitude, setAmplitude] = useState<number>(1.0);
  const [frequency, setFrequency] = useState<number>(1.0);
  const [isDiscrete, setIsDiscrete] = useState<boolean>(false);

  useEffect(() => {
    if (selectedNode) {
      const data = selectedNode.data as any;
      setAmplitude(data.amplitude ?? 1.0);
      setFrequency(data.frequency ?? 1.0);
      setIsDiscrete(data.isDiscrete ?? false);
    }
  }, [selectedNodeId, selectedNode]);

  const handleAmplitudeChange = (val: number) => {
    setAmplitude(val);
    if (selectedNodeId) {
      onUpdateNodeData(selectedNodeId, { amplitude: val });
    }
  };

  const handleFrequencyChange = (val: number) => {
    setFrequency(val);
    if (selectedNodeId) {
      onUpdateNodeData(selectedNodeId, { frequency: val });
    }
  };

  const handleDiscreteToggle = () => {
    const nextVal = !isDiscrete;
    setIsDiscrete(nextVal);
    if (selectedNodeId) {
      onUpdateNodeData(selectedNodeId, { isDiscrete: nextVal });
    }
  };

  const displayName = selectedNodeId 
    ? selectedNodeId.split('_')[0].charAt(0).toUpperCase() + selectedNodeId.split('_')[0].slice(1) 
    : 'No Selection';

  const isSignalBlock = selectedNode && ['sine', 'cosine'].includes(selectedNode.type || '');

  return (
    <aside className="properties-sidebar">
      {/* Panel Header */}
      <div className="properties-header">
        <span className="material-symbols-outlined icon">tune</span>
        <h3>Properties</h3>
      </div>

      {/* Panel Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="props-label">Selected: {displayName}</label>
          
          {selectedNode ? (
            isSignalBlock ? (
              <div className="props-card">
                {/* Amplitude Slider */}
                <div className="slider-group">
                  <div className="slider-header">
                    <span>Amplitude</span>
                    <span className="slider-val">{amplitude.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    className="props-slider" 
                    min="0.1" 
                    max="5.0" 
                    step="0.1"
                    value={amplitude}
                    onChange={(e) => handleAmplitudeChange(parseFloat(e.target.value))}
                  />
                </div>

                {/* Frequency Slider */}
                <div className="slider-group">
                  <div className="slider-header">
                    <span>Frequency (Hz)</span>
                    <span className="slider-val">{frequency.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    className="props-slider" 
                    min="0.5" 
                    max="10.0" 
                    step="0.1"
                    value={frequency}
                    onChange={(e) => handleFrequencyChange(parseFloat(e.target.value))}
                  />
                </div>

                {/* Discrete Output Checkbox */}
                <div className="checkbox-group" onClick={handleDiscreteToggle}>
                  <input 
                    type="checkbox" 
                    className="props-checkbox" 
                    checked={isDiscrete} 
                    onChange={() => {}}
                  />
                  <span className="table-val" style={{ fontSize: 13, userSelect: 'none' }}>
                    Output Discrete
                  </span>
                </div>
              </div>
            ) : (
              <div className="props-card" style={{ color: 'var(--outline)', fontSize: 13, textAlign: 'center', padding: '16px 8px' }}>
                Selected block ({selectedNode.type}) does not have configurable signal parameters.
              </div>
            )
          ) : (
            <div className="props-card" style={{ color: 'var(--outline)', fontSize: 13, textAlign: 'center', padding: '16px 8px' }}>
              Click on a block on the canvas to inspect and configure its parameters.
            </div>
          )}
        </div>

        {/* Solver Information Display Card */}
        <div>
          <label className="props-label">Solver Params</label>
          <div className="props-table">
            <div className="table-row">
              <span className="table-key">Type</span>
              <span className="table-val">Fixed-Step</span>
            </div>
            <div className="table-row" style={{ borderTop: '1px solid var(--surface-container-low)', paddingTop: 8 }}>
              <span className="table-key">Solver</span>
              <span className="table-val">ode4 (RK)</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
