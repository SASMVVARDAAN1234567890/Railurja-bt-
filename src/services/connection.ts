/**
 * Hardware Connection Service
 * Orchestrates Web Bluetooth (BLE), Wi-Fi Polling, Wi-Fi WebSocket,
 * Server SSE relay, and Demo Mode train physics simulation.
 */
import { ConnectionMode, ConnectionStatus, DeviceConfig, TelemetryReading } from '../types/telemetry';
import { TelemetryParser } from './parser';

export interface ConnectionEvent {
  status: ConnectionStatus;
  mode: ConnectionMode;
  deviceName?: string;
  errorMessage?: string;
  lastPacketTime?: number;
  isStale?: boolean;
}

export type TelemetryCallback = (reading: TelemetryReading) => void;
export type ConnectionStateCallback = (event: ConnectionEvent) => void;
export type RawLogCallback = (log: string, type: 'info' | 'rx' | 'error' | 'warn') => void;

export class HardwareConnectionManager {
  private config: DeviceConfig;
  private parser: TelemetryParser;
  private currentMode: ConnectionMode = 'bluetooth';
  private currentStatus: ConnectionStatus = 'disconnected';
  private deviceName: string = '';
  private lastPacketTime: number = 0;
  private isStale: boolean = false;
  private hasReceivedFirstPacket: boolean = false;
  private currentSessionId?: string;

  // Bluetooth references
  private bleDevice: any = null;
  private bleCharacteristic: any = null;
  private autoReconnect: boolean = true;

  // Wi-Fi polling references
  private wifiPollTimer: any = null;
  private isPollingActive: boolean = false;

  // WebSocket references
  private wsClient: WebSocket | null = null;

  // SSE references
  private sseClient: EventSource | null = null;

  // Stale check timer
  private staleCheckTimer: any = null;

  // Demo mode timer & state
  private isDemoMode: boolean = false;
  private demoTimer: any = null;
  private demoPhase: number = 0; // 0: ambient, 1: approach, 2: passing, 3: trailing
  private demoTick: number = 0;

  // Listeners
  private telemetryListeners: Set<TelemetryCallback> = new Set();
  private connectionListeners: Set<ConnectionStateCallback> = new Set();
  private logListeners: Set<RawLogCallback> = new Set();

  constructor(config: DeviceConfig) {
    this.config = config;
    this.parser = new TelemetryParser();
    this.startStaleChecker();
  }

  public updateConfig(newConfig: DeviceConfig) {
    this.config = newConfig;
  }

  public setSessionId(sessionId?: string) {
    this.currentSessionId = sessionId;
  }

  public resetCumulativeEnergy(initialJoules: number = 0) {
    this.parser.resetAccumulator(initialJoules);
  }

  public onTelemetry(cb: TelemetryCallback) {
    this.telemetryListeners.add(cb);
    return () => this.telemetryListeners.delete(cb);
  }

  public onConnectionState(cb: ConnectionStateCallback) {
    this.connectionListeners.add(cb);
    return () => this.connectionListeners.delete(cb);
  }

  public onLog(cb: RawLogCallback) {
    this.logListeners.add(cb);
    return () => this.logListeners.delete(cb);
  }

  public getStatus(): ConnectionStatus {
    return this.currentStatus;
  }

  public getMode(): ConnectionMode {
    return this.currentMode;
  }

  public getDeviceName(): string {
    return this.deviceName;
  }

  public getLastPacketTime(): number {
    return this.lastPacketTime;
  }

  public getIsStale(): boolean {
    return this.isStale;
  }

  public getHasReceivedData(): boolean {
    return this.hasReceivedFirstPacket;
  }

  public isDemo(): boolean {
    return this.isDemoMode;
  }

  private notifyState(errorMsg?: string) {
    const event: ConnectionEvent = {
      status: this.currentStatus,
      mode: this.currentMode,
      deviceName: this.deviceName,
      errorMessage: errorMsg,
      lastPacketTime: this.lastPacketTime,
      isStale: this.isStale,
    };
    for (const listener of this.connectionListeners) {
      listener(event);
    }
  }

  private log(message: string, type: 'info' | 'rx' | 'error' | 'warn' = 'info') {
    for (const listener of this.logListeners) {
      listener(message, type);
    }
  }

  private handleIncomingReading(reading: TelemetryReading) {
    this.lastPacketTime = Date.now();
    this.isStale = false;
    this.hasReceivedFirstPacket = true;
    for (const listener of this.telemetryListeners) {
      listener(reading);
    }
  }

  private startStaleChecker() {
    if (this.staleCheckTimer) clearInterval(this.staleCheckTimer);
    this.staleCheckTimer = setInterval(() => {
      if (this.currentStatus === 'connected' && this.hasReceivedFirstPacket) {
        const elapsed = Date.now() - this.lastPacketTime;
        const nowStale = elapsed > this.config.staleDataTimeoutMs;
        if (nowStale !== this.isStale) {
          this.isStale = nowStale;
          this.notifyState();
          if (this.isStale) {
            this.log(`Warning: Stale data. No packet received for ${(elapsed / 1000).toFixed(1)}s`, 'warn');
          }
        }
      }
    }, 1000);
  }

  // ==================== WEB BLUETOOTH (BLE) ====================
  public async connectBluetooth(): Promise<void> {
    if (this.isDemoMode) {
      this.stopDemoMode();
    }
    this.disconnectAll();

    this.currentMode = 'bluetooth';
    this.currentStatus = 'connecting';
    this.hasReceivedFirstPacket = false;
    this.notifyState();
    this.log('Initiating Web Bluetooth scan...', 'info');

    const nav = navigator as any;
    if (!nav.bluetooth) {
      const err = 'Web Bluetooth API is not supported in this browser. Please use Chrome/Edge on Desktop/Android, or connect via Wi-Fi.';
      this.currentStatus = 'error';
      this.notifyState(err);
      this.log(err, 'error');
      throw new Error(err);
    }

    try {
      const serviceUuid = this.config.bleServiceUuid.toLowerCase().trim();
      const charUuid = this.config.bleCharUuid.toLowerCase().trim();

      this.log(`Requesting Bluetooth Device with Service: ${serviceUuid}`, 'info');

      // Request device filter
      const options: any = {
        filters: [{ services: [serviceUuid] }],
        optionalServices: [serviceUuid],
      };

      // If user provided a name filter
      if (this.config.bleDeviceNameFilter) {
        options.filters.push({ namePrefix: this.config.bleDeviceNameFilter });
      }

      // Request device with fallback to acceptAllDevices if specific service filter misses
      let device: any;
      try {
        device = await nav.bluetooth.requestDevice(options);
      } catch (err: any) {
        // Fallback: allow selecting any device and querying the service
        this.log('Falling back to general device picker...', 'warn');
        device = await nav.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [serviceUuid],
        });
      }

      if (!device) {
        throw new Error('No Bluetooth device selected.');
      }

      this.bleDevice = device;
      this.deviceName = device.name || 'RailUrja-BLE';
      this.log(`Connecting to GATT Server on ${this.deviceName}...`, 'info');

      device.addEventListener('gattserverdisconnected', () => {
        this.log(`Bluetooth device disconnected: ${this.deviceName}`, 'warn');
        this.currentStatus = 'disconnected';
        this.notifyState();
        if (this.autoReconnect) {
          this.reconnectBluetooth();
        }
      });

      const server = await device.gatt.connect();
      this.log('Connected to GATT Server. Discovering Primary Service...', 'info');

      const service = await server.getPrimaryService(serviceUuid);
      this.log('Service found. Querying Characteristic...', 'info');

      const characteristic = await service.getCharacteristic(charUuid);
      this.bleCharacteristic = characteristic;

      await characteristic.startNotifications();
      this.log('GATT Notifications active. Listening for telemetry stream...', 'info');

      characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        const decoder = new TextDecoder('utf-8');
        const rawString = decoder.decode(value);
        this.log(`[BLE RX] ${rawString}`, 'rx');

        const reading = this.parser.parse(rawString, this.config, 'hardware', this.currentSessionId);
        if (reading) {
          this.handleIncomingReading(reading);
        }
      });

      this.currentStatus = 'connected';
      this.notifyState();
      this.log(`Successfully connected to ${this.deviceName} via BLE. Waiting for first packet...`, 'info');
    } catch (err: any) {
      this.currentStatus = 'error';
      const msg = err.message || 'Bluetooth connection failed';
      this.notifyState(msg);
      this.log(`Bluetooth Error: ${msg}`, 'error');
      throw err;
    }
  }

  private async reconnectBluetooth() {
    if (!this.bleDevice || this.currentMode !== 'bluetooth') return;
    this.currentStatus = 'reconnecting';
    this.notifyState();
    this.log(`Attempting automatic Bluetooth reconnection to ${this.deviceName}...`, 'info');

    try {
      const server = await this.bleDevice.gatt.connect();
      const service = await server.getPrimaryService(this.config.bleServiceUuid.toLowerCase().trim());
      const char = await service.getCharacteristic(this.config.bleCharUuid.toLowerCase().trim());
      await char.startNotifications();
      this.bleCharacteristic = char;
      this.currentStatus = 'connected';
      this.notifyState();
      this.log(`Reconnected to ${this.deviceName}`, 'info');
    } catch (e: any) {
      this.currentStatus = 'error';
      this.notifyState(`Auto-reconnect failed: ${e.message}`);
    }
  }

  // ==================== WI-FI POLLING (HTTP API) ====================
  public async connectWifiPolling(host?: string, endpoint?: string, intervalMs?: number): Promise<void> {
    if (this.isDemoMode) {
      this.stopDemoMode();
    }
    this.disconnectAll();

    this.currentMode = 'wifi-poll';
    this.currentStatus = 'connecting';
    this.hasReceivedFirstPacket = false;
    this.notifyState();

    const targetHost = host || this.config.wifiHost;
    const targetEndpoint = endpoint || this.config.wifiEndpoint;
    const pollInterval = intervalMs || this.config.wifiPollIntervalMs;

    const url = targetHost.startsWith('http') ? `${targetHost}${targetEndpoint}` : `http://${targetHost}${targetEndpoint}`;
    this.deviceName = `Wi-Fi (${targetHost})`;
    this.log(`Testing HTTP connection to ${url}...`, 'info');

    try {
      // Test initial fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }

      const initialData = await res.json();
      this.log(`HTTP Initial Response received: ${JSON.stringify(initialData).slice(0, 80)}...`, 'rx');

      const reading = this.parser.parse(initialData, this.config, 'hardware', this.currentSessionId);
      if (reading) {
        this.handleIncomingReading(reading);
      }

      this.currentStatus = 'connected';
      this.notifyState();
      this.isPollingActive = true;

      // Start regular polling loop
      this.wifiPollTimer = setInterval(async () => {
        if (!this.isPollingActive) return;
        try {
          const fetchRes = await fetch(url);
          if (fetchRes.ok) {
            const data = await fetchRes.json();
            const r = this.parser.parse(data, this.config, 'hardware', this.currentSessionId);
            if (r) {
              this.handleIncomingReading(r);
            }
          }
        } catch (pollErr: any) {
          // If polling fails repeatedly, warn
          this.log(`Wi-Fi Poll Warning: ${pollErr.message}`, 'warn');
        }
      }, pollInterval);

      this.log(`Wi-Fi Polling active at ${pollInterval}ms interval.`, 'info');
    } catch (err: any) {
      this.currentStatus = 'error';
      const msg = `Failed to connect to Wi-Fi sensor at ${url}: ${err.message}. Ensure device is on the same local network.`;
      this.notifyState(msg);
      this.log(msg, 'error');
      throw new Error(msg);
    }
  }

  // ==================== WI-FI WEBSOCKET ====================
  public async connectWifiWebSocket(wsUrl?: string): Promise<void> {
    if (this.isDemoMode) {
      this.stopDemoMode();
    }
    this.disconnectAll();

    this.currentMode = 'wifi-ws';
    this.currentStatus = 'connecting';
    this.hasReceivedFirstPacket = false;
    this.notifyState();

    const targetUrl = wsUrl || this.config.wifiWsUrl;
    this.deviceName = `WebSocket (${targetUrl})`;
    this.log(`Opening WebSocket connection to ${targetUrl}...`, 'info');

    return new Promise((resolve, reject) => {
      try {
        const socket = new WebSocket(targetUrl);
        this.wsClient = socket;

        const timeout = setTimeout(() => {
          if (socket.readyState !== WebSocket.OPEN) {
            socket.close();
            const err = `WebSocket connection timed out to ${targetUrl}`;
            this.currentStatus = 'error';
            this.notifyState(err);
            this.log(err, 'error');
            reject(new Error(err));
          }
        }, 5000);

        socket.onopen = () => {
          clearTimeout(timeout);
          this.currentStatus = 'connected';
          this.notifyState();
          this.log(`WebSocket connected to ${targetUrl}. Waiting for stream...`, 'info');
          resolve();
        };

        socket.onmessage = (event) => {
          const raw = event.data;
          this.log(`[WS RX] ${raw}`, 'rx');
          const reading = this.parser.parse(raw, this.config, 'hardware', this.currentSessionId);
          if (reading) {
            this.handleIncomingReading(reading);
          }
        };

        socket.onerror = (err: any) => {
          clearTimeout(timeout);
          const msg = `WebSocket error on ${targetUrl}`;
          this.currentStatus = 'error';
          this.notifyState(msg);
          this.log(msg, 'error');
        };

        socket.onclose = () => {
          this.log('WebSocket disconnected', 'warn');
          if (this.currentStatus === 'connected') {
            this.currentStatus = 'disconnected';
            this.notifyState();
          }
        };
      } catch (e: any) {
        this.currentStatus = 'error';
        this.notifyState(e.message);
        reject(e);
      }
    });
  }

  // ==================== LOCAL SERVER SSE RELAY ====================
  public connectServerSSE(): void {
    if (this.isDemoMode) {
      this.stopDemoMode();
    }
    this.disconnectAll();

    this.currentMode = 'server-sse';
    this.currentStatus = 'connecting';
    this.hasReceivedFirstPacket = false;
    this.deviceName = 'RailUrja Server Webhook Relay';
    this.notifyState();
    this.log('Connecting to Server SSE stream (/api/telemetry/stream)...', 'info');

    try {
      const sse = new EventSource('/api/telemetry/stream');
      this.sseClient = sse;

      sse.onopen = () => {
        this.currentStatus = 'connected';
        this.notifyState();
        this.log('Server SSE connected! Microcontrollers can POST to /api/telemetry', 'info');
      };

      sse.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'connected') return;

          this.log(`[SSE RX] Received webhook packet from ${payload.deviceId || 'ESP32'}`, 'rx');
          const reading = this.parser.parse(payload, this.config, 'hardware', this.currentSessionId);
          if (reading) {
            this.handleIncomingReading(reading);
          }
        } catch (err: any) {
          this.log(`SSE parse error: ${err.message}`, 'error');
        }
      };

      sse.onerror = () => {
        this.log('Server SSE stream interrupted. Reconnecting...', 'warn');
        this.currentStatus = 'reconnecting';
        this.notifyState();
      };
    } catch (err: any) {
      this.currentStatus = 'error';
      this.notifyState(`SSE Error: ${err.message}`);
    }
  }

  // ==================== DISCONNECT ====================
  public disconnectAll() {
    // Bluetooth
    if (this.bleDevice && this.bleDevice.gatt && this.bleDevice.gatt.connected) {
      try {
        this.bleDevice.gatt.disconnect();
      } catch (e) {
        // Ignored
      }
    }
    this.bleDevice = null;
    this.bleCharacteristic = null;

    // Polling
    if (this.wifiPollTimer) {
      clearInterval(this.wifiPollTimer);
      this.wifiPollTimer = null;
    }
    this.isPollingActive = false;

    // WebSocket
    if (this.wsClient) {
      try {
        this.wsClient.close();
      } catch (e) {
        // Ignored
      }
      this.wsClient = null;
    }

    // SSE
    if (this.sseClient) {
      try {
        this.sseClient.close();
      } catch (e) {
        // Ignored
      }
      this.sseClient = null;
    }

    this.currentStatus = 'disconnected';
    this.isStale = false;
    this.hasReceivedFirstPacket = false;
    this.notifyState();
    this.log('All hardware connections closed.', 'info');
  }

  // ==================== DEMO MODE (TRAIN VIBRATION PHYSICS) ====================
  public startDemoMode() {
    this.disconnectAll();
    this.isDemoMode = true;
    this.currentStatus = 'connected';
    this.deviceName = 'RailUrja Simulator (Train Dynamics)';
    this.hasReceivedFirstPacket = true;
    this.notifyState();
    this.log('DEMO MODE STARTED: Simulating railway piezoelectric harvesting physics.', 'info');

    this.demoTick = 0;
    this.demoPhase = 0;

    if (this.demoTimer) clearInterval(this.demoTimer);

    // 250ms tick interval (4Hz data stream)
    this.demoTimer = setInterval(() => {
      this.demoTick++;
      const cycleLength = 240; // 60-second full train pass cycle (240 ticks @ 250ms)
      const phasePos = this.demoTick % cycleLength;

      let vibrationG = 0.08 + Math.random() * 0.04; // Baseline ambient rail track rumble
      let frequencyHz = 8.0 + Math.random() * 2.0;
      let voltageV = 0.2 + Math.random() * 0.1;
      let currentA = 0.0001; // tiny leakage

      if (phasePos < 50) {
        // Phase 1: Idle Track Ambient
        this.demoPhase = 0;
        vibrationG = 0.06 + Math.random() * 0.05;
        frequencyHz = 7 + Math.random() * 3;
        voltageV = 0.15 + Math.random() * 0.08;
        currentA = 0.00008;
      } else if (phasePos < 90) {
        // Phase 2: Train Approaching (distance 500m -> 50m)
        this.demoPhase = 1;
        const progress = (phasePos - 50) / 40;
        vibrationG = 0.15 + progress * 0.55 + (Math.random() - 0.5) * 0.12;
        frequencyHz = 12 + progress * 14 + (Math.random() - 0.5) * 4;
        voltageV = 0.4 + progress * 2.2 + (Math.random() - 0.5) * 0.3;
        currentA = (0.001 + progress * 0.015) + (Math.random() - 0.5) * 0.002;
      } else if (phasePos < 190) {
        // Phase 3: Train Passing! Locomotive + Heavy Freight Bogies
        this.demoPhase = 2;
        // Periodic bogie impacts every ~8 ticks (wheelsets hitting rail joint)
        const bogieImpact = Math.sin(this.demoTick * 1.25) > 0.65 ? 1.6 : 0.8;
        const subHarmonic = Math.sin(this.demoTick * 0.35) * 0.4;
        vibrationG = (1.4 + bogieImpact + subHarmonic + (Math.random() - 0.5) * 0.4);
        frequencyHz = 28 + Math.sin(this.demoTick * 0.5) * 12 + (Math.random() - 0.5) * 5;
        // PZT stack voltage peaks with rectified capacitor storage
        voltageV = 3.8 + bogieImpact * 1.4 + (Math.random() - 0.5) * 0.4;
        // Harvesting current into charging capacitor
        const currentMa = 35 + bogieImpact * 45 + (Math.random() - 0.5) * 8;
        currentA = currentMa / 1000.0;
      } else {
        // Phase 4: Train Departing & Capacitor Trickle Discharge
        this.demoPhase = 3;
        const fade = 1 - (phasePos - 190) / 50;
        vibrationG = 0.1 + fade * 0.9 + (Math.random() - 0.5) * 0.1;
        frequencyHz = 8 + fade * 16;
        voltageV = 0.3 + fade * 3.0;
        currentA = Math.max(0.0001, (fade * 15) / 1000.0);
      }

      // Feed into parser with 'demo' source
      const demoPacket = {
        deviceId: 'RailUrja-SIM-01',
        timestamp: Date.now(),
        vibration: Math.max(0.01, vibrationG),
        voltage: Math.max(0.05, voltageV),
        current: Math.max(0.00001, currentA),
        frequency: Math.max(1.0, frequencyHz)
      };

      const reading = this.parser.parse(demoPacket, this.config, 'demo', this.currentSessionId);
      if (reading) {
        this.handleIncomingReading(reading);
      }
    }, 250);
  }

  public stopDemoMode() {
    if (this.demoTimer) {
      clearInterval(this.demoTimer);
      this.demoTimer = null;
    }
    this.isDemoMode = false;
    this.currentStatus = 'disconnected';
    this.hasReceivedFirstPacket = false;
    this.notifyState();
    this.log('DEMO MODE STOPPED.', 'info');
  }

  public destroy() {
    this.disconnectAll();
    this.stopDemoMode();
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }
    this.telemetryListeners.clear();
    this.connectionListeners.clear();
    this.logListeners.clear();
  }
}
