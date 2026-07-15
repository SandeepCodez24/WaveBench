import { useState } from 'react';

interface Props {
  initialStepSize: number;
  initialSolver: 'Euler' | 'RK4';
  onClose: () => void;
  onApply: (stepSize: number, solver: 'Euler' | 'RK4') => void;
}

export function StepSizeDialog({
  initialStepSize,
  initialSolver,
  onClose,
  onApply
}: Props) {
  const [stepSize, setStepSize] = useState<string>(initialStepSize.toString());
  const [solver, setSolver] = useState<'Euler' | 'RK4'>(initialSolver);
  const [timeStart] = useState<string>('0.0');
  const [timeEnd] = useState<string>('10.0');
  const [realtime, setRealtime] = useState<boolean>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericStepSize = parseFloat(stepSize);
    if (!isNaN(numericStepSize) && numericStepSize > 0) {
      onApply(numericStepSize, solver);
      onClose();
    } else {
      alert('Please enter a valid positive number for step size.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form 
        className="modal-panel" 
        onClick={(e) => e.stopPropagation()} 
        onSubmit={handleSubmit}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <h3>Solver Settings</h3>
          <button type="button" className="icon-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Step Size Input */}
          <div className="input-group">
            <label className="input-label">Step Size (Seconds)</label>
            <input 
              type="text" 
              className="text-input" 
              value={stepSize}
              onChange={(e) => setStepSize(e.target.value)}
              required
            />
            <p className="input-desc">Lower values increase accuracy but reduce real-time performance.</p>
          </div>

          {/* Solver Selection (Euler vs RK4) */}
          <div className="input-group">
            <label className="input-label">Solver Type</label>
            <div className="solver-container">
              <button
                type="button"
                className={`solver-option-btn ${solver === 'Euler' ? 'selected' : ''}`}
                onClick={() => setSolver('Euler')}
              >
                Euler (ode1)
              </button>
              <button
                type="button"
                className={`solver-option-btn ${solver === 'RK4' ? 'selected' : ''}`}
                onClick={() => setSolver('RK4')}
              >
                Runge-Kutta 4 (ode4)
              </button>
            </div>
          </div>

          {/* Simulation Time Range */}
          <div className="input-group">
            <label className="input-label">Simulation Time</label>
            <div className="range-inputs">
              <input type="text" className="text-input" value={timeStart} readOnly style={{ width: '40%' }} />
              <span className="range-span">to</span>
              <input type="text" className="text-input" value={timeEnd} readOnly style={{ width: '40%' }} />
            </div>
          </div>

          {/* Real-time synchronization check */}
          <div className="checkbox-group" onClick={() => setRealtime(!realtime)}>
            <input 
              type="checkbox" 
              className="props-checkbox" 
              checked={realtime} 
              onChange={() => {}} 
            />
            <span className="table-val" style={{ fontSize: 13, userSelect: 'none' }}>
              Real-time synchronization
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            CANCEL
          </button>
          <button type="submit" className="btn-primary">
            APPLY CHANGES
          </button>
        </div>
      </form>
    </div>
  );
}
