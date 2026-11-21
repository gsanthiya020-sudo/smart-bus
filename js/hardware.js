/**
 * SMART BUS OVERLOAD DETECTION & PASSENGER COUNTING SYSTEM
 * Hardware Integration & IoT Sensor Simulation Layer
 * 
 * Simulates:
 * - ESP32 Dual Core 240MHz Microcontroller Telemetry
 * - 4x Load Cells + HX711 24-bit ADC Load Amplifier with noise simulation
 * - IR Sensor 1 (GPIO 18 Entry Beam) & IR Sensor 2 (GPIO 19 Exit Beam)
 * - 16x2 I2C Character LCD Display (PCF8574 at 0x27)
 * - 5V Active Piezo Buzzer (GPIO 23)
 */

class BusHardwareManager {
  constructor() {
    this.noiseInterval = null;
    this.lcdCycleInterval = null;
    this.lcdDisplayMode = 0; // 0: Main P/W readout, 1: Route & Time info

    // Realistic Microcontroller C++ Firmware Code for Engineering ECE Submissions
    this.firmwareSourceCode = `/*
 * =====================================================================
 * PROJECT: Smart Bus Overload Detection & Passenger Counting System
 * TARGET:  ESP32 DevKit V1 (Tensilica Xtensa Dual-Core 240MHz)
 * SENSORS: 4x Load Cells (Wheatstone Bridge) + HX711 24-bit ADC
 *          2x Infrared Obstacle Sensors (Beam-Break Mode)
 *          16x2 Character LCD with I2C Backpack (PCF8574 @ 0x27)
 *          Active Piezo Buzzer (5V, 2.4kHz resonant frequency)
 * AUTHOR:  ECE Final-Year Engineering Simulation & Prototype
 * =====================================================================
 */

#include <WiFi.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "HX711.h"
#include <ArduinoJson.h>

// PIN ASSIGNMENTS
#define PIN_HX711_DOUT    4   // HX711 Serial Data Output
#define PIN_HX711_SCK     5   // HX711 Serial Clock Input
#define PIN_IR_ENTRY      18  // IR Sensor 1: Passenger Ingress (Entry Door)
#define PIN_IR_EXIT       19  // IR Sensor 2: Passenger Egress (Exit Door)
#define PIN_BUZZER        23  // Active Piezo Buzzer Alert Pin
#define PIN_LED_SAFE      2   // Green LED Indicator (Safe Operation)
#define PIN_LED_ALARM     15  // Red High-Intensity Alert Strobe

// SYSTEM CALIBRATION & THRESHOLDS
const int MAX_PASSENGER_CAPACITY = 50;       // Max permitted headcount
const float MAX_PERMITTED_WEIGHT_KG = 3500.0;// Max safe payload weight
const float WARNING_RATIO = 0.80;            // 80% approaching limit
const float CALIBRATION_FACTOR = -24.50;     // Scale calibration coefficient

// SENSOR PERIPHERAL OBJECTS
HX711 scale;
LiquidCrystal_I2C lcd(0x27, 16, 2);

// VOLATILE TELEMETRY STATE (INTERRUPT-DRIVEN)
volatile int passengerCount = 0;
volatile unsigned long lastEntryInterruptTime = 0;
volatile unsigned long lastExitInterruptTime = 0;
const unsigned long DEBOUNCE_DELAY_MS = 250;

float currentGrossWeightKg = 0.0;
bool isOverload = false;
bool isWarning = false;

// HARDWARE INTERRUPT SERVICE ROUTINES (ISRs)
void IRAM_ATTR isrPassengerEntry() {
  unsigned long now = millis();
  if (now - lastEntryInterruptTime > DEBOUNCE_DELAY_MS) {
    passengerCount++;
    lastEntryInterruptTime = now;
  }
}

void IRAM_ATTR isrPassengerExit() {
  unsigned long now = millis();
  if (now - lastExitInterruptTime > DEBOUNCE_DELAY_MS) {
    if (passengerCount > 0) {
      passengerCount--;
    }
    lastExitInterruptTime = now;
  }
}

void setup() {
  Serial.begin(115200);
  delay(100);

  // Configure GPIO Modes
  pinMode(PIN_IR_ENTRY, INPUT_PULLUP);
  pinMode(PIN_IR_EXIT, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_SAFE, OUTPUT);
  pinMode(PIN_LED_ALARM, OUTPUT);

  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LED_SAFE, HIGH);
  digitalWrite(PIN_LED_ALARM, LOW);

  // Attach Hardware Interrupts for Millisecond-Precision Beam Break Detection
  attachInterrupt(digitalPinToInterrupt(PIN_IR_ENTRY), isrPassengerEntry, FALLING);
  attachInterrupt(digitalPinToInterrupt(PIN_IR_EXIT), isrPassengerExit, FALLING);

  // Initialize 16x2 I2C LCD
  Wire.begin(21, 22); // SDA=21, SCL=22 on ESP32
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("SMART BUS IOT");
  lcd.setCursor(0, 1);
  lcd.print("CALIBRATING...");

  // Initialize HX711 24-bit Weight Amplifier
  scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare(); // Zero tare empty bus floor chassis weight

  delay(1200);
  lcd.clear();
  Serial.println("[ESP32] Hardware & Telematics Subsystem Ready.");
}

void loop() {
  // 1. SAMPLE LOAD CELL PAYLOAD WEIGHT VIA HX711
  if (scale.is_ready()) {
    currentGrossWeightKg = scale.get_units(3); // 3-sample rolling average
    if (currentGrossWeightKg < 0) currentGrossWeightKg = 0.0;
  }

  // 2. DUAL-CRITERIA OVERLOAD & WARNING EVALUATION
  isOverload = (passengerCount > MAX_PASSENGER_CAPACITY) || 
               (currentGrossWeightKg > MAX_PERMITTED_WEIGHT_KG);

  isWarning = (!isOverload) && 
              ((passengerCount >= (MAX_PASSENGER_CAPACITY * WARNING_RATIO)) || 
               (currentGrossWeightKg >= (MAX_PERMITTED_WEIGHT_KG * WARNING_RATIO)));

  // 3. ACTUATOR & ALARM CONTROL (BUZZER + LEDS)
  if (isOverload) {
    digitalWrite(PIN_LED_ALARM, HIGH);
    digitalWrite(PIN_LED_SAFE, LOW);
    // Urgent pulsing 2.4 kHz alarm tone
    tone(PIN_BUZZER, 2400);
  } else if (isWarning) {
    digitalWrite(PIN_LED_ALARM, HIGH);
    digitalWrite(PIN_LED_SAFE, HIGH);
    noTone(PIN_BUZZER);
  } else {
    digitalWrite(PIN_LED_ALARM, LOW);
    digitalWrite(PIN_LED_SAFE, HIGH);
    noTone(PIN_BUZZER);
  }

  // 4. REFRESH 16x2 I2C LCD DISPLAY
  updateLcdDisplay();

  // 5. TRANSMIT JSON TELEMATICS OVER UART / MQTT
  transmitSerialTelemetry();

  delay(200); // 5 Hz refresh cycle
}

void updateLcdDisplay() {
  lcd.setCursor(0, 0);
  char line1[17];
  snprintf(line1, sizeof(line1), "P:%02d/%02d W:%04.0fkg", 
           passengerCount, MAX_PASSENGER_CAPACITY, currentGrossWeightKg);
  lcd.print(line1);

  lcd.setCursor(0, 1);
  if (isOverload) {
    lcd.print("STATUS: OVERLOAD");
  } else if (isWarning) {
    lcd.print("STATUS: WARNING ");
  } else {
    lcd.print("STATUS: NORMAL  ");
  }
}

void transmitSerialTelemetry() {
  StaticJsonDocument<256> doc;
  doc["device"] = "ESP32-BUS-NODE-01";
  doc["passengers"] = passengerCount;
  doc["gross_weight"] = currentGrossWeightKg;
  doc["overload"] = isOverload;
  doc["warning"] = isWarning;
  serializeJson(doc, Serial);
  Serial.println();
}`;

    // Start background load cell continuous noise updates
    this.startContinuousLoadCellTicker();
  }

  // Continuous sensor noise ticker that updates the load cell readings dynamically
  startContinuousLoadCellTicker() {
    this.noiseInterval = setInterval(() => {
      if (!window.busState) return;
      if (window.busState.config.sensorNoiseEnabled && window.busState.live.passengerCount > 0) {
        // Minor dynamic fluctuation to simulate road vibrations (+/- 0.4 kg)
        const noise = (Math.random() - 0.5) * 2 * window.busState.config.sensorNoiseLevelKg;
        const currentWeight = window.busState.live.totalWeightKg;
        const noisyWeight = Math.max(0, currentWeight + noise);
        
        // Update raw ADC and mV
        window.busState.hardware.hx711RawAdc = Math.round(noisyWeight * 24.5 + 1024);
        window.busState.hardware.hx711VoltageMv = ((noisyWeight / 5000) * 10.0).toFixed(3);
        
        // Update live 4 corner load cells with tiny differential vibrations
        const frontW = window.busState.live.frontAxleWeightKg;
        const rearW = window.busState.live.rearAxleWeightKg;
        window.busState.hardware.loadCell1Kg = Math.round((frontW * 0.49 + noise * 0.2) * 10) / 10;
        window.busState.hardware.loadCell2Kg = Math.round((frontW * 0.51 - noise * 0.2) * 10) / 10;
        window.busState.hardware.loadCell3Kg = Math.round((rearW * 0.50 + noise * 0.3) * 10) / 10;
        window.busState.hardware.loadCell4Kg = Math.round((rearW * 0.50 - noise * 0.3) * 10) / 10;

        // Notify UI to refresh sensor reading widgets
        if (window.updateHardwareSensorsUI) {
          window.updateHardwareSensorsUI();
        }
      }
    }, 400);
  }

  // Simulate manual beam interrupt on IR Sensor 1 (Entry)
  simulateIrEntryTrip() {
    if (!window.busState) return;
    window.busState.passengerEnter();
  }

  // Simulate manual beam interrupt on IR Sensor 2 (Exit)
  simulateIrExitTrip() {
    if (!window.busState) return;
    window.busState.passengerExit();
  }

  // Toggle between Simulated IoT Telematics and Physical Microcontroller bridge
  setHardwareMode(isSimulated) {
    if (!window.busState) return;
    window.busState.hardware.isSimulated = isSimulated;
    if (!isSimulated) {
      window.busState.hardware.esp32Status = 'SERIAL COM4 ACTIVE (115200 BAUD)';
      window.busState.hardware.hx711Status = 'PHYSICAL ADC ONLINE (±0.05% Accuracy)';
      window.busState.hardware.irEntryStatus = 'GPIO 18 ACTIVE (HARDWARE BEAM)';
      window.busState.hardware.irExitStatus = 'GPIO 19 ACTIVE (HARDWARE BEAM)';
    } else {
      window.busState.hardware.esp32Status = 'CONNECTED (Wi-Fi 802.11b/g/n - 240MHz)';
      window.busState.hardware.hx711Status = 'CALIBRATED & ONLINE (24-bit ADC)';
      window.busState.hardware.irEntryStatus = 'BEAM INTACT (GPIO 18 - HIGH)';
      window.busState.hardware.irExitStatus = 'BEAM INTACT (GPIO 19 - HIGH)';
    }
    window.busState.notify();
  }
}

// Global hardware manager instance
window.busHardware = new BusHardwareManager();
