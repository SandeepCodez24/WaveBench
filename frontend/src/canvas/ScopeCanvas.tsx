import { useEffect, useRef } from 'react';
import type { Sample } from '../hooks/useSimulationSocket';

export type ScopeMode = 'time' | 'phase' | 'fft';

interface Props {
  samplesRef: React.MutableRefObject<Sample[]>;
  width?: number;
  height?: number;
  mode?: ScopeMode;
}

// --- Client-side DFT for FFT tab ---
function computeDFT(signal: number[], maxBins = 64): { freq: number; mag: number }[] {
  const N = signal.length;
  const result: { freq: number; mag: number }[] = [];
  const limit = Math.min(maxBins, Math.floor(N / 2));
  for (let k = 1; k <= limit; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      re += signal[n] * Math.cos(angle);
      im -= signal[n] * Math.sin(angle);
    }
    result.push({ freq: k, mag: Math.sqrt(re * re + im * im) / N });
  }
  return result;
}

export function ScopeCanvas({ samplesRef, width = 280, height = 160, mode = 'time' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    // ─── Shared layout constants ──────────────────────────────────────────────
    const plotLeft   = 52;
    const plotRight  = width - 16;
    const plotTop    = 32;
    const plotBottom = height - 36;
    const plotW      = plotRight - plotLeft;
    const plotH      = plotBottom - plotTop;
    const plotMid    = plotTop + plotH / 2;

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const drawBackground = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(plotLeft, plotTop, plotW, plotH);
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      for (let pct = 0.2; pct < 1.0; pct += 0.2) {
        const x = plotLeft + pct * plotW;
        ctx.beginPath(); ctx.moveTo(x, plotTop); ctx.lineTo(x, plotBottom); ctx.stroke();
        const y = plotTop + pct * plotH;
        ctx.beginPath(); ctx.moveTo(plotLeft, y); ctx.lineTo(plotRight, y); ctx.stroke();
      }
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5;
      ctx.strokeRect(plotLeft, plotTop, plotW, plotH);
    };

    const drawAxisLabels = (xTitle: string, yTitle: string, yMin: number, yMax: number, samples: Sample[]) => {
      ctx.fillStyle = '#475569';
      ctx.font = '10px "Outfit","Inter",sans-serif';

      // Y axis title
      ctx.save();
      ctx.translate(14, plotTop + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(yTitle, 0, 0);
      ctx.restore();

      // Y ticks
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      const yMax2 = yMax === yMin ? yMax + 1 : yMax;
      [yMax2, (yMax2 + yMin) / 2, yMin].forEach((v, i) => {
        const y = plotTop + (i / 2) * plotH;
        ctx.fillText(v.toFixed(1), plotLeft - 6, y);
      });

      // X axis ticks & title
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      if (mode === 'time') {
        const first = samples[0]?.t ?? 0;
        const last  = samples[samples.length - 1]?.t ?? 0.5;
        ctx.fillText(first.toFixed(2) + 's', plotLeft, plotBottom + 8);
        ctx.fillText(((first + last) / 2).toFixed(2) + 's', plotLeft + plotW / 2, plotBottom + 8);
        ctx.fillText(last.toFixed(2) + 's', plotRight, plotBottom + 8);
      }
      ctx.font = '500 10px "Outfit","Inter",sans-serif';
      ctx.fillText(xTitle, plotLeft + plotW / 2, plotBottom + 20);
    };

    const drawLegend = (entries: { label: string; color: string; dashed?: boolean }[]) => {
      ctx.font = 'bold 9px "Outfit","Inter",sans-serif';
      let xOff = plotRight - 148;
      entries.forEach(({ label, color, dashed }) => {
        ctx.strokeStyle = color; ctx.lineWidth = dashed ? 1.5 : 2.5;
        if (dashed) ctx.setLineDash([3, 3]); else ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(xOff, plotTop - 16);
        ctx.lineTo(xOff + 18, plotTop - 16);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#475569'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(label, xOff + 22, plotTop - 16);
        xOff += 80;
      });
    };

    // ─── TIME DOMAIN DRAW ─────────────────────────────────────────────────────
    const drawTime = (samples: Sample[]) => {
      drawBackground();

      // Zero reference line
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(plotLeft, plotMid); ctx.lineTo(plotRight, plotMid); ctx.stroke();

      drawAxisLabels('Time (s)', 'Amplitude (V)', -1.0, 1.0, samples);
      drawLegend([
        { label: 'Ch1: Sine', color: '#0d9488' },
        { label: 'Ch2: Cos',  color: '#d97706', dashed: true }
      ]);

      if (samples.length < 2) return;

      ctx.save();
      ctx.beginPath(); ctx.rect(plotLeft, plotTop, plotW, plotH); ctx.clip();
      const amp  = plotH / 2 - 4;
      const step = plotW / Math.max(1, samples.length - 1);

      // Ch1 Sine
      ctx.beginPath(); ctx.strokeStyle = '#0d9488'; ctx.lineWidth = 2.5;
      samples.forEach((s, i) => {
        const x = plotLeft + i * step;
        const y = plotMid - s.sin * amp;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Ch2 Cosine (dashed)
      ctx.beginPath(); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      samples.forEach((s, i) => {
        const x = plotLeft + i * step;
        const y = plotMid - s.cos * amp;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    };

    // ─── PHASE (XY) DRAW with comet trail ────────────────────────────────────
    const drawPhase = (samples: Sample[]) => {
      drawBackground();

      // Axes cross-hairs
      const cx = plotLeft + plotW / 2;
      const cy = plotTop  + plotH / 2;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(plotLeft, cy); ctx.lineTo(plotRight, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, plotTop); ctx.lineTo(cx, plotBottom); ctx.stroke();

      // Unit circle reference
      const r = Math.min(plotW, plotH) / 2 - 6;
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke();

      drawAxisLabels('Cosine (Ch2)', 'Sine (Ch1)', -1.0, 1.0, samples);

      ctx.fillStyle = '#475569'; ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Phase Plot (XY)', cx, plotTop - 16);

      if (samples.length < 2) return;

      ctx.save();
      ctx.beginPath(); ctx.rect(plotLeft, plotTop, plotW, plotH); ctx.clip();

      const scaleX = (plotW / 2 - 6) ;
      const scaleY = (plotH / 2 - 6);

      // Comet trail: older samples fade out
      const trail = samples.slice(-300);
      trail.forEach((s, i) => {
        const alpha = (i + 1) / trail.length;
        const x = cx + s.cos * scaleX;
        const y = cy - s.sin * scaleY;

        if (i === 0) return;
        const prev = trail[i - 1];
        const px = cx + prev.cos * scaleX;
        const py = cy - prev.sin * scaleY;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(99,102,241,${alpha * 0.85})`;
        ctx.lineWidth = alpha < 0.3 ? 1 : alpha < 0.7 ? 1.8 : 2.5;
        ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
      });

      // Draw the leading dot (comet head)
      const last = trail[trail.length - 1];
      if (last) {
        const hx = cx + last.cos * scaleX;
        const hy = cy - last.sin * scaleY;
        ctx.beginPath();
        ctx.arc(hx, hy, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#6366f1';
        ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();
    };

    // ─── FFT DRAW ─────────────────────────────────────────────────────────────
    const drawFFT = (samples: Sample[]) => {
      drawBackground();

      ctx.fillStyle = '#475569'; ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Frequency Spectrum (FFT)', plotLeft + plotW / 2, plotTop - 16);

      if (samples.length < 8) return;

      const signal = samples.map(s => s.sin);
      const bins = computeDFT(signal, 48);
      if (!bins.length) return;

      const maxMag = Math.max(...bins.map(b => b.mag), 0.001);

      // Bars
      const barW = Math.floor(plotW / bins.length) - 1;
      bins.forEach((bin, i) => {
        const barH = (bin.mag / maxMag) * (plotH - 4);
        const x = plotLeft + i * (barW + 1);
        const y = plotBottom - barH;

        // Color by magnitude
        const intensity = bin.mag / maxMag;
        const r = Math.round(13  + (99  - 13)  * intensity);
        const g = Math.round(148 + (102 - 148) * intensity);
        const b2= Math.round(136 + (241 - 136) * intensity);

        ctx.fillStyle = `rgb(${r},${g},${b2})`;
        ctx.fillRect(x, y, barW, barH);

        // Peak glow for dominant frequency
        if (intensity > 0.85) {
          ctx.fillStyle = 'rgba(99,102,241,0.15)';
          ctx.fillRect(x, plotTop, barW, plotH);
          ctx.fillStyle = '#6366f1';
          ctx.fillRect(x, y, barW, Math.min(barH, 3));

          // Label dominant frequency
          ctx.fillStyle = '#475569'; ctx.font = '8px monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText(`${bin.freq}`, x + barW / 2, y - 2);
        }
      });

      // Axes
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5;
      ctx.strokeRect(plotLeft, plotTop, plotW, plotH);

      ctx.fillStyle = '#475569'; ctx.font = '500 10px "Outfit","Inter",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('Frequency bin', plotLeft + plotW / 2, plotBottom + 20);

      ctx.save();
      ctx.translate(14, plotTop + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('Magnitude', 0, 0);
      ctx.restore();
    };

    // ─── Animation Loop ───────────────────────────────────────────────────────
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const samples = samplesRef.current;

      if (mode === 'time')  drawTime(samples);
      else if (mode === 'phase') drawPhase(samples);
      else if (mode === 'fft')   drawFFT(samples);

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [samplesRef, width, height, mode]);

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
