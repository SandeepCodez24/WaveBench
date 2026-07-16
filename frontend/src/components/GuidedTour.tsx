import { useState } from 'react';

interface TourStep {
  title: string;
  description: string;
  target: string; // CSS selector
  icon: string;
  position: 'bottom' | 'top' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Clock Block',
    description: 'The Clock block generates a monotonically increasing time signal t. It\'s the source of all signals in your diagram — every block downstream receives t as its input.',
    target: '[data-tour="clock"]',
    icon: 'schedule',
    position: 'right',
  },
  {
    title: 'Signal Blocks (Sine & Cosine)',
    description: 'The Sine and Cosine blocks receive t from the Clock and compute sin(ωt) and cos(ωt) respectively. Adjust Amplitude and Frequency in the Properties panel on the right.',
    target: '[data-tour="sine"]',
    icon: 'waves',
    position: 'right',
  },
  {
    title: 'Scope Block',
    description: 'The Scope visualises real-time signal values. Ch1 (teal) is the Sine channel; Ch2 (amber) is the Cosine channel. Signals are plotted as the simulation runs.',
    target: '[data-tour="scope"]',
    icon: 'analytics',
    position: 'left',
  },
  {
    title: 'Run the Simulation',
    description: 'Click the ▶ Play button in the toolbar (or press Space) to start the C++ simulation engine. Signals begin flowing through the block diagram in real time.',
    target: '[data-tour="play-btn"]',
    icon: 'play_arrow',
    position: 'bottom',
  },
  {
    title: 'Properties Panel',
    description: 'Select any block on the canvas to inspect and edit its parameters here. Changes (like frequency or amplitude) sync live to the C++ solver without stopping the simulation.',
    target: '[data-tour="properties"]',
    icon: 'tune',
    position: 'left',
  },
];

interface Props {
  onClose: () => void;
}

export function GuidedTour({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <>
      {/* Full-screen backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 300,
        backgroundColor: 'rgba(17,28,45,0.72)',
        backdropFilter: 'blur(1px)',
        pointerEvents: 'none',
      }} />

      {/* Tour card — centered, pointer-events restored */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 301,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: '#fff', border: '1px solid #bcc9c6', borderRadius: 14,
          width: 440, maxWidth: '90vw',
          boxShadow: '0 16px 60px rgba(17,28,45,0.25)',
          fontFamily: "'Hanken Grotesk', sans-serif",
          pointerEvents: 'all',
          overflow: 'hidden',
        }}>
          {/* Progress bar */}
          <div style={{ height: 3, background: '#e7eeff' }}>
            <div style={{
              height: '100%', background: '#00685f',
              width: `${((step + 1) / TOUR_STEPS.length) * 100}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>

          {/* Header */}
          <div style={{
            padding: '18px 20px 12px',
            display: 'flex', alignItems: 'flex-start', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: 'rgba(0,104,95,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ color: '#00685f', fontSize: 24 }}>
                {current.icon}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6d7a77', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Step {step + 1} of {TOUR_STEPS.length}
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111c2d' }}>
                {current.title}
              </h3>
            </div>
          </div>

          {/* Description */}
          <div style={{ padding: '0 20px 20px' }}>
            <p style={{
              margin: 0, fontSize: 14, lineHeight: 1.65, color: '#3d4947',
              background: '#f0f3ff', borderRadius: 8, padding: '14px 16px',
              border: '1px solid #e7eeff',
            }}>
              {current.description}
            </p>
          </div>

          {/* Step dots */}
          <div style={{
            padding: '0 20px 16px',
            display: 'flex', justifyContent: 'center', gap: 6,
          }}>
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width: i === step ? 20 : 8, height: 8,
                  borderRadius: 99, border: 'none', cursor: 'pointer',
                  background: i === step ? '#00685f' : '#dee8ff',
                  transition: 'all 0.25s ease', padding: 0,
                }}
              />
            ))}
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 20px', borderTop: '1px solid #e7eeff',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#f0f3ff',
          }}>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: '1px solid #bcc9c6', borderRadius: 6,
                padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                color: '#6d7a77',
              }}
            >
              Skip Tour
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  style={{
                    background: '#fff', border: '1px solid #bcc9c6', borderRadius: 6,
                    padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    color: '#111c2d', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
                  Back
                </button>
              )}
              <button
                onClick={isLast ? onClose : () => setStep(s => s + 1)}
                style={{
                  background: '#00685f', color: '#fff', border: 'none', borderRadius: 6,
                  padding: '7px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {isLast ? 'Finish' : 'Next'}
                {!isLast && <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
