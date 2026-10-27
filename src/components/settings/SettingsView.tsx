/**
 * SettingsView
 * Configurable parser configuration, field mappings, calibration multipliers,
 * unit scalers, and interactive payload tester.
 */
import React, { useState } from 'react';
import {
  Settings,
  Sliders,
  Check,
  RefreshCw,
  Terminal,
  Play,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { DeviceConfig } from '../../types/telemetry';
import { TelemetryParser } from '../../services/parser';
import { DEFAULT_CONFIG } from '../../services/db';

interface SettingsViewProps {
  config: DeviceConfig;
  onSaveConfig: (newConfig: DeviceConfig) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onSaveConfig,
}) => {
  const [currentConfig, setCurrentConfig] = useState<DeviceConfig>({ ...config });
  const [testPayload, setTestPayload] = useState<string>(
    JSON.stringify(
      {
        deviceId: 'RailUrja-01',
        timestamp: '2026-10-26T10:00:00Z',
        vibration: 1.25,
        voltage: 3.6,
        current: 0.025,
        frequency: 18.5,
      },
      null,
      2
    )
  );
  const [parseResult, setParseResult] = useState<any>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Run parser test
  const handleTestParse = () => {
    try {
      const parser = new TelemetryParser();
      const res = parser.parse(testPayload, currentConfig, 'hardware');
      setParseResult(res);
    } catch (e: any) {
      setParseResult({ error: e.message });
    }
  };

  const handleSave = () => {
    onSaveConfig(currentConfig);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleReset = () => {
    setCurrentConfig({ ...DEFAULT_CONFIG });
    onSaveConfig({ ...DEFAULT_CONFIG });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#070b14] p-3 gap-3">
      {/* Header Banner */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0b1324] border border-slate-800 rounded-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <Settings size={18} />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              Data Parser &amp; Hardware Calibration Settings
            </div>
            <div className="text-[11px] text-slate-400">
              Customize JSON keys, unit scalers, and sensor conversion multipliers
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <span className="text-emerald-400 text-xs flex items-center gap-1 font-mono">
              <CheckCircle2 size={14} /> Saved!
            </span>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded text-xs font-semibold transition-all shadow-sm"
          >
            <Save size={13} />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
        {/* Left 7 Cols: Field Mappings & Units */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Card: JSON Key Mapping */}
          <div className="bg-[#0b1324] border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="text-xs font-bold text-slate-200 tracking-wide flex items-center justify-between">
              <span>Configurable JSON Field Keys</span>
              <span className="text-[10px] font-mono text-slate-500">Case-sensitive</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              If your microcontroller sends custom key names (e.g. <span className="font-mono text-slate-300">vib</span> instead of <span className="font-mono text-slate-300">vibration</span>), configure them here:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Vibration Key:</label>
                <input
                  type="text"
                  value={currentConfig.fieldMapping.vibrationKey}
                  onChange={(e) =>
                    setCurrentConfig({
                      ...currentConfig,
                      fieldMapping: { ...currentConfig.fieldMapping, vibrationKey: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Voltage Key:</label>
                <input
                  type="text"
                  value={currentConfig.fieldMapping.voltageKey}
                  onChange={(e) =>
                    setCurrentConfig({
                      ...currentConfig,
                      fieldMapping: { ...currentConfig.fieldMapping, voltageKey: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-amber-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Current Key:</label>
                <input
                  type="text"
                  value={currentConfig.fieldMapping.currentKey}
                  onChange={(e) =>
                    setCurrentConfig({
                      ...currentConfig,
                      fieldMapping: { ...currentConfig.fieldMapping, currentKey: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-emerald-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Frequency Key:</label>
                <input
                  type="text"
                  value={currentConfig.fieldMapping.frequencyKey}
                  onChange={(e) =>
                    setCurrentConfig({
                      ...currentConfig,
                      fieldMapping: { ...currentConfig.fieldMapping, frequencyKey: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-blue-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Device ID Key:</label>
                <input
                  type="text"
                  value={currentConfig.fieldMapping.deviceIdKey}
                  onChange={(e) =>
                    setCurrentConfig({
                      ...currentConfig,
                      fieldMapping: { ...currentConfig.fieldMapping, deviceIdKey: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Timestamp Key:</label>
                <input
                  type="text"
                  value={currentConfig.fieldMapping.timestampKey}
                  onChange={(e) =>
                    setCurrentConfig({
                      ...currentConfig,
                      fieldMapping: { ...currentConfig.fieldMapping, timestampKey: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Card: Unit Scales & Thresholds */}
          <div className="bg-[#0b1324] border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="text-xs font-bold text-slate-200 tracking-wide">
              Incoming Units &amp; Hardware Calibration Multipliers
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Incoming Current Unit:</label>
                <select
                  value={currentConfig.units.currentUnit}
                  onChange={(e) =>
                    setCurrentConfig({
                      ...currentConfig,
                      units: { ...currentConfig.units, currentUnit: e.target.value as any },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1.5 font-mono text-xs focus:outline-none"
                >
                  <option value="A">Amperes (A)</option>
                  <option value="mA">Milliamperes (mA)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Incoming Voltage Unit:</label>
                <select
                  value={currentConfig.units.voltageUnit}
                  onChange={(e) =>
                    setCurrentConfig({
                      ...currentConfig,
                      units: { ...currentConfig.units, voltageUnit: e.target.value as any },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1.5 font-mono text-xs focus:outline-none"
                >
                  <option value="V">Volts (V)</option>
                  <option value="mV">Millivolts (mV)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Incoming Vibration Unit:</label>
                <select
                  value={currentConfig.units.vibrationUnit}
                  onChange={(e) =>
                    setCurrentConfig({
                      ...currentConfig,
                      units: { ...currentConfig.units, vibrationUnit: e.target.value as any },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1.5 font-mono text-xs focus:outline-none"
                >
                  <option value="g">g (standard gravity)</option>
                  <option value="m/s2">m/s² (SI acceleration)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">
                  Train Passage Trigger Threshold (g):
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={currentConfig.trainPassThresholdG}
                  onChange={(e) =>
                    setCurrentConfig({ ...currentConfig, trainPassThresholdG: Number(e.target.value) })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-cyan-300 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">
                  Stale Data Timeout (ms):
                </label>
                <input
                  type="number"
                  step="500"
                  value={currentConfig.staleDataTimeoutMs}
                  onChange={(e) =>
                    setCurrentConfig({ ...currentConfig, staleDataTimeoutMs: Number(e.target.value) })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-200 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded text-xs font-mono transition-colors"
              >
                Reset All Settings to Factory Default
              </button>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Interactive Payload Tester */}
        <div className="lg:col-span-5 flex flex-col bg-[#0b1324] border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Terminal size={14} className="text-cyan-400" />
              Interactive Parser Sandbox
            </span>
            <button
              onClick={handleTestParse}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition-colors"
            >
              <Play size={11} className="fill-current" />
              <span>Test Parse</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            Paste an example packet from your ESP32 serial monitor to verify parsing:
          </p>

          <textarea
            value={testPayload}
            onChange={(e) => setTestPayload(e.target.value)}
            rows={7}
            className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-400 resize-none"
          />

          {/* Test Parse Results */}
          <div className="flex-1 min-h-[160px] bg-slate-950 border border-slate-800 rounded p-2.5 font-mono text-[11px] overflow-y-auto space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-semibold border-b border-slate-800 pb-1">
              Parsed Output:
            </div>
            {parseResult ? (
              parseResult.error ? (
                <div className="text-rose-400">{parseResult.error}</div>
              ) : (
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Device ID:</span>
                    <span className="text-white font-bold">{parseResult.deviceId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vibration:</span>
                    <span className="text-cyan-300 font-bold">{parseResult.vibration} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Frequency:</span>
                    <span className="text-blue-300 font-bold">{parseResult.frequency ?? 'N/A'} Hz</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Voltage:</span>
                    <span className="text-amber-300 font-bold">{parseResult.voltage} V</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current:</span>
                    <span className="text-emerald-300 font-bold">{(parseResult.current * 1000).toFixed(2)} mA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Power:</span>
                    <span className="text-purple-300 font-bold">{(parseResult.power * 1000).toFixed(2)} mW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Energy Increment:</span>
                    <span className="text-slate-200">{(parseResult.energyIncrement * 1000).toFixed(4)} mJ</span>
                  </div>
                </div>
              )
            ) : (
              <div className="text-slate-600 italic py-2">
                Click &ldquo;Test Parse&rdquo; above to inspect parsed values.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
