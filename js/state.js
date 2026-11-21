/**
 * SMART BUS OVERLOAD DETECTION & PASSENGER COUNTING SYSTEM
 * State Management & Overload Evaluation Engine
 * 
 * ECE IoT Project Software Simulation
 * Tracks individual passenger weights (35 kg - 100 kg), calculates dynamic payload,
 * evaluates dual overload thresholds (headcount & weight), and simulates hardware telemetry.
 */

class BusStateManager {
  constructor() {
    this.STORAGE_KEY_CONFIG = 'smartbus_config_v3';
    this.STORAGE_KEY_INCIDENTS = 'smartbus_incidents_v3';

    // Default Bus Configuration (Configurable via Settings)
    this.config = {
      busNumber: 'KA-01-F-4589',
      routeNumber: 'Route 335-E Express',
      startingPoint: 'Majestic Central Bus Station',
      destination: 'ITPL Tech Park, Whitefield',
      driverName: 'R. K. Sharma (Badge #8942)',
      conductorName: 'M. Anand (Badge #7119)',
      busModel: 'Volvo 8400 Low Floor City Bus (BS-VI)',
      maxPassengerCapacity: 50,      // Max passenger capacity
      maxPermittedWeightKg: 3500,    // Safe payload weight limit (kg)
      warningThresholdPercent: 80,   // Warning threshold % (80% default)
      tareEmptyBusWeightKg: 10200,   // Empty bus chassis tare weight
      loadCellSensitivity: 2.0,      // 2.0 mV/V
      sensorNoiseEnabled: true,       // Sensor noise toggle
      sensorNoiseLevelKg: 0.6,       // Max +/- noise in kg
      simulationIntervalMs: 5000,    // Auto simulation step interval
    };

    // Passenger counter for unique IDs
    this.passengerIdCounter = 1;

    // Array of currently onboard passengers:
    // { id, weight, seatNumber, isStanding, enteredAt, stopName }
    this.passengers = [];

    // Live Telemetry & Calculations
    this.live = {
      passengerCount: 0,
      totalWeightKg: 0.0,
      avgPassengerWeightKg: 0.0,
      remainingWeightCapacityKg: 3500.0,
      availableCapacity: 50,
      occupancyPercent: 0.0,
      weightLoadPercent: 0.0,
      frontAxleWeightKg: 0.0,
      rearAxleWeightKg: 0.0,
      status: 'NORMAL', // 'NORMAL' | 'WARNING' | 'OVERLOAD'
      statusMessage: 'BUS LOAD NORMAL',
      statusDetail: 'All operating parameters are safe. Headcount and weight within certified limits.',
      lastPassengerEntered: null,
      lastPassengerExited: null,
      lastUpdated: new Date().toLocaleTimeString(),
    };

    // Cumulative Statistics for Reports
    this.stats = {
      totalEnteredToday: 142,
      totalExitedToday: 118,
      peakPassengerCount: 42,
      maxRecordedWeightKg: 2940.0,
      overloadIncidentCount: 1,
      totalTripsToday: 6,
      averageOccupancyPercent: 54.2,
      hourlyData: [
        { hour: '06:00', entered: 18, exited: 4, count: 14, weight: 980 },
        { hour: '07:00', entered: 35, exited: 12, count: 37, weight: 2590 },
        { hour: '08:00', entered: 48, exited: 43, count: 42, weight: 2940 },
        { hour: '09:00', entered: 30, exited: 34, count: 38, weight: 2660 },
        { hour: '10:00', entered: 15, exited: 29, count: 24, weight: 1680 },
      ],
      timeSeries: [] // for live charts (last 20 data points)
    };

    // Hardware Simulation State (ESP32, HX711, IR Sensors, LCD, Buzzer)
    this.hardware = {
      isSimulated: true,
      esp32Status: 'CONNECTED (Wi-Fi 802.11b/g/n - 240MHz)',
      esp32Ip: '192.168.1.145',
      esp32CycleTimeMs: 12,
      hx711Status: 'CALIBRATED & ONLINE (24-bit ADC)',
      hx711RawAdc: 1024,
      hx711VoltageMv: 0.0,
      loadCell1Kg: 0.0, // Front-Left
      loadCell2Kg: 0.0, // Front-Right
      loadCell3Kg: 0.0, // Rear-Left
      loadCell4Kg: 0.0, // Rear-Right
      irEntryStatus: 'BEAM INTACT (GPIO 18 - HIGH)',
      irEntryTripped: false,
      irExitStatus: 'BEAM INTACT (GPIO 19 - HIGH)',
      irExitTripped: false,
      buzzerStatus: 'IDLE (GPIO 23 - LOW)',
      buzzerActive: false,
      lcdLine1: 'P:00/50  W:0000kg',
      lcdLine2: 'STATUS: NORMAL  ',
      doorInterlockStatus: 'UNLOCKED (DOORS OPERATIONAL)',
      lastHeartbeat: new Date().toLocaleTimeString(),
      packetsReceived: 2140,
    };

    // Route Waypoints along Bangalore Express Corridor
    this.routeStops = [
      { name: 'Majestic Kempegowda Central', expectedIn: [12, 20], expectedOut: [0, 2] },
      { name: 'Corporation Circle', expectedIn: [6, 12], expectedOut: [2, 5] },
      { name: 'Richmond Circle', expectedIn: [5, 10], expectedOut: [4, 8] },
      { name: 'Trinity Circle / MG Road', expectedIn: [4, 8], expectedOut: [5, 10] },
      { name: 'Domlur Flyover', expectedIn: [6, 11], expectedOut: [4, 9] },
      { name: 'HAL Old Airport Road', expectedIn: [7, 14], expectedOut: [6, 12] },
      { name: 'Marathahalli Bridge', expectedIn: [8, 16], expectedOut: [10, 18] },
      { name: 'Kundalahalli Gate', expectedIn: [4, 8], expectedOut: [8, 14] },
      { name: 'ITPL Tech Park Terminal', expectedIn: [1, 4], expectedOut: [18, 30] },
    ];
    this.currentStopIndex = 2; // Default starting at Richmond Circle

    // Incidents Log
    this.incidents = [];

    // Observers/Listeners
    this.listeners = [];

    // Auto simulation state
    this.isSimulationRunning = false;
    this.simulationTimer = null;

    // Initialize state
    this.loadFromStorage();
    this.initPreloadedPassengers(24); // Start with 24 realistic passengers
    this.initTimeSeries();
    this.evaluateStatus();
  }

  // Subscribe to state changes
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  notify() {
    this.listeners.forEach(cb => cb(this));
  }

  loadFromStorage() {
    try {
      const savedConfig = localStorage.getItem(this.STORAGE_KEY_CONFIG);
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      const savedIncidents = localStorage.getItem(this.STORAGE_KEY_INCIDENTS);
      if (savedIncidents) {
        this.incidents = JSON.parse(savedIncidents);
      } else {
        this.incidents = [
          {
            id: 'INC-1042',
            timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString(),
            date: new Date().toLocaleDateString(),
            cause: 'Payload Weight Limit Exceeded',
            passengerCount: 46,
            totalWeightKg: 3590.5,
            maxAllowedWeight: this.config.maxPermittedWeightKg,
            severity: 'CRITICAL',
            actionTaken: 'Conductor halted boarding; buzzer sounded; safe margin restored.',
            resolved: true
          }
        ];
      }
    } catch (e) {
      console.warn('Could not load stored state:', e);
    }
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(this.STORAGE_KEY_CONFIG, JSON.stringify(this.config));
    this.evaluateStatus();
    this.notify();
  }

  saveIncidents() {
    localStorage.setItem(this.STORAGE_KEY_INCIDENTS, JSON.stringify(this.incidents));
  }

  // Generate realistic passenger weight between 35 kg and 100 kg
  // Uses a slight Gaussian curve centered around 68 kg for realistic demographics (children, teens, adults)
  generatePassengerWeight() {
    // Range: 35 kg to 100 kg
    const u1 = Math.random();
    const u2 = Math.random();
    // Box-Muller transform for normal distribution
    const z = Math.sqrt(-2.0 * Math.log(u1 + 0.0001)) * Math.cos(2.0 * Math.PI * u2);
    // Mean = 68 kg, StdDev = 14 kg
    let weight = 68.0 + (z * 14.0);
    // Clamp strictly between 35.0 kg and 100.0 kg
    weight = Math.max(35.0, Math.min(100.0, weight));
    return Math.round(weight * 10) / 10;
  }

  // Preload initial batch of passengers
  initPreloadedPassengers(count) {
    this.passengers = [];
    this.passengerIdCounter = 1;
    for (let i = 0; i < count; i++) {
      const pWeight = this.generatePassengerWeight();
      const seatNum = i + 1 <= 40 ? i + 1 : 'Aisle';
      this.passengers.push({
        id: `PAX-${String(this.passengerIdCounter++).padStart(3, '0')}`,
        weight: pWeight,
        seatNumber: seatNum,
        isStanding: i + 1 > 40,
        enteredAt: new Date(Date.now() - (count - i) * 15000).toLocaleTimeString(),
        stopName: this.routeStops[Math.min(this.currentStopIndex, this.routeStops.length - 1)].name
      });
    }
    this.recalculateTotals();
  }

  initTimeSeries() {
    const now = Date.now();
    for (let i = 15; i >= 0; i--) {
      const t = new Date(now - i * 4000);
      const count = Math.max(12, Math.min(48, Math.round(this.live.passengerCount + (Math.sin(i) * 5))));
      const weight = Math.round(count * 69.2);
      this.stats.timeSeries.push({
        time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        count: count,
        weight: weight
      });
    }
  }

  // Calculate live values from stored passengers array
  recalculateTotals() {
    const count = this.passengers.length;
    // Exactly sum all stored passenger weights!
    const totalWeight = this.passengers.reduce((sum, p) => sum + p.weight, 0);
    const roundedWeight = Math.round(totalWeight * 10) / 10;

    this.live.passengerCount = count;
    this.live.totalWeightKg = roundedWeight;
    this.live.avgPassengerWeightKg = count > 0 ? (roundedWeight / count).toFixed(1) : '0.0';

    const maxWeight = Number(this.config.maxPermittedWeightKg);
    this.live.remainingWeightCapacityKg = Math.max(0, Math.round((maxWeight - roundedWeight) * 10) / 10);
  }

  // =========================================================================
  // OVERLOAD DETECTION & SENSOR EVALUATION ENGINE
  // =========================================================================
  evaluateStatus() {
    this.recalculateTotals();

    const maxCount = Number(this.config.maxPassengerCapacity);
    const maxWeight = Number(this.config.maxPermittedWeightKg);
    const warnRatio = Number(this.config.warningThresholdPercent) / 100;

    const count = this.live.passengerCount;
    const weight = this.live.totalWeightKg;

    // Remaining capacity & percentages
    this.live.availableCapacity = Math.max(0, maxCount - count);
    this.live.occupancyPercent = Math.min(150, Math.round((count / maxCount) * 100 * 10) / 10);
    this.live.weightLoadPercent = Math.min(150, Math.round((weight / maxWeight) * 100 * 10) / 10);

    // 4-point shear load cell simulation (Load distributed over 4 wheels/corners)
    // Front Axle: ~44%, Rear Axle: ~56%
    const frontRatio = 0.44;
    const rearRatio = 0.56;
    this.live.frontAxleWeightKg = Math.round(weight * frontRatio * 10) / 10;
    this.live.rearAxleWeightKg = Math.round(weight * rearRatio * 10) / 10;

    // 4 Corner Load Cells (FL, FR, RL, RR)
    this.hardware.loadCell1Kg = Math.round((this.live.frontAxleWeightKg * 0.49) * 10) / 10;
    this.hardware.loadCell2Kg = Math.round((this.live.frontAxleWeightKg * 0.51) * 10) / 10;
    this.hardware.loadCell3Kg = Math.round((this.live.rearAxleWeightKg * 0.50) * 10) / 10;
    this.hardware.loadCell4Kg = Math.round((this.live.rearAxleWeightKg * 0.50) * 10) / 10;

    // HX711 24-bit ADC Simulation
    // Full scale 24-bit ADC: 0 to 16,777,215 (or signed 2's complement)
    // Scale factor: ~24.5 ADC counts per kg + tare offset 1024
    let noise = 0;
    if (this.config.sensorNoiseEnabled && count > 0) {
      noise = (Math.random() - 0.5) * 2 * this.config.sensorNoiseLevelKg;
    }
    const weightWithNoise = Math.max(0, weight + noise);
    this.hardware.hx711RawAdc = Math.round(weightWithNoise * 24.5 + 1024);
    // Bridge differential voltage (mV) = (Weight / MaxWeight) * Sensitivity (2.0 mV/V) * 5V Excitation
    this.hardware.hx711VoltageMv = ((weightWithNoise / 5000) * 10.0).toFixed(3);

    // Overload conditions
    const isCountOverload = count > maxCount;
    const isWeightOverload = weight > maxWeight;

    // Warning conditions (>= 80% default threshold)
    const isCountWarning = count >= (maxCount * warnRatio);
    const isWeightWarning = weight >= (maxWeight * warnRatio);

    const prevStatus = this.live.status;

    if (isCountOverload || isWeightOverload) {
      this.live.status = 'OVERLOAD';
      this.live.statusMessage = 'OVERLOAD DETECTED';

      if (isCountOverload && isWeightOverload) {
        this.live.statusDetail = `CRITICAL DANGER: Passenger Count (${count}/${maxCount} pax) AND Gross Weight (${weight} kg / ${maxWeight} kg) have EXCEEDED certified safety limits!`;
      } else if (isCountOverload) {
        this.live.statusDetail = `CRITICAL HAZARD: Maximum passenger headcount exceeded (${count}/${maxCount} pax). Cabin overcrowded!`;
      } else {
        this.live.statusDetail = `CRITICAL HAZARD: Maximum payload weight exceeded (${weight} kg / ${maxWeight} kg limit). Structural stress on chassis!`;
      }

      this.hardware.buzzerStatus = 'ACTIVE ALARM (PULSING 2.4 kHz PIEZO)';
      this.hardware.buzzerActive = true;
      this.hardware.doorInterlockStatus = 'INTERLOCKED (BOARDING HALTED)';

      // Trigger Web Audio API piezo alarm
      if (window.busAudio) {
        window.busAudio.startOverloadAlarm();
      }

      // Record incident only once on transition into OVERLOAD
      if (prevStatus !== 'OVERLOAD') {
        const triggerReason = isCountOverload && isWeightOverload 
          ? 'Dual Headcount & Weight Overload' 
          : (isCountOverload ? 'Headcount Capacity Overload' : 'Gross Weight Payload Overload');
        this.recordIncident(triggerReason, count, weight);
      }
    } else if (isCountWarning || isWeightWarning) {
      this.live.status = 'WARNING';
      this.live.statusMessage = 'BUS APPROACHING CAPACITY';

      if (isCountWarning && isWeightWarning) {
        this.live.statusDetail = `WARNING: Both headcount (${count} pax) and weight (${weight} kg) have reached ${this.config.warningThresholdPercent}% safety buffer.`;
      } else if (isCountWarning) {
        this.live.statusDetail = `WARNING: Bus passenger occupancy is at ${this.live.occupancyPercent}% (approaching max ${maxCount} pax limit).`;
      } else {
        this.live.statusDetail = `WARNING: Bus gross weight is at ${this.live.weightLoadPercent}% of certified payload (${weight} kg / ${maxWeight} kg).`;
      }

      this.hardware.buzzerStatus = 'IDLE (WARNING CHIME DELIVERED)';
      this.hardware.buzzerActive = false;
      this.hardware.doorInterlockStatus = 'CAUTION (APPROACHING LIMIT)';

      if (window.busAudio) {
        window.busAudio.stopOverloadAlarm();
        if (prevStatus === 'NORMAL') {
          window.busAudio.playWarningChime();
        }
      }
    } else {
      this.live.status = 'NORMAL';
      this.live.statusMessage = 'BUS LOAD NORMAL';
      this.live.statusDetail = `All operating parameters are green. Count: ${count}/${maxCount} (${this.live.occupancyPercent}%), Weight: ${weight} kg/${maxWeight} kg (${this.live.weightLoadPercent}%).`;
      this.hardware.buzzerStatus = 'IDLE (NORMAL)';
      this.hardware.buzzerActive = false;
      this.hardware.doorInterlockStatus = 'UNLOCKED (DOORS OPERATIONAL)';

      if (window.busAudio) {
        window.busAudio.stopOverloadAlarm();
      }
    }

    // Update Peak Stats
    if (count > this.stats.peakPassengerCount) {
      this.stats.peakPassengerCount = count;
    }
    if (weight > this.stats.maxRecordedWeightKg) {
      this.stats.maxRecordedWeightKg = weight;
    }

    // Update Live 16x2 LCD Text Buffer
    this.updateLcdBuffer();

    // Time series for live trend chart
    this.stats.timeSeries.push({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      count: count,
      weight: weight
    });
    if (this.stats.timeSeries.length > 20) {
      this.stats.timeSeries.shift();
    }

    this.live.lastUpdated = new Date().toLocaleTimeString();
    this.hardware.lastHeartbeat = this.live.lastUpdated;
    this.hardware.packetsReceived += 1;
  }

  // Update virtual 16x2 LCD line buffers
  updateLcdBuffer() {
    const count = this.live.passengerCount;
    const maxCount = this.config.maxPassengerCapacity;
    const weight = Math.round(this.live.totalWeightKg);

    // Format Line 1: 16 characters e.g. "P:24/50  W:1680k"
    const countPart = `P:${String(count).padStart(2, '0')}/${maxCount}`;
    const weightPart = `W:${String(weight).padStart(4, ' ')}k`;
    this.hardware.lcdLine1 = `${countPart.padEnd(8, ' ')}${weightPart.padStart(8, ' ')}`.slice(0, 16);

    // Format Line 2: 16 characters e.g. "STATUS: NORMAL  " or "STATUS: OVERLOAD"
    let statusText = 'NORMAL  ';
    if (this.live.status === 'OVERLOAD') {
      statusText = 'OVERLOAD';
    } else if (this.live.status === 'WARNING') {
      statusText = 'WARNING ';
    }
    this.hardware.lcdLine2 = `STATUS: ${statusText}`.padEnd(16, ' ').slice(0, 16);
  }

  recordIncident(cause, count, weight) {
    const newInc = {
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      cause: cause,
      passengerCount: count,
      totalWeightKg: weight,
      maxAllowedWeight: this.config.maxPermittedWeightKg,
      severity: 'CRITICAL',
      actionTaken: 'Emergency Piezo Buzzer Fired; Interlock Engaged; Transit Audit Dispatched',
      resolved: false
    };

    this.incidents.unshift(newInc);
    if (this.incidents.length > 50) this.incidents.pop();
    this.stats.overloadIncidentCount += 1;
    this.saveIncidents();
  }

  // =========================================================================
  // PASSENGER ENTRY & EXIT CONTROLS (IR SENSORS & LOAD CELLS)
  // =========================================================================

  // Control 1: Add Passenger
  passengerEnter(customWeight = null) {
    // Generate realistic weight between 35 kg and 100 kg
    const pWeight = customWeight !== null ? customWeight : this.generatePassengerWeight();
    
    // Assign seat (1 to 40) or standing in aisle
    const nextSeat = this.passengers.length < 40 ? this.passengers.length + 1 : 'Aisle';

    const newPassenger = {
      id: `PAX-${String(this.passengerIdCounter++).padStart(3, '0')}`,
      weight: pWeight,
      seatNumber: nextSeat,
      isStanding: nextSeat === 'Aisle',
      enteredAt: new Date().toLocaleTimeString(),
      stopName: this.routeStops[this.currentStopIndex].name
    };

    this.passengers.push(newPassenger);
    this.live.lastPassengerEntered = newPassenger;
    this.stats.totalEnteredToday += 1;

    // Trigger IR Sensor 1 (Entry) beam interruption animation & GPIO 18 state change
    this.hardware.irEntryStatus = 'BEAM BROKEN (GPIO 18 - LOW / PAX ENTER)';
    this.hardware.irEntryTripped = true;
    setTimeout(() => {
      this.hardware.irEntryStatus = 'BEAM INTACT (GPIO 18 - HIGH)';
      this.hardware.irEntryTripped = false;
      this.notify();
    }, 600);

    // Audio chime
    if (window.busAudio) {
      window.busAudio.playPassengerEnter();
    }

    this.evaluateStatus();
    this.notify();
    return newPassenger;
  }

  // Control 2: Remove Passenger
  passengerExit() {
    // Guard: Do not allow passenger count to become negative!
    if (this.passengers.length <= 0) {
      if (window.showAppNotification) {
        window.showAppNotification('Bus is Empty', 'Passenger count is already 0. Cannot remove passenger.', 'info');
      }
      return null;
    }

    // When a passenger exits:
    // Decrease total passenger weight using the exiting passenger's stored weight!
    // We pick the passenger at the front of the exit queue or a random onboard passenger
    const exitingPax = this.passengers.shift();
    this.live.lastPassengerExited = exitingPax;
    this.stats.totalExitedToday += 1;

    // Re-index remaining seat numbers for neat visual presentation
    this.passengers.forEach((p, idx) => {
      p.seatNumber = idx < 40 ? idx + 1 : 'Aisle';
      p.isStanding = idx >= 40;
    });

    // Trigger IR Sensor 2 (Exit) beam interruption & GPIO 19 state change
    this.hardware.irExitStatus = 'BEAM BROKEN (GPIO 19 - LOW / PAX EXIT)';
    this.hardware.irExitTripped = true;
    setTimeout(() => {
      this.hardware.irExitStatus = 'BEAM INTACT (GPIO 19 - HIGH)';
      this.hardware.irExitTripped = false;
      this.notify();
    }, 600);

    // Audio chime
    if (window.busAudio) {
      window.busAudio.playPassengerExit();
    }

    this.evaluateStatus();
    this.notify();
    return exitingPax;
  }

  // Control 3: Add 5 Passengers (Rapid boarding batch)
  addFivePassengers() {
    let added = 0;
    const interval = setInterval(() => {
      if (added < 5) {
        this.passengerEnter();
        added++;
      } else {
        clearInterval(interval);
      }
    }, 180);
  }

  // Control 4: Remove 5 Passengers (Rapid alighting batch)
  removeFivePassengers() {
    let removed = 0;
    const interval = setInterval(() => {
      if (removed < 5 && this.passengers.length > 0) {
        this.passengerExit();
        removed++;
      } else {
        clearInterval(interval);
      }
    }, 180);
  }

  // Control 5: Start Simulation (Autonomous Route Transit)
  startSimulation() {
    if (this.isSimulationRunning) return;
    this.isSimulationRunning = true;

    // Run first step immediately
    this.simulateBusStopArrival();

    // Schedule periodic stop arrivals
    this.simulationTimer = setInterval(() => {
      this.simulateBusStopArrival();
    }, this.config.simulationIntervalMs);

    this.notify();
  }

  // Control 6: Pause Simulation
  pauseSimulation() {
    if (!this.isSimulationRunning) return;
    this.isSimulationRunning = false;
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
    this.notify();
  }

  // Control 7: Reset Simulation
  resetSimulation() {
    this.pauseSimulation();
    this.passengers = [];
    this.passengerIdCounter = 1;
    this.live.lastPassengerEntered = null;
    this.live.lastPassengerExited = null;
    this.currentStopIndex = 0;
    this.recalculateTotals();
    this.evaluateStatus();
    this.notify();
  }

  // Reset to typical normal load (for testing)
  resetToNormalScenario() {
    this.pauseSimulation();
    this.initPreloadedPassengers(Math.round(this.config.maxPassengerCapacity * 0.55));
    this.evaluateStatus();
    this.notify();
  }

  // Force overload scenario (for testing)
  triggerOverloadScenario() {
    this.pauseSimulation();
    // Exceed both headcount limit and weight limit
    const targetCount = this.config.maxPassengerCapacity + 6;
    this.passengers = [];
    this.passengerIdCounter = 1;
    for (let i = 0; i < targetCount; i++) {
      // Slightly heavier weights to guarantee weight overload
      const w = Math.round((70 + Math.random() * 25) * 10) / 10;
      this.passengers.push({
        id: `PAX-${String(this.passengerIdCounter++).padStart(3, '0')}`,
        weight: w,
        seatNumber: i < 40 ? i + 1 : 'Aisle',
        isStanding: i >= 40,
        enteredAt: new Date().toLocaleTimeString(),
        stopName: this.routeStops[this.currentStopIndex].name
      });
    }
    this.evaluateStatus();
    this.notify();
  }

  // Simulate arrival at next transit bus stop
  simulateBusStopArrival() {
    this.currentStopIndex = (this.currentStopIndex + 1) % this.routeStops.length;
    const stop = this.routeStops[this.currentStopIndex];

    const inRange = stop.expectedIn;
    const outRange = stop.expectedOut;
    const numIn = Math.floor(Math.random() * (inRange[1] - inRange[0] + 1)) + inRange[0];
    const numOut = Math.floor(Math.random() * (outRange[1] - outRange[0] + 1)) + outRange[0];

    // Passengers exit first
    let exited = 0;
    const exitInterval = setInterval(() => {
      if (exited < numOut && this.passengers.length > 0) {
        this.passengerExit();
        exited++;
      } else {
        clearInterval(exitInterval);

        // Passengers enter after alighting completes
        let entered = 0;
        const enterInterval = setInterval(() => {
          if (entered < numIn) {
            this.passengerEnter();
            entered++;
          } else {
            clearInterval(enterInterval);
          }
        }, 250);
      }
    }, 200);

    if (window.showAppNotification) {
      window.showAppNotification(
        `Arrived at Stop: ${stop.name}`,
        `Boarding: ~${numIn} pax | Alighting: ~${numOut} pax`,
        'info'
      );
    }
  }

  // Calibrate Load Cell / Tare Zero
  tareScale() {
    // Zero out offset
    this.hardware.hx711Status = 'TARED (OFFSET: 0.0 kg - ZEROED)';
    this.evaluateStatus();
    this.notify();
    setTimeout(() => {
      this.hardware.hx711Status = 'CALIBRATED & ONLINE (24-bit ADC)';
      this.notify();
    }, 1500);
  }
}

// Global state instance
window.busState = new BusStateManager();
