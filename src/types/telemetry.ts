/**
 * RailUrja - Railway Vibration Energy Harvesting System
 * Type definitions for telemetry, connections, sessions, and configuration
 */

export interface TelemetryReading {
  id?: number;
  deviceId: string;
  timestamp: number; // Unix ms
  vibration: number; // in g (acceleration) or m/s²
  voltage: number; // Volts
  current: number; // Amperes
  frequency?: number; // Hz
  power: number; // Watts (voltage * current)
  energyIncrement: number; // Joules (P * dt)
  cumulativeEnergyJoules: number; // Total accumulated Joules in current run
  cumulativeEnergyMWh: number; // Total accumulated mWh
  source: 'hardware' | 'demo';
  sessionId?: string;
  rawPayload?: string;
}

export interface MonitoringSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs: number;
  readingCount: number;
  peakVibration: number; // g
  avgVibration: number;
  maxVoltage: number; // V
  maxCurrent: number; // A
  peakPower: number; // W
  totalEnergyJoules: number;
  totalEnergyMWh: number;
  trainPassesDetected: number;
  source: 'hardware' | 'demo';
  notes?: string;
}

export type ConnectionMode = 'bluetooth' | 'wifi-poll' | 'wifi-ws' | 'server-sse';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface DeviceConfig {
  // Bluetooth BLE
  bleServiceUuid: string;
  bleCharUuid: string;
  bleDeviceNameFilter: string;

  // Wi-Fi Polling
  wifiHost: string;
  wifiEndpoint: string;
  wifiPollIntervalMs: number;

  // Wi-Fi WebSocket
  wifiWsUrl: string;

  // Field mappings for custom microcontroller payloads
  fieldMapping: {
    deviceIdKey: string;
    vibrationKey: string;
    voltageKey: string;
    currentKey: string;
    frequencyKey: string;
    timestampKey: string;
  };

  // Calibration and unit scale factors
  units: {
    currentUnit: 'A' | 'mA';
    voltageUnit: 'V' | 'mV';
    vibrationUnit: 'g' | 'm/s2';
  };
  vibrationScaleMultiplier: number;
  voltageScaleMultiplier: number;
  currentScaleMultiplier: number;

  // Thresholds
  trainPassThresholdG: number; // Vibration threshold to count a train pass
  staleDataTimeoutMs: number;
}

export interface TrainPassEvent {
  id: string;
  timestamp: number;
  durationSeconds: number;
  peakVibration: number;
  peakPower: number;
  harvestedEnergyJoules: number;
}
