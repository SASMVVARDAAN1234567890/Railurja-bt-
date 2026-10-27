/**
 * Parser for incoming Bluetooth and Wi-Fi messages
 * Supports configurable field names, unit conversions, and malformed packet recovery
 */
import { TelemetryReading, DeviceConfig } from '../types/telemetry';

export class TelemetryParser {
  private lastTimestamp: number = 0;
  private cumulativeEnergyJoules: number = 0;

  constructor() {}

  public resetAccumulator(initialJoules: number = 0) {
    this.cumulativeEnergyJoules = initialJoules;
    this.lastTimestamp = 0;
  }

  public getCumulativeEnergyJoules(): number {
    return this.cumulativeEnergyJoules;
  }

  public parse(
    rawInput: string | object,
    config: DeviceConfig,
    source: 'hardware' | 'demo' = 'hardware',
    currentSessionId?: string
  ): TelemetryReading | null {
    let payload: any = null;

    if (typeof rawInput === 'object' && rawInput !== null) {
      payload = rawInput;
    } else if (typeof rawInput === 'string') {
      const trimmed = rawInput.trim();
      if (!trimmed) return null;

      // Try JSON parsing
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          payload = JSON.parse(trimmed);
        } catch (e) {
          // Fall through to key-value or delimiter parsing
        }
      }

      // If not JSON, try key-value delimiter (e.g., "vib:1.2,volt:3.4,curr:0.02" or CSV)
      if (!payload) {
        payload = this.parseDelimiterString(trimmed);
      }
    }

    if (!payload) return null;

    // Extract fields based on configured field mapping
    const mapping = config.fieldMapping;

    const deviceId = String(
      payload[mapping.deviceIdKey] ||
      payload['deviceId'] ||
      payload['devId'] ||
      payload['id'] ||
      'RailUrja-01'
    );

    // Extract Vibration (in g or m/s²)
    let rawVib = this.extractNumeric(payload, [
      mapping.vibrationKey,
      'vibration',
      'vib',
      'v',
      'accel',
      'accel_g',
      'vibe'
    ]);
    if (isNaN(rawVib)) rawVib = 0;

    // Apply scale multiplier & unit conversion
    let vibrationG = rawVib * (config.vibrationScaleMultiplier || 1.0);
    if (config.units.vibrationUnit === 'm/s2') {
      // 1g ≈ 9.80665 m/s²
      vibrationG = vibrationG / 9.80665;
    }

    // Extract Voltage
    let rawVolt = this.extractNumeric(payload, [
      mapping.voltageKey,
      'voltage',
      'volt',
      'v_out',
      'volts',
      'v'
    ]);
    if (isNaN(rawVolt)) rawVolt = 0;

    let voltageV = rawVolt * (config.voltageScaleMultiplier || 1.0);
    if (config.units.voltageUnit === 'mV') {
      voltageV = voltageV / 1000.0;
    }

    // Extract Current
    let rawCurr = this.extractNumeric(payload, [
      mapping.currentKey,
      'current',
      'curr',
      'i',
      'amps',
      'i_ma',
      'cur'
    ]);
    if (isNaN(rawCurr)) rawCurr = 0;

    let currentA = rawCurr * (config.currentScaleMultiplier || 1.0);
    if (config.units.currentUnit === 'mA') {
      currentA = currentA / 1000.0;
    }

    // Extract Frequency (optional)
    let rawFreq = this.extractNumeric(payload, [
      mapping.frequencyKey,
      'frequency',
      'freq',
      'hz',
      'f'
    ]);
    const frequencyHz = !isNaN(rawFreq) && rawFreq >= 0 ? rawFreq : undefined;

    // Extract or assign timestamp
    let ts = Date.now();
    const rawTs = payload[mapping.timestampKey] || payload['timestamp'] || payload['time'];
    if (rawTs) {
      if (typeof rawTs === 'number') {
        ts = rawTs < 1e11 ? rawTs * 1000 : rawTs; // check if seconds or ms
      } else if (typeof rawTs === 'string') {
        const parsedDate = new Date(rawTs).getTime();
        if (!isNaN(parsedDate)) ts = parsedDate;
      }
    }

    // Calculate electrical power: P = V * I (Watts)
    // Absolute power generated (ensuring non-negative)
    const powerW = Math.max(0, voltageV * currentA);

    // Calculate energy increment: E = P * dt (Joules, 1 W*s = 1 J)
    let dtSeconds = 0.25; // default 250ms interval if first sample
    if (this.lastTimestamp > 0 && ts > this.lastTimestamp) {
      dtSeconds = Math.min(5.0, (ts - this.lastTimestamp) / 1000.0); // cap max dt to 5s to prevent huge jumps
    }
    this.lastTimestamp = ts;

    const energyIncrementJoules = powerW * dtSeconds;
    this.cumulativeEnergyJoules += energyIncrementJoules;
    const cumulativeEnergyMWh = (this.cumulativeEnergyJoules / 3600) * 1000;

    return {
      deviceId,
      timestamp: ts,
      vibration: Math.max(0, Number(vibrationG.toFixed(4))),
      voltage: Math.max(0, Number(voltageV.toFixed(4))),
      current: Math.max(0, Number(currentA.toFixed(6))),
      frequency: frequencyHz !== undefined ? Number(frequencyHz.toFixed(2)) : undefined,
      power: Number(powerW.toFixed(6)),
      energyIncrement: Number(energyIncrementJoules.toFixed(6)),
      cumulativeEnergyJoules: Number(this.cumulativeEnergyJoules.toFixed(6)),
      cumulativeEnergyMWh: Number(cumulativeEnergyMWh.toFixed(4)),
      source,
      sessionId: currentSessionId,
      rawPayload: typeof rawInput === 'string' ? rawInput.slice(0, 200) : JSON.stringify(rawInput).slice(0, 200)
    };
  }

  private extractNumeric(obj: any, keys: string[]): number {
    for (const key of keys) {
      if (key in obj && obj[key] !== null && obj[key] !== undefined) {
        const val = Number(obj[key]);
        if (!isNaN(val)) return val;
      }
    }
    return NaN;
  }

  private parseDelimiterString(str: string): Record<string, any> | null {
    const result: Record<string, any> = {};
    // Matches key=value or key:value
    const pairs = str.split(/[,;\n\r&]+/);
    let matchedAny = false;

    for (const pair of pairs) {
      const parts = pair.split(/[:=]/);
      if (parts.length === 2) {
        const k = parts[0].trim();
        const v = parts[1].trim();
        if (k && v) {
          result[k] = isNaN(Number(v)) ? v : Number(v);
          matchedAny = true;
        }
      }
    }

    if (matchedAny) return result;

    // Try purely comma separated numbers: vib,volt,curr,freq
    const tokens = str.split(',').map(t => Number(t.trim()));
    if (tokens.length >= 3 && !tokens.some(isNaN)) {
      return {
        vibration: tokens[0],
        voltage: tokens[1],
        current: tokens[2],
        frequency: tokens[3] || 0
      };
    }

    return null;
  }
}
