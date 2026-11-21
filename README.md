# Smart Bus Overload Detection and Passenger Counting System

> **Department of Electronics and Communication Engineering (ECE)**  
> **Engineering Capstone Project / IoT Telematics Software Simulation**  
> **Technology Stack:** HTML5, Modern CSS3 (Tailwind CSS), Vanilla JavaScript (ES6+), Chart.js, Web Audio API, Simulated ESP32 Microcontroller, HX711 24-bit ADC, Load Cells, IR Optical Sensors.

---

## 1. Project Overview & Objective

Public transport buses often face extreme overcrowding during peak hours. Overloading compromises passenger safety, strains braking systems, increases rollover risk, accelerates chassis fatigue, and leads to premature tyre failures.

The **Smart Bus Overload Detection and Passenger Counting System** is an IoT-enabled telematics solution that:
1. **Simulates Passenger Flow (Ingress / Egress):** Passengers enter through Door 1 and exit through Door 2. Optical infrared (IR) beam break sensors accurately detect entries and exits.
2. **Dynamically Calculates Individual & Total Passenger Weight:** For each passenger entering the bus, a realistic weight between **35 kg and 100 kg** is generated and stored. Total passenger weight is calculated automatically. When a passenger exits, their specific stored weight is deducted.
3. **Simulates Load Cells & HX711 24-Bit ADC:** 4-point shear beam load cells provide continuous weight readings with optional road vibration sensor noise ($\pm 0.1$ to $2.0\text{ kg}$).
4. **Detects Overload on Dual Criteria:** Monitors **both passenger headcount AND gross payload weight**. Real-time warnings fire when approaching safe limits (80% warning buffer) or exceeding certified capacity (>100% overload).
5. **Provides Driver Alerts & Actuators:** Features real-time visual alerts (safe green, capacity warning amber, emergency red strobe), an onboard 16x2 I2C LCD character readout, and an authentic 2.4 kHz piezo buzzer simulation using the Web Audio API.

---

## 2. Professional Dashboard (8 Dedicated Sections)

The web dashboard is designed with a modern dark-blue and white transportation theme (`#0A1128`, `#001F54`, `#111C3A`, `#172448`):

1. **Live Bus Simulation:**
   - Visual representation of the public bus cabin with driver cab, steering wheel, entry door, exit door, and 40 passenger seats.
   - **Human Icons:** Stylized human avatars indicate occupied seats and aisle standing passengers with individual weights displayed on hover.
   - **Simulation Controls:** `Add Passenger`, `Remove Passenger`, `Add 5 Passengers`, `Remove 5 Passengers`, `Start Simulation`, `Pause Simulation`, and `Reset Simulation`.
   - Live route progression along 9 transit bus stops (Majestic Central $\rightarrow$ ITPL Tech Park).

2. **Passenger Monitoring:**
   - Digital headcount counter, seated vs. aisle standing breakdown, occupancy percentage, and ingress/egress totals.
   - Live Onboard Passenger Manifest with individual passenger weights (PAX-ID, seat #, weight kg, boarding stop, time).

3. **Weight Monitoring:**
   - Radial payload capacity gauge (0% to 120%), gross passenger payload weight, certified maximum weight, average passenger weight, and remaining weight capacity.
   - Dual axle load distribution balance (Front Axle ~44% vs. Rear Axle ~56%).
   - HX711 24-bit ADC signal conditioning panel: raw digital counts, Wheatstone bridge output voltage (mV), and tare zero-calibration button.

4. **Overload Detection:**
   - Dual-criteria matrix: Headcount Check ($N > N_{\text{max}}$) and Gross Payload Weight Check ($W > W_{\text{max}}$).
   - 3-level safety indicator: Normal (<80%), Warning buffer (80%-100%), and Overload (>100%).
   - Automatic passenger door safety interlock status.

5. **Sensor Simulation:**
   - Interactive IR Sensor 1 (Entry) & IR Sensor 2 (Exit) with animated optical beam breaker and manual trip test buttons.
   - ESP32 microcontroller telemetry (CPU 240 MHz, cycle time, GPIO 18, 19, 4, 5, 23, 21, 22 pinout).
   - Virtual 16x2 I2C character LCD display with green backlight and dot-matrix characters.
   - Flash-ready Arduino / ESP32 C++ firmware source code viewer.

6. **Alert System:**
   - Active alarm banner with acknowledgement button.
   - Synthesized 2.4 kHz piezo buzzer with volume control and audio mute toggle.
   - Overload incident audit log table.

7. **Statistics and Reports:**
   - Real-time dual-axis timeline chart (Passenger Count vs Payload Weight).
   - Passenger Weight Distribution Histogram (grouping onboard passengers: 35-50 kg, 51-65 kg, 66-80 kg, 81-100 kg).
   - Hourly ridership flow chart (Boarded vs Alighted).
   - One-click **Download Full CSV Report** for transportation authority audits.

8. **Settings:**
   - Configurable bus passenger capacity (default 50 persons).
   - Configurable maximum safe weight (default 3,500 kg).
   - Configurable warning buffer threshold (default 80%).
   - Configurable sensor vibration noise level (kg).
   - Fleet metadata (Bus number, Route number, Terminals, Driver credentials).

---

## 3. Bus Simulation Controls

The toolbar and simulation deck provide the 7 required interactive controls:

| Control | Description |
|---|---|
| **Add Passenger** | Breaks IR Sensor 1 beam, increments passenger count by 1, generates individual weight (35-100 kg), updates total payload weight, recalculates load status, and plays entry chime. |
| **Remove Passenger** | Breaks IR Sensor 2 beam, decrements passenger count by 1, removes exiting passenger's stored weight from total payload, updates load status, and plays exit chime. Never allows count to drop below 0. |
| **Add 5 Passengers** | Simulates rapid batch boarding of 5 passengers with staggered IR 1 beam breaks. |
| **Remove 5 Passengers** | Simulates rapid batch alighting of 5 passengers with staggered IR 2 beam breaks. |
| **Start Simulation** | Starts autonomous transit mode where the bus drives between bus stops, with passengers boarding and alighting at each stop. |
| **Pause Simulation** | Pauses the autonomous transit simulation. |
| **Reset Simulation** | Clears all passengers, resets load cell scale, and sets headcount to 0. |

---

## 4. Passenger Weight & Load Cell Simulation

- **Demographic Weights:** Every passenger entering the bus receives a realistic weight strictly between **35 kg and 100 kg**.
- **Dynamic Summation:** Total passenger weight is the mathematical sum of all onboard passengers' weights.
- **Individual Weight Deduction:** When a passenger departs, their exact stored weight is subtracted from the gross payload weight.
- **Continuous Load Cell Readings:** 4 corner load cells (Front-Left, Front-Right, Rear-Left, Rear-Right) calculate load distribution continuously.
- **Road Vibration Noise:** An optional sensor noise simulation adds minor dynamic fluctuations ($\pm 0.6\text{ kg}$) to simulate engine and road vibration on the HX711 24-bit ADC.

---

## 5. How to Run the Project

No Node.js or Python backend is required to run the simulation. It is completely self-contained:

1. Open the project folder:
   ```text
   C:\Users\gsant\.gemini\antigravity\scratch\smart-bus-overload-system\
   ```
2. Double-click **`index.html`** to open it in Chrome, Edge, Firefox, or any modern web browser.
3. Alternatively, run the local server script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\start-server.ps1
   ```
   Or with Node.js:
   ```bash
   npx serve . -l 3000
   ```
4. Access the dashboard at `http://localhost:3000`.
