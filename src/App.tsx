/**
 * RailUrja – Railway Vibration Energy Harvesting System
 * Full-screen laptop control-room application with real hardware Bluetooth/Wi-Fi integration,
 * high-resolution waveforms, IndexedDB persistence, and physical simulation demo mode.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { LiveMonitoringView } from './components/live/LiveMonitoringView';
import { ConnectDeviceView } from './components/connect/ConnectDeviceView';
import { DataHistoryView } from './components/history/DataHistoryView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { HardwareGuideView } from './components/guide/HardwareGuideView';

import {
  TelemetryReading,
  MonitoringSession,
  ConnectionStatus,
  ConnectionMode,
  DeviceConfig
} from './types/telemetry';
import { HardwareConnectionManager, ConnectionEvent } from './services/connection';
import {
  loadConfig,
  saveConfig,
  saveReadingsBatch,
  saveSession,
  DEFAULT_CONFIG
} from './services/db';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [config, setConfig] = useState<DeviceConfig>(DEFAULT_CONFIG);

  // Connection & Telemetry state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('bluetooth');
  const [deviceName, setDeviceName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [lastPacketTime, setLastPacketTime] = useState<number>(0);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [hasReceivedData, setHasReceivedData] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Telemetry buffer & reading states
  const [latestReading, setLatestReading] = useState<TelemetryReading | null>(null);
  const [historyBuffer, setHistoryBuffer] = useState<TelemetryReading[]>([]);
  const [totalEnergyJoules, setTotalEnergyJoules] = useState<number>(0);
  const [trainPassCount, setTrainPassCount] = useState<number>(0);

  // Session recording state
  const [activeSession, setActiveSession] = useState<MonitoringSession | null>(null);

  // Raw logs for hardware console
  const [rawLogs, setRawLogs] = useState<Array<{ text: string; type: 'info' | 'rx' | 'error' | 'warn'; time: string }>>([]);

  // Hardware connection manager reference
  const connManagerRef = useRef<HardwareConnectionManager | null>(null);

  // Pending batch writes for IndexedDB
  const pendingBatchRef = useRef<TelemetryReading[]>([]);
  const activeSessionRef = useRef<MonitoringSession | null>(null);
  activeSessionRef.current = activeSession;

  // Track train pass threshold debouncing
  const isInTrainPassRef = useRef<boolean>(false);

  // Initialize Configuration & Connection Manager
  useEffect(() => {
    let mounted = true;

    async function init() {
      const loadedConfig = await loadConfig();
      if (!mounted) return;
      setConfig(loadedConfig);

      const manager = new HardwareConnectionManager(loadedConfig);
      connManagerRef.current = manager;

      // Telemetry listener
      manager.onTelemetry((reading: TelemetryReading) => {
        setLatestReading(reading);
        setLastPacketTime(reading.timestamp);
        setTotalEnergyJoules(reading.cumulativeEnergyJoules);

        // Append to live circular buffer (keep max 1000 items in memory)
        setHistoryBuffer((prev) => {
          const updated = [...prev, reading];
          return updated.length > 1000 ? updated.slice(updated.length - 1000) : updated;
        });

        // Detect train pass events based on vibration threshold
        if (reading.vibration >= loadedConfig.trainPassThresholdG) {
          if (!isInTrainPassRef.current) {
            isInTrainPassRef.current = true;
            setTrainPassCount((c) => c + 1);
          }
        } else if (reading.vibration < loadedConfig.trainPassThresholdG * 0.7) {
          isInTrainPassRef.current = false;
        }

        // Add to persistence write queue
        pendingBatchRef.current.push(reading);

        // Update active session stats if recording
        if (activeSessionRef.current) {
          const sess = activeSessionRef.current;
          sess.readingCount++;
          sess.durationMs = reading.timestamp - sess.startTime;
          sess.peakVibration = Math.max(sess.peakVibration, reading.vibration);
          sess.maxVoltage = Math.max(sess.maxVoltage, reading.voltage);
          sess.maxCurrent = Math.max(sess.maxCurrent, reading.current);
          sess.peakPower = Math.max(sess.peakPower, reading.power);
          sess.totalEnergyJoules = reading.cumulativeEnergyJoules;
          sess.totalEnergyMWh = reading.cumulativeEnergyMWh;
        }
      });

      // State listener
      manager.onConnectionState((event: ConnectionEvent) => {
        setConnectionStatus(event.status);
        setConnectionMode(event.mode);
        if (event.deviceName) setDeviceName(event.deviceName);
        setErrorMessage(event.errorMessage);
        if (event.lastPacketTime) setLastPacketTime(event.lastPacketTime);
        setIsStale(!!event.isStale);
        setHasReceivedData(manager.getHasReceivedData());
      });

      // Log listener
      manager.onLog((text: string, type: 'info' | 'rx' | 'error' | 'warn') => {
        const timeStr = new Date().toLocaleTimeString();
        setRawLogs((prev) => {
          const next = [...prev, { text, type, time: timeStr }];
          return next.length > 250 ? next.slice(next.length - 250) : next;
        });
      });
    }

    init();

    return () => {
      mounted = false;
      if (connManagerRef.current) {
        connManagerRef.current.destroy();
      }
    };
  }, []);

  // Periodic flush of pending readings to IndexedDB
  useEffect(() => {
    const interval = setInterval(async () => {
      if (pendingBatchRef.current.length > 0) {
        const batch = [...pendingBatchRef.current];
        pendingBatchRef.current = [];
        try {
          await saveReadingsBatch(batch);
        } catch (err) {
          console.error('Failed to flush readings batch to IndexedDB:', err);
        }
      }

      // Auto-save active session snapshot to IndexedDB
      if (activeSessionRef.current) {
        try {
          await saveSession({ ...activeSessionRef.current });
        } catch (e) {
          // Ignore
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Handler to update config
  const handleUpdateConfig = async (newConfig: DeviceConfig) => {
    setConfig(newConfig);
    await saveConfig(newConfig);
    if (connManagerRef.current) {
      connManagerRef.current.updateConfig(newConfig);
    }
  };

  // Handler to toggle Demo Mode
  const handleToggleDemoMode = () => {
    if (!connManagerRef.current) return;

    if (isDemoMode) {
      // Turn off demo mode
      connManagerRef.current.stopDemoMode();
      setIsDemoMode(false);
      setConnectionStatus('disconnected');
      setDeviceName('');
      setErrorMessage(undefined);
      setHasReceivedData(false);
      setLatestReading(null);
    } else {
      // Turn on demo mode
      setIsDemoMode(true);
      connManagerRef.current.startDemoMode();
      setDeviceName('RailUrja Simulator (Train Dynamics)');
      setConnectionStatus('connected');
      setHasReceivedData(true);
    }
  };

  // Session Management
  const handleStartSession = (name?: string) => {
    const sessId = `SES-${Date.now().toString(36).toUpperCase()}`;
    const sessionName = name || `Session ${new Date().toLocaleTimeString()}`;
    const newSession: MonitoringSession = {
      id: sessId,
      name: sessionName,
      startTime: Date.now(),
      durationMs: 0,
      readingCount: 0,
      peakVibration: 0,
      avgVibration: 0,
      maxVoltage: 0,
      maxCurrent: 0,
      peakPower: 0,
      totalEnergyJoules: 0,
      totalEnergyMWh: 0,
      trainPassesDetected: 0,
      source: isDemoMode ? 'demo' : 'hardware',
    };
    setActiveSession(newSession);
    if (connManagerRef.current) {
      connManagerRef.current.setSessionId(sessId);
      connManagerRef.current.resetCumulativeEnergy(0);
    }
    setTotalEnergyJoules(0);
  };

  const handleStopSession = async () => {
    if (activeSession) {
      const finalSession = {
        ...activeSession,
        endTime: Date.now(),
        durationMs: Date.now() - activeSession.startTime,
        totalEnergyJoules,
        totalEnergyMWh: (totalEnergyJoules / 3600) * 1000,
        trainPassesDetected: trainPassCount,
      };
      await saveSession(finalSession);
      setActiveSession(null);
      if (connManagerRef.current) {
        connManagerRef.current.setSessionId(undefined);
      }
    }
  };

  // Reset accumulated energy
  const handleResetEnergy = () => {
    if (confirm('Reset total cumulative harvested energy to 0 Joules?')) {
      setTotalEnergyJoules(0);
      if (connManagerRef.current) {
        connManagerRef.current.resetCumulativeEnergy(0);
      }
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#070b14] text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Bar Header */}
      <Header
        connectionStatus={connectionStatus}
        connectionMode={connectionMode}
        deviceName={deviceName}
        isDemoMode={isDemoMode}
        isStale={isStale}
        lastPacketTime={lastPacketTime}
        activeSession={activeSession}
        onToggleDemoMode={handleToggleDemoMode}
        onStartSession={handleStartSession}
        onStopSession={handleStopSession}
        onNavigate={(tab) => setCurrentTab(tab as NavTab)}
      />

      {/* Main Control-Room Stage: Fixed Left Sidebar + Right Dynamic Dashboard */}
      <div className="flex-1 flex overflow-hidden w-full h-[calc(100vh-3.5rem)]">
        {/* Fixed Left Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          connectionStatus={connectionStatus}
          isDemoMode={isDemoMode}
          totalEnergyJoules={totalEnergyJoules}
        />

        {/* Right Stage: Active View */}
        <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-[#070b14]">
          {currentTab === 'dashboard' && (
            <DashboardView
              latestReading={latestReading}
              historyBuffer={historyBuffer}
              connectionStatus={connectionStatus}
              connectionMode={connectionMode}
              deviceName={deviceName}
              isDemoMode={isDemoMode}
              isStale={isStale}
              hasReceivedData={hasReceivedData}
              totalEnergyJoules={totalEnergyJoules}
              trainPassCount={trainPassCount}
              onNavigate={(tab) => setCurrentTab(tab)}
              onResetEnergy={handleResetEnergy}
            />
          )}

          {currentTab === 'live' && (
            <LiveMonitoringView
              historyBuffer={historyBuffer}
              latestReading={latestReading}
              connectionStatus={connectionStatus}
              connectionMode={connectionMode}
              isDemoMode={isDemoMode}
              isStale={isStale}
              hasReceivedData={hasReceivedData}
              config={config}
              totalEnergyJoules={totalEnergyJoules}
            />
          )}

          {currentTab === 'connect' && (
            <ConnectDeviceView
              connectionStatus={connectionStatus}
              connectionMode={connectionMode}
              deviceName={deviceName}
              errorMessage={errorMessage}
              lastPacketTime={lastPacketTime}
              config={config}
              rawLogs={rawLogs}
              onUpdateConfig={handleUpdateConfig}
              onConnectBluetooth={async () => {
                if (connManagerRef.current) {
                  await connManagerRef.current.connectBluetooth();
                }
              }}
              onConnectWifiPolling={async (host, ep) => {
                if (connManagerRef.current) {
                  await connManagerRef.current.connectWifiPolling(host, ep);
                }
              }}
              onConnectWifiWebSocket={async (wsUrl) => {
                if (connManagerRef.current) {
                  await connManagerRef.current.connectWifiWebSocket(wsUrl);
                }
              }}
              onConnectServerSSE={() => {
                if (connManagerRef.current) {
                  connManagerRef.current.connectServerSSE();
                }
              }}
              onDisconnect={() => {
                if (connManagerRef.current) {
                  connManagerRef.current.disconnectAll();
                }
              }}
              onClearLogs={() => setRawLogs([])}
            />
          )}

          {currentTab === 'history' && (
            <DataHistoryView
              activeSession={activeSession}
              onStartSession={handleStartSession}
              onStopSession={handleStopSession}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              totalEnergyJoules={totalEnergyJoules}
              trainPassCount={trainPassCount}
              historyBuffer={historyBuffer}
              activeSession={activeSession}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              config={config}
              onSaveConfig={handleUpdateConfig}
            />
          )}

          {currentTab === 'guide' && <HardwareGuideView />}
        </main>
      </div>
    </div>
  );
}
