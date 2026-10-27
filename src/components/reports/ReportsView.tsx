/**
 * ReportsView
 * School Science Exhibition and Engineering Project Report Generator.
 * Displays energy harvesting yields, piezo conversion efficiency, supercapacitor storage curves,
 * and train passage analytics with print/export options.
 */
import React from 'react';
import {
  FileSpreadsheet,
  Zap,
  Activity,
  Award,
  Clock,
  BatteryCharging,
  TrainTrack,
  Download,
  Printer,
  CheckCircle,
  Lightbulb
} from 'lucide-react';
import { TelemetryReading, MonitoringSession } from '../../types/telemetry';

// Generated schematic image
const ENERGY_FLOW_IMAGE = '/src/assets/images/railway_energy_flow_1793002781548.jpg';

interface ReportsViewProps {
  totalEnergyJoules: number;
  trainPassCount: number;
  historyBuffer: TelemetryReading[];
  activeSession: MonitoringSession | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  totalEnergyJoules,
  trainPassCount,
  historyBuffer,
  activeSession,
}) => {
  // Calculated metrics
  const totalMWh = (totalEnergyJoules / 3600) * 1000;

  // Peak metrics from buffer
  const peakVib = historyBuffer.reduce((max, r) => Math.max(max, r.vibration), 0);
  const peakPowerW = historyBuffer.reduce((max, r) => Math.max(max, r.power), 0);
  const maxVoltage = historyBuffer.reduce((max, r) => Math.max(max, r.voltage), 0);

  // Practical equivalencies for Science Exhibition
  // 1 standard low-power IoT sensor node takes ~15mW during sleep/active cycle
  const iotSensorOperatingMinutes = totalEnergyJoules > 0 ? (totalEnergyJoules / 0.015 / 60).toFixed(1) : '0';
  // 1 high-efficiency white LED indicator takes ~20mW
  const ledRuntimeSeconds = totalEnergyJoules > 0 ? (totalEnergyJoules / 0.02).toFixed(1) : '0';
  // Supercapacitor 10F charged from 0V to 3.3V takes E = 0.5 * C * V² = 0.5 * 10 * 10.89 ≈ 54.45 Joules
  const supercapChargePercent = Math.min(100, (totalEnergyJoules / 54.45) * 100).toFixed(1);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#070b14] p-3 gap-3">
      {/* Header Banner */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0b1324] border border-slate-800 rounded-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-600 to-blue-700 flex items-center justify-center text-white">
            <Award size={18} />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              RailUrja Engineering &amp; Science Exhibition Report
            </div>
            <div className="text-[11px] text-slate-400">
              Systematic quantitative evaluation of railway kinetic energy harvesting
            </div>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold transition-colors"
        >
          <Printer size={13} />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Grid: Key Project Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-[#0b1324] border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Cumulative Energy Yield</div>
          <div className="text-2xl font-mono font-bold text-cyan-300 mt-1 tabular-nums">
            {totalEnergyJoules < 1 ? `${(totalEnergyJoules * 1000).toFixed(1)} mJ` : `${totalEnergyJoules.toFixed(3)} J`}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            ≈ {totalMWh.toFixed(3)} mWh
          </div>
        </div>

        <div className="bg-[#0b1324] border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Peak Harvesting Power</div>
          <div className="text-2xl font-mono font-bold text-purple-300 mt-1 tabular-nums">
            {peakPowerW >= 1 ? `${peakPowerW.toFixed(3)} W` : `${(peakPowerW * 1000).toFixed(1)} mW`}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            Max Voltage: {maxVoltage.toFixed(2)} V
          </div>
        </div>

        <div className="bg-[#0b1324] border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Detected Train Passes</div>
          <div className="text-2xl font-mono font-bold text-amber-300 mt-1 tabular-nums">
            {trainPassCount} Passes
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            Peak Shock Accel: {peakVib.toFixed(2)} g
          </div>
        </div>

        <div className="bg-[#0b1324] border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Energy per Train Event</div>
          <div className="text-2xl font-mono font-bold text-emerald-300 mt-1 tabular-nums">
            {trainPassCount > 0 ? `${(totalEnergyJoules / trainPassCount).toFixed(2)} J` : '---'}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            Average Bogie Harvest
          </div>
        </div>
      </div>

      {/* Visual Energy Flow Architecture Card */}
      <div className="bg-[#0b1324] border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
            <TrainTrack size={16} className="text-cyan-400" />
            Kinetic-to-Electrical Energy Conversion Architecture
          </div>
          <span className="text-[10px] font-mono text-slate-400">Design Document: DWG-RW-EH-01</span>
        </div>

        <div className="relative w-full h-56 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
          <img
            src={ENERGY_FLOW_IMAGE}
            alt="Railway Vibration Energy Conversion Schematic"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
            <div className="font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
              <Activity size={12} />
              1. Mechanical Wave Generation
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              High-speed freight & passenger wheelsets impart cyclical elastic rail deflection into the steel web, inducing vertical shock oscillations between 10Hz and 60Hz.
            </p>
          </div>

          <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
            <div className="font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
              <Zap size={12} />
              2. Piezoelectric Direct Effect
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Piezoelectric PZT crystal stacks convert dynamic compressive mechanical strain directly into alternating voltage (V_AC), reaching peak outputs over 15V.
            </p>
          </div>

          <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
            <div className="font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
              <BatteryCharging size={12} />
              3. Rectification & Storage
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              An ultra-low forward drop Schottky bridge rectifies AC into DC, buffering into a supercapacitor bank to power wireless trackside IoT sensor nodes autonomously.
            </p>
          </div>
        </div>
      </div>

      {/* Practical Energy Benchmarks Card */}
      <div className="bg-[#0b1324] border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
          <Lightbulb size={16} className="text-amber-400" />
          Practical Real-World Energy Applications
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Trackside IoT Sensor Node</div>
              <div className="text-xl font-mono font-bold text-cyan-300 mt-1">{iotSensorOperatingMinutes} min</div>
              <p className="text-[11px] text-slate-400 mt-1">
                Continuous runtime for an ESP32 deep-sleep temperature &amp; crack monitoring sensor.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Emergency Rail Beacon LED</div>
              <div className="text-xl font-mono font-bold text-amber-300 mt-1">{ledRuntimeSeconds} sec</div>
              <p className="text-[11px] text-slate-400 mt-1">
                Illumination duration for a high-intensity 20mW track warning light without external battery.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">10F Supercapacitor Charge</div>
              <div className="text-xl font-mono font-bold text-emerald-300 mt-1">{supercapChargePercent}%</div>
              <p className="text-[11px] text-slate-400 mt-1">
                Fraction of 3.3V supercapacitor capacity filled from railway vibration energy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
