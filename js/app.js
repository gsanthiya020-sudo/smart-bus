/**
 * SMART BUS OVERLOAD DETECTION & PASSENGER COUNTING SYSTEM
 * Main Application Controller & UI Binder
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
  setupAdminConfigModal();
  setupAudioControls();
  setupHardwareControls();
  setupLiveClock();

  // Initial UI Render
  updateUI(window.busState);

  // Initialize Charts once DOM is ready
  setTimeout(() => {
    if (window.busCharts) {
      window.busCharts.init();
    }
    if (window.busReports) {
      window.busReports.renderIncidentsTable();
    }
  }, 200);
});

// =========================================================================
// NAVIGATION TABS CONTROLLER
// =========================================================================
function setupNavigation() {
  const navLinks = document.querySelectorAll('[data-tab-target]');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const mobileMenuBtn = document.getElementById('btnMobileMenu');
  const sidebar = document.getElementById('sidebar');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-tab-target');

      // Update Nav Link Active States
      navLinks.forEach(l => {
        l.classList.remove('bg-blue-600/30', 'text-cyan-300', 'border-cyan-400');
        l.classList.add('text-slate-400', 'hover:bg-slate-800/60', 'hover:text-slate-200');
      });

      // Highlight active nav links (both desktop and mobile)
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

      // Refresh charts or reports if navigating to their tab
      if (targetId === 'tab-stats' && window.busCharts) {
        setTimeout(() => window.busCharts.update(), 100);
      }
      if (targetId === 'tab-reports' && window.busReports) {
        window.busReports.renderIncidentsTable();
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
  const { config, live, stats, hardware } = state;
  const status = live.status; // 'NORMAL' | 'WARNING' | 'OVERLOAD'

  // 1. TOP HEADER & STATUS BANNER
  updateHeaderAndBadges(state);

  // 2. PASSENGER METRICS (SECTION 3)
  updatePassengerMetrics(state);

  // 3. WEIGHT METRICS & GAUGE (SECTION 4)
  updateWeightMetrics(state);

  // 4. OVERLOAD ALERT BANNER & NOTIFICATION (SECTION 5)
  updateAlertSystem(state);

  // 5. PASSENGER STATISTICS (SECTION 6)
  updateStatisticsCards(state);

  // 6. BUS INFORMATION FIELDS (SECTION 7)
  updateBusInfoDisplays(state);

  // 7. HARDWARE STATUS & LCD READOUT (SECTION 9)
  updateHardwareDisplays(state);

  // 8. BUS SEATING & HEATMAP BLUEPRINT
  updateBusSeatMap(state);

  // 9. REPORTS SUMMARY METRICS (SECTION 8)
  updateReportsSummary(state);
}

// Header Badges & Pill Updates
function updateHeaderAndBadges(state) {
  const { live, config } = state;
  const statusPill = document.getElementById('headerStatusPill');
  const statusDot = document.getElementById('headerStatusDot');
  const statusText = document.getElementById('headerStatusText');
  const busRoutePill = document.getElementById('headerBusRoutePill');

  if (busRoutePill) {
    busRoutePill.textContent = `${config.busNumber} • ${config.routeNumber}`;
  }

  if (statusPill && statusDot && statusText) {
    statusPill.className = 'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wider transition-all duration-300';
    statusDot.className = 'w-2.5 h-2.5 rounded-full';

    if (live.status === 'OVERLOAD') {
      statusPill.classList.add('bg-rose-500/20', 'text-rose-300', 'border', 'border-rose-500/50', 'badge-overload-pulse');
      statusDot.classList.add('bg-rose-500');
      statusText.textContent = 'OVERLOAD DETECTED';
    } else if (live.status === 'WARNING') {
      statusPill.classList.add('bg-amber-500/20', 'text-amber-300', 'border', 'border-amber-500/50', 'badge-warning-pulse');
      statusDot.classList.add('bg-amber-400');
      statusText.textContent = 'APPROACHING CAPACITY';
    } else {
      statusPill.classList.add('bg-emerald-500/20', 'text-emerald-300', 'border', 'border-emerald-500/50', 'badge-normal-pulse');
      statusDot.classList.add('bg-emerald-400');
      statusText.textContent = 'BUS LOAD NORMAL';
    }
  }
}

// Section 3: Live Passenger Monitoring
function updatePassengerMetrics(state) {
  const { live, config } = state;

  // Digital Passenger Counters
  document.querySelectorAll('.val-passenger-count').forEach(el => {
    el.textContent = live.passengerCount;
  });
  document.querySelectorAll('.val-max-capacity').forEach(el => {
    el.textContent = config.maxPassengerCapacity;
  });
  document.querySelectorAll('.val-available-capacity').forEach(el => {
    el.textContent = live.availableCapacity;
  });
  document.querySelectorAll('.val-occupancy-percent').forEach(el => {
    el.textContent = `${live.occupancyPercent}%`;
  });

  // Progress Bar for Passenger Occupancy
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
}

// Section 4: Weight Monitoring
function updateWeightMetrics(state) {
  const { live, config } = state;

  document.querySelectorAll('.val-current-weight').forEach(el => {
    el.textContent = Math.round(live.totalWeightKg).toLocaleString();
  });
  document.querySelectorAll('.val-max-weight').forEach(el => {
    el.textContent = Number(config.maxPermittedWeightKg).toLocaleString();
  });
  document.querySelectorAll('.val-weight-percent').forEach(el => {
    el.textContent = `${live.weightLoadPercent}%`;
  });

  // Weight Status Badge
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

  // Weight Progress Bar
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

  // Update Axle Load Dynamic Numbers
  const frontEl = document.getElementById('valFrontAxleLive');
  const rearEl = document.getElementById('valRearAxleLive');
  if (frontEl) frontEl.textContent = Math.round(live.frontAxleWeightKg).toLocaleString();
  if (rearEl) rearEl.textContent = Math.round(live.rearAxleWeightKg).toLocaleString();

  // SVG Radial Gauge for Load Percentage
  updateRadialGauge(live.weightLoadPercent);
}

function updateRadialGauge(percentage) {
  const circle = document.getElementById('radialGaugeCircle');
  const textVal = document.getElementById('radialGaugeText');
  if (!circle || !textVal) return;

  const radius = 68;
  const circumference = 2 * Math.PI * radius; // ~427.25
  const clamped = Math.min(130, Math.max(0, percentage));
  // Display up to 100% on circle track, offset appropriately
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

// Section 5: Overload Detection & Warning System
function updateAlertSystem(state) {
  const { live } = state;
  const banner = document.getElementById('mainOverloadBanner');
  const bannerTitle = document.getElementById('bannerTitle');
  const bannerDetail = document.getElementById('bannerDetail');
  const bannerIcon = document.getElementById('bannerIcon');

  if (!banner || !bannerTitle || !bannerDetail) return;

  if (live.status === 'OVERLOAD') {
    banner.classList.remove('hidden', 'bg-emerald-950/40', 'border-emerald-500/30', 'bg-amber-950/40', 'border-amber-500/30');
    banner.classList.add('emergency-banner-active', 'border-rose-500/60');
    bannerTitle.textContent = 'OVERLOAD DETECTED - IMMEDIATE ACTION REQUIRED';
    bannerTitle.className = 'text-lg font-bold text-rose-300';
    bannerDetail.textContent = live.statusDetail;
    if (bannerIcon) bannerIcon.className = 'w-8 h-8 text-rose-400 animate-bounce';
  } else if (live.status === 'WARNING') {
    banner.classList.remove('hidden', 'emergency-banner-active', 'bg-emerald-950/40', 'border-emerald-500/30', 'border-rose-500/60');
    banner.classList.add('bg-amber-950/40', 'border', 'border-amber-500/40');
    bannerTitle.textContent = 'WARNING: BUS APPROACHING CAPACITY';
    bannerTitle.className = 'text-lg font-bold text-amber-300';
    bannerDetail.textContent = live.statusDetail;
    if (bannerIcon) bannerIcon.className = 'w-8 h-8 text-amber-400';
  } else {
    // Normal state banner
    banner.classList.remove('emergency-banner-active', 'border-rose-500/60', 'bg-amber-950/40', 'border-amber-500/40');
    banner.classList.add('bg-emerald-950/30', 'border', 'border-emerald-500/25');
    bannerTitle.textContent = 'BUS LOAD NORMAL';
    bannerTitle.className = 'text-lg font-bold text-emerald-300';
    bannerDetail.textContent = live.statusDetail;
    if (bannerIcon) bannerIcon.className = 'w-8 h-8 text-emerald-400';
  }

  // Update Alert Log Count in Quick Badge
  const alertCountBadge = document.getElementById('overloadCountBadge');
  if (alertCountBadge) {
    alertCountBadge.textContent = state.stats.overloadIncidentCount;
  }
}

// Section 6: Passenger Statistics
function updateStatisticsCards(state) {
  const { stats, live } = state;

  document.querySelectorAll('.val-entered-today').forEach(el => el.textContent = stats.totalEnteredToday);
  document.querySelectorAll('.val-exited-today').forEach(el => el.textContent = stats.totalExitedToday);
  document.querySelectorAll('.val-peak-count').forEach(el => el.textContent = stats.peakPassengerCount);
  document.querySelectorAll('.val-max-weight-recorded').forEach(el => el.textContent = `${Math.round(stats.maxRecordedWeightKg)} kg`);

  // Average Passenger Weight: Dynamic calculate (totalWeight / passengerCount)
  const avgWeight = live.passengerCount > 0 ? (live.totalWeightKg / live.passengerCount).toFixed(1) : '68.0';
  document.querySelectorAll('.val-avg-passenger-weight').forEach(el => {
    el.textContent = `${avgWeight} kg`;
  });
}

// Section 7: Bus Information
function updateBusInfoDisplays(state) {
  const { config } = state;
  document.querySelectorAll('.val-bus-number').forEach(el => el.textContent = config.busNumber);
  document.querySelectorAll('.val-route-number').forEach(el => el.textContent = config.routeNumber);
  document.querySelectorAll('.val-starting-point').forEach(el => el.textContent = config.startingPoint);
  document.querySelectorAll('.val-destination').forEach(el => el.textContent = config.destination);
  document.querySelectorAll('.val-driver-name').forEach(el => el.textContent = config.driverName);
  document.querySelectorAll('.val-conductor-name').forEach(el => el.textContent = config.conductorName);
  document.querySelectorAll('.val-bus-model').forEach(el => el.textContent = config.busModel);
}

// Section 9: Hardware Status & 16x2 LCD
function updateHardwareDisplays(state) {
  const { hardware } = state;

  // LCD Readout Lines
  if (window.busHardware) {
    window.busHardware.updateVirtualLCD();
    const line1El = document.getElementById('lcdLine1');
    const line2El = document.getElementById('lcdLine2');
    if (line1El && line2El) {
      line1El.textContent = window.busHardware.lcdBuffer.line1;
      line2El.textContent = window.busHardware.lcdBuffer.line2;
    }
  }

  // Hardware Status Badges
  const espBadge = document.getElementById('hwEsp32Status');
  if (espBadge) espBadge.textContent = hardware.esp32Status;

  const hx711Badge = document.getElementById('hwHx711Status');
  if (hx711Badge) hx711Badge.textContent = hardware.hx711Status;

  const irInBadge = document.getElementById('hwIrEntryStatus');
  if (irInBadge) {
    irInBadge.textContent = hardware.irEntryStatus;
    if (hardware.irEntryStatus.includes('INTERRUPTED')) {
      irInBadge.classList.add('bg-cyan-500/30', 'text-cyan-200');
    } else {
      irInBadge.classList.remove('bg-cyan-500/30', 'text-cyan-200');
    }
  }

  const irOutBadge = document.getElementById('hwIrExitStatus');
  if (irOutBadge) {
    irOutBadge.textContent = hardware.irExitStatus;
    if (hardware.irExitStatus.includes('INTERRUPTED')) {
      irOutBadge.classList.add('bg-amber-500/30', 'text-amber-200');
    } else {
      irOutBadge.classList.remove('bg-amber-500/30', 'text-amber-200');
    }
  }

  const buzzerBadge = document.getElementById('hwBuzzerStatus');
  if (buzzerBadge) buzzerBadge.textContent = hardware.buzzerStatus;

  const modeBadge = document.getElementById('telemetryModeBadge');
  if (modeBadge) {
    modeBadge.textContent = hardware.isSimulated ? 'MODE: SIMULATED SENSORS' : 'MODE: PHYSICAL HARDWARE BRIDGE';
    modeBadge.className = hardware.isSimulated 
      ? 'px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40'
      : 'px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
  }
}

// Visual Bus Schematic: Passenger Seating & Heatmap
function updateBusSeatMap(state) {
  const container = document.getElementById('busSeatsGrid');
  if (!container) return;

  const count = state.live.passengerCount;
  const maxSeats = 40; // 40 seated capacity
  const standing = Math.max(0, count - maxSeats);

  let html = '';
  for (let i = 1; i <= maxSeats; i++) {
    const isOccupied = i <= count;
    let seatClass = 'seat-empty';
    if (isOccupied) {
      if (state.live.status === 'OVERLOAD') {
        seatClass = 'seat-overload';
      } else if (state.live.status === 'WARNING') {
        seatClass = 'seat-occupied';
      } else {
        seatClass = 'seat-occupied';
      }
    }
    html += `<div class="seat-pill ${seatClass}" title="Seat #${i}: ${isOccupied ? 'Occupied' : 'Vacant'}">${i}</div>`;
  }
  container.innerHTML = html;

  // Standing Aisle Indicator
  const standingEl = document.getElementById('standingPassengersDisplay');
  if (standingEl) {
    if (standing > 0) {
      const overloadPills = Array.from({ length: standing }, (_, idx) => 
        `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${state.live.status === 'OVERLOAD' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-900'}">P${idx + 1}</span>`
      ).join(' ');
      standingEl.innerHTML = `<span class="text-xs text-amber-300 font-semibold mr-2">${standing} Aisle Standing:</span> ${overloadPills}`;
    } else {
      standingEl.innerHTML = `<span class="text-xs text-slate-500 italic">No passengers currently standing in the aisle.</span>`;
    }
  }
}

// Section 8: Reports Summary
function updateReportsSummary(state) {
  const { stats } = state;
  const repCount = document.getElementById('repDailyCount');
  const repIncidents = document.getElementById('repIncidentsCount');
  const repMaxWeight = document.getElementById('repMaxWeight');
  const repAvgOcc = document.getElementById('repAvgOccupancy');

  if (repCount) repCount.textContent = stats.totalEnteredToday;
  if (repIncidents) repIncidents.textContent = stats.overloadIncidentCount;
  if (repMaxWeight) repMaxWeight.textContent = `${Math.round(stats.maxRecordedWeightKg)} kg`;
  if (repAvgOcc) repAvgOcc.textContent = `${stats.averageOccupancyPercent}%`;
}

// =========================================================================
// SIMULATION QUICK CONTROLS
// =========================================================================
function setupSimulationControls() {
  const btnAddPax = document.getElementById('btnSimAddPax');
  const btnRemovePax = document.getElementById('btnSimRemovePax');
  const btnAddFivePax = document.getElementById('btnSimAddFivePax');
  const btnSimOverload = document.getElementById('btnSimOverload');
  const btnSimNormal = document.getElementById('btnSimNormal');
  const btnSimClear = document.getElementById('btnSimClear');
  const btnToggleAutoSim = document.getElementById('btnToggleAutoSim');

  if (btnAddPax) {
    btnAddPax.addEventListener('click', () => {
      window.busState.passengerEnter();
      showAppNotification('IR Sensor 1 Triggered', '1 Passenger entered (+~68 kg)', 'info');
    });
  }

  if (btnRemovePax) {
    btnRemovePax.addEventListener('click', () => {
      if (window.busState.live.passengerCount > 0) {
        window.busState.passengerExit();
        showAppNotification('IR Sensor 2 Triggered', '1 Passenger exited', 'info');
      }
    });
  }

  if (btnAddFivePax) {
    btnAddFivePax.addEventListener('click', () => {
      let count = 0;
      const interval = setInterval(() => {
        if (count < 5) {
          window.busState.passengerEnter();
          count++;
        } else {
          clearInterval(interval);
        }
      }, 150);
      showAppNotification('Rapid Boarding', '5 passengers boarded', 'info');
    });
  }

  if (btnSimOverload) {
    btnSimOverload.addEventListener('click', () => {
      window.busState.triggerOverloadScenario();
      showAppNotification('Overload Test Active', 'Capacity & Weight pushed above 100% threshold', 'danger');
    });
  }

  if (btnSimNormal) {
    btnSimNormal.addEventListener('click', () => {
      window.busState.resetToNormalScenario();
      showAppNotification('Reset to Safe Margin', 'Bus passenger count set to 55% nominal load', 'success');
    });
  }

  if (btnSimClear) {
    btnSimClear.addEventListener('click', () => {
      window.busState.clearBus();
      showAppNotification('Depot Reset', 'All passengers exited. Tare load zeroed.', 'info');
    });
  }

  if (btnToggleAutoSim) {
    btnToggleAutoSim.addEventListener('click', () => {
      const isAuto = window.busHardware.toggleAutoSimulation();
      btnToggleAutoSim.textContent = isAuto ? 'Stop Route Simulation' : 'Start Route Simulation';
      btnToggleAutoSim.className = isAuto
        ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition'
        : 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition';
      
      showAppNotification(
        isAuto ? 'Route Simulation Running' : 'Route Simulation Stopped',
        isAuto ? 'Simulating passenger stops along 335-E route.' : 'Simulation paused.',
        'info'
      );
    });
  }
}

// =========================================================================
// ADMIN SETTINGS MODAL & EDIT BUS DETAILS
// =========================================================================
function setupAdminConfigModal() {
  const modal = document.getElementById('adminConfigModal');
  const btnOpenModal = document.getElementById('btnOpenAdminConfig');
  const btnCloseModal = document.getElementById('btnCloseAdminConfig');
  const form = document.getElementById('adminConfigForm');

  if (btnOpenModal && modal) {
    btnOpenModal.addEventListener('click', () => {
      // Pre-fill form values with current state
      const { config } = window.busState;
      document.getElementById('cfgBusNumber').value = config.busNumber;
      document.getElementById('cfgRouteNumber').value = config.routeNumber;
      document.getElementById('cfgStartingPoint').value = config.startingPoint;
      document.getElementById('cfgDestination').value = config.destination;
      document.getElementById('cfgDriverName').value = config.driverName;
      document.getElementById('cfgConductorName').value = config.conductorName;
      document.getElementById('cfgBusModel').value = config.busModel;
      document.getElementById('cfgMaxCapacity').value = config.maxPassengerCapacity;
      document.getElementById('cfgMaxWeight').value = config.maxPermittedWeightKg;
      document.getElementById('cfgWarningThreshold').value = config.warningThresholdPercent;

      modal.classList.remove('hidden');
    });
  }

  if (btnCloseModal && modal) {
    btnCloseModal.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const updated = {
        busNumber: document.getElementById('cfgBusNumber').value.trim(),
        routeNumber: document.getElementById('cfgRouteNumber').value.trim(),
        startingPoint: document.getElementById('cfgStartingPoint').value.trim(),
        destination: document.getElementById('cfgDestination').value.trim(),
        driverName: document.getElementById('cfgDriverName').value.trim(),
        conductorName: document.getElementById('cfgConductorName').value.trim(),
        busModel: document.getElementById('cfgBusModel').value.trim(),
        maxPassengerCapacity: parseInt(document.getElementById('cfgMaxCapacity').value, 10),
        maxPermittedWeightKg: parseFloat(document.getElementById('cfgMaxWeight').value),
        warningThresholdPercent: parseInt(document.getElementById('cfgWarningThreshold').value, 10),
      };

      window.busState.saveConfig(updated);
      if (modal) modal.classList.add('hidden');
      showAppNotification('Settings Saved', 'Bus configuration and safety limits updated successfully.', 'success');
    });
  }
}

// =========================================================================
// AUDIO & BUZZER CONTROLS
// =========================================================================
function setupAudioControls() {
  const muteBtn = document.getElementById('btnToggleMute');
  const muteIcon = document.getElementById('audioMuteIcon');
  const muteText = document.getElementById('audioMuteText');

  const updateMuteButtonUI = () => {
    if (!muteBtn || !window.busAudio) return;
    const isMuted = window.busAudio.isMuted;
    if (isMuted) {
      if (muteText) muteText.textContent = 'Unmute Alarm';
      muteBtn.classList.remove('bg-emerald-600/30', 'text-emerald-300', 'border-emerald-500/40');
      muteBtn.classList.add('bg-slate-800', 'text-slate-400', 'border-slate-700');
    } else {
      if (muteText) muteText.textContent = 'Alarm Audio ON';
      muteBtn.classList.remove('bg-slate-800', 'text-slate-400', 'border-slate-700');
      muteBtn.classList.add('bg-emerald-600/30', 'text-emerald-300', 'border-emerald-500/40');
    }
  };

  if (muteBtn && window.busAudio) {
    updateMuteButtonUI();
    muteBtn.addEventListener('click', () => {
      window.busAudio.toggleMute();
      updateMuteButtonUI();
      showAppNotification(
        window.busAudio.isMuted ? 'Buzzer Muted' : 'Buzzer Enabled',
        window.busAudio.isMuted ? 'Audio alarms silenced.' : 'Emergency sound alert active.',
        'info'
      );
    });
  }

  // Silence Alarm Button in Alert Banner
  const btnAckAlarm = document.getElementById('btnAcknowledgeAlarm');
  if (btnAckAlarm) {
    btnAckAlarm.addEventListener('click', () => {
      if (window.busAudio) {
        window.busAudio.stopOverloadAlarm();
      }
      showAppNotification('Alarm Acknowledged', 'Driver acknowledged overload condition.', 'warning');
    });
  }
}

// =========================================================================
// HARDWARE CONTROLS & CODE VIEWER MODAL
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
        showAppNotification('Code Copied', 'Arduino/ESP32 C++ code copied to clipboard!', 'success');
      });
    });
  }

  // Toggle Hardware Mode (Simulated vs Physical)
  const modeSwitch = document.getElementById('toggleHardwareMode');
  if (modeSwitch) {
    modeSwitch.addEventListener('change', (e) => {
      const isSimulated = !e.target.checked;
      window.busHardware.setHardwareMode(isSimulated);
      showAppNotification(
        isSimulated ? 'Switched to Simulated IoT' : 'Connected to Physical Hardware Port',
        isSimulated ? 'Using synthetic sensor physics stream.' : 'Listening on COM4 Serial stream (115200 baud).',
        'info'
      );
    });
  }

  // CSV Report Download Trigger
  const btnDownloadCSV = document.getElementById('btnDownloadReportCSV');
  if (btnDownloadCSV) {
    btnDownloadCSV.addEventListener('click', () => {
      if (window.busReports) {
        window.busReports.downloadCSVReport();
      }
    });
  }
}

// Live Digital Clock
function setupLiveClock() {
  const clockEl = document.getElementById('liveDigitalClock');
  if (clockEl) {
    const updateTime = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    updateTime();
    setInterval(updateTime, 1000);
  }
}

// =========================================================================
// FLOATING TOAST NOTIFICATIONS
// =========================================================================
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

  // Trigger animation
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
