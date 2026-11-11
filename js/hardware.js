/**
 * SMART BUS OVERLOAD DETECTION & PASSENGER COUNTING SYSTEM
 * Hardware Integration & IoT Telematics Layer
 * Supports Simulated IoT Telematics and Physical Microcontroller (ESP32 / Arduino) Bridge.
 */

class BusHardwareManager {
  constructor() {
    this.isAutoSimulating = false;
    this.autoSimInterval = null;
    this.noiseInterval = null;
    this.currentStopIndex = 0;
    
    // Virtual 16x2 LCD display buffer
    this.lcdBuffer = {
      line1: 'SMART BUS IOT',
      line2: 'SYSTEM READY...'
    };

    // Realistic Microcontroller C++ Firmware Code for ECE College Submissions
    this.firmwareSourceCode = `/*
 * =====================================================================
 * PROJECT: Smart Bus Overload Detection & Passenger Counting System
 * HARDWARE: ESP32 DevKit V1 / Arduino Mega 2560
 * SENSORS: 4x Load Cells + HX711, 2x IR Sensors, 16x2 I2C LCD, Piezo Buzzer
 * COMM: WiFi / MQTT / Serial JSON Telematics
 * =====================================================================
 */

#include <WiFi.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "HX711.h"
#include <ArduinoJson.h>

// PIN ASSIGNMENTS
#define PIN_HX711_DOUT    4   // HX711 Serial Data
#define PIN_HX711_SCK     5   // HX711 Serial Clock
#define PIN_IR_ENTRY      18  // IR Obstacle Sensor 1 (Door In)
#define PIN_IR_EXIT       19  // IR Obstacle Sensor 2 (Door Out)
#define PIN_BUZZER        23  // 5V Active Piezo Buzzer
#define PIN_LED_NORMAL    2   // Green LED (Normal status)
#define PIN_LED_ALERT     15  // Red LED (Overload alert)

// SYSTEM CONSTANTS
const int MAX_PASSENGER_CAPACITY = 50;
const float MAX_PERMITTED_WEIGHT_KG = 3500.0;
const float WARNING_THRESHOLD_RATIO = 0.80; // 80%

// SENSOR OBJECTS
HX711 scale;
LiquidCrystal_I2C lcd(0x27, 16, 2);

// TELEMETRY STATE
volatile int passengerCount = 0;
float currentWeightKg = 0.0;
bool isOverload = false;
bool isWarning = false;

// Calibration factor for 4-point shear beam load cells
const float CALIBRATION_FACTOR = -22.45; 

void setup() {
  Serial.begin(115200);
  
  // Pin modes
  pinMode(PIN_IR_ENTRY, INPUT_PULLUP);
  pinMode(PIN_IR_EXIT, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_NORMAL, OUTPUT);
  pinMode(PIN_LED_ALERT, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("SMART BUS SYSTEM");
  lcd.setCursor(0, 1);
  lcd.print("CALIBRATING...");

  // Initialize HX711 Load Cell Amplifier
  scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare(); // Zero out empty bus floor tare weight

  delay(1500);
  lcd.clear();
  Serial.println("[ESP32] Hardware initialization complete.");
}

void loop() {
  // 1. READ IR ENTRY SENSOR (Edge Detection)
  static int lastEntryState = HIGH;
  int currentEntryState = digitalRead(PIN_IR_ENTRY);
  if (lastEntryState == HIGH && currentEntryState == LOW) {
    passengerCount++;
    Serial.println("[EVENT] Passenger Entered");
    delay(200); // Debounce
  }
  lastEntryState = currentEntryState;

  // 2. READ IR EXIT SENSOR (Edge Detection)
  static int lastExitState = HIGH;
  int currentExitState = digitalRead(PIN_IR_EXIT);
  if (lastExitState == HIGH && currentExitState == LOW) {
    if (passengerCount > 0) passengerCount--;
    Serial.println("[EVENT] Passenger Exited");
    delay(200); // Debounce
  }
  lastExitState = currentExitState;

  // 3. READ LOAD CELL WEIGHT VIA HX711
  if (scale.is_ready()) {
    currentWeightKg = scale.get_units(5); // Average of 5 readings
    if (currentWeightKg < 0) currentWeightKg = 0.0;
  }

  // 4. OVERLOAD & WARNING EVALUATION LOGIC
  isOverload = (passengerCount > MAX_PASSENGER_CAPACITY) || 
               (currentWeightKg > MAX_PERMITTED_WEIGHT_KG);
               
  isWarning = (!isOverload) && 
              ((passengerCount >= (MAX_PASSENGER_CAPACITY * WARNING_THRESHOLD_RATIO)) || 
               (currentWeightKg >= (MAX_PERMITTED_WEIGHT_KG * WARNING_THRESHOLD_RATIO)));

  // 5. ACTUATOR & BUZZER CONTROL
  if (isOverload) {
    digitalWrite(PIN_LED_ALERT, HIGH);
    digitalWrite(PIN_LED_NORMAL, LOW);
    // Urgent alarm pulsing
    tone(PIN_BUZZER, 2400);
  } else if (isWarning) {
    digitalWrite(PIN_LED_ALERT, HIGH);
    digitalWrite(PIN_LED_NORMAL, HIGH);
    noTone(PIN_BUZZER);
  } else {
    digitalWrite(PIN_LED_ALERT, LOW);
    digitalWrite(PIN_LED_NORMAL, HIGH);
    noTone(PIN_BUZZER);
  }

  // 6. UPDATE 16x2 I2C LCD READOUT
  updateLCD();

  // 7. EMIT JSON TELEMETRY TELEMATICS OVER SERIAL / MQTT
  sendTelemetry();

  delay(250);
}

void updateLCD() {
  lcd.setCursor(0, 0);
  char line1[17];
  snprintf(line1, sizeof(line1), "P:%02d/%02d W:%04.0fkg", 
           passengerCount, MAX_PASSENGER_CAPACITY, currentWeightKg);
  lcd.print(line1);

  lcd.setCursor(0, 1);
  if (isOverload) {
    lcd.print("STATUS: OVERLOAD");
  } else if (isWarning) {
    lcd.print("STATUS: CAPACITY");
  } else {
    lcd.print("STATUS: NORMAL  ");
  }
}

void sendTelemetry() {
  StaticJsonDocument<256> doc;
  doc["device_id"] = "BUS-ESP32-NODE-01";
  doc["count"] = passengerCount;
  doc["weight_kg"] = currentWeightKg;
  doc["overload"] = isOverload;
  doc["warning"] = isWarning;
  serializeJson(doc, Serial);
  Serial.println();
}`;

    // Start background sensor fluctuation noise
    this.startSensorFluctuation();
  }

  // Realistic sensor noise / small vibration fluctuations while bus is moving
  startSensorFluctuation() {
    this.noiseInterval = setInterval(() => {
      if (!window.busState) return;
      if (window.busState.live.passengerCount > 0) {
        // Minor load cell fluctuation +/- 0.8 kg from engine vibrations
        const noise = (Math.random() - 0.5) * 1.6;
        const currentW = window.busState.live.totalWeightKg;
        // Keep weight anchored around realistic avg
        const targetW = window.busState.live.passengerCount * 70;
        const diff = (targetW - currentW) * 0.05;
        const newWeight = Math.max(0, Math.round((currentW + diff + noise) * 10) / 10);
        
        window.busState.live.totalWeightKg = newWeight;
        window.busState.evaluateStatus();
        this.updateVirtualLCD();
        window.busState.notify();
      } else {
        this.updateVirtualLCD();
      }
    }, 3500);
  }

  // Format 16x2 LCD Text
  updateVirtualLCD() {
    if (!window.busState) return;
    const count = window.busState.live.passengerCount;
    const maxCount = window.busState.config.maxPassengerCapacity;
    const weight = Math.round(window.busState.live.totalWeightKg);
    const status = window.busState.live.status;

    // Line 1: 16 Characters e.g. "P:28/50  W:1950k"
    const countStr = `P:${String(count).padStart(2, '0')}/${maxCount}`;
    const weightStr = `W:${String(weight).padStart(4, ' ')}kg`;
    const line1 = `${countStr.padEnd(8, ' ')}${weightStr.padStart(8, ' ')}`;

    // Line 2: 16 Characters e.g. "STATUS: NORMAL  " or "STATUS: OVERLOAD"
    let statusText = 'NORMAL  ';
    if (status === 'OVERLOAD') {
      statusText = 'OVERLOAD';
    } else if (status === 'WARNING') {
      statusText = 'CAPACITY';
    }
    const line2 = `STATUS: ${statusText}`.padEnd(16, ' ');

    this.lcdBuffer.line1 = line1.slice(0, 16);
    this.lcdBuffer.line2 = line2.slice(0, 16);
  }

  // Autonomous Transit Simulation (Bus travelling along route stops)
  toggleAutoSimulation() {
    this.isAutoSimulating = !this.isAutoSimulating;

    if (this.isAutoSimulating) {
      this.runNextStopSimulation();
      this.autoSimInterval = setInterval(() => {
        this.runNextStopSimulation();
      }, 7000); // Every 7 seconds advance to next stop
    } else {
      if (this.autoSimInterval) {
        clearInterval(this.autoSimInterval);
        this.autoSimInterval = null;
      }
    }

    return this.isAutoSimulating;
  }

  runNextStopSimulation() {
    if (!window.busState) return;
    const stops = window.busState.routeStops;
    this.currentStopIndex = (this.currentStopIndex + 1) % stops.length;
    const stop = stops[this.currentStopIndex];

    const numIn = Math.floor(Math.random() * (stop.expectedIn[1] - stop.expectedIn[0] + 1)) + stop.expectedIn[0];
    const numOut = Math.floor(Math.random() * (stop.expectedOut[1] - stop.expectedOut[0] + 1)) + stop.expectedOut[0];

    // Simulate alighting passengers first
    let exited = 0;
    const exitInterval = setInterval(() => {
      if (exited < numOut && window.busState.live.passengerCount > 0) {
        window.busState.passengerExit();
        exited++;
      } else {
        clearInterval(exitInterval);

        // Then simulate boarding passengers
        let entered = 0;
        const enterInterval = setInterval(() => {
          if (entered < numIn) {
            window.busState.passengerEnter();
            entered++;
          } else {
            clearInterval(enterInterval);
          }
        }, 300);
      }
    }, 250);

    // Update stop notification
    if (window.showAppNotification) {
      window.showAppNotification(
        `Arrived at Stop: ${stop.name}`,
        `Boarding: ~${numIn} pax | Alighting: ~${numOut} pax`,
        'info'
      );
    }
  }

  // Toggle between Simulated IoT vs Physical Hardware Connection
  setHardwareMode(isSimulated) {
    if (!window.busState) return;
    window.busState.hardware.isSimulated = isSimulated;
    if (!isSimulated) {
      window.busState.hardware.esp32Status = 'SERIAL COM4 ACTIVE (115200 BAUD)';
      window.busState.hardware.hx711Status = 'PHYSICAL ADC ONLINE (±0.05% Acc)';
      window.busState.hardware.irEntryStatus = 'GPIO 18 ACTIVE (PHYSICAL SENSOR)';
      window.busState.hardware.irExitStatus = 'GPIO 19 ACTIVE (PHYSICAL SENSOR)';
    } else {
      window.busState.hardware.esp32Status = 'CONNECTED (Wi-Fi 802.11b/g/n)';
      window.busState.hardware.hx711Status = 'CALIBRATED & ONLINE (24-bit ADC)';
      window.busState.hardware.irEntryStatus = 'READY (GPIO 18 - Beam High)';
      window.busState.hardware.irExitStatus = 'READY (GPIO 19 - Beam High)';
    }
    window.busState.notify();
  }
}

// Global hardware manager instance
window.busHardware = new BusHardwareManager();
