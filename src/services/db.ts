/**
 * IndexedDB persistence layer for RailUrja
 * Stores sessions, historical readings, and user configuration
 */
import { TelemetryReading, MonitoringSession, DeviceConfig } from '../types/telemetry';

const DB_NAME = 'RailUrjaHarvestingDB';
const DB_VERSION = 1;

export const DEFAULT_CONFIG: DeviceConfig = {
  bleServiceUuid: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service / ESP32 BLE default
  bleCharUuid: '6e400003-b5a3-f393-e0a9-e50e24dcca9e', // TX characteristic (Notify)
  bleDeviceNameFilter: 'RailUrja',
  wifiHost: '192.168.4.1',
  wifiEndpoint: '/data',
  wifiPollIntervalMs: 250,
  wifiWsUrl: 'ws://192.168.4.1:81/ws',
  fieldMapping: {
    deviceIdKey: 'deviceId',
    vibrationKey: 'vibration',
    voltageKey: 'voltage',
    currentKey: 'current',
    frequencyKey: 'frequency',
    timestampKey: 'timestamp',
  },
  units: {
    currentUnit: 'A',
    voltageUnit: 'V',
    vibrationUnit: 'g',
  },
  vibrationScaleMultiplier: 1.0,
  voltageScaleMultiplier: 1.0,
  currentScaleMultiplier: 1.0,
  trainPassThresholdG: 0.65,
  staleDataTimeoutMs: 3500,
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('readings')) {
        const readingsStore = db.createObjectStore('readings', { keyPath: 'id', autoIncrement: true });
        readingsStore.createIndex('timestamp', 'timestamp', { unique: false });
        readingsStore.createIndex('sessionId', 'sessionId', { unique: false });
        readingsStore.createIndex('source', 'source', { unique: false });
      }

      if (!db.objectStoreNames.contains('sessions')) {
        const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionsStore.createIndex('startTime', 'startTime', { unique: false });
        sessionsStore.createIndex('source', 'source', { unique: false });
      }

      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveReading(reading: TelemetryReading): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('readings', 'readwrite');
    const store = tx.objectStore('readings');
    const request = store.add(reading);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

export async function saveReadingsBatch(readings: TelemetryReading[]): Promise<void> {
  if (!readings.length) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('readings', 'readwrite');
    const store = tx.objectStore('readings');
    readings.forEach(r => store.add(r));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getReadings(limit = 1000, sessionId?: string, sourceFilter?: 'hardware' | 'demo'): Promise<TelemetryReading[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('readings', 'readonly');
    const store = tx.objectStore('readings');
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev'); // Most recent first
    const results: TelemetryReading[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor && results.length < limit) {
        const item = cursor.value as TelemetryReading;
        let match = true;
        if (sessionId && item.sessionId !== sessionId) match = false;
        if (sourceFilter && item.source !== sourceFilter) match = false;
        if (match) results.push(item);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function saveSession(session: MonitoringSession): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readwrite');
    const store = tx.objectStore('sessions');
    const request = store.put(session);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllSessions(): Promise<MonitoringSession[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readonly');
    const store = tx.objectStore('sessions');
    const index = store.index('startTime');
    const request = index.openCursor(null, 'prev');
    const results: MonitoringSession[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['sessions', 'readings'], 'readwrite');
    const sessionsStore = tx.objectStore('sessions');
    sessionsStore.delete(sessionId);

    const readingsStore = tx.objectStore('readings');
    const index = readingsStore.index('sessionId');
    const request = index.openCursor(IDBKeyRange.only(sessionId));

    request.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllReadings(sourceFilter?: 'hardware' | 'demo'): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('readings', 'readwrite');
    const store = tx.objectStore('readings');
    if (!sourceFilter) {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } else {
      const index = store.index('source');
      const req = index.openCursor(IDBKeyRange.only(sourceFilter));
      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    }
  });
}

export async function loadConfig(): Promise<DeviceConfig> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('config', 'readonly');
      const store = tx.objectStore('config');
      const req = store.get('deviceConfig');
      req.onsuccess = () => {
        if (req.result && req.result.value) {
          resolve({ ...DEFAULT_CONFIG, ...req.result.value });
        } else {
          resolve(DEFAULT_CONFIG);
        }
      };
      req.onerror = () => resolve(DEFAULT_CONFIG);
    });
  } catch (err) {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: DeviceConfig): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('config', 'readwrite');
    const store = tx.objectStore('config');
    const req = store.put({ key: 'deviceConfig', value: config });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Generates and triggers download of CSV from readings
 */
export function exportReadingsToCSV(readings: TelemetryReading[], filename = 'RailUrja_Telemetry_Data.csv') {
  if (!readings || readings.length === 0) {
    throw new Error('No data available to export');
  }

  const headers = [
    'Timestamp_ISO',
    'Timestamp_Unix_ms',
    'Device_ID',
    'Source',
    'Vibration_g',
    'Frequency_Hz',
    'Voltage_V',
    'Current_A',
    'Current_mA',
    'Harvested_Power_W',
    'Harvested_Power_mW',
    'Energy_Increment_Joules',
    'Cumulative_Energy_Joules',
    'Cumulative_Energy_mWh',
    'Session_ID'
  ];

  const rows = readings.map(r => {
    const iso = new Date(r.timestamp).toISOString();
    return [
      `"${iso}"`,
      r.timestamp,
      `"${r.deviceId || 'RailUrja-01'}"`,
      `"${r.source}"`,
      r.vibration.toFixed(4),
      (r.frequency ?? 0).toFixed(2),
      r.voltage.toFixed(4),
      r.current.toFixed(6),
      (r.current * 1000).toFixed(3),
      r.power.toFixed(6),
      (r.power * 1000).toFixed(3),
      r.energyIncrement.toFixed(6),
      r.cumulativeEnergyJoules.toFixed(6),
      r.cumulativeEnergyMWh.toFixed(4),
      `"${r.sessionId || ''}"`
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
