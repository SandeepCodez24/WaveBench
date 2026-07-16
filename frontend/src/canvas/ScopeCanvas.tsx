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

      // Define margins for axes and annotations
      const plotLeft = 52;
      const plotRight = width - 16;
      const plotTop = 32;
      const plotBottom = height - 36;
      
      const plotWidth = plotRight - plotLeft;
      const plotHeight = plotBottom - plotTop;

      // Draw background (white grid area)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(plotLeft, plotTop, plotWidth, plotHeight);

      // Grid background (subtle light grid lines matching Lumina system)
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;

      // Vertical Grid Lines (draw 5 lines inside plot bounds)
      for (let pct = 0.2; pct < 1.0; pct += 0.2) {
        const x = plotLeft + pct * plotWidth;
        ctx.beginPath();
        ctx.moveTo(x, plotTop);
        ctx.lineTo(x, plotBottom);
        ctx.stroke();
      }

      // Horizontal Grid Lines (draw 4 lines inside plot bounds)
      for (let pct = 0.2; pct < 1.0; pct += 0.2) {
        const y = plotTop + pct * plotHeight;
        ctx.beginPath();
        ctx.moveTo(plotLeft, y);
        ctx.lineTo(plotRight, y);
        ctx.stroke();
      }

      // Draw outer plot border box
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(plotLeft, plotTop, plotWidth, plotHeight);

      // Draw center reference line (0 level)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.2;
      const plotMid = plotTop + plotHeight / 2;
      ctx.beginPath();
      ctx.moveTo(plotLeft, plotMid);
      ctx.lineTo(plotRight, plotMid);
      ctx.stroke();

      // Set Font and color settings for labels
      ctx.fillStyle = '#475569';
      ctx.font = '10px "Outfit", "Inter", -apple-system, sans-serif';

      // 1. Draw Y-Axis Ticks & Labels (+1.0, 0.0, -1.0)
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      
      // +1.0
      ctx.fillText('+1.0', plotLeft - 8, plotTop + 4);
      ctx.beginPath();
      ctx.moveTo(plotLeft - 4, plotTop);
      ctx.lineTo(plotLeft, plotTop);
      ctx.stroke();

      // 0.0
      ctx.fillText('0.0', plotLeft - 8, plotMid);
      ctx.beginPath();
      ctx.moveTo(plotLeft - 4, plotMid);
      ctx.lineTo(plotLeft, plotMid);
      ctx.stroke();

      // -1.0
      ctx.fillText('-1.0', plotLeft - 8, plotBottom - 4);
      ctx.beginPath();
      ctx.moveTo(plotLeft - 4, plotBottom);
      ctx.lineTo(plotLeft, plotBottom);
      ctx.stroke();

      // 2. Y-Axis Title ("Amplitude (V)")
      ctx.save();
      ctx.translate(14, plotTop + plotHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.font = '500 10px "Outfit", "Inter", sans-serif';
      ctx.fillText('Amplitude (V)', 0, 0);
      ctx.restore();

      // 3. Draw X-Axis Ticks & Labels (0.00s, T_mid, T_end)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const firstSample = samples[0];
      const lastSample = samples[samples.length - 1];
      
      const minTime = firstSample ? firstSample.t : 0.0;
      const maxTime = lastSample ? lastSample.t : 0.5;

      // Start Time
      ctx.fillText(minTime.toFixed(2) + 's', plotLeft, plotBottom + 8);
      
      // Middle T
      ctx.fillText(((minTime + maxTime) / 2).toFixed(2) + 's', plotLeft + plotWidth / 2, plotBottom + 8);
      
      // End T
      ctx.fillText(maxTime.toFixed(2) + 's', plotRight, plotBottom + 8);

      // 4. X-Axis Title ("Time (s)")
      ctx.font = '500 10px "Outfit", "Inter", sans-serif';
      ctx.fillText('Time (s)', plotLeft + plotWidth / 2, plotBottom + 20);

      // 5. Legends at the top
      ctx.font = 'bold 9px "Outfit", "Inter", sans-serif';
      
      // Channel 1: Sine Wave (Solid Teal)
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(plotRight - 140, plotTop - 16);
      ctx.lineTo(plotRight - 120, plotTop - 16);
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('Ch1: Sine', plotRight - 116, plotTop - 16);

      // Channel 2: Cosine Wave (Dashed Amber)
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(plotRight - 70, plotTop - 16);
      ctx.lineTo(plotRight - 50, plotTop - 16);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText('Ch2: Cos', plotRight - 46, plotTop - 16);

      // Plot Signal wave lines inside clipping boundaries
      if (samples.length < 2) {
        animId = requestAnimationFrame(draw);
        return;
      }

      ctx.save();
      // Clip to plot rectangular boundary so waveforms don't draw outside the margins
      ctx.beginPath();
      ctx.rect(plotLeft, plotTop, plotWidth, plotHeight);
      ctx.clip();

      const amp = plotHeight / 2 - 4; // leave slight cushion
      const step = plotWidth / Math.max(1, samples.length - 1);

      // A. Draw Channel 1 (Teal)
      ctx.beginPath();
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 2.5;
      samples.forEach((sample, i) => {
        const x = plotLeft + i * step;
        const y = plotMid - (sample.sin * amp);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // B. Draw Channel 2 (Amber, dashed)
      ctx.beginPath();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      samples.forEach((sample, i) => {
        const x = plotLeft + i * step;
        const y = plotMid - (sample.cos * amp);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore(); // restore clipping context

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
        borderRadius: 4,
        backgroundColor: '#fafafa',
        border: '1px solid #e2e8f0',
        display: 'block'
      }}
    />
  );
}
