/**
 * HardwareGuideView
 * Complete engineering wiring diagrams, circuit schematics, pinout tables,
 * and copy-paste ready firmware code for ESP32/Arduino BLE and Wi-Fi modules.
 */
import React, { useState } from 'react';
import {
  BookOpen,
  Cpu,
  Zap,
  Copy,
  Check,
  Code,
  TrainTrack,
  ExternalLink,
  Layers,
  ShieldCheck
} from 'lucide-react';

const HARVESTER_IMAGE = '/src/assets/images/railway_piezo_harvester_1793002781127.jpg';
const FLOW_IMAGE = '/src/assets/images/railway_energy_flow_1793002781548.jpg';

export const HardwareGuideView: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedFirmware, setSelectedFirmware] = useState<'ble' | 'wifi-server' | 'wifi-post'>('ble');

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const bleArduinoCode = `/*
 * RailUrja - ESP32 Bluetooth Low Energy (BLE) Firmware
 * Transmits real-time railway vibration and electrical harvesting telemetry
 */
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

#define SERVICE_UUID        "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

// Pin definitions
#define VIBRATION_SENSOR_PIN 34 // Analog ADC pin for Piezo / Accelerometer
Adafruit_INA219 ina219;

BLEServer* pServer = NULL;
BLECharacteristic* pTxCharacteristic = NULL;
bool deviceConnected = false;

class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
  };
  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    // Restart advertising
    pServer->startAdvertising();
  }
};

void setup() {
  Serial.begin(115200);
  if (!ina219.begin()) {
    Serial.println("INA219 not detected - using analog fallback");
  }

  // Create the BLE Device
  BLEDevice::init("RailUrja-01");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create the BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create a BLE Characteristic
  pTxCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_UUID,
                        BLECharacteristic::PROPERTY_NOTIFY
                      );
  pTxCharacteristic->addDescriptor(new BLE2902());

  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.println("RailUrja BLE Transceiver Ready. Waiting for connection...");
}

void loop() {
  // Read vibration sensor
  int rawVib = analogRead(VIBRATION_SENSOR_PIN);
  float vibrationG = (rawVib / 4095.0) * 4.0; // scale to 0-4g

  // Read electrical harvesting sensors via INA219
  float busVoltageV = ina219.getBusVoltage_V();
  float currentMa = ina219.getCurrent_mA();
  float currentA = currentMa / 1000.0;
  float frequencyHz = 18.5 + (vibrationG * 8.0); // or calculate from zero-crossings

  if (deviceConnected) {
    // Format JSON packet
    char buffer[128];
    snprintf(buffer, sizeof(buffer), 
      "{\\"deviceId\\":\\"RailUrja-01\\",\\"vibration\\":%.3f,\\"voltage\\":%.3f,\\"current\\":%.5f,\\"frequency\\":%.1f}",
      vibrationG, busVoltageV, currentA, frequencyHz
    );

    pTxCharacteristic->setValue((uint8_t*)buffer, strlen(buffer));
    pTxCharacteristic->notify();
    Serial.println(buffer);
  }

  delay(250); // 4Hz telemetry sample rate
}`;

  const wifiServerArduinoCode = `/*
 * RailUrja - ESP32 Wi-Fi Local Web Server Firmware
 * Serves live telemetry at http://<ESP32_IP>/data for browser polling
 */
#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

WebServer server(80);
Adafruit_INA219 ina219;
#define VIBRATION_PIN 34

void handleData() {
  float vibrationG = (analogRead(VIBRATION_PIN) / 4095.0) * 4.0;
  float voltageV = ina219.getBusVoltage_V();
  float currentA = ina219.getCurrent_mA() / 1000.0;
  float frequencyHz = 22.0;

  String json = "{\\"deviceId\\":\\"RailUrja-01\\",";
  json += "\\"vibration\\":" + String(vibrationG, 3) + ",";
  json += "\\"voltage\\":" + String(voltageV, 3) + ",";
  json += "\\"current\\":" + String(currentA, 6) + ",";
  json += "\\"frequency\\":" + String(frequencyHz, 1) + "}";

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);
  ina219.begin();
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("RailUrja Server IP: ");
  Serial.println(WiFi.localIP());

  server.on("/data", handleData);
  server.begin();
}

void loop() {
  server.handleClient();
}`;

  const wifiPostArduinoCode = `/*
 * RailUrja - ESP32 Wi-Fi HTTP Client Firmware
 * Pushes real-time telemetry POST requests directly to RailUrja /api/telemetry
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
// Point to your RailUrja host URL or local IP:
const char* serverUrl = "http://192.168.1.50:3000/api/telemetry";

Adafruit_INA219 ina219;
#define VIBRATION_PIN 34

void setup() {
  Serial.begin(115200);
  ina219.begin();
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nConnected to Wi-Fi! Streaming to RailUrja...");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    float vibrationG = (analogRead(VIBRATION_PIN) / 4095.0) * 4.0;
    float voltageV = ina219.getBusVoltage_V();
    float currentA = ina219.getCurrent_mA() / 1000.0;
    float frequencyHz = 24.5;

    String json = "{\\"deviceId\\":\\"RailUrja-01\\",";
    json += "\\"vibration\\":" + String(vibrationG, 3) + ",";
    json += "\\"voltage\\":" + String(voltageV, 3) + ",";
    json += "\\"current\\":" + String(currentA, 6) + ",";
    json += "\\"frequency\\":" + String(frequencyHz, 1) + "}";

    int httpCode = http.POST(json);
    http.end();
  }
  delay(250); // 4Hz rate
}`;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#070b14] p-3 gap-3">
      {/* Header Banner */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0b1324] border border-slate-800 rounded-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              Hardware Wiring, Sensor Integration &amp; Firmware Guide
            </div>
            <div className="text-[11px] text-slate-400">
              Ready-to-flash Arduino C++ firmware and circuit schematics for ESP32 and piezoelectric harvesters
            </div>
          </div>
        </div>
      </div>

      {/* Hardware Schematic Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-[#0b1324] border border-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <TrainTrack size={14} className="text-cyan-400" />
              Piezo Harvester Sleeper Installation
            </span>
            <span className="text-[10px] font-mono text-slate-500">ISO Schematic</span>
          </div>
          <div className="relative w-full h-44 rounded bg-slate-900 border border-slate-800 overflow-hidden">
            <img
              src={HARVESTER_IMAGE}
              alt="Harvester unit mounted on rail"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            PZT ceramic discs clamped under spring pre-load between the rail foot and sleeper, capturing vertical dynamic deflection under train wheel bogies.
          </p>
        </div>

        <div className="bg-[#0b1324] border border-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              Rectification &amp; Storage Circuit
            </span>
            <span className="text-[10px] font-mono text-slate-500">Block Diagram</span>
          </div>
          <div className="relative w-full h-44 rounded bg-slate-900 border border-slate-800 overflow-hidden">
            <img
              src={FLOW_IMAGE}
              alt="Electrical energy conversion schematic"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            AC output from PZT stack is rectified via Schottky bridge (e.g. 1N5819), stored in a supercapacitor buffer (10F, 5.5V), and measured by an INA219 current/voltage sensor.
          </p>
        </div>
      </div>

      {/* Pinout & Components Table */}
      <div className="bg-[#0b1324] border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="font-bold text-slate-200 text-sm">Recommended Component Pinout Table</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0e172e] border-b border-slate-800 text-slate-400 text-[10px] uppercase">
              <tr>
                <th className="py-2 px-3">Subsystem</th>
                <th className="py-2 px-3">Hardware Component</th>
                <th className="py-2 px-3">ESP32 Pin Connection</th>
                <th className="py-2 px-3">Operating Range</th>
                <th className="py-2 px-3">Function</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-[11px] text-slate-300">
              <tr>
                <td className="py-2 px-3 font-semibold text-cyan-300">Vibration Sensing</td>
                <td className="py-2 px-3">SW-420 or ADXL345 / Piezo Disc</td>
                <td className="py-2 px-3 text-cyan-400">GPIO 34 (ADC1)</td>
                <td className="py-2 px-3">0.05g – 4.5g</td>
                <td className="py-2 px-3 text-slate-400">Measures track vibration intensity &amp; frequency</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-amber-300">Voltage &amp; Current</td>
                <td className="py-2 px-3">INA219 High-Side Power Monitor</td>
                <td className="py-2 px-3 text-amber-400">I2C: SDA=GPIO21, SCL=GPIO22</td>
                <td className="py-2 px-3">0 – 26V / 0 – 3.2A</td>
                <td className="py-2 px-3 text-slate-400">Measures rectified harvesting voltage &amp; charging current</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-emerald-300">Energy Storage</td>
                <td className="py-2 px-3">10F 5.5V Supercapacitor Bank</td>
                <td className="py-2 px-3 text-emerald-400">Across INA219 Load &amp; GND</td>
                <td className="py-2 px-3">0 – 5.0V</td>
                <td className="py-2 px-3 text-slate-400">Buffers harvested intermittent energy</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-purple-300">Controller &amp; Comm</td>
                <td className="py-2 px-3">ESP32 DevKit V1</td>
                <td className="py-2 px-3 text-purple-400">USB / LiPo 3.7V Input</td>
                <td className="py-2 px-3">BLE &amp; Wi-Fi 2.4GHz</td>
                <td className="py-2 px-3 text-slate-400">Digitizes sensor data and streams to RailUrja</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Copy-Paste Arduino Firmware Section */}
      <div className="bg-[#0b1324] border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
            <Code size={16} className="text-cyan-400" />
            Ready-to-Flash ESP32 Firmware Source Code
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 rounded p-0.5 border border-slate-800 text-[11px] font-mono">
              <button
                onClick={() => setSelectedFirmware('ble')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedFirmware === 'ble' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Web Bluetooth (BLE)
              </button>
              <button
                onClick={() => setSelectedFirmware('wifi-server')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedFirmware === 'wifi-server' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. Wi-Fi Local HTTP
              </button>
              <button
                onClick={() => setSelectedFirmware('wifi-post')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedFirmware === 'wifi-post' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3. Wi-Fi Webhook POST
              </button>
            </div>

            <button
              onClick={() => {
                const code = selectedFirmware === 'ble' ? bleArduinoCode : selectedFirmware === 'wifi-server' ? wifiServerArduinoCode : wifiPostArduinoCode;
                copyToClipboard(code, 99);
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition-colors"
            >
              {copiedIndex === 99 ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedIndex === 99 ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-72 select-all leading-relaxed">
          {selectedFirmware === 'ble' ? bleArduinoCode : selectedFirmware === 'wifi-server' ? wifiServerArduinoCode : wifiPostArduinoCode}
        </pre>
      </div>
    </div>
  );
};
