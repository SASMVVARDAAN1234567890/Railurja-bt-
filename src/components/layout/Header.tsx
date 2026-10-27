/**
 * Header Component for RailUrja Control Room
 * Compliant with Top Bar Contract: Brand title, active monitoring status, full-screen controls
 */
import React, { useState, useEffect } from 'react';
import {
  Activity,
  Maximize2,
  Minimize2,
  Radio,
  Zap,
  Square,
  CircleDot,
  AlertTriangle,
  Play
} from 'lucide-react';
import { ConnectionStatus, ConnectionMode, MonitoringSession } from '../../types/telemetry';

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  connectionMode: ConnectionMode;
  deviceName: string;
  isDemoMode: boolean;
  isStale: boolean;
  lastPacketTime: number;
  activeSession: MonitoringSession | null;
  onToggleDemoMode: () => void;
  onStartSession: (name?: string) => void;
  onStopSession: () => void;
  onNavigate: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionStatus,
  connectionMode,
  deviceName,
  isDemoMode,
  isStale,
  lastPacketTime,
  activeSession,
  onToggleDemoMode,
  onStartSession,
  onStopSession,
  onNavigate,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Track fullscreen state changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Update clock every second for elapsed time
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen toggle error:', err);
    }
  };

  const getStatusColor = () => {
    if (isDemoMode) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    if (connectionStatus === 'connected') {
      if (isStale) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    }
    if (connectionStatus === 'connecting' || connectionStatus === 'reconnecting') {
      return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
    return 'text-slate-400 bg-slate-800/40 border-slate-700/50';
  };

  const elapsedSincePacketSec = lastPacketTime > 0 ? ((now - lastPacketTime) / 1000).toFixed(1) : null;

  return (
    <header className="h-14 border-b border-slate-800 bg-[#070b14]/95 backdrop-blur-md px-4 flex items-center justify-between gap-6 shrink-0 z-30 select-none">
      {/* Zone 1: Wordmark & Architecture */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-950/40">
          <Zap size={18} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white flex items-center gap-2 whitespace-nowrap">
            RailUrja
            <span className="text-[11px] font-mono font-medium px-1.5 py-0.2 text-cyan-300 bg-cyan-950/60 border border-cyan-700/40 rounded">
              v1.0
            </span>
          </span>
          <span className="text-[10px] text-slate-400 tracking-wider font-mono">
            RAILWAY VIBRATION ENERGY HARVESTING
          </span>
        </div>
      </div>

      {/* Zone 2: Telemetry Status & Active Session Ribbon */}
      <div className="hidden md:flex items-center gap-3">
        {/* Connection status badge */}
        <div
          onClick={() => onNavigate('connect')}
          className={`flex items-center gap-2 px-3 py-1 rounded-md border text-xs font-medium cursor-pointer transition-colors ${getStatusColor()}`}
          title="Click to manage device connection"
        >
          <Radio size={13} className={connectionStatus === 'connected' && !isStale ? 'animate-pulse' : ''} />
          <span className="capitalize whitespace-nowrap">
            {isDemoMode ? 'SIMULATOR ACTIVE' : connectionStatus === 'connected' ? (isStale ? 'STALE' : 'LIVE') : connectionStatus}
          </span>
          {deviceName && (
            <span className="text-slate-400 font-mono text-[11px] max-w-[120px] truncate">
              · {deviceName}
            </span>
          )}
          {lastPacketTime > 0 && (
            <span className="text-slate-400 font-mono text-[10px]">
              ({elapsedSincePacketSec}s)
            </span>
          )}
        </div>

        {/* Stale warning if live and stale */}
        {!isDemoMode && connectionStatus === 'connected' && isStale && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md">
            <AlertTriangle size={13} />
            <span className="font-mono text-[11px]">No packet for {elapsedSincePacketSec}s</span>
          </div>
        )}

        {/* Active Recording Session Status */}
        {activeSession ? (
          <div className="flex items-center gap-2.5 px-3 py-1 bg-rose-500/10 border border-rose-500/30 rounded-md text-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="font-semibold text-rose-300 whitespace-nowrap">REC: {activeSession.name}</span>
            <span className="font-mono text-slate-300">
              {Math.floor((now - activeSession.startTime) / 1000)}s
            </span>
            <button
              onClick={onStopSession}
              className="p-0.5 rounded text-rose-300 hover:text-white hover:bg-rose-600 transition-colors"
              title="Stop Recording"
            >
              <Square size={12} className="fill-current" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onStartSession()}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-md text-xs text-slate-300 transition-colors whitespace-nowrap"
          >
            <CircleDot size={12} className="text-rose-400" />
            <span>Record Session</span>
          </button>
        )}
      </div>

      {/* Zone 3: Demo Mode Toggle & Full-Screen Action */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Demo Mode Button */}
        <button
          onClick={onToggleDemoMode}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide border transition-all whitespace-nowrap flex items-center gap-1.5 ${
            isDemoMode
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 hover:bg-amber-400'
              : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
          }`}
          title={isDemoMode ? 'Turn off Demo Mode (switch to Live hardware)' : 'Launch simulated train vibration profile'}
        >
          {isDemoMode ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
              <span>DEMO MODE ACTIVE</span>
            </>
          ) : (
            <>
              <Play size={12} className="fill-current text-amber-400" />
              <span>Demo Mode</span>
            </>
          )}
        </button>

        {/* Working Full-Screen Button */}
        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 text-cyan-300 hover:text-cyan-200 text-xs font-medium transition-colors shadow-sm whitespace-nowrap"
          title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Enter Full Screen (100vw x 100vh)'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}</span>
        </button>
      </div>
    </header>
  );
};
