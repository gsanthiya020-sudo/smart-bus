/**
 * SMART BUS OVERLOAD DETECTION & PASSENGER COUNTING SYSTEM
 * State Management & Overload Evaluation Engine
 */

class BusStateManager {
  constructor() {
    this.STORAGE_KEY_CONFIG = 'smartbus_config_v2';
    this.STORAGE_KEY_INCIDENTS = 'smartbus_incidents_v2';
    this.STORAGE_KEY_DAILY_STATS = 'smartbus_daily_stats_v2';

    // Default Bus Configuration
    this.config = {
      busNumber: 'KA-01-F-4589',
      routeNumber: 'Route 335-E',
      startingPoint: 'Majestic Central Bus Station',
      destination: 'ITPL Tech Park, Whitefield',
      driverName: 'R. K. Sharma (Badge #8942)',
      conductorName: 'M. Anand (Badge #7119)',
      busModel: 'Volvo 8400 Low Floor City Bus (BS-VI)',
      maxPassengerCapacity: 50,
      maxPermittedWeightKg: 3500, // Safe payload weight limit
      warningThresholdPercent: 80, // Warning threshold %
      tareEmptyBusWeightKg: 10200, // Empty bus weight
    };

    // Live Sensor Readings (Simulated / Hardware bridge)
    this.live = {
      passengerCount: 24,
      totalWeightKg: 1680.0,
      frontAxleWeightKg: 780.0,
      rearAxleWeightKg: 900.0,
      availableCapacity: 26,
      occupancyPercent: 48.0,
      weightLoadPercent: 48.0,
      status: 'NORMAL', // 'NORMAL' | 'WARNING' | 'OVERLOAD'
      statusMessage: 'BUS LOAD NORMAL',
      statusDetail: 'Weight and passenger levels are well within safety regulations.',
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
      timeSeries: [] // for live charts (last 25 data points)
    };

    // Hardware Interface States
    this.hardware = {
      isSimulated: true, // true: Simulated IoT telemetry, false: Physical Hardware Stream
      esp32Status: 'CONNECTED (Wi-Fi 802.11b/g/n)',
      esp32Ip: '192.168.1.145',
      hx711Status: 'CALIBRATED & ONLINE (24-bit ADC)',
      irEntryStatus: 'READY (GPIO 18 - Beam High)',
      irExitStatus: 'READY (GPIO 19 - Beam High)',
      buzzerStatus: 'IDLE (GPIO 23)',
      lcdStatus: 'ONLINE (I2C 0x27 16x2 Display)',
      lastHeartbeat: new Date().toLocaleTimeString(),
      packetsReceived: 1845,
    };

    // Route Waypoints for Realistic Transit Simulation
    this.routeStops = [
      { name: 'Majestic Kempegowda', expectedIn: [15, 25], expectedOut: [0, 2] },
      { name: 'Corporation Circle', expectedIn: [8, 14], expectedOut: [2, 6] },
      { name: 'Richmond Circle', expectedIn: [6, 12], expectedOut: [4, 9] },
      { name: 'Trinity Circle / MG Road', expectedIn: [5, 10], expectedOut: [6, 12] },
      { name: 'Domlur Flyover', expectedIn: [7, 12], expectedOut: [5, 10] },
      { name: 'HAL Old Airport Road', expectedIn: [8, 15], expectedOut: [8, 14] },
      { name: 'Marathahalli Bridge', expectedIn: [10, 18], expectedOut: [12, 20] },
      { name: 'Kundalahalli Gate', expectedIn: [4, 9], expectedOut: [10, 16] },
      { name: 'ITPL Tech Park Terminal', expectedIn: [1, 4], expectedOut: [20, 35] },
    ];
    this.currentStopIndex = 2; // Starting at Richmond Circle

    // Incidents Log
    this.incidents = [];

    // Observers/Listeners
    this.listeners = [];

    // Initialize state from storage if available
    this.loadFromStorage();

    // Populate initial time series for charts
    this.initTimeSeries();

    // Evaluate initial state
    this.evaluateStatus();
  }

  // Subscribe to state change events
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
        // Initial mock incident for demonstration
        this.incidents = [
          {
            id: 'INC-1042',
            timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString(),
            date: new Date().toLocaleDateString(),
            cause: 'Weight Limit Exceeded',
            passengerCount: 46,
            totalWeightKg: 3590,
            maxAllowedWeight: this.config.maxPermittedWeightKg,
            severity: 'CRITICAL',
            actionTaken: 'Conductor halted boarding at Marathahalli Bridge',
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

  initTimeSeries() {
    const now = Date.now();
    for (let i = 15; i >= 0; i--) {
      const t = new Date(now - i * 4000);
      const count = Math.max(10, Math.min(48, Math.round(this.live.passengerCount + (Math.sin(i) * 5))));
      const weight = Math.round(count * 69.5);
      this.stats.timeSeries.push({
        time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        count: count,
        weight: weight
      });
    }
  }

  // =========================================================================
  // OVERLOAD DETECTION ALGORITHM (CORE REQUIREMENTS #1 & #5)
  // Evaluates BOTH passenger count AND total passenger weight against limits.
  // =========================================================================
  evaluateStatus() {
    const maxCount = Number(this.config.maxPassengerCapacity);
    const maxWeight = Number(this.config.maxPermittedWeightKg);
    const warnThreshold = Number(this.config.warningThresholdPercent) / 100;

    const count = this.live.passengerCount;
    const weight = this.live.totalWeightKg;

    // Available capacity calculation
    this.live.availableCapacity = Math.max(0, maxCount - count);
    this.live.occupancyPercent = Math.min(150, Math.round((count / maxCount) * 100 * 10) / 10);
    this.live.weightLoadPercent = Math.min(150, Math.round((weight / maxWeight) * 100 * 10) / 10);

    // Axle distribution simulation (Front 45%, Rear 55% with minor random dynamic shift)
    this.live.frontAxleWeightKg = Math.round(weight * 0.44 + (Math.random() * 4 - 2));
    this.live.rearAxleWeightKg = Math.round(weight - this.live.frontAxleWeightKg);

    const isCountOverload = count > maxCount;
    const isWeightOverload = weight > maxWeight;

    const isCountWarning = count >= (maxCount * warnThreshold);
    const isWeightWarning = weight >= (maxWeight * warnThreshold);

    const prevStatus = this.live.status;

    if (isCountOverload || isWeightOverload) {
      this.live.status = 'OVERLOAD';
      this.live.statusMessage = 'OVERLOAD DETECTED';

      if (isCountOverload && isWeightOverload) {
        this.live.statusDetail = `DANGER: Both Passenger Count (${count}/${maxCount}) & Safe Weight (${weight}kg / ${maxWeight}kg) exceeded!`;
      } else if (isCountOverload) {
        this.live.statusDetail = `CRITICAL: Passenger capacity exceeded (${count}/${maxCount} pax). Maximum safe occupancy breached!`;
      } else {
        this.live.statusDetail = `CRITICAL: Safe weight limit breached (${weight}kg / ${maxWeight}kg). Heavy luggage or overcrowding detected!`;
      }

      this.hardware.buzzerStatus = 'ACTIVE ALARM (PULSING 2.4kHz)';

      // Trigger audio alarm
      if (window.busAudio) {
        window.busAudio.startOverloadAlarm();
      }

      // Log incident if newly entered overload state
      if (prevStatus !== 'OVERLOAD') {
        this.recordIncident(
          isCountOverload && isWeightOverload ? 'Dual Capacity & Weight Breach' : (isCountOverload ? 'Count Overload' : 'Weight Overload'),
          count,
          weight
        );
      }
    } else if (isCountWarning || isWeightWarning) {
      this.live.status = 'WARNING';
      this.live.statusMessage = 'BUS APPROACHING CAPACITY';

      if (isCountWarning && isWeightWarning) {
        this.live.statusDetail = `WARNING: Both count (${count} pax) and weight (${weight}kg) have crossed the 80% safety buffer.`;
      } else if (isCountWarning) {
        this.live.statusDetail = `WARNING: Bus passenger occupancy is at ${this.live.occupancyPercent}% (approaching max limit).`;
      } else {
        this.live.statusDetail = `WARNING: Bus gross weight is at ${this.live.weightLoadPercent}% of certified payload limit.`;
      }

      this.hardware.buzzerStatus = 'IDLE (WARNING CHIME SENT)';

      if (window.busAudio) {
        window.busAudio.stopOverloadAlarm();
        if (prevStatus === 'NORMAL') {
          window.busAudio.playWarningChime();
        }
      }
    } else {
      this.live.status = 'NORMAL';
      this.live.statusMessage = 'BUS LOAD NORMAL';
      this.live.statusDetail = `All operating parameters are green. Count: ${count}/${maxCount} (${this.live.occupancyPercent}%), Weight: ${weight}kg/${maxWeight}kg (${this.live.weightLoadPercent}%).`;
      this.hardware.buzzerStatus = 'IDLE (NORMAL)';

      if (window.busAudio) {
        window.busAudio.stopOverloadAlarm();
      }
    }

    // Update peak stats
    if (count > this.stats.peakPassengerCount) {
      this.stats.peakPassengerCount = count;
    }
    if (weight > this.stats.maxRecordedWeightKg) {
      this.stats.maxRecordedWeightKg = weight;
    }

    // Update time series
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

  recordIncident(cause, count, weight) {
    const newInc = {
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      cause: cause,
      passengerCount: count,
      totalWeightKg: weight,
      maxAllowedWeight: this.config.maxPermittedWeightKg,
      severity: 'HIGH / CRITICAL',
      actionTaken: 'Audio Alarm Fired - Conductor Notified',
      resolved: false
    };

    this.incidents.unshift(newInc);
    if (this.incidents.length > 50) this.incidents.pop();
    this.stats.overloadIncidentCount += 1;
    this.saveIncidents();
  }

  // =========================================================================
  // PASSENGER ENTRY & EXIT ACTIONS (IR SENSORS)
  // =========================================================================
  passengerEnter(customWeight = null) {
    // Average passenger weight with natural Gaussian variation (60kg - 85kg)
    const pWeight = customWeight || Math.round(62 + Math.random() * 22);

    this.live.passengerCount += 1;
    this.live.totalWeightKg = Math.round((this.live.totalWeightKg + pWeight) * 10) / 10;
    this.stats.totalEnteredToday += 1;

    // Trigger IR entry sensor flash
    this.hardware.irEntryStatus = 'BEAM INTERRUPTED (Passenger Detected IN)';
    setTimeout(() => {
      this.hardware.irEntryStatus = 'READY (GPIO 18 - Beam High)';
      this.notify();
    }, 700);

    if (window.busAudio) {
      window.busAudio.playPassengerEnter();
    }

    this.evaluateStatus();
    this.notify();
  }

  passengerExit(customWeight = null) {
    if (this.live.passengerCount <= 0) return;

    // Approximate weight to remove (calculated from current average or custom)
    const avgW = this.live.passengerCount > 0 
      ? Math.round(this.live.totalWeightKg / this.live.passengerCount) 
      : 70;
    const pWeight = customWeight || Math.max(45, Math.min(105, avgW + Math.round((Math.random() - 0.5) * 10)));

    this.live.passengerCount -= 1;
    this.live.totalWeightKg = Math.max(0, Math.round((this.live.totalWeightKg - pWeight) * 10) / 10);
    this.stats.totalExitedToday += 1;

    // Trigger IR exit sensor flash
    this.hardware.irExitStatus = 'BEAM INTERRUPTED (Passenger Detected OUT)';
    setTimeout(() => {
      this.hardware.irExitStatus = 'READY (GPIO 19 - Beam High)';
      this.notify();
    }, 700);

    if (window.busAudio) {
      window.busAudio.playPassengerExit();
    }

    this.evaluateStatus();
    this.notify();
  }

  // Overload stress test scenario
  triggerOverloadScenario() {
    this.live.passengerCount = this.config.maxPassengerCapacity + 6; // Exceed count
    this.live.totalWeightKg = Math.round(this.config.maxPermittedWeightKg * 1.08); // Exceed weight
    this.stats.totalEnteredToday += 8;
    this.evaluateStatus();
    this.notify();
  }

  // Normal safe load scenario
  resetToNormalScenario() {
    this.live.passengerCount = Math.round(this.config.maxPassengerCapacity * 0.55);
    this.live.totalWeightKg = Math.round(this.live.passengerCount * 69);
    this.evaluateStatus();
    this.notify();
  }

  // Clear all passengers (Bus at depot)
  clearBus() {
    this.live.passengerCount = 0;
    this.live.totalWeightKg = 0;
    this.evaluateStatus();
    this.notify();
  }
}

// Global state instance
window.busState = new BusStateManager();
