import { useState } from 'react';

interface Props {
  selectedNodeId: string | null;
}

export function PropertiesPanel({ selectedNodeId }: Props) {
  const [amplitude, setAmplitude] = useState<number>(1.0);
  const [frequency, setFrequency] = useState<number>(60.0);
  const [isDiscrete, setIsDiscrete] = useState<boolean>(false);

  // Default to Sine Wave if no node selected or depending on ID
  const displayName = selectedNodeId 
    ? selectedNodeId.charAt(0).toUpperCase() + selectedNodeId.slice(1) 
    : 'Sine Wave';

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
                onChange={(e) => setAmplitude(parseFloat(e.target.value))}
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
                min="1" 
                max="120" 
                step="1"
                value={frequency}
                onChange={(e) => setFrequency(parseInt(e.target.value))}
              />
            </div>

            {/* Discrete Output Checkbox */}
            <div className="checkbox-group" onClick={() => setIsDiscrete(!isDiscrete)}>
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
