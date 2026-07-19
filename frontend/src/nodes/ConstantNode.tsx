import { Handle, Position } from '@xyflow/react';

interface Props {
  data: { value?: number };
}

export function ConstantNode({ data }: Props) {
  const value = data.value ?? 1.0;

  return (
    <div className="flow-node" style={{ width: 160 }}>
      {/* Node Header */}
      <div className="node-header">
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
          pin
        </span>
        <span>CONSTANT</span>
      </div>

      {/* Node Body */}
      <div className="node-body" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}>
        <div style={{ width: 8 }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <p className="node-sub-text" style={{ fontSize: 9, color: 'var(--on-surface-variant)', margin: 0 }}>
            Value
          </p>
          <p className="node-value-text" style={{
            fontSize: 16,
            margin: 0,
            color: 'var(--secondary-amber)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700
          }}>
            {value.toFixed(4)}
          </p>
        </div>
        <div style={{ width: 8 }} />
      </div>

      {/* Output Handle — constants only produce output */}
      <Handle type="source" position={Position.Right} id="out"
        style={{ top: '50%', transform: 'translateY(-50%)' }} />
    </div>
  );
}
