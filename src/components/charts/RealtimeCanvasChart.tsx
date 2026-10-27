/**
 * RealtimeCanvasChart
 * High-performance 60fps HTML5 Canvas chart for multi-channel vibration,
 * voltage, current, power, and harvested energy waveforms.
 */
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { TelemetryReading } from '../../types/telemetry';
import { Play, Pause, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

export type TimeWindow = '1m' | '5m' | '15m' | '1h';

export interface ChartChannel {
  key: keyof TelemetryReading;
  label: string;
  unit: string;
  color: string;
  axis: 'left' | 'right';
  multiplier?: number;
  fixedMin?: number;
  fixedMax?: number;
}

interface RealtimeCanvasChartProps {
  data: TelemetryReading[];
  channels: ChartChannel[];
  title?: string;
  isStale?: boolean;
  onClear?: () => void;
  height?: number | string;
}

export const RealtimeCanvasChart: React.FC<RealtimeCanvasChartProps> = ({
  data,
  channels,
  title,
  isStale = false,
  onClear,
  height = '100%',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('1m');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; reading?: TelemetryReading } | null>(null);

  // Freeze buffer when paused
  const [frozenData, setFrozenData] = useState<TelemetryReading[]>([]);

  useEffect(() => {
    if (isPaused) {
      setFrozenData([...data]);
    }
  }, [isPaused]);

  const activeData = isPaused ? frozenData : data;

  // Window duration in ms
  const windowDurationMs = useMemo(() => {
    switch (timeWindow) {
      case '1m': return 60 * 1000;
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
    }
  }, [timeWindow]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas based on container
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Background
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, w, h);

    if (w < 50 || h < 50) {
      ctx.restore();
      return;
    }

    const padding = { top: 25, bottom: 35, left: 55, right: channels.some(c => c.axis === 'right') ? 55 : 20 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Time domain
    const now = activeData.length > 0 ? activeData[activeData.length - 1].timestamp : Date.now();
    const startTime = now - windowDurationMs;

    // Filter points in current window
    const visibleData = activeData.filter(d => d.timestamp >= startTime - 2000);

    // Compute left and right axis min/max bounds
    let leftMin = Infinity;
    let leftMax = -Infinity;
    let rightMin = Infinity;
    let rightMax = -Infinity;

    const leftChannels = channels.filter(c => c.axis === 'left');
    const rightChannels = channels.filter(c => c.axis === 'right');

    leftChannels.forEach(c => {
      if (c.fixedMin !== undefined) leftMin = Math.min(leftMin, c.fixedMin);
      if (c.fixedMax !== undefined) leftMax = Math.max(leftMax, c.fixedMax);
    });

    rightChannels.forEach(c => {
      if (c.fixedMin !== undefined) rightMin = Math.min(rightMin, c.fixedMin);
      if (c.fixedMax !== undefined) rightMax = Math.max(rightMax, c.fixedMax);
    });

    visibleData.forEach(d => {
      leftChannels.forEach(c => {
        const val = ((d[c.key] as number) || 0) * (c.multiplier || 1);
        if (c.fixedMin === undefined && val < leftMin) leftMin = val;
        if (c.fixedMax === undefined && val > leftMax) leftMax = val;
      });
      rightChannels.forEach(c => {
        const val = ((d[c.key] as number) || 0) * (c.multiplier || 1);
        if (c.fixedMin === undefined && val < rightMin) rightMin = val;
        if (c.fixedMax === undefined && val > rightMax) rightMax = val;
      });
    });

    if (leftMin === Infinity || leftMin === leftMax) { leftMin = 0; leftMax = 1; }
    if (leftMin > 0) leftMin = 0; // Baseline at 0 for vibration & voltage
    leftMax = leftMax * 1.15; // 15% headroom

    if (rightChannels.length > 0) {
      if (rightMin === Infinity || rightMin === rightMax) { rightMin = 0; rightMax = 1; }
      if (rightMin > 0) rightMin = 0;
      rightMax = rightMax * 1.15;
    }

    // Grid lines - horizontal
    const numYDivisions = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= numYDivisions; i++) {
      const y = padding.top + (chartH / numYDivisions) * i;
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);

      // Left axis label
      const leftVal = leftMax - (i / numYDivisions) * (leftMax - leftMin);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(leftVal.toFixed(leftVal >= 10 ? 1 : 2), padding.left - 8, y + 3);

      // Right axis label
      if (rightChannels.length > 0) {
        const rightVal = rightMax - (i / numYDivisions) * (rightMax - rightMin);
        ctx.textAlign = 'left';
        ctx.fillStyle = rightChannels[0].color;
        ctx.fillText(rightVal.toFixed(rightVal >= 10 ? 1 : 2), padding.left + chartW + 8, y + 3);
      }
    }
    ctx.stroke();

    // Time grid lines - vertical
    const numXDivisions = 6;
    ctx.beginPath();
    for (let i = 0; i <= numXDivisions; i++) {
      const x = padding.left + (chartW / numXDivisions) * i;
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartH);

      const t = startTime + (i / numXDivisions) * windowDurationMs;
      const d = new Date(t);
      const timeStr = `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(timeStr, x, padding.top + chartH + 18);
    }
    ctx.stroke();

    // If no data
    if (visibleData.length === 0) {
      ctx.fillStyle = '#475569';
      ctx.font = '13px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for incoming sensor data stream...', padding.left + chartW / 2, padding.top + chartH / 2);
      ctx.restore();
      return;
    }

    // Function to calculate (x, y) coordinates
    const getX = (timestamp: number) => {
      const progress = (timestamp - startTime) / windowDurationMs;
      return padding.left + progress * chartW;
    };

    const getLeftY = (val: number) => {
      const norm = (val - leftMin) / (leftMax - leftMin || 1);
      return padding.top + chartH - norm * chartH;
    };

    const getRightY = (val: number) => {
      const norm = (val - rightMin) / (rightMax - rightMin || 1);
      return padding.top + chartH - norm * chartH;
    };

    // Draw channels
    channels.forEach(chan => {
      ctx.save();
      ctx.strokeStyle = chan.color;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // Create subtle gradient fill under main left curve
      if (chan.axis === 'left' && channels.indexOf(chan) === 0) {
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        gradient.addColorStop(0, `${chan.color}33`); // 20% opacity
        gradient.addColorStop(1, `${chan.color}00`);

        ctx.beginPath();
        let started = false;
        visibleData.forEach((d) => {
          const x = getX(d.timestamp);
          const val = ((d[chan.key] as number) || 0) * (chan.multiplier || 1);
          const y = getLeftY(val);

          if (!started) {
            ctx.moveTo(x, padding.top + chartH);
            ctx.lineTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        });

        if (started) {
          const lastX = getX(visibleData[visibleData.length - 1].timestamp);
          ctx.lineTo(lastX, padding.top + chartH);
          ctx.closePath();
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      }

      // Draw stroke
      ctx.beginPath();
      let first = true;
      visibleData.forEach(d => {
        const x = getX(d.timestamp);
        const val = ((d[chan.key] as number) || 0) * (chan.multiplier || 1);
        const y = chan.axis === 'left' ? getLeftY(val) : getRightY(val);

        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw latest glowing pulse point
      if (visibleData.length > 0 && !isPaused) {
        const latest = visibleData[visibleData.length - 1];
        const lx = getX(latest.timestamp);
        const lval = ((latest[chan.key] as number) || 0) * (chan.multiplier || 1);
        const ly = chan.axis === 'left' ? getLeftY(lval) : getRightY(lval);

        ctx.fillStyle = chan.color;
        ctx.beginPath();
        ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `${chan.color}44`;
        ctx.beginPath();
        ctx.arc(lx, ly, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    // Hover crosshair and HUD
    if (hoverInfo && hoverInfo.x >= padding.left && hoverInfo.x <= padding.left + chartW) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hoverInfo.x, padding.top);
      ctx.lineTo(hoverInfo.x, padding.top + chartH);
      ctx.stroke();

      // Find closest reading
      const hoverTime = startTime + ((hoverInfo.x - padding.left) / chartW) * windowDurationMs;
      let closest: TelemetryReading | null = null;
      let minDiff = Infinity;
      visibleData.forEach(d => {
        const diff = Math.abs(d.timestamp - hoverTime);
        if (diff < minDiff) {
          minDiff = diff;
          closest = d;
        }
      });

      if (closest) {
        // Draw tooltip card
        const tipX = Math.min(hoverInfo.x + 12, padding.left + chartW - 130);
        const tipY = Math.max(padding.top + 10, hoverInfo.y - 40);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tipX, tipY, 140, 20 + channels.length * 16, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(new Date((closest as TelemetryReading).timestamp).toLocaleTimeString(), tipX + 8, tipY + 14);

        channels.forEach((c, idx) => {
          const val = (((closest as TelemetryReading)[c.key] as number) || 0) * (c.multiplier || 1);
          ctx.fillStyle = c.color;
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillText(`${c.label}: ${val.toFixed(2)} ${c.unit}`, tipX + 8, tipY + 30 + idx * 16);
        });
      }

      ctx.restore();
    }

    ctx.restore();
  }, [activeData, channels, timeWindow, windowDurationMs, isPaused, hoverInfo]);

  // Handle canvas mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoverInfo({ x, y });
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

  return (
    <div ref={containerRef} className="relative flex flex-col w-full h-full bg-[#080d1a] border border-slate-800/80 rounded-lg overflow-hidden">
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800 bg-[#0d1527]/90 text-xs">
        <div className="flex items-center gap-3">
          {title && <span className="font-semibold text-slate-200 tracking-wide">{title}</span>}
          {/* Channel Legend */}
          <div className="flex items-center gap-3">
            {channels.map(chan => (
              <div key={chan.key as string} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chan.color }} />
                <span>{chan.label}</span>
                <span className="text-slate-500 font-mono">({chan.unit})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Time window selector */}
          <div className="flex items-center bg-slate-900/80 rounded p-0.5 border border-slate-800 text-[11px] font-mono">
            {(['1m', '5m', '15m', '1h'] as TimeWindow[]).map(tw => (
              <button
                key={tw}
                onClick={() => setTimeWindow(tw)}
                className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                  timeWindow === tw
                    ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tw}
              </button>
            ))}
          </div>

          {/* Pause / Resume */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume live update' : 'Pause buffer'}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isPaused ? <Play size={12} className="fill-current" /> : <Pause size={12} />}
            <span>{isPaused ? 'Paused' : 'Live'}</span>
          </button>

          {onClear && (
            <button
              onClick={onClear}
              title="Clear chart buffer"
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 w-full min-h-0">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full block cursor-crosshair"
        />

        {/* Stale Warning Indicator */}
        {isStale && (
          <div className="absolute top-3 right-3 bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded text-xs flex items-center gap-1.5 backdrop-blur-sm shadow-sm pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-[11px]">Stream Inactive / Stale</span>
          </div>
        )}
      </div>
    </div>
  );
};
