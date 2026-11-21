/**
 * SMART BUS OVERLOAD DETECTION & PASSENGER COUNTING SYSTEM
 * Main Application Controller & Dynamic UI Binder
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize State Listener
  window.busState.subscribe((state) => {
    updateUI(state);
    if (window.busCharts) {
      window.busCharts.update();
    }
  });

  // Setup Event Listeners
  setupNavigation();
  setupSimulationControls();
  setupSettingsForm();
  setupAudioControls();
  setupHardwareControls();
  setupLiveClock();

  // Initial UI Render
  updateUI(window.busState);

  // Initialize Charts & Tables once DOM is ready
  setTimeout(() => {
    if (window.busCharts) {
      window.busCharts.init();
    }
    if (window.busReports) {
      window.busReports.renderIncidentsTable();
      window.busReports.renderPassengerRosterTable();
    }
    renderRouteTimeline(window.busState);
  }, 200);
});

// =========================================================================
// NAVIGATION TABS CONTROLLER (8 SECTIONS)
// =========================================================================
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const mobileMenuBtn = document.getElementById('btnMobileMenu');
  const sidebar = document.getElementById('sidebar');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-tab-target');
      if (!targetId) return;

      // Update Nav Link Active States
      navLinks.forEach(l => {
        l.classList.remove('bg-blue-600/30', 'text-cyan-300', 'border-cyan-400');
        l.classList.add('text-slate-400', 'hover:bg-slate-800/60', 'hover:text-slate-200');
      });

      document.querySelectorAll(`[data-tab-target="${targetId}"]`).forEach(activeLink => {
        activeLink.classList.remove('text-slate-400', 'hover:bg-slate-800/60');
        activeLink.classList.add('bg-blue-600/30', 'text-cyan-300', 'border-cyan-400');
      });

      // Switch Tab Panes
      tabPanes.forEach(pane => {
        if (pane.id === targetId) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });

      // Close mobile sidebar if open
      if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.add('-translate-x-full');
      }

      // Refresh charts or tables when navigating to their respective tabs
      if (targetId === 'tab-reports' || targetId === 'tab-alerts') {
        if (window.busReports) {
          window.busReports.renderIncidentsTable();
          window.busReports.renderPassengerRosterTable();
        }
        if (window.busCharts) {
          setTimeout(() => window.busCharts.update(), 100);
        }
      } else if (targetId === 'tab-weight' || targetId === 'tab-passenger') {
        if (window.busReports) {
          window.busReports.renderPassengerRosterTable();
        }
        if (window.busCharts) {
          setTimeout(() => window.busCharts.update(), 100);
        }
      }
    });
  });

  // Mobile menu toggle
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }
}

// =========================================================================
// MAIN UI DYNAMIC UPDATE ENGINE
// =========================================================================
function updateUI(state) {
  // 1. Header & Badges
  updateHeaderAndBadges(state);

  // 2. Section 1 & Section 2: Passenger Headcount Metrics
  updatePassengerMetrics(state);

  // 3. Section 3: Weight Monitoring Metrics
  updateWeightMetrics(state);

  // 4. Section 4: Overload Detection Matrix & Alert Banners
  updateOverloadAlertSystem(state);

  // 5. Section 5: Sensor Simulation Displays (IR Sensors, 16x2 LCD, Load Cells)
  updateSensorDisplays(state);

  // 6. Section 1: Visual Bus Cabin Schematic with Human Icons
  updateBusCabinVisualization(state);

  // 7. Section 7: Reports Summary & Passenger Roster Table
  if (window.busReports) {
    window.busReports.renderPassengerRosterTable();
    window.busReports.renderIncidentsTable();
  }

  // 8. Route Stop Timeline Progress
  renderRouteTimeline(state);
}

// 1. Header Badges & Overall System Status
function updateHeaderAndBadges(state) {
  const { live, config } = state;
  const statusPill = document.getElementById('headerStatusPill');
  const statusDot = document.getElementById('headerStatusDot');
  const statusText = document.getElementById('headerStatusText');
  const busRoutePill = document.getElementById('headerBusRoutePill');
  const miniBadge = document.getElementById('overloadStatusMiniBadge');

  if (busRoutePill) {
    busRoutePill.textContent = `${config.busNumber} • ${config.routeNumber}`;
  }

  if (statusPill && statusDot && statusText) {
    statusPill.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-300';
    statusDot.className = 'w-2.5 h-2.5 rounded-full';

    if (live.status === 'OVERLOAD') {
      statusPill.classList.add('bg-rose-500/20', 'text-rose-300', 'border', 'border-rose-500/50', 'badge-overload-pulse');
      statusDot.classList.add('bg-rose-500');
      statusText.textContent = 'OVERLOAD DETECTED';
      if (miniBadge) {
        miniBadge.textContent = 'ALERT';
        miniBadge.className = 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30';
      }
    } else if (live.status === 'WARNING') {
      statusPill.classList.add('bg-amber-500/20', 'text-amber-300', 'border', 'border-amber-500/50', 'badge-warning-pulse');
      statusDot.classList.add('bg-amber-400');
      statusText.textContent = 'APPROACHING CAPACITY';
      if (miniBadge) {
        miniBadge.textContent = 'WARN';
        miniBadge.className = 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
      }
    } else {
      statusPill.classList.add('bg-emerald-500/20', 'text-emerald-300', 'border', 'border-emerald-500/50', 'badge-normal-pulse');
      statusDot.classList.add('bg-emerald-400');
      statusText.textContent = 'BUS LOAD NORMAL';
      if (miniBadge) {
        miniBadge.textContent = 'OK';
        miniBadge.className = 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      }
    }
  }

  // Sidebar dynamic vehicle values
  document.querySelectorAll('.val-bus-number').forEach(el => el.textContent = config.busNumber);
  document.querySelectorAll('.val-route-number').forEach(el => el.textContent = config.routeNumber);
  document.querySelectorAll('.val-destination').forEach(el => el.textContent = config.destination);
}

// 2. Passenger Headcount Metrics (Section 2)
function updatePassengerMetrics(state) {
  const { live, config, stats } = state;

  document.querySelectorAll('.val-passenger-count').forEach(el => el.textContent = live.passengerCount);
  document.querySelectorAll('.val-max-capacity').forEach(el => el.textContent = config.maxPassengerCapacity);
  document.querySelectorAll('.val-available-capacity').forEach(el => el.textContent = live.availableCapacity);
  document.querySelectorAll('.val-occupancy-percent').forEach(el => el.textContent = `${live.occupancyPercent}%`);
  document.querySelectorAll('.val-entered-today').forEach(el => el.textContent = stats.totalEnteredToday);
  document.querySelectorAll('.val-exited-today').forEach(el => el.textContent = stats.totalExitedToday);
  document.querySelectorAll('.val-peak-count').forEach(el => el.textContent = stats.peakPassengerCount);

  // Occupancy Progress Bar
  const occBar = document.getElementById('passengerOccupancyBar');
  if (occBar) {
    const widthVal = Math.min(100, live.occupancyPercent);
    occBar.style.width = `${widthVal}%`;
    occBar.className = 'h-full transition-all duration-500 rounded-full ';
    if (live.occupancyPercent > 100) {
      occBar.classList.add('bg-rose-500');
    } else if (live.occupancyPercent >= config.warningThresholdPercent) {
      occBar.classList.add('bg-amber-400');
    } else {
      occBar.classList.add('bg-emerald-400');
    }
  }

  // Latest passenger event spotlight card
  if (state.live.lastPassengerEntered) {
    const p = state.live.lastPassengerEntered;
    const paxId = document.getElementById('latestPaxId');
    const paxTime = document.getElementById('latestPaxTime');
    const paxWeight = document.getElementById('latestPaxWeight');
    if (paxId) paxId.textContent = p.id;
    if (paxTime) paxTime.textContent = `Boarded at ${p.stopName} (${p.enteredAt})`;
    if (paxWeight) paxWeight.textContent = `${p.weight.toFixed(1)} kg`;
  }
}

// 3. Weight Monitoring Metrics (Section 3 & 4)
function updateWeightMetrics(state) {
  const { live, config } = state;

  document.querySelectorAll('.val-current-weight').forEach(el => {
    el.textContent = Math.round(live.totalWeightKg).toLocaleString();
  });
  document.querySelectorAll('.val-max-weight').forEach(el => {
    el.textContent = Number(config.maxPermittedWeightKg).toLocaleString();
  });
  document.querySelectorAll('.val-remaining-weight').forEach(el => {
    el.textContent = `${Math.round(live.remainingWeightCapacityKg).toLocaleString()} kg`;
  });
  document.querySelectorAll('.val-avg-passenger-weight').forEach(el => {
    el.textContent = `${live.avgPassengerWeightKg} kg`;
  });
  document.querySelectorAll('.val-weight-percent').forEach(el => {
    el.textContent = `${live.weightLoadPercent}%`;
  });

  // Safe Load Status Badge
  const weightBadge = document.getElementById('weightStatusBadge');
  if (weightBadge) {
    if (live.weightLoadPercent > 100) {
      weightBadge.className = 'px-2.5 py-1 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40';
      weightBadge.textContent = 'OVERWEIGHT';
    } else if (live.weightLoadPercent >= config.warningThresholdPercent) {
      weightBadge.className = 'px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40';
      weightBadge.textContent = 'NEAR CAPACITY (80%+)';
    } else {
      weightBadge.className = 'px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
      weightBadge.textContent = 'SAFE WEIGHT LOAD';
    }
  }

  // Weight Linear Progress Bar
  const weightBar = document.getElementById('weightProgressBar');
  if (weightBar) {
    const widthVal = Math.min(100, live.weightLoadPercent);
    weightBar.style.width = `${widthVal}%`;
    weightBar.className = 'h-full transition-all duration-500 rounded-full ';
    if (live.weightLoadPercent > 100) {
      weightBar.classList.add('bg-rose-500');
    } else if (live.weightLoadPercent >= config.warningThresholdPercent) {
      weightBar.classList.add('bg-amber-400');
    } else {
      weightBar.classList.add('bg-cyan-400');
    }
  }

  // Axle Load Live Numbers
  const frontEl = document.getElementById('valFrontAxleLive');
  const rearEl = document.getElementById('valRearAxleLive');
  if (frontEl) frontEl.textContent = Math.round(live.frontAxleWeightKg).toLocaleString();
  if (rearEl) rearEl.textContent = Math.round(live.rearAxleWeightKg).toLocaleString();

  // SVG Radial Gauge
  updateRadialGauge(live.weightLoadPercent);

  // Load Cell Corner displays (FL, FR, RL, RR)
  const lc1 = document.getElementById('valLCCorner1');
  const lc2 = document.getElementById('valLCCorner2');
  const lc3 = document.getElementById('valLCCorner3');
  const lc4 = document.getElementById('valLCCorner4');
  if (lc1) lc1.textContent = Math.round(state.hardware.loadCell1Kg);
  if (lc2) lc2.textContent = Math.round(state.hardware.loadCell2Kg);
  if (lc3) lc3.textContent = Math.round(state.hardware.loadCell3Kg);
  if (lc4) lc4.textContent = Math.round(state.hardware.loadCell4Kg);
}

function updateRadialGauge(percentage) {
  const circle = document.getElementById('radialGaugeCircle');
  const textVal = document.getElementById('radialGaugeText');
  if (!circle || !textVal) return;

  const radius = 68;
  const circumference = 2 * Math.PI * radius; // ~427.25
  const clamped = Math.min(130, Math.max(0, percentage));
  const fillAmount = Math.min(100, clamped) / 100;
  const offset = circumference - (fillAmount * circumference);

  circle.style.strokeDasharray = `${circumference}`;
  circle.style.strokeDashoffset = `${offset}`;

  if (clamped > 100) {
    circle.style.stroke = '#EF4444'; // Red
  } else if (clamped >= 80) {
    circle.style.stroke = '#F59E0B'; // Orange
  } else {
    circle.style.stroke = '#10B981'; // Green
  }

  textVal.textContent = `${percentage}%`;
}

// 4. Overload Alert System & Global Banner (Section 4 & 6)
function updateOverloadAlertSystem(state) {
  const { live, config, stats } = state;
  const banner = document.getElementById('mainOverloadBanner');
  const bannerTitle = document.getElementById('bannerTitle');
  const bannerDetail = document.getElementById('bannerDetail');
  const bannerIcon = document.getElementById('bannerIcon');

  if (banner && bannerTitle && bannerDetail) {
    if (live.status === 'OVERLOAD') {
      banner.classList.remove('bg-emerald-950/30', 'border-emerald-500/25', 'bg-amber-950/40', 'border-amber-500/40');
      banner.classList.add('emergency-banner-active', 'border-rose-500/60');
      bannerTitle.textContent = 'CRITICAL OVERLOAD DETECTED - BOARDING HALTED';
      bannerTitle.className = 'text-base font-bold text-rose-300';
      bannerDetail.textContent = live.statusDetail;
      if (bannerIcon) bannerIcon.className = 'w-8 h-8 text-rose-400 animate-bounce';
    } else if (live.status === 'WARNING') {
      banner.classList.remove('emergency-banner-active', 'border-rose-500/60', 'bg-emerald-950/30', 'border-emerald-500/25');
      banner.classList.add('bg-amber-950/40', 'border', 'border-amber-500/40');
      bannerTitle.textContent = 'WARNING: BUS APPROACHING CAPACITY';
      bannerTitle.className = 'text-base font-bold text-amber-300';
      bannerDetail.textContent = live.statusDetail;
      if (bannerIcon) bannerIcon.className = 'w-8 h-8 text-amber-400';
    } else {
      banner.classList.remove('emergency-banner-active', 'border-rose-500/60', 'bg-amber-950/40', 'border-amber-500/40');
      banner.classList.add('bg-emerald-950/30', 'border', 'border-emerald-500/25');
      bannerTitle.textContent = 'BUS LOAD NORMAL';
      bannerTitle.className = 'text-base font-bold text-emerald-300';
      bannerDetail.textContent = live.statusDetail;
      if (bannerIcon) bannerIcon.className = 'w-8 h-8 text-emerald-400';
    }
  }

  // Overload Matrix Checks
  const evalCountPill = document.getElementById('evalCountStatusPill');
  const evalCountBar = document.getElementById('evalCountBar');
  const isCountOver = live.passengerCount > config.maxPassengerCapacity;
  if (evalCountPill && evalCountBar) {
    evalCountBar.style.width = `${Math.min(100, live.occupancyPercent)}%`;
    if (isCountOver) {
      evalCountPill.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40';
      evalCountPill.textContent = 'OVER CAPACITY';
      evalCountBar.className = 'h-full bg-rose-500 rounded-full';
    } else {
      evalCountPill.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
      evalCountPill.textContent = 'COMPLIANT';
      evalCountBar.className = 'h-full bg-emerald-400 rounded-full';
    }
  }

  const evalWeightPill = document.getElementById('evalWeightStatusPill');
  const evalWeightBar = document.getElementById('evalWeightBar');
  const isWeightOver = live.totalWeightKg > config.maxPermittedWeightKg;
  if (evalWeightPill && evalWeightBar) {
    evalWeightBar.style.width = `${Math.min(100, live.weightLoadPercent)}%`;
    if (isWeightOver) {
      evalWeightPill.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40';
      evalWeightPill.textContent = 'OVERWEIGHT';
      evalWeightBar.className = 'h-full bg-rose-500 rounded-full';
    } else {
      evalWeightPill.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
      evalWeightPill.textContent = 'COMPLIANT';
      evalWeightBar.className = 'h-full bg-cyan-400 rounded-full';
    }
  }

  // Automatic Door Safety Interlock Status
  const doorBadge = document.getElementById('doorInterlockBadge');
  if (doorBadge) {
    doorBadge.textContent = state.hardware.doorInterlockStatus;
    if (live.status === 'OVERLOAD') {
      doorBadge.className = 'font-mono-code font-bold text-rose-400';
    } else if (live.status === 'WARNING') {
      doorBadge.className = 'font-mono-code font-bold text-amber-400';
    } else {
      doorBadge.className = 'font-mono-code font-bold text-emerald-400';
    }
  }

  // Incidents badge
  const alertCountBadge = document.getElementById('overloadCountBadge');
  if (alertCountBadge) {
    alertCountBadge.textContent = stats.overloadIncidentCount;
  }
}

// 5. Sensor Simulation Displays (Section 5)
function updateSensorDisplays(state) {
  const { hardware } = state;

  // 16x2 Virtual LCD
  const line1El = document.getElementById('lcdLine1');
  const line2El = document.getElementById('lcdLine2');
  if (line1El) line1El.textContent = hardware.lcdLine1;
  if (line2El) line2El.textContent = hardware.lcdLine2;

  // IR Sensor 1 (Entry)
  const ir1Line = document.getElementById('ir1BeamLine');
  const ir1Interactive = document.getElementById('ir1InteractiveBeam');
  const ir1Status = document.getElementById('ir1StatusText');
  const ir1Logic = document.getElementById('ir1LogicState');
  const ir1DoorPill = document.getElementById('irEntryDoorPill');

  if (hardware.irEntryTripped) {
    if (ir1Line) ir1Line.classList.add('tripped');
    if (ir1Interactive) ir1Interactive.classList.add('tripped');
    if (ir1Status) {
      ir1Status.textContent = 'BEAM BROKEN (0V - INTERRUPT)';
      ir1Status.className = 'text-[11px] font-mono-code font-bold text-rose-400 mb-1';
    }
    if (ir1Logic) ir1Logic.textContent = 'LOW (0V - Passenger Breaking Beam)';
    if (ir1DoorPill) {
      ir1DoorPill.textContent = 'IR1: BROKEN (PAX IN)';
      ir1DoorPill.className = 'pin-badge text-rose-400';
    }
  } else {
    if (ir1Line) ir1Line.classList.remove('tripped');
    if (ir1Interactive) ir1Interactive.classList.remove('tripped');
    if (ir1Status) {
      ir1Status.textContent = 'BEAM INTACT (3.3V)';
      ir1Status.className = 'text-[11px] font-mono-code font-bold text-emerald-400 mb-1';
    }
    if (ir1Logic) ir1Logic.textContent = 'HIGH (3.3V - Normal)';
    if (ir1DoorPill) {
      ir1DoorPill.textContent = 'IR1: INTACT (GPIO 18)';
      ir1DoorPill.className = 'pin-badge text-emerald-400';
    }
  }

  // IR Sensor 2 (Exit)
  const ir2Line = document.getElementById('ir2BeamLine');
  const ir2Interactive = document.getElementById('ir2InteractiveBeam');
  const ir2Status = document.getElementById('ir2StatusText');
  const ir2Logic = document.getElementById('ir2LogicState');
  const ir2DoorPill = document.getElementById('irExitDoorPill');

  if (hardware.irExitTripped) {
    if (ir2Line) ir2Line.classList.add('tripped');
    if (ir2Interactive) ir2Interactive.classList.add('tripped');
    if (ir2Status) {
      ir2Status.textContent = 'BEAM BROKEN (0V - INTERRUPT)';
      ir2Status.className = 'text-[11px] font-mono-code font-bold text-rose-400 mb-1';
    }
    if (ir2Logic) ir2Logic.textContent = 'LOW (0V - Passenger Exiting)';
    if (ir2DoorPill) {
      ir2DoorPill.textContent = 'IR2: BROKEN (PAX OUT)';
      ir2DoorPill.className = 'pin-badge text-rose-400';
    }
  } else {
    if (ir2Line) ir2Line.classList.remove('tripped');
    if (ir2Interactive) ir2Interactive.classList.remove('tripped');
    if (ir2Status) {
      ir2Status.textContent = 'BEAM INTACT (3.3V)';
      ir2Status.className = 'text-[11px] font-mono-code font-bold text-emerald-400 mb-1';
    }
    if (ir2Logic) ir2Logic.textContent = 'HIGH (3.3V - Normal)';
    if (ir2DoorPill) {
      ir2DoorPill.textContent = 'IR2: INTACT (GPIO 19)';
      ir2DoorPill.className = 'pin-badge text-emerald-400';
    }
  }

  // HX711 Readout values
  const rawAdc = document.getElementById('hx711RawAdcValue');
  const voltMv = document.getElementById('hx711VoltageMvValue');
  if (rawAdc) rawAdc.textContent = hardware.hx711RawAdc.toLocaleString();
  if (voltMv) voltMv.textContent = `${hardware.hx711VoltageMv} mV`;
}

// Global hook for live sensor noise ticker in hardware.js
window.updateHardwareSensorsUI = () => {
  if (window.busState) {
    updateSensorDisplays(window.busState);
    const lc1 = document.getElementById('valLCCorner1');
    const lc2 = document.getElementById('valLCCorner2');
    const lc3 = document.getElementById('valLCCorner3');
    const lc4 = document.getElementById('valLCCorner4');
    if (lc1) lc1.textContent = Math.round(window.busState.hardware.loadCell1Kg);
    if (lc2) lc2.textContent = Math.round(window.busState.hardware.loadCell2Kg);
    if (lc3) lc3.textContent = Math.round(window.busState.hardware.loadCell3Kg);
    if (lc4) lc4.textContent = Math.round(window.busState.hardware.loadCell4Kg);
  }
};

// =========================================================================
// 6. BUS VISUAL SCHEMATIC WITH HUMAN ICONS (SECTION 3 CORE REQUIREMENT)
// =========================================================================
function updateBusCabinVisualization(state) {
  const container = document.getElementById('busSeatsVisualGrid');
  if (!container) return;

  const passengers = state.passengers;
  const maxSeats = 40; // 40 seated capacity
  const standingPassengers = passengers.slice(maxSeats);

  let html = '';

  // Render 40 seats (10 rows x 4 seats: Seat 1,2 on Left, Aisle, Seat 3,4 on Right)
  for (let i = 1; i <= maxSeats; i++) {
    const isOccupied = i <= passengers.length;
    const pax = isOccupied ? passengers[i - 1] : null;

    let seatClass = 'seat-empty';
    if (isOccupied) {
      if (state.live.status === 'OVERLOAD') {
        seatClass = 'seat-overload';
      } else {
        seatClass = 'seat-occupied';
      }
    }

    if (isOccupied && pax) {
      // SVG Human Figure Icon (Head & Torso) + Passenger Weight label
      html += `
        <div class="seat-unit ${seatClass}" title="Seat #${i}: ${pax.id} (${pax.weight.toFixed(1)} kg)">
          <svg class="w-5 h-5 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
          </svg>
          <span class="text-[9px] font-bold font-digital tracking-tighter text-white mt-0.5 leading-none">${Math.round(pax.weight)}k</span>
          
          <!-- Tooltip with full passenger details -->
          <div class="pax-tooltip-content">
            <div class="font-bold text-cyan-300">${pax.id} (Seat #${i})</div>
            <div>Weight: <strong>${pax.weight.toFixed(1)} kg</strong></div>
            <div class="text-[10px] text-slate-400">Boarded: ${pax.enteredAt}</div>
          </div>
        </div>
      `;
    } else {
      // Empty Seat Outline with seat number
      html += `
        <div class="seat-unit seat-empty" title="Seat #${i}: Vacant">
          <svg class="w-4 h-4 opacity-30 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 19V9a4 4 0 014-4h6a4 4 0 014 4v10M5 19h14M5 19H3m16 0h2M9 13h6"/>
          </svg>
          <span class="text-[10px] font-mono-code opacity-50 mt-0.5 leading-none">#${i}</span>
        </div>
      `;
    }
  }

  container.innerHTML = html;

  // Standing Passengers in Central Aisle
  const standingEl = document.getElementById('standingPassengersDisplay');
  if (standingEl) {
    if (standingPassengers.length > 0) {
      const standingPills = standingPassengers.map(p => {
        const badgeColor = state.live.status === 'OVERLOAD' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-900';
        return `
          <div class="standing-passenger-pill ${badgeColor}" title="${p.id}: ${p.weight.toFixed(1)} kg (Standing in Aisle)">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
            </svg>
            <span>${p.id} (${Math.round(p.weight)}kg)</span>
          </div>
        `;
      }).join(' ');

      standingEl.innerHTML = `
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-amber-300 font-bold mr-1">${standingPassengers.length} Aisle Standing Passengers:</span>
          ${standingPills}
        </div>
      `;
    } else {
      standingEl.innerHTML = `<span class="text-xs text-slate-500 italic">No passengers currently standing in the aisle. All passengers seated.</span>`;
    }
  }
}

// Render Route Timeline Stepper
function renderRouteTimeline(state) {
  const container = document.getElementById('routeStopTimeline');
  const currentStopDisplay = document.getElementById('currentStopNameDisplay');
  if (!container) return;

  const stops = state.routeStops;
  const currentIdx = state.currentStopIndex;

  if (currentStopDisplay && stops[currentIdx]) {
    currentStopDisplay.textContent = stops[currentIdx].name;
  }

  container.innerHTML = stops.map((stop, idx) => {
    const isCurrent = idx === currentIdx;
    const isPast = idx < currentIdx;

    let style = 'bg-slate-900/60 border-slate-800 text-slate-500';
    let dotStyle = 'bg-slate-700';

    if (isCurrent) {
      style = 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold ring-1 ring-cyan-400/40';
      dotStyle = 'bg-cyan-400 animate-ping';
    } else if (isPast) {
      style = 'bg-slate-800/40 border-slate-700 text-slate-300';
      dotStyle = 'bg-emerald-400';
    }

    return `
      <div class="p-2 rounded-lg border ${style} flex flex-col items-center justify-center transition">
        <span class="w-1.5 h-1.5 rounded-full ${dotStyle} mb-1"></span>
        <span class="truncate w-full block text-[10px]">${stop.name}</span>
      </div>
    `;
  }).join('');
}

// =========================================================================
// SIMULATION CONTROLS SETUP (ALL 7 MANDATORY CONTROLS)
// =========================================================================
function setupSimulationControls() {
  const btnAddPax = document.getElementById('btnSimAddPax');
  const btnRemovePax = document.getElementById('btnSimRemovePax');
  const btnAddFivePax = document.getElementById('btnSimAddFivePax');
  const btnRemoveFivePax = document.getElementById('btnSimRemoveFivePax');
  const btnStartSim = document.getElementById('btnStartSimulation');
  const btnPauseSim = document.getElementById('btnPauseSimulation');
  const btnResetSim = document.getElementById('btnResetSimulation');
  const btnSimOverload = document.getElementById('btnSimOverload');

  // 1. Add Passenger
  if (btnAddPax) {
    btnAddPax.addEventListener('click', () => {
      const p = window.busState.passengerEnter();
      showAppNotification('IR Sensor 1 Triggered', `Passenger ${p.id} entered (+${p.weight.toFixed(1)} kg)`, 'info');
    });
  }

  // 2. Remove Passenger
  if (btnRemovePax) {
    btnRemovePax.addEventListener('click', () => {
      if (window.busState.live.passengerCount > 0) {
        const p = window.busState.passengerExit();
        if (p) {
          showAppNotification('IR Sensor 2 Triggered', `Passenger ${p.id} exited (-${p.weight.toFixed(1)} kg)`, 'info');
        }
      } else {
        showAppNotification('Empty Bus', 'Passenger count is already 0. Cannot remove passenger.', 'warning');
      }
    });
  }

  // 3. Add 5 Passengers
  if (btnAddFivePax) {
    btnAddFivePax.addEventListener('click', () => {
      window.busState.addFivePassengers();
      showAppNotification('Batch Boarding', '5 passengers entered via Door 1', 'info');
    });
  }

  // 4. Remove 5 Passengers
  if (btnRemoveFivePax) {
    btnRemoveFivePax.addEventListener('click', () => {
      if (window.busState.live.passengerCount > 0) {
        window.busState.removeFivePassengers();
        showAppNotification('Batch Alighting', '5 passengers departed via Door 2', 'info');
      } else {
        showAppNotification('Empty Bus', 'Passenger count is already 0.', 'warning');
      }
    });
  }

  // 5. Start Simulation
  if (btnStartSim) {
    btnStartSim.addEventListener('click', () => {
      window.busState.startSimulation();
      btnStartSim.classList.remove('bg-blue-600', 'hover:bg-blue-500');
      btnStartSim.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
      const startText = document.getElementById('startSimulationText');
      if (startText) startText.textContent = 'Sim Running...';
      showAppNotification('Autonomous Simulation Started', 'Bus is en route along 335-E stops.', 'info');
    });
  }

  // 6. Pause Simulation
  if (btnPauseSim) {
    btnPauseSim.addEventListener('click', () => {
      window.busState.pauseSimulation();
      if (btnStartSim) {
        btnStartSim.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
        btnStartSim.classList.add('bg-blue-600', 'hover:bg-blue-500');
      }
      const startText = document.getElementById('startSimulationText');
      if (startText) startText.textContent = 'Start Simulation';
      showAppNotification('Simulation Paused', 'Bus route simulation stopped.', 'info');
    });
  }

  // 7. Reset Simulation
  if (btnResetSim) {
    btnResetSim.addEventListener('click', () => {
      window.busState.resetSimulation();
      if (btnStartSim) {
        btnStartSim.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
        btnStartSim.classList.add('bg-blue-600', 'hover:bg-blue-500');
      }
      const startText = document.getElementById('startSimulationText');
      if (startText) startText.textContent = 'Start Simulation';
      showAppNotification('Simulation Reset', 'All passengers cleared. Tare load zeroed.', 'info');
    });
  }

  // Test Overload
  if (btnSimOverload) {
    btnSimOverload.addEventListener('click', () => {
      window.busState.triggerOverloadScenario();
      showAppNotification('Overload Test Active', 'Headcount and weight pushed beyond 100% threshold', 'danger');
    });
  }

  // Sensor noise switch
  const noiseSwitch = document.getElementById('toggleSensorNoise');
  if (noiseSwitch) {
    noiseSwitch.addEventListener('change', (e) => {
      window.busState.config.sensorNoiseEnabled = e.target.checked;
      showAppNotification('Sensor Noise', e.target.checked ? 'Load cell vibration noise enabled' : 'Vibration noise disabled', 'info');
    });
  }
}

// =========================================================================
// SETTINGS FORM (SECTION 8)
// =========================================================================
function setupSettingsForm() {
  const form = document.getElementById('settingsForm');
  const btnResetDefaults = document.getElementById('btnResetSettingsDefaults');

  // Populate initial values
  const populateForm = () => {
    const { config } = window.busState;
    if (document.getElementById('setBusNumber')) document.getElementById('setBusNumber').value = config.busNumber;
    if (document.getElementById('setRouteNumber')) document.getElementById('setRouteNumber').value = config.routeNumber;
    if (document.getElementById('setBusModel')) document.getElementById('setBusModel').value = config.busModel;
    if (document.getElementById('setStartingPoint')) document.getElementById('setStartingPoint').value = config.startingPoint;
    if (document.getElementById('setDestination')) document.getElementById('setDestination').value = config.destination;
    if (document.getElementById('setDriverName')) document.getElementById('setDriverName').value = config.driverName;
    if (document.getElementById('setMaxCapacity')) document.getElementById('setMaxCapacity').value = config.maxPassengerCapacity;
    if (document.getElementById('setMaxWeight')) document.getElementById('setMaxWeight').value = config.maxPermittedWeightKg;
    if (document.getElementById('setWarningThreshold')) document.getElementById('setWarningThreshold').value = config.warningThresholdPercent;
    if (document.getElementById('setNoiseLevel')) document.getElementById('setNoiseLevel').value = config.sensorNoiseLevelKg;
    if (document.getElementById('setSimInterval')) document.getElementById('setSimInterval').value = config.simulationIntervalMs;
  };

  populateForm();

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const updated = {
        busNumber: document.getElementById('setBusNumber').value.trim(),
        routeNumber: document.getElementById('setRouteNumber').value.trim(),
        busModel: document.getElementById('setBusModel').value.trim(),
        startingPoint: document.getElementById('setStartingPoint').value.trim(),
        destination: document.getElementById('setDestination').value.trim(),
        driverName: document.getElementById('setDriverName').value.trim(),
        maxPassengerCapacity: parseInt(document.getElementById('setMaxCapacity').value, 10),
        maxPermittedWeightKg: parseFloat(document.getElementById('setMaxWeight').value),
        warningThresholdPercent: parseInt(document.getElementById('setWarningThreshold').value, 10),
        sensorNoiseLevelKg: parseFloat(document.getElementById('setNoiseLevel').value),
        simulationIntervalMs: parseInt(document.getElementById('setSimInterval').value, 10),
      };

      window.busState.saveConfig(updated);
      showAppNotification('Configuration Saved', 'System safety parameters and fleet metadata updated successfully.', 'success');
    });
  }

  if (btnResetDefaults) {
    btnResetDefaults.addEventListener('click', () => {
      const defaults = {
        busNumber: 'KA-01-F-4589',
        routeNumber: 'Route 335-E Express',
        startingPoint: 'Majestic Central Bus Station',
        destination: 'ITPL Tech Park, Whitefield',
        driverName: 'R. K. Sharma (Badge #8942)',
        conductorName: 'M. Anand (Badge #7119)',
        busModel: 'Volvo 8400 Low Floor City Bus (BS-VI)',
        maxPassengerCapacity: 50,
        maxPermittedWeightKg: 3500,
        warningThresholdPercent: 80,
        sensorNoiseEnabled: true,
        sensorNoiseLevelKg: 0.6,
        simulationIntervalMs: 5000,
      };
      window.busState.saveConfig(defaults);
      populateForm();
      showAppNotification('Factory Reset', 'Settings reset to default values.', 'info');
    });
  }
}

// =========================================================================
// AUDIO & ALARM CONTROLS
// =========================================================================
function setupAudioControls() {
  const muteBtn = document.getElementById('btnToggleMute');
  const muteIcon = document.getElementById('audioMuteIcon');
  const muteText = document.getElementById('audioMuteText');

  const updateMuteUI = () => {
    if (!muteBtn || !window.busAudio) return;
    const isMuted = window.busAudio.isMuted;
    if (isMuted) {
      if (muteText) muteText.textContent = 'Unmute Alarm';
      muteBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 hover:brightness-110 transition';
    } else {
      if (muteText) muteText.textContent = 'Alarm Audio ON';
      muteBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:brightness-110 transition';
    }
  };

  if (muteBtn && window.busAudio) {
    updateMuteUI();
    muteBtn.addEventListener('click', () => {
      window.busAudio.toggleMute();
      updateMuteUI();
      showAppNotification(
        window.busAudio.isMuted ? 'Piezo Buzzer Muted' : 'Piezo Buzzer Enabled',
        window.busAudio.isMuted ? 'Audio alarms silenced.' : 'Emergency sound alert active (2.4 kHz).',
        'info'
      );
    });
  }

  // Acknowledge Alert Button
  const btnAck = document.getElementById('btnAcknowledgeAlarm');
  if (btnAck) {
    btnAck.addEventListener('click', () => {
      if (window.busAudio) {
        window.busAudio.stopOverloadAlarm();
      }
      showAppNotification('Alarm Acknowledged', 'Emergency piezo alarm silenced by conductor.', 'warning');
    });
  }
}

// =========================================================================
// HARDWARE MODAL & FIRMWARE VIEWER
// =========================================================================
function setupHardwareControls() {
  const btnViewFirmware = document.getElementById('btnViewFirmwareCode');
  const codeModal = document.getElementById('firmwareCodeModal');
  const btnCloseCodeModal = document.getElementById('btnCloseCodeModal');
  const btnCopyFirmware = document.getElementById('btnCopyFirmwareCode');
  const codeContainer = document.getElementById('firmwareCodeBlock');

  if (btnViewFirmware && codeModal && codeContainer) {
    btnViewFirmware.addEventListener('click', () => {
      codeContainer.textContent = window.busHardware.firmwareSourceCode;
      codeModal.classList.remove('hidden');
    });
  }

  if (btnCloseCodeModal && codeModal) {
    btnCloseCodeModal.addEventListener('click', () => {
      codeModal.classList.add('hidden');
    });
  }

  if (btnCopyFirmware && codeContainer) {
    btnCopyFirmware.addEventListener('click', () => {
      navigator.clipboard.writeText(codeContainer.textContent).then(() => {
        showAppNotification('Code Copied', 'ESP32 / Arduino C++ code copied to clipboard!', 'success');
      });
    });
  }
}

// Live Digital Clock
function setupLiveClock() {
  const clockEl = document.getElementById('liveDigitalClock');
  if (clockEl) {
    const updateClock = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    updateClock();
    setInterval(updateClock, 1000);
  }
}

// Floating Toast Notification Engine
function showAppNotification(title, message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  const typeStyles = {
    info: 'border-cyan-500/50 bg-slate-900/90 text-cyan-300',
    success: 'border-emerald-500/50 bg-slate-900/90 text-emerald-300',
    warning: 'border-amber-500/50 bg-slate-900/90 text-amber-300',
    danger: 'border-rose-500/50 bg-slate-900/90 text-rose-300 emergency-banner-active'
  };

  toast.className = `p-3 rounded-lg border shadow-xl flex items-start gap-3 backdrop-blur-md transform transition-all duration-300 translate-y-2 opacity-0 text-xs ${typeStyles[type] || typeStyles.info}`;
  toast.innerHTML = `
    <div class="flex-1">
      <div class="font-bold text-slate-100">${title}</div>
      <div class="text-slate-400 mt-0.5">${message}</div>
    </div>
  `;

  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-full');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
}

window.showAppNotification = showAppNotification;
