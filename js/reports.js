/**
 * SMART BUS OVERLOAD DETECTION & PASSENGER COUNTING SYSTEM
 * Reports Generation & CSV Export Utility
 * 
 * Generates transit compliance audit logs, onboard passenger weight manifests,
 * and comprehensive CSV reports for engineering evaluation.
 */

class BusReportsManager {
  constructor() {
    this.filterStatus = 'ALL';
  }

  // Generate CSV and trigger browser download
  downloadCSVReport() {
    if (!window.busState) return;

    const incidents = window.busState.incidents;
    const config = window.busState.config;
    const stats = window.busState.stats;
    const live = window.busState.live;
    const passengers = window.busState.passengers;
    const today = new Date().toISOString().split('T')[0];

    // CSV Headers & Meta Information
    let csv = "data:text/csv;charset=utf-8,";
    
    // Header block
    csv += "SMART BUS OVERLOAD DETECTION AND PASSENGER COUNTING SYSTEM\n";
    csv += "ECE IoT Engineering Project Simulation - Compliance & Telematics Audit Report\n";
    csv += `Report Generated At,${new Date().toLocaleString()}\n`;
    csv += `Bus Registration Number,${config.busNumber}\n`;
    csv += `Route Number,${config.routeNumber} (${config.startingPoint} -> ${config.destination})\n`;
    csv += `Assigned Driver,${config.driverName}\n`;
    csv += `Assigned Conductor,${config.conductorName}\n`;
    csv += `Max Permitted Headcount,${config.maxPassengerCapacity} Passengers\n`;
    csv += `Max Certified Payload Weight,${config.maxPermittedWeightKg} kg\n`;
    csv += `Warning Buffer Threshold,${config.warningThresholdPercent}%\n\n`;

    // Section 1: Real-time Telemetry Snapshot
    csv += "--- CURRENT LIVE TELEMETRY SNAPSHOT ---\n";
    csv += "Metric,Current Reading,Unit,Operating Safety Status\n";
    csv += `Passenger Count,${live.passengerCount},Persons,${live.passengerCount > config.maxPassengerCapacity ? 'OVERLOAD' : 'NORMAL'}\n`;
    csv += `Total Payload Weight,${live.totalWeightKg},kg,${live.totalWeightKg > config.maxPermittedWeightKg ? 'OVERLOAD' : 'NORMAL'}\n`;
    csv += `Average Passenger Weight,${live.avgPassengerWeightKg},kg,Calculated Mean\n`;
    csv += `Remaining Weight Capacity,${live.remainingWeightCapacityKg},kg,Payload Headroom\n`;
    csv += `Front Axle Load (Load Cells 1+2),${live.frontAxleWeightKg},kg,Balanced\n`;
    csv += `Rear Axle Load (Load Cells 3+4),${live.rearAxleWeightKg},kg,Balanced\n`;
    csv += `Chassis Safety Status,${live.status},-,${live.statusMessage}\n\n`;

    // Section 2: Daily Performance Summary
    csv += "--- DAILY PERFORMANCE SUMMARY ---\n";
    csv += "Summary Metric,Daily Value\n";
    csv += `Total Passengers Boarded (IR 1),${stats.totalEnteredToday}\n`;
    csv += `Total Passengers Alighted (IR 2),${stats.totalExitedToday}\n`;
    csv += `Peak Simultaneous Headcount,${stats.peakPassengerCount} passengers\n`;
    csv += `Peak Recorded Payload Weight,${stats.maxRecordedWeightKg} kg\n`;
    csv += `Total Overload Incidents Triggered,${stats.overloadIncidentCount}\n`;
    csv += `Average Fleet Occupancy Rate,${stats.averageOccupancyPercent}%\n\n`;

    // Section 3: Onboard Passenger Manifest with Individual Weights
    csv += "--- CURRENT ONBOARD PASSENGER MANIFEST (INDIVIDUAL WEIGHTS) ---\n";
    csv += "Passenger ID,Assigned Seat,Individual Weight (kg),Demographic Category,Boarding Time,Boarding Stop\n";
    if (passengers.length === 0) {
      csv += "NONE,N/A,0.0,Bus Empty,N/A,N/A\n";
    } else {
      passengers.forEach(p => {
        let category = 'Adult';
        if (p.weight <= 50) category = 'Youth / Child';
        else if (p.weight <= 65) category = 'Medium Adult';
        else if (p.weight > 80) category = 'Heavy Adult / Baggage';
        csv += `${p.id},${p.seatNumber},${p.weight},${category},${p.enteredAt},${p.stopName}\n`;
      });
    }
    csv += "\n";

    // Section 4: Overload Incidents Audit Log
    csv += "--- OVERLOAD & SAFETY INCIDENT LOGS ---\n";
    csv += "Incident ID,Date,Timestamp,Trigger Cause,Headcount,Max Capacity,Weight (kg),Max Weight (kg),Severity,Action Taken\n";

    if (incidents.length === 0) {
      csv += "NONE,N/A,N/A,No overload incidents recorded,N/A,N/A,N/A,N/A,NORMAL,COMPLIANT\n";
    } else {
      incidents.forEach(inc => {
        const cleanCause = `"${(inc.cause || '').replace(/"/g, '""')}"`;
        const cleanAction = `"${(inc.actionTaken || '').replace(/"/g, '""')}"`;
        csv += `${inc.id},${inc.date || today},${inc.timestamp},${cleanCause},${inc.passengerCount},${config.maxPassengerCapacity},${inc.totalWeightKg},${config.maxPermittedWeightKg},${inc.severity},${cleanAction}\n`;
      });
    }

    // Trigger Download
    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SmartBus_Overload_AuditReport_${config.busNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (window.showAppNotification) {
      window.showAppNotification("CSV Export Complete", "Daily audit report downloaded with onboard passenger weights and incident logs.", "success");
    }
  }

  // Render incidents table inside Reports tab & Alerts tab
  renderIncidentsTable() {
    if (!window.busState) return;

    const incidents = window.busState.incidents;
    const containers = ['reportIncidentsTableBody', 'reportIncidentsTableBodySecondary'];

    containers.forEach(containerId => {
      const tableBody = document.getElementById(containerId);
      if (!tableBody) return;

      if (incidents.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="px-4 py-8 text-center text-slate-400">
              <div class="flex flex-col items-center justify-center">
                <svg class="w-8 h-8 text-emerald-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="font-medium text-slate-300">No Overload Incidents Recorded</p>
                <p class="text-xs text-slate-500">The bus has operated strictly within safe regulatory weight and passenger margins.</p>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = incidents.map(inc => {
        const badgeColor = inc.severity.includes('CRITICAL') 
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
          : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

        return `
          <tr class="hover:bg-slate-800/40 transition">
            <td class="px-4 py-3 font-mono-code font-bold text-cyan-400">${inc.id}</td>
            <td class="px-4 py-3 font-mono-code text-slate-300">${inc.timestamp}</td>
            <td class="px-4 py-3 font-semibold text-white">${inc.cause}</td>
            <td class="px-4 py-3 font-digital text-cyan-300">${inc.passengerCount}</td>
            <td class="px-4 py-3 font-digital text-amber-300">${Math.round(inc.totalWeightKg).toLocaleString()} kg</td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}">
                ${inc.severity}
              </span>
            </td>
            <td class="px-4 py-3 text-slate-400">${inc.actionTaken}</td>
          </tr>
        `;
      }).join('');
    });
  }

  // Render individual onboard passenger manifest table
  renderPassengerRosterTable() {
    if (!window.busState) return;

    const passengers = window.busState.passengers;
    const rosterBody = document.getElementById('passengerRosterTableBody');
    if (!rosterBody) return;

    if (passengers.length === 0) {
      rosterBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-4 py-6 text-center text-slate-500 italic">
            No passengers currently on board. Bus is empty.
          </td>
        </tr>
      `;
      return;
    }

    rosterBody.innerHTML = passengers.map(p => {
      let weightBadge = 'text-cyan-300';
      if (p.weight > 85) weightBadge = 'text-rose-400 font-bold';
      else if (p.weight > 70) weightBadge = 'text-amber-300';

      return `
        <tr class="hover:bg-slate-800/30 transition text-xs">
          <td class="px-3 py-2 font-mono-code font-semibold text-cyan-400">${p.id}</td>
          <td class="px-3 py-2 font-semibold text-white">Seat #${p.seatNumber}</td>
          <td class="px-3 py-2 font-digital font-bold ${weightBadge}">${p.weight.toFixed(1)} kg</td>
          <td class="px-3 py-2 text-slate-400 font-mono-code">${p.enteredAt}</td>
          <td class="px-3 py-2 text-slate-400 truncate max-w-[140px]">${p.stopName}</td>
        </tr>
      `;
    }).join('');
  }
}

// Global reports manager instance
window.busReports = new BusReportsManager();
