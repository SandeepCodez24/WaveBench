import { useEffect, useRef } from 'react';
import type { Sample } from '../hooks/useSimulationSocket';

interface Props {
  samplesRef: React.MutableRefObject<Sample[]>;
  width?: number;
  height?: number;
}

export function ScopeCanvas({ samplesRef, width = 280, height = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const draw = () => {
      const samples = samplesRef.current;
      
      // Clean canvas
      ctx.clearRect(0, 0, width, height);

      // Grid background (subtle light grid lines matching Lumina system)
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      
      // Draw vertical grid lines every 40px
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Draw horizontal grid lines every 40px
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw center line (0 level)
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (samples.length < 2) {
        animId = requestAnimationFrame(draw);
        return;
      }

      const mid = height / 2;
      const amp = (height / 2) - 12; // margin to prevent clipping
      const step = width / 500; // fixed horizontal step based on ring buffer capacity

      // 1. Draw Sine wave (Primary Teal #0d9488)
      ctx.beginPath();
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 2.5;
      
      samples.forEach((sample, i) => {
        // Position samples from left to right as they fill up the buffer
        const x = i * step;
        const y = mid - (sample.sin * amp);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // 2. Draw Cosine wave (Secondary Amber #d97706, dashed for visual distinction)
      ctx.beginPath();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]); // Dashed line as in reference HTML
      
      samples.forEach((sample, i) => {
        const x = i * step;
        const y = mid - (sample.cos * amp);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash for other drawings

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [samplesRef, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        borderRadius: 8,
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        display: 'block'
      }}
    />
  );
}
