/**
 * LiveMonitoringView
 * High-resolution multi-channel oscilloscope & power flow monitoring console
 */
import React, { useState } from 'react';
import {
  Activity,
  Zap,
  TrendingUp,
  Gauge,
  Sliders,
  Filter,
  Camera,
  Play,
  Pause,
  AlertCircle
} from 'lucide-react';
import { TelemetryReading, ConnectionStatus, ConnectionMode, DeviceConfig } from '../../types/telemetry';
import { RealtimeCanvasChart } from '../charts/RealtimeCanvasChart';

interface LiveMonitoringViewProps {
  historyBuffer: TelemetryReading[];
  latestReading: TelemetryReading | null;
  connectionStatus: ConnectionStatus;
  connectionMode: ConnectionMode;
  isDemoMode: boolean;
  isStale: boolean;
  hasReceivedData: boolean;
  config: DeviceConfig;
  totalEnergyJoules: number;
}

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({
  historyBuffer,
  latestReading,
  connectionStatus,
  connectionMode,
  isDemoMode,
  isStale,
  hasReceivedData,
  config,
  totalEnergyJoules,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<'all' | 'vibration' | 'electrical'>('all');
  const isConnected = connectionStatus === 'connected';
  const showWaiting = !isDemoMode && (!isConnected || !hasReceivedData || !latestReading);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#070b14] p-3 gap-3">
      {/* Scope Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0b1324] border border-slate-800 rounded-lg text-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-cyan-400" />
            <span className="font-bold text-white tracking-wide">Multi-Channel Telemetry Oscilloscope</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-800" />

          {/* Mode presets */}
          <div className="flex items-center bg-slate-900 rounded p-0.5 border border-slate-800 text-[11px]">
            <button
              onClick={() => setSelectedPreset('all')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                selectedPreset === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Master All-Channel
            </button>
            <button
              onClick={() => setSelectedPreset('vibration')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                selectedPreset === 'vibration'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vibration Focus (g & Hz)
            </button>
            <button
              onClick={() => setSelectedPreset('electrical')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                selectedPreset === 'electrical'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Electrical Yield (V & mW)
            </button>
          </div>
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-slate-400">Trigger Threshold:</span>
          <span className="text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
            ≥ {config.trainPassThresholdG} g
          </span>
          <span className="text-slate-500">|</span>
          <span className={isConnected ? (isStale ? 'text-amber-400' : 'text-emerald-400') : 'text-slate-500'}>
            ● {isConnected ? (isStale ? 'STALE' : 'LIVE STREAM') : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* Main Waveform Section: Split or Single depending on Preset */}
      {selectedPreset === 'all' && (
        <div className="flex-1 min-h-0 grid grid-rows-2 gap-3">
          {/* Top Scope: Mechanical Vibration & Frequency */}
          <div className="h-full min-h-0">
            <RealtimeCanvasChart
              title="Channel A & B: Mechanical Railway Vibration & Frequency"
              data={historyBuffer}
              isStale={isStale}
              channels={[
                {
                  key: 'vibration',
                  label: 'Vibration Acceleration',
                  unit: 'g',
                  color: '#00f0ff',
                  axis: 'left',
                  fixedMin: 0,
                },
                {
                  key: 'frequency',
                  label: 'Fundamental Frequency',
                  unit: 'Hz',
                  color: '#38bdf8',
                  axis: 'right',
                  fixedMin: 0,
                },
              ]}
            />
          </div>

          {/* Bottom Scope: Electrical Rectification, Current & Harvested Power */}
          <div className="h-full min-h-0">
            <RealtimeCanvasChart
              title="Channel C & D: Electrical Harvester Output (Voltage, Current, Power)"
              data={historyBuffer}
              isStale={isStale}
              channels={[
                {
                  key: 'voltage',
                  label: 'Rectified Voltage',
                  unit: 'V',
                  color: '#f59e0b',
                  axis: 'left',
                  fixedMin: 0,
                },
                {
                  key: 'current',
                  label: 'Harvest Current',
                  unit: 'mA',
                  color: '#10b981',
                  axis: 'right',
                  multiplier: 1000,
                  fixedMin: 0,
                },
                {
                  key: 'power',
                  label: 'Power Yield',
                  unit: 'mW',
                  color: '#c084fc',
                  axis: 'right',
                  multiplier: 1000,
                  fixedMin: 0,
                },
              ]}
            />
          </div>
        </div>
      )}

      {selectedPreset === 'vibration' && (
        <div className="flex-1 min-h-0">
          <RealtimeCanvasChart
            title="High-Resolution Vibration Waveform & Harmonic Frequency Dynamics"
            data={historyBuffer}
            isStale={isStale}
            channels={[
              {
                key: 'vibration',
                label: 'Vibration Accel',
                unit: 'g',
                color: '#00f0ff',
                axis: 'left',
                fixedMin: 0,
              },
              {
                key: 'frequency',
                label: 'Frequency',
                unit: 'Hz',
                color: '#38bdf8',
                axis: 'right',
                fixedMin: 0,
              },
            ]}
          />
        </div>
      )}

      {selectedPreset === 'electrical' && (
        <div className="flex-1 min-h-0">
          <RealtimeCanvasChart
            title="Harvested Electrical Flow: Voltage (V) & Power Output (mW)"
            data={historyBuffer}
            isStale={isStale}
            channels={[
              {
                key: 'voltage',
                label: 'Piezo Rectified Voltage',
                unit: 'V',
                color: '#f59e0b',
                axis: 'left',
                fixedMin: 0,
              },
              {
                key: 'power',
                label: 'Electrical Power',
                unit: 'mW',
                color: '#c084fc',
                axis: 'right',
                multiplier: 1000,
                fixedMin: 0,
              },
              {
                key: 'current',
                label: 'Current',
                unit: 'mA',
                color: '#10b981',
                axis: 'right',
                multiplier: 1000,
                fixedMin: 0,
              },
            ]}
          />
        </div>
      )}

      {/* Instantaneous Probe Readouts Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 shrink-0 bg-[#0b1324] p-2.5 rounded-lg border border-slate-800 text-xs">
        <div className="flex items-center justify-between px-2 py-1 bg-slate-900/80 rounded border border-slate-800 font-mono">
          <span className="text-slate-400">INST. VIBRATION:</span>
          <span className="text-cyan-300 font-bold tabular-nums">
            {showWaiting ? 'WAITING' : `${latestReading?.vibration.toFixed(3)} g`}
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 bg-slate-900/80 rounded border border-slate-800 font-mono">
          <span className="text-slate-400">INST. FREQUENCY:</span>
          <span className="text-blue-300 font-bold tabular-nums">
            {showWaiting ? 'WAITING' : `${latestReading?.frequency?.toFixed(1) ?? '---'} Hz`}
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 bg-slate-900/80 rounded border border-slate-800 font-mono">
          <span className="text-slate-400">RECTIFIED VOLTAGE:</span>
          <span className="text-amber-300 font-bold tabular-nums">
            {showWaiting ? 'WAITING' : `${latestReading?.voltage.toFixed(3)} V`}
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 bg-slate-900/80 rounded border border-slate-800 font-mono">
          <span className="text-slate-400">HARVEST POWER:</span>
          <span className="text-purple-300 font-bold tabular-nums">
            {showWaiting ? 'WAITING' : `${((latestReading?.power || 0) * 1000).toFixed(1)} mW`}
          </span>
        </div>
      </div>
    </div>
  );
};
