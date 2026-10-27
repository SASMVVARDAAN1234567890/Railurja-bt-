/**
 * ConnectDeviceView
 * Dedicated hardware connection management interface for Web Bluetooth (BLE),
 * Local Wi-Fi HTTP Polling, WebSocket streams, and Server Webhook Relay.
 */
import React, { useState } from 'react';
import {
  Bluetooth,
  Wifi,
  Server,
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Terminal,
  Settings,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Code
} from 'lucide-react';
import { ConnectionStatus, ConnectionMode, DeviceConfig } from '../../types/telemetry';

interface ConnectDeviceViewProps {
  connectionStatus: ConnectionStatus;
  connectionMode: ConnectionMode;
  deviceName: string;
  errorMessage?: string;
  lastPacketTime: number;
  config: DeviceConfig;
  rawLogs: Array<{ text: string; type: 'info' | 'rx' | 'error' | 'warn'; time: string }>;
  onUpdateConfig: (config: DeviceConfig) => void;
  onConnectBluetooth: () => Promise<void>;
  onConnectWifiPolling: (host?: string, endpoint?: string) => Promise<void>;
  onConnectWifiWebSocket: (wsUrl?: string) => Promise<void>;
  onConnectServerSSE: () => void;
  onDisconnect: () => void;
  onClearLogs: () => void;
}

export const ConnectDeviceView: React.FC<ConnectDeviceViewProps> = ({
  connectionStatus,
  connectionMode,
  deviceName,
  errorMessage,
  lastPacketTime,
  config,
  rawLogs,
  onUpdateConfig,
  onConnectBluetooth,
  onConnectWifiPolling,
  onConnectWifiWebSocket,
  onConnectServerSSE,
  onDisconnect,
  onClearLogs,
}) => {
  const [activeTab, setActiveTab] = useState<'bluetooth' | 'wifi' | 'server'>('bluetooth');
  const [isBusy, setIsBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Form states
  const [bleServiceUuid, setBleServiceUuid] = useState(config.bleServiceUuid);
  const [bleCharUuid, setBleCharUuid] = useState(config.bleCharUuid);
  const [bleNameFilter, setBleNameFilter] = useState(config.bleDeviceNameFilter);

  const [wifiHost, setWifiHost] = useState(config.wifiHost);
  const [wifiEndpoint, setWifiEndpoint] = useState(config.wifiEndpoint);
  const [wifiPollInterval, setWifiPollInterval] = useState(config.wifiPollIntervalMs);
  const [wifiWsUrl, setWifiWsUrl] = useState(config.wifiWsUrl);

  const isConnected = connectionStatus === 'connected';

  // Check Web Bluetooth support in current browser
  const isWebBluetoothSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

  const handleSaveConfig = () => {
    onUpdateConfig({
      ...config,
      bleServiceUuid,
      bleCharUuid,
      bleDeviceNameFilter: bleNameFilter,
      wifiHost,
      wifiEndpoint,
      wifiPollIntervalMs: Number(wifiPollInterval),
      wifiWsUrl,
    });
  };

  const handleBleConnect = async () => {
    setIsBusy(true);
    setLocalError(null);
    handleSaveConfig();
    try {
      await onConnectBluetooth();
    } catch (e: any) {
      setLocalError(e.message || 'Bluetooth connection failed');
    } finally {
      setIsBusy(false);
    }
  };

  const handleWifiPollConnect = async () => {
    setIsBusy(true);
    setLocalError(null);
    handleSaveConfig();
    try {
      await onConnectWifiPolling(wifiHost, wifiEndpoint);
    } catch (e: any) {
      setLocalError(e.message || 'Wi-Fi connection failed');
    } finally {
      setIsBusy(false);
    }
  };

  const handleWifiWsConnect = async () => {
    setIsBusy(true);
    setLocalError(null);
    handleSaveConfig();
    try {
      await onConnectWifiWebSocket(wifiWsUrl);
    } catch (e: any) {
      setLocalError(e.message || 'WebSocket connection failed');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#070b14] p-3 gap-3">
      {/* Top Status & Controls Ribbon */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0b1324] border border-slate-800 rounded-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio size={16} className={isConnected ? 'text-cyan-400 animate-pulse' : 'text-slate-500'} />
            <span className="font-bold text-white text-sm">Hardware Link Status:</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span
              className={`px-2.5 py-1 rounded font-semibold uppercase ${
                isConnected
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : connectionStatus === 'connecting'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {connectionStatus}
            </span>
            {deviceName && (
              <span className="text-slate-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                {deviceName}
              </span>
            )}
            {lastPacketTime > 0 && (
              <span className="text-slate-400">
                Last Rx: {new Date(lastPacketTime).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {isConnected ? (
          <button
            onClick={onDisconnect}
            className="px-4 py-1.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs font-semibold rounded-md transition-colors"
          >
            Disconnect Device
          </button>
        ) : (
          <span className="text-xs text-slate-400 font-mono">Ready to pair / link</span>
        )}
      </div>

      {/* Error Callout if any */}
      {(errorMessage || localError) && (
        <div className="bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs p-3 rounded-lg flex items-start gap-2.5 shrink-0">
          <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Connection Error:</div>
            <div className="font-mono text-[11px]">{errorMessage || localError}</div>
          </div>
        </div>
      )}

      {/* Main Split: Connection Configuration Tabs (Left 7) and Live Serial Inspector (Right 5) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left 7 Columns: Connection Mode Tabs */}
        <div className="lg:col-span-7 flex flex-col bg-[#0b1324] border border-slate-800 rounded-lg overflow-hidden">
          {/* Tabs bar */}
          <div className="flex items-center border-b border-slate-800 bg-[#0d162b] px-3 pt-2 gap-2 text-xs">
            <button
              onClick={() => setActiveTab('bluetooth')}
              className={`flex items-center gap-2 px-3 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'bluetooth'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-900/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bluetooth size={14} />
              <span>Web Bluetooth (BLE)</span>
            </button>
            <button
              onClick={() => setActiveTab('wifi')}
              className={`flex items-center gap-2 px-3 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'wifi'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-900/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wifi size={14} />
              <span>Wi-Fi Direct (HTTP/WS)</span>
            </button>
            <button
              onClick={() => setActiveTab('server')}
              className={`flex items-center gap-2 px-3 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'server'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-900/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server size={14} />
              <span>Server Webhook Relay</span>
            </button>
          </div>

          {/* Tab 1: Web Bluetooth BLE */}
          {activeTab === 'bluetooth' && (
            <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
              {!isWebBluetoothSupported && (
                <div className="bg-amber-950/40 border border-amber-800/60 p-3 rounded text-amber-200 text-xs flex items-start gap-2">
                  <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Web Bluetooth API is not available in this browser.</span>
                    <p className="text-[11px] text-amber-300/80 mt-1">
                      Web Bluetooth is natively supported in Google Chrome, Microsoft Edge, and Opera on Windows, macOS, Linux, and Android.
                      Alternatively, connect your ESP32 over Wi-Fi via the Wi-Fi or Server Webhook tab!
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="font-semibold text-slate-200 text-sm">Bluetooth Low Energy (GATT) Settings</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Connect directly from your browser to an ESP32 or Arduino BLE peripheral transmitting vibration and electrical harvesting telemetry.
                </p>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Primary Service UUID:
                    </label>
                    <input
                      type="text"
                      value={bleServiceUuid}
                      onChange={(e) => setBleServiceUuid(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-cyan-300 text-xs focus:outline-none focus:border-cyan-400"
                      placeholder="e.g. 6e400001-b5a3-f393-e0a9-e50e24dcca9e (Nordic UART)"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Telemetry Characteristic UUID (TX / Notify):
                    </label>
                    <input
                      type="text"
                      value={bleCharUuid}
                      onChange={(e) => setBleCharUuid(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-cyan-300 text-xs focus:outline-none focus:border-cyan-400"
                      placeholder="e.g. 6e400003-b5a3-f393-e0a9-e50e24dcca9e"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Device Name Prefix Filter (Optional):
                    </label>
                    <input
                      type="text"
                      value={bleNameFilter}
                      onChange={(e) => setBleNameFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
                      placeholder="e.g. RailUrja"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={handleBleConnect}
                    disabled={isBusy}
                    className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded shadow-md text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Bluetooth size={14} />
                    <span>{isBusy ? 'Scanning & Pairing...' : 'Scan & Pair RailUrja BLE'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setBleServiceUuid('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
                      setBleCharUuid('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
                      setBleNameFilter('RailUrja');
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
                  >
                    Reset Defaults
                  </button>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded text-[11px] text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">Browser Pairing Instructions:</div>
                  <ol className="list-decimal pl-4 space-y-0.5">
                    <li>Power on your ESP32 with the RailUrja BLE firmware (see Hardware Guide).</li>
                    <li>Click &ldquo;Scan &amp; Pair RailUrja BLE&rdquo; above.</li>
                    <li>Select your device (e.g. &ldquo;RailUrja-01&rdquo;) from the browser pop-up.</li>
                    <li>Live vibration and electrical telemetry begins streaming immediately.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Wi-Fi Direct (HTTP Polling or WebSocket) */}
          {activeTab === 'wifi' && (
            <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-3">
                <div className="font-semibold text-slate-200 text-sm">Wi-Fi Direct Hardware Streaming</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Stream data directly from an ESP32 or Wi-Fi Arduino serving data over local HTTP API or WebSocket.
                </p>

                {/* HTTP Polling */}
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg space-y-2.5">
                  <div className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                    <Wifi size={13} />
                    <span>Method A: HTTP API Polling</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-0.5">ESP32 IP Address / Host:</label>
                      <input
                        type="text"
                        value={wifiHost}
                        onChange={(e) => setWifiHost(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-white"
                        placeholder="192.168.4.1 or 192.168.1.100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-0.5">API Endpoint:</label>
                      <input
                        type="text"
                        value={wifiEndpoint}
                        onChange={(e) => setWifiEndpoint(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-white"
                        placeholder="/data"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Poll Interval (ms):</label>
                    <input
                      type="number"
                      value={wifiPollInterval}
                      onChange={(e) => setWifiPollInterval(Number(e.target.value))}
                      className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-white"
                      min={100}
                      max={5000}
                    />
                  </div>

                  <button
                    onClick={handleWifiPollConnect}
                    disabled={isBusy}
                    className="w-full py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold rounded text-xs transition-colors"
                  >
                    {isBusy ? 'Connecting...' : 'Connect via HTTP API Polling'}
                  </button>
                </div>

                {/* Direct WebSocket */}
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg space-y-2.5">
                  <div className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                    <Radio size={13} />
                    <span>Method B: Direct WebSocket Stream</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">WebSocket URL:</label>
                    <input
                      type="text"
                      value={wifiWsUrl}
                      onChange={(e) => setWifiWsUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-white"
                      placeholder="ws://192.168.4.1:81/ws"
                    />
                  </div>

                  <button
                    onClick={handleWifiWsConnect}
                    disabled={isBusy}
                    className="w-full py-1.5 bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded text-xs transition-colors"
                  >
                    {isBusy ? 'Connecting...' : 'Connect via WebSocket'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Server Webhook Relay */}
          {activeTab === 'server' && (
            <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-3">
                <div className="font-semibold text-slate-200 text-sm">Server-Side Telemetry Relay (Webhook)</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Your microcontroller (ESP32 / Arduino / Raspberry Pi) can push JSON data directly to RailUrja via standard HTTP POST over Wi-Fi, Ethernet, or Cellular!
                </p>

                <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg space-y-2">
                  <div className="text-[11px] font-mono text-cyan-300 font-semibold">POST Webhook URL:</div>
                  <div className="bg-slate-900 px-2.5 py-1.5 rounded font-mono text-xs text-white select-all border border-slate-800">
                    http://&lt;railurja-host&gt;:3000/api/telemetry
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Payload: JSON with <span className="font-mono text-slate-200">vibration, voltage, current, frequency</span>.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg space-y-2">
                  <div className="text-[11px] font-mono text-slate-300 font-semibold">Test with cURL from Terminal:</div>
                  <pre className="bg-slate-900 p-2 rounded text-[10px] font-mono text-emerald-400 overflow-x-auto select-all">
{`curl -X POST http://localhost:3000/api/telemetry \\
  -H "Content-Type: application/json" \\
  -d '{"deviceId":"RailUrja-01","vibration":1.24,"voltage":4.2,"current":0.035,"frequency":22.4}'`}
                  </pre>
                </div>

                <button
                  onClick={onConnectServerSSE}
                  className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Server size={14} />
                  <span>Listen to Server Webhook Relay (SSE)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 Columns: Raw Hardware Serial & Packet Inspector */}
        <div className="lg:col-span-5 flex flex-col bg-[#0b1324] border border-slate-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-[#0d162b] border-b border-slate-800 text-xs">
            <span className="font-mono font-bold text-slate-300 flex items-center gap-1.5">
              <Terminal size={14} className="text-cyan-400" />
              Serial Telemetry Console
            </span>
            <button
              onClick={onClearLogs}
              className="text-[10px] text-slate-400 hover:text-slate-200 font-mono transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="flex-1 bg-slate-950 p-2.5 font-mono text-[11px] overflow-y-auto space-y-1">
            {rawLogs.length === 0 ? (
              <div className="text-slate-600 italic py-4 text-center">
                Console ready. Connect device to inspect live incoming packets.
              </div>
            ) : (
              rawLogs.map((entry, idx) => (
                <div
                  key={idx}
                  className={`leading-tight flex items-start gap-1.5 break-all ${
                    entry.type === 'error'
                      ? 'text-rose-400'
                      : entry.type === 'warn'
                      ? 'text-amber-400'
                      : entry.type === 'rx'
                      ? 'text-cyan-300'
                      : 'text-slate-400'
                  }`}
                >
                  <span className="text-slate-600 text-[10px] shrink-0">[{entry.time}]</span>
                  <span>{entry.text}</span>
                </div>
              ))
            )}
          </div>

          <div className="px-3 py-1.5 bg-[#0a1020] border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
            <span>Encoding: UTF-8 / JSON</span>
            <span>Logs: {rawLogs.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
