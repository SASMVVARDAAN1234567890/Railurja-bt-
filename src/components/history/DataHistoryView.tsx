/**
 * DataHistoryView
 * Persistent historical logs, session analysis, searchable telemetry tables,
 * and standard RFC-4180 CSV export for school exhibition reports.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Download,
  Trash2,
  Search,
  Filter,
  FileSpreadsheet,
  Clock,
  Zap,
  Activity,
  Layers,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { TelemetryReading, MonitoringSession } from '../../types/telemetry';
import {
  getReadings,
  getAllSessions,
  deleteSession,
  clearAllReadings,
  exportReadingsToCSV
} from '../../services/db';

interface DataHistoryViewProps {
  activeSession: MonitoringSession | null;
  onStartSession: (name?: string) => void;
  onStopSession: () => void;
}

export const DataHistoryView: React.FC<DataHistoryViewProps> = ({
  activeSession,
  onStartSession,
  onStopSession,
}) => {
  const [sessions, setSessions] = useState<MonitoringSession[]>([]);
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'hardware' | 'demo'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const pageSize = 50;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const sessList = await getAllSessions();
      setSessions(sessList);

      const sessIdArg = selectedSessionId !== 'all' ? selectedSessionId : undefined;
      const srcArg = sourceFilter !== 'all' ? sourceFilter : undefined;
      const readList = await getReadings(2000, sessIdArg, srcArg);
      setReadings(readList);
    } catch (err) {
      console.error('Failed to load history data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSessionId, sourceFilter]);

  // Filtered readings based on search query
  const filteredReadings = useMemo(() => {
    return readings.filter(r => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const devMatch = r.deviceId?.toLowerCase().includes(q);
        const timeMatch = new Date(r.timestamp).toLocaleTimeString().toLowerCase().includes(q);
        const sessMatch = r.sessionId?.toLowerCase().includes(q);
        if (!devMatch && !timeMatch && !sessMatch) return false;
      }
      return true;
    });
  }, [readings, searchQuery]);

  // Pagination slice
  const paginatedReadings = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredReadings.slice(start, start + pageSize);
  }, [filteredReadings, page]);

  const totalPages = Math.ceil(filteredReadings.length / pageSize) || 1;

  // Handle CSV export
  const handleExportCSV = () => {
    try {
      const filename = selectedSessionId !== 'all'
        ? `RailUrja_Session_${selectedSessionId}.csv`
        : `RailUrja_Full_Export_${Date.now()}.csv`;
      exportReadingsToCSV(filteredReadings, filename);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    }
  };

  // Handle Clear
  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear stored historical telemetry? This action is permanent.')) {
      await clearAllReadings();
      await loadData();
    }
  };

  // Handle Delete Session
  const handleDeleteSession = async (sessId: string) => {
    if (confirm(`Delete session ${sessId}?`)) {
      await deleteSession(sessId);
      if (selectedSessionId === sessId) setSelectedSessionId('all');
      await loadData();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#070b14] p-3 gap-3">
      {/* Top Header & Session Management Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#0b1324] border border-slate-800 rounded-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <Database size={18} />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              Persistent Telemetry History
              <span className="text-[10px] font-mono font-normal text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                IndexedDB
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Preserved across browser refreshes · {readings.length} total samples in database
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredReadings.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded text-xs font-semibold transition-all shadow-sm disabled:opacity-40"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-800 text-slate-300 hover:text-rose-300 rounded text-xs transition-colors"
            title="Clear all stored logs"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Filter and Session Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 bg-[#0b1324] border border-slate-800 rounded-lg text-xs shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Source Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px] font-mono">Source:</span>
            <div className="flex items-center bg-slate-900 rounded p-0.5 border border-slate-800 text-[11px]">
              {(['all', 'hardware', 'demo'] as const).map(src => (
                <button
                  key={src}
                  onClick={() => setSourceFilter(src)}
                  className={`px-2 py-0.5 rounded capitalize transition-colors ${
                    sourceFilter === src
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>

          {/* Session Selector */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px] font-mono">Session:</span>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-[11px] font-mono focus:outline-none"
            >
              <option value="all">All Sessions ({sessions.length})</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({new Date(s.startTime).toLocaleTimeString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Query */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search timestamp, ID..."
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded pl-7 pr-3 py-1 text-[11px] font-mono w-44 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 min-h-0 bg-[#0b1324] border border-slate-800 rounded-lg overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0e172e] border-b border-slate-800 text-slate-400 font-mono text-[10px] sticky top-0 z-10 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Device</th>
                <th className="py-2.5 px-3 text-right">Vibration (g)</th>
                <th className="py-2.5 px-3 text-right">Freq (Hz)</th>
                <th className="py-2.5 px-3 text-right">Voltage (V)</th>
                <th className="py-2.5 px-3 text-right">Current (mA)</th>
                <th className="py-2.5 px-3 text-right">Power (mW)</th>
                <th className="py-2.5 px-3 text-right">Cumul. Energy (J)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {paginatedReadings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 italic">
                    {isLoading ? 'Loading records from IndexedDB...' : 'No telemetry records found matching filter.'}
                  </td>
                </tr>
              ) : (
                paginatedReadings.map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-2 px-3 text-slate-300">
                      {new Date(r.timestamp).toLocaleTimeString()}.{String(r.timestamp % 1000).padStart(3, '0')}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                          r.source === 'hardware'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {r.source}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400">{r.deviceId}</td>
                    <td className="py-2 px-3 text-right text-cyan-300 font-bold tabular-nums">
                      {r.vibration.toFixed(3)}
                    </td>
                    <td className="py-2 px-3 text-right text-blue-300 tabular-nums">
                      {r.frequency !== undefined ? r.frequency.toFixed(1) : '---'}
                    </td>
                    <td className="py-2 px-3 text-right text-amber-300 tabular-nums">
                      {r.voltage.toFixed(3)}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-300 tabular-nums">
                      {(r.current * 1000).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right text-purple-300 font-bold tabular-nums">
                      {(r.power * 1000).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-200 tabular-nums">
                      {r.cumulativeEnergyJoules.toFixed(4)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-3 py-2 bg-[#0d162b] border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
          <div>
            Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredReadings.length)} of {filteredReadings.length} records
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 disabled:opacity-30 hover:bg-slate-800"
            >
              Prev
            </button>
            <span className="px-2 text-slate-200">Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 disabled:opacity-30 hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
