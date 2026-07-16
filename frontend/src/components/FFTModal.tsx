import { useMemo } from 'react';

interface Sample {
  t: number;
  sin: number;
  cos: number;
}

interface Props {
  onClose: () => void;
  samplesRef: React.MutableRefObject<Sample[]>;
}

// Simple DFT over a time series: returns array of { freq, magnitude }
function computeDFT(values: number[], sampleRate: number, maxBins: number): { freq: number; mag: number }[] {
  const N = Math.min(values.length, 512);
  if (N < 8) return [];

  const results: { freq: number; mag: number }[] = [];
  const binCount = Math.min(Math.floor(N / 2), maxBins);

  for (let k = 0; k < binCount; k++) {
    let real = 0;
    let imag = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      real += values[n] * Math.cos(angle);
      imag -= values[n] * Math.sin(angle);
    }
    const mag = (2 / N) * Math.sqrt(real * real + imag * imag);
    const freq = (k * sampleRate) / N;
    results.push({ freq, mag });
  }
  return results;
}

export function FFTModal({ onClose, samplesRef }: Props) {
  const samples = samplesRef.current;

  const { sinBins, cosBins, maxMag, sampleRate } = useMemo(() => {
    if (samples.length < 8) return { sinBins: [], cosBins: [], maxMag: 1, sampleRate: 1 };

    // Estimate sample rate from timestamps
    const dt = samples.length > 1 ? (samples[samples.length - 1].t - samples[0].t) / (samples.length - 1) : 0.001;
    const sr = dt > 0 ? 1 / dt : 1000;
    const N = Math.min(samples.length, 512);
    const sinVals = samples.slice(-N).map(s => s.sin);
    const cosVals = samples.slice(-N).map(s => s.cos);

    const sinB = computeDFT(sinVals, sr, 48);
    const cosB = computeDFT(cosVals, sr, 48);
    const allMags = [...sinB, ...cosB].map(b => b.mag);
    const mMax = Math.max(...allMags, 0.001);

    return { sinBins: sinB, cosBins: cosB, maxMag: mMax, sampleRate: sr };
  }, [samples]);

  const chartW = 440;
  const chartH = 160;
  const barW = sinBins.length > 0 ? Math.max(2, Math.floor((chartW - 2) / sinBins.length) - 1) : 4;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        backgroundColor: 'rgba(38,49,67,0.45)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', border: '1px solid #bcc9c6', borderRadius: 12,
          width: 540, maxWidth: '95vw', boxShadow: '0 8px 40px rgba(17,28,45,0.12)',
          fontFamily: "'Hanken Grotesk', sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #e7eeff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#e7eeff', borderRadius: '12px 12px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: '#00685f', fontSize: 20 }}>monitoring</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111c2d' }}>Signal Analyzer (DFT)</h3>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', padding: '2px 8px',
              borderRadius: 99, textTransform: 'uppercase', backgroundColor: '#0d948818',
              color: '#00685f', border: '1px solid #0d948840',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              Freq Domain
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d7a77', padding: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Charts */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {samples.length < 8 ? (
            <div style={{
              textAlign: 'center', padding: '40px 20px', color: '#6d7a77',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
              border: '1px dashed #dee8ff', borderRadius: 8, background: '#f0f3ff',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, display: 'block', marginBottom: 8, color: '#bcc9c6' }}>monitoring</span>
              Run the simulation first to populate signal data.
            </div>
          ) : (
            <>
              {/* Meta info */}
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { label: 'Samples', value: Math.min(samples.length, 512).toString() },
                  { label: 'Sample Rate', value: `${sampleRate.toFixed(1)} Hz` },
                  { label: 'Freq Resolution', value: `${(sampleRate / Math.min(samples.length, 512)).toFixed(2)} Hz` },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    flex: 1, background: '#f0f3ff', borderRadius: 6, padding: '8px 12px',
                    border: '1px solid #dee8ff',
                  }}>
                    <div style={{ fontSize: 10, color: '#6d7a77', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: '#111c2d' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Sine DFT Chart */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0d9488', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 3, background: '#0d9488', borderRadius: 2, display: 'inline-block' }} />
                  Ch1 — Sine Wave
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e7eeff', borderRadius: 8, padding: '12px 8px 6px', overflow: 'hidden' }}>
                  <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ display: 'block' }}>
                    {/* Grid */}
                    {[0.25, 0.5, 0.75, 1.0].map(f => (
                      <line key={f} x1={0} y1={chartH * (1 - f)} x2={chartW} y2={chartH * (1 - f)}
                        stroke="#e7eeff" strokeWidth={1} strokeDasharray={f === 1 ? '0' : '3,3'} />
                    ))}
                    {/* Bars */}
                    {sinBins.map((b, i) => {
                      const h = Math.max(1, (b.mag / maxMag) * chartH);
                      const x = i * (barW + 1);
                      return (
                        <rect key={i} x={x} y={chartH - h} width={barW} height={h}
                          fill="#0d9488" opacity={0.85} rx={1} />
                      );
                    })}
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, paddingInline: 4 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#6d7a77' }}>0 Hz</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#6d7a77' }}>
                      {sinBins.length > 0 ? `${sinBins[sinBins.length - 1].freq.toFixed(1)} Hz` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cosine DFT Chart */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#904d00', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 3, background: '#904d00', borderRadius: 2, display: 'inline-block' }} />
                  Ch2 — Cosine Wave
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e7eeff', borderRadius: 8, padding: '12px 8px 6px', overflow: 'hidden' }}>
                  <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ display: 'block' }}>
                    {[0.25, 0.5, 0.75, 1.0].map(f => (
                      <line key={f} x1={0} y1={chartH * (1 - f)} x2={chartW} y2={chartH * (1 - f)}
                        stroke="#e7eeff" strokeWidth={1} strokeDasharray={f === 1 ? '0' : '3,3'} />
                    ))}
                    {cosBins.map((b, i) => {
                      const h = Math.max(1, (b.mag / maxMag) * chartH);
                      const x = i * (barW + 1);
                      return (
                        <rect key={i} x={x} y={chartH - h} width={barW} height={h}
                          fill="#904d00" opacity={0.85} rx={1} />
                      );
                    })}
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, paddingInline: 4 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#6d7a77' }}>0 Hz</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#6d7a77' }}>
                      {cosBins.length > 0 ? `${cosBins[cosBins.length - 1].freq.toFixed(1)} Hz` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #e7eeff', background: '#f0f3ff',
          borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, color: '#6d7a77', fontFamily: "'JetBrains Mono', monospace" }}>
            DFT over last {Math.min(samples.length, 512)} samples · No windowing applied
          </span>
          <button onClick={onClose} style={{
            padding: '6px 16px', background: '#00685f', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
