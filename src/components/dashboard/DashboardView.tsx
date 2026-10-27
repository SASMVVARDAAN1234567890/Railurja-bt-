/**
 * DashboardView
 * Primary executive overview with 6 large readable metric cards,
 * real-time dual-waveform chart, train passage event detection, and system harvester overview.
 */
import React from 'react';
import {
  Activity,
  Zap,
  Gauge,
  Radio,
  Clock,
  TrendingUp,
  Cpu,
  TrainTrack,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { TelemetryReading, ConnectionStatus, ConnectionMode } from '../../types/telemetry';
import { RealtimeCanvasChart } from '../charts/RealtimeCanvasChart';

// Generated asset paths
const HARVESTER_IMAGE = '/src/assets/images/railway_piezo_harvester_1793002781127.jpg';

interface DashboardViewProps {
  latestReading: TelemetryReading | null;
  historyBuffer: TelemetryReading[];
  connectionStatus: ConnectionStatus;
  connectionMode: ConnectionMode;
  deviceName: string;
  isDemoMode: boolean;
  isStale: boolean;
  hasReceivedData: boolean;
  totalEnergyJoules: number;
  trainPassCount: number;
  onNavigate: (tab: any) => void;
  onResetEnergy: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  latestReading,
  historyBuffer,
  connectionStatus,
  connectionMode,
  deviceName,
  isDemoMode,
  isStale,
  hasReceivedData,
  totalEnergyJoules,
  trainPassCount,
  onNavigate,
  onResetEnergy,
}) => {
  const isConnected = connectionStatus === 'connected';
  const showWaiting = !isDemoMode && (!isConnected || !hasReceivedData || !latestReading);

  // Power in mW or W
  const powerW = latestReading?.power || 0;
  const powerFormatted = powerW >= 1 ? `${powerW.toFixed(3)} W` : `${(powerW * 1000).toFixed(1)} mW`;

  // Current in mA or A
  const currentA = latestReading?.current || 0;
  const currentFormatted = currentA >= 1 ? `${currentA.toFixed(3)} A` : `${(currentA * 1000).toFixed(2)} mA`;

  // Energy in mWh
  const totalMWh = (totalEnergyJoules / 3600) * 1000;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#070b14] p-3 gap-3">
      {/* Top Warning Banner if Live and Disconnected / Stale */}
      {!isDemoMode && !isConnected && (
        <div className="bg-blue-950/40 border border-blue-800/60 rounded-lg px-4 py-2 flex items-center justify-between text-xs text-blue-200 shrink-0">
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-cyan-400" />
            <span>Hardware sensor not connected. Connect via Web Bluetooth or Wi-Fi to stream live railway telemetry.</span>
          </div>
          <button
            onClick={() => onNavigate('connect')}
            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition-colors"
          >
            Connect Hardware
          </button>
        </div>
      )}

      {!isDemoMode && isConnected && isStale && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-lg px-4 py-2 flex items-center gap-2 text-xs text-amber-200 shrink-0">
          <AlertCircle size={14} className="text-amber-400" />
          <span>Warning: Hardware stream is active, but no packets have been received recently. Check microcontroller power or signal.</span>
        </div>
      )}

      {/* 6 Large High-Density Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 shrink-0">
        {/* Card 1: Vibration Intensity */}
        <div className="bg-[#0b1324] border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-mono text-[10px] uppercase tracking-wider">Vibration</span>
            <Activity size={14} className="text-cyan-400" />
          </div>
          <div className="my-1">
            {showWaiting ? (
              <span className="text-xs font-mono text-slate-500 italic">Waiting for Sensor Data</span>
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl lg:text-3xl font-mono font-bold text-white tabular-nums">
                  {latestReading?.vibration.toFixed(3)}
                </span>
                <span className="text-xs font-mono text-cyan-400 font-semibold">g</span>
              </div>
            )}
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
            <span>Peak: {latestReading ? `${(latestReading.vibration * 1.2).toFixed(2)} g` : '---'}</span>
            <span className={latestReading && latestReading.vibration > 0.6 ? 'text-amber-400 font-bold' : ''}>
              {latestReading && latestReading.vibration > 0.6 ? 'TRAIN PASS' : 'AMBIENT'}
            </span>
          </div>
        </div>

        {/* Card 2: Vibration Frequency */}
        <div className="bg-[#0b1324] border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-mono text-[10px] uppercase tracking-wider">Frequency</span>
            <Gauge size={14} className="text-blue-400" />
          </div>
          <div className="my-1">
            {showWaiting ? (
              <span className="text-xs font-mono text-slate-500 italic">Waiting for Sensor Data</span>
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl lg:text-3xl font-mono font-bold text-white tabular-nums">
                  {latestReading?.frequency !== undefined ? latestReading.frequency.toFixed(1) : '---'}
                </span>
                <span className="text-xs font-mono text-blue-400 font-semibold">Hz</span>
              </div>
            )}
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
            <span>Harmonics</span>
            <span>Piezo Res: ~28Hz</span>
          </div>
        </div>

        {/* Card 3: Generated Voltage */}
        <div className="bg-[#0b1324] border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-mono text-[10px] uppercase tracking-wider">Voltage</span>
            <Zap size={14} className="text-amber-400" />
          </div>
          <div className="my-1">
            {showWaiting ? (
              <span className="text-xs font-mono text-slate-500 italic">Waiting for Sensor Data</span>
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl lg:text-3xl font-mono font-bold text-white tabular-nums">
                  {latestReading?.voltage.toFixed(3)}
                </span>
                <span className="text-xs font-mono text-amber-400 font-semibold">V</span>
              </div>
            )}
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
            <span>Rectified DC</span>
            <span>Limit: 25.0 V</span>
          </div>
        </div>

        {/* Card 4: Generated Current */}
        <div className="bg-[#0b1324] border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-mono text-[10px] uppercase tracking-wider">Current</span>
            <TrendingUp size={14} className="text-emerald-400" />
          </div>
          <div className="my-1">
            {showWaiting ? (
              <span className="text-xs font-mono text-slate-500 italic">Waiting for Sensor Data</span>
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl lg:text-3xl font-mono font-bold text-white tabular-nums">
                  {currentFormatted.split(' ')[0]}
                </span>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  {currentFormatted.split(' ')[1]}
                </span>
              </div>
            )}
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
            <span>Sensor: INA219</span>
            <span>Charging Cap</span>
          </div>
        </div>

        {/* Card 5: Harvested Power (P = V * I) */}
        <div className="bg-[#0b1324] border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-mono text-[10px] uppercase tracking-wider">Power (P=VI)</span>
            <Zap size={14} className="text-purple-400" />
          </div>
          <div className="my-1">
            {showWaiting ? (
              <span className="text-xs font-mono text-slate-500 italic">Waiting for Sensor Data</span>
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl lg:text-3xl font-mono font-bold text-white tabular-nums">
                  {powerFormatted.split(' ')[0]}
                </span>
                <span className="text-xs font-mono text-purple-400 font-semibold">
                  {powerFormatted.split(' ')[1]}
                </span>
              </div>
            )}
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
            <span>Instantaneous</span>
            <span>Calc: V × I</span>
          </div>
        </div>

        {/* Card 6: Total Harvested Energy */}
        <div className="bg-gradient-to-br from-[#0c1833] to-[#0b1324] border border-cyan-800/50 rounded-lg p-3 flex flex-col justify-between shadow-lg shadow-cyan-950/20">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-300">Total Energy</span>
            <ShieldCheck size={14} className="text-cyan-400" />
          </div>
          <div className="my-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl lg:text-3xl font-mono font-bold text-cyan-200 tabular-nums">
                {totalEnergyJoules < 1 ? (totalEnergyJoules * 1000).toFixed(1) : totalEnergyJoules.toFixed(3)}
              </span>
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                {totalEnergyJoules < 1 ? 'mJ' : 'J'}
              </span>
            </div>
          </div>
          <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>≈ {totalMWh.toFixed(3)} mWh</span>
            <button
              onClick={onResetEnergy}
              title="Reset energy accumulator"
              className="text-[9px] text-cyan-400 hover:text-white underline cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main Monitoring Split Section */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left 8 Cols: Real-Time Multi-Channel Chart */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-0">
          <RealtimeCanvasChart
            title="Real-Time Vibration & Power Telemetry Waveforms"
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
                key: 'voltage',
                label: 'Piezo Voltage',
                unit: 'V',
                color: '#f59e0b',
                axis: 'right',
                fixedMin: 0,
              },
              {
                key: 'power',
                label: 'Power (mW)',
                unit: 'mW',
                color: '#a855f7',
                axis: 'right',
                multiplier: 1000,
                fixedMin: 0,
              },
            ]}
          />
        </div>

        {/* Right 4 Cols: Hardware Harvester Unit Blueprint & Train Event Monitor */}
        <div className="lg:col-span-4 flex flex-col gap-3 h-full min-h-0 overflow-y-auto pr-1">
          {/* Harvester Unit Spec Card */}
          <div className="bg-[#0b1324] border border-slate-800 rounded-lg p-3 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 tracking-wide flex items-center gap-2">
                <TrainTrack size={14} className="text-cyan-400" />
                Track Harvester Subsystem
              </span>
              <span className="text-[10px] font-mono text-slate-400">PZT-5H Dual Stack</span>
            </div>

            {/* Visual Hardware Schematic */}
            <div className="relative w-full h-32 rounded bg-slate-900 border border-slate-800 overflow-hidden group">
              <img
                src={HARVESTER_IMAGE}
                alt="Railway Piezo Harvester Unit"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070b14]/90 via-transparent to-transparent flex items-end p-2">
                <div className="flex items-center justify-between w-full text-[10px] font-mono text-slate-300">
                  <span>Web & Sleeper Clamp Mount</span>
                  <span className="text-cyan-300">Status: ACTIVE</span>
                </div>
              </div>
            </div>

            {/* Technical Specifications Matrix */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
                <div className="text-[9px] font-mono text-slate-500 uppercase">Energy Storage</div>
                <div className="font-mono text-slate-200 font-semibold">10F Supercap Bank</div>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
                <div className="text-[9px] font-mono text-slate-500 uppercase">Transducer</div>
                <div className="font-mono text-slate-200 font-semibold">Piezoelectric PZT</div>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
                <div className="text-[9px] font-mono text-slate-500 uppercase">Comm Link</div>
                <div className="font-mono text-cyan-400 font-semibold uppercase">{connectionMode}</div>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
                <div className="text-[9px] font-mono text-slate-500 uppercase">Train Events</div>
                <div className="font-mono text-amber-300 font-semibold">{trainPassCount} Passes Logged</div>
              </div>
            </div>
          </div>

          {/* Quick Hardware Connection Status Card */}
          <div className="bg-[#0b1324] border border-slate-800 rounded-lg p-3 flex flex-col gap-2 flex-1 min-h-[140px] justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Cpu size={14} className="text-blue-400" />
                Active Device Telemetry
              </span>
              <button
                onClick={() => onNavigate('connect')}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-0.5"
              >
                Config <ArrowUpRight size={10} />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60 font-mono text-[11px]">
                <span className="text-slate-400">Device ID</span>
                <span className="text-slate-200 font-semibold">{latestReading?.deviceId || deviceName || 'RailUrja-01'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60 font-mono text-[11px]">
                <span className="text-slate-400">Link Mode</span>
                <span className="text-cyan-300 uppercase">{isDemoMode ? 'Simulator' : connectionMode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60 font-mono text-[11px]">
                <span className="text-slate-400">Stream Status</span>
                <span className={isConnected ? (isStale ? 'text-amber-400' : 'text-emerald-400 font-semibold') : 'text-slate-500'}>
                  {isConnected ? (isStale ? 'STALE' : 'ONLINE (4Hz)') : 'OFFLINE'}
                </span>
              </div>
              <div className="flex justify-between py-1 font-mono text-[11px]">
                <span className="text-slate-400">Last Packet</span>
                <span className="text-slate-300">
                  {latestReading ? new Date(latestReading.timestamp).toLocaleTimeString() : '---'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => onNavigate('live')}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-colors text-center"
              >
                Full Oscilloscope
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className="flex-1 py-1.5 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800/50 text-cyan-300 rounded text-xs font-medium transition-colors text-center"
              >
                Energy Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
