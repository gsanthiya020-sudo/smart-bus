# Smart Bus Overload Detection and Passenger Counting System

> **Department of Electronics and Communication Engineering (ECE)**  
> **Final-Year Capstone Project / IoT Telematics Demonstration**  
> **Technology Stack:** HTML5, Modern CSS3 (Tailwind CSS), Vanilla JavaScript (ES6+), Chart.js, Web Audio API, ESP32/Arduino C++ Embedded Firmware.

---

## 1. Project Overview & Objective

Public transport buses often face extreme overcrowding during peak hours. Overloading compromises passenger safety, strains braking systems, increases rollover risk, accelerates vehicle chassis fatigue, and leads to premature tyre failures.

The **Smart Bus Overload Detection and Passenger Counting System** is an IoT-enabled telematics solution that:
1. **Tracks Headcount via Ingress/Egress Sensors:** Uses optical infrared (IR) beam sensors at both doors to accurately maintain a digital tally of passengers entering and exiting the bus.
2. **Monitors Total Payload via Load Cells:** Leverages 4-point shear beam load cells connected to a 24-bit HX711 ADC to measure the real-time gross weight of passengers.
3. **Detects Overload on Dual Criteria:** Unlike basic counters, the system monitors **both passenger count AND gross passenger payload weight**. Overload is flagged if either headcount exceeds the vehicle limit OR the payload weight breaches safe chassis ratings (e.g., in cases of heavy passenger luggage).
4. **Delivers Driver & Conductor Alerts:** Features real-time visual alerts (normal green, capacity warning orange, critical overload red), an onboard 16x2 I2C LCD status readout, and an audible 2.4 kHz piezo buzzer.
5. **Provides Cloud Telematics & CSV Reporting:** Generates regulatory safety compliance logs, hourly flow trends, axle balance metrics, and one-click downloadable CSV audit reports.

---

## 2. System Architecture

```
+-----------------------------------------------------------------------------------+
|                            BUS HARDWARE LAYER (PHYSICAL)                         |
|                                                                                   |
|  [IR Entry Sensor]       [IR Exit Sensor]       [4x Shear Load Cells (1000kg)]    |
|      (GPIO 18)               (GPIO 19)                         |                  |
|          |                       |                      [HX711 24-bit ADC]        |
|          |                       |                        (DT:4, SCK:5)           |
|          +------------+----------+-----------------------------+                  |
|                       |                                                           |
|                       v                                                           |
|            +-----------------------+                                              |
|            |   ESP32 DevKit V1     | <---- FreeRTOS / Arduino C++ Firmware        |
|            | (240MHz Dual-Core)    |                                              |
|            +-----------+-----------+                                              |
|                        |                                                          |
|       +----------------+----------------+                                         |
|       v                                 v                                         |
|  [16x2 I2C LCD]                 [5V Piezo Buzzer]                                 |
|  (SDA:21, SCL:22)                   (GPIO 23)                                     |
+-----------------------------------------------------------------------------------+
                                 |
         Serial Telemetry (115200 Baud) / WiFi MQTT JSON Stream
                                 |
                                 v
+-----------------------------------------------------------------------------------+
|                        TELEMATICS WEB DASHBOARD (SOFTWARE)                        |
|                                                                                   |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  | Live Headcount     |  | Gross Weight Scale |  | Dual-Axis Trend Graphs      |  |
|  | Digital LED Display|  | Radial Load Gauge  |  | (Passengers vs Payload kg)  |  |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  | Seat Heatmap &     |  | Overload Alert     |  | Daily Regulatory Compliance |  |
|  | Aisle Standing Plan|  | Audio Synthesizer  |  | & CSV Audit Exporter        |  |
|  +--------------------+  +--------------------+  +-----------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Hardware Circuit Wiring & Pinout Specifications

| Component | Hardware Module | ESP32 Pin Assignment | Logic / Interface | Purpose |
|---|---|---|---|---|
| **Weight Amplifier** | HX711 24-bit ADC | **DT: GPIO 4, SCK: GPIO 5** | 2-wire Serial Bus | Reads differential bridge voltage from 4 load cells |
| **Door Ingress Sensor** | Sharp GP2Y0A21 / IR Obstacle | **GPIO 18** (Input Pullup) | Active LOW Digital | Detects entering passenger (increments count) |
| **Door Egress Sensor** | Sharp GP2Y0A21 / IR Obstacle | **GPIO 19** (Input Pullup) | Active LOW Digital | Detects departing passenger (decrements count) |
| **Warning Buzzer** | 5V Active Piezo Buzzer | **GPIO 23** | Digital Output / PWM | Sounds loud 2.4 kHz audible alarm during overload |
| **Normal Status LED** | 5mm Green LED | **GPIO 2** | Digital Active HIGH | Visual indication of safe passenger load |
| **Overload Status LED**| 5mm Red LED | **GPIO 15** | Digital Active HIGH | Visual indication of dangerous capacity overload |
| **Cabin Display** | 16x2 Character LCD + PCF8574 | **SDA: GPIO 21, SCL: GPIO 22** | I2C (Address `0x27`) | Real-time cockpit display for driver/conductor |

---

## 4. Overload Detection Algorithm

The evaluation function executes on every passenger ingress, egress, or weight delta:

$$\text{Count Occupancy (\%)} = \left(\frac{N_{\text{current}}}{N_{\text{max}}}\right) \times 100$$

$$\text{Weight Load (\%)} = \left(\frac{W_{\text{gross}}}{W_{\text{max\_safe}}}\right) \times 100$$

### Decision Truth Matrix:

| Condition | Headcount ($N$) | Gross Weight ($W$) | Indicator Status | Audio Alarm | Conductor Action |
|---|---|---|---|---|---|
| **NORMAL** | $< 80\%$ Max | $< 80\%$ Safe Limit | **GREEN** (`BUS LOAD NORMAL`) | OFF | Unrestricted boarding |
| **WARNING** | $\ge 80\%$ or | $\ge 80\%$ Safe Limit | **ORANGE** (`BUS APPROACHING CAPACITY`) | Warning Chime | Advise passengers nearing capacity |
| **OVERLOAD** | $> 100\%$ or | $> 100\%$ Safe Limit | **RED FLASH** (`OVERLOAD DETECTED`) | Continuous 2.4 kHz Pulse | **Halt boarding immediately** |

*Note: If heavy freight or luggage is loaded, the bus can enter **Overload** condition on weight even if seat headcount is only 30/50.*

---

## 5. Key Dashboard Features

### 1. Dashboard Overview
- Live KPI status tiles: Passenger Count, Gross Weight, Available Space, and 16x2 LCD mirror.
- Bus Cabin Occupancy Blueprint: 40 numbered passenger seats that illuminate green/orange/red, plus dynamic aisle standing indicators.
- Live Telemetry Trend Chart: Real-time dual-axis synchronization of count and weight.
- Axle Balance Analysis: Front vs. Rear axle dynamic load division.

### 2. Live Passenger Monitoring
- Ultra-large digital LED counter for cockpit visibility.
- Real-time tally of daily ingress (passengers boarded) and egress (passengers alighted).
- Peak simultaneous ridership tracking.

### 3. Weight Monitoring
- High-precision kg readout with tare zero-calibration reference.
- Interactive radial gauge displaying 0% to 120% safe payload utilization.
- Compliance badge verifying adherence to CMV Rule 125 axle loading safety limits.

### 4. Overload Alerts & Log
- Emergency flashing warning banner with immediate driver acknowledgement button.
- Native Web Audio API synthesizer emitting realistic 2.4 kHz piezo alarm pulses.
- Auditable incident table with unique incident ID, timestamp, trigger reason, and action taken.

### 5. Passenger Statistics & Analytics
- Multi-hour passenger flow bar charts comparing hourly boardings vs alightings.
- Live calculation of dynamic average passenger weight ($\text{Weight} / \text{Headcount}$).

### 6. Bus Information & Admin Settings
- Modal configuration interface to calibrate:
  - Bus Number, Route Number, Starting Terminal, Destination.
  - Driver and Conductor credential badges.
  - Max safe passenger capacity and maximum payload weight limits.
  - Warning threshold percentage ($50\%$ - $95\%$).
- All configuration changes immediately persist in the browser's `localStorage`.

### 7. Reports & CSV Export
- Daily summary table (Daily Boardings, Overload Incidents, Max Weight, Mean Occupancy).
- One-click **Download CSV Report** generating properly formatted spreadsheet records for transportation authorities.

### 8. Hardware Integration & IoT Lab
- Live status indicators for ESP32, HX711, IR sensors, and Buzzer.
- Complete Arduino / ESP32 C++ firmware viewer with copy button.
- Toggle between **Simulated Sensors** and **Physical Hardware Bridge**.
- Interactive sensor simulation controls (+1 Pax, -1 Pax, Rapid Board, Overload Scenario, Normal Scenario, Depot Reset, Route Progression).

---

## 6. How to Run the Project

No Node.js, Python, or external build server installation is required. The project is completely self-contained with modern modular JavaScript and CSS:

1. Navigate to the project folder:
   ```text
   C:\Users\gsant\.gemini\antigravity\scratch\smart-bus-overload-system\
   ```
2. Double-click **`index.html`** to open it directly in Google Chrome, Microsoft Edge, Mozilla Firefox, or any modern web browser.
3. The dashboard will launch immediately with full interactive simulations, dynamic charts, audio synthesizer, and reports.

---

## 7. College Presentation & Viva Questions

### Q1: Why use both IR sensors and Load Cells instead of just one?
> **Answer:** An IR sensor alone can only count people; it cannot detect if passengers are carrying heavy luggage, cargo, or school bags that push the vehicle over its gross vehicle weight (GVW) limit. Conversely, load cells alone cannot differentiate between 5 heavy adults or 8 children. Combining both provides complete situational awareness.

### Q2: What is the HX711 and why is it needed?
> **Answer:** Load cells produce microscopic changes in resistance that output tiny differential voltages (a few millivolts). The HX711 is a specialized 24-bit analog-to-digital converter (ADC) with an integrated low-noise programmable gain amplifier (PGA) capable of amplifying and digitizing these minute signals with high precision.

### Q3: How do the IR sensors avoid double counting when passengers stand in the doorway?
> **Answer:** In hardware firmware, debounce timers and state-transition edge detection (interrupts) ensure that only a complete transition from beam-unbroken $\rightarrow$ beam-interrupted $\rightarrow$ beam-restored registers as a single count event.

---

## 8. Author & Project Metadata
- **Project Title:** Smart Bus Overload Detection and Passenger Counting System
- **Domain:** Embedded Systems & IoT / Intelligent Transportation Systems (ITS)
- **Status:** Fully Functional & Tested Telematics Web Application
