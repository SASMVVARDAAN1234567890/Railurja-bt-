/**
 * Sidebar Navigation for RailUrja Control Room
 * Fixed left navigation sidebar with clean typography, responsive icons, and active state indicators
 */
import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Bluetooth,
  Database,
  FileSpreadsheet,
  Settings,
  Cpu,
  Zap,
  Radio,
  BookOpen,
} from 'lucide-react';
import { ConnectionStatus } from '../../types/telemetry';

export type NavTab = 'dashboard' | 'live' | 'connect' | 'history' | 'reports' | 'settings' | 'guide';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  connectionStatus: ConnectionStatus;
  isDemoMode: boolean;
  totalEnergyJoules: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  connectionStatus,
  isDemoMode,
  totalEnergyJoules,
}) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: string }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
    },
    {
      id: 'live',
      label: 'Live Monitoring',
      icon: <Activity size={18} />,
      badge: connectionStatus === 'connected' ? 'LIVE' : undefined,
    },
    {
      id: 'connect',
      label: 'Connect Device',
      icon: <Bluetooth size={18} />,
      badge: connectionStatus === 'connected' ? 'OK' : 'SETUP',
    },
    {
      id: 'history',
      label: 'Data History',
      icon: <Database size={18} />,
    },
    {
      id: 'reports',
      label: 'Reports & Science',
      icon: <FileSpreadsheet size={18} />,
    },
    {
      id: 'settings',
      label: 'Settings & Parser',
      icon: <Settings size={18} />,
    },
    {
      id: 'guide',
      label: 'Hardware Guide',
      icon: <BookOpen size={18} />,
    },
  ];

  return (
    <aside className="w-56 lg:w-60 h-[calc(100vh-3.5rem)] bg-[#0a0f1d] border-r border-slate-800 flex flex-col justify-between p-3 shrink-0 select-none">
      {/* Navigation Links */}
      <div className="space-y-1">
        <div className="px-2.5 py-1 text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider">
          Control Center
        </div>

        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950/70 to-blue-950/40 text-cyan-300 border border-cyan-800/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {item.icon}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                    item.badge === 'LIVE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : item.badge === 'OK'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Telemetry Card: Energy Mini-Gauge */}
      <div className="bg-[#0f172a]/90 border border-slate-800 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <Zap size={11} className="text-amber-400" />
            Harvested Yield
          </span>
          <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/50 px-1 rounded border border-cyan-900/50">
            {isDemoMode ? 'SIMULATED' : 'LIVE'}
          </span>
        </div>

        <div className="space-y-0.5">
          <div className="text-lg font-mono font-bold text-white tabular-nums">
            {totalEnergyJoules < 1
              ? `${(totalEnergyJoules * 1000).toFixed(1)} mJ`
              : `${totalEnergyJoules.toFixed(3)} J`}
          </div>
          <div className="text-[10px] font-mono text-slate-400 tabular-nums">
            ≈ {((totalEnergyJoules / 3600) * 1000).toFixed(3)} mWh
          </div>
        </div>

        {/* Micro progress bar towards 10 Joules benchmark */}
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-500 to-amber-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (totalEnergyJoules / 10) * 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-0.5">
          <span>0 J</span>
          <span>Benchmark: 10 J</span>
        </div>
      </div>
    </aside>
  );
};
