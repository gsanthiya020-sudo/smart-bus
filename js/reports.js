/**
 * SMART BUS OVERLOAD DETECTION & PASSENGER COUNTING SYSTEM
 * Reports Generation & CSV Export Utility
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
    const today = new Date().toISOString().split('T')[0];

    // CSV Headers & Meta Information
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Header block
    csvContent += "SMART BUS OVERLOAD DETECTION AND PASSENGER COUNTING SYSTEM - AUDIT REPORT\n";
    csvContent += `Generated At,${new Date().toLocaleString()}\n`;
    csvContent += `Bus Number,${config.busNumber}\n`;
    csvContent += `Route,${config.routeNumber} (${config.startingPoint} -> ${config.destination})\n`;
    csvContent += `Max Allowed Capacity,${config.maxPassengerCapacity} Passengers\n`;
    csvContent += `Max Safe Payload Weight,${config.maxPermittedWeightKg} kg\n\n`;

    // Summary Section
    csvContent += "--- DAILY PERFORMANCE SUMMARY ---\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total Passengers Boarded Today,${stats.totalEnteredToday}\n`;
    csvContent += `Total Passengers Alighted Today,${stats.totalExitedToday}\n`;
    csvContent += `Peak Passenger Count Recorded,${stats.peakPassengerCount} pax\n`;
    csvContent += `Maximum Recorded Weight,${stats.maxRecordedWeightKg} kg\n`;
    csvContent += `Total Overload Incidents,${stats.overloadIncidentCount}\n`;
    csvContent += `Average Occupancy Rate,${stats.averageOccupancyPercent}%\n\n`;

    // Overload Incidents Log Section
    csvContent += "--- OVERLOAD & CAPACITY INCIDENT LOGS ---\n";
    csvContent += "Incident ID,Date,Timestamp,Trigger Cause,Passenger Count,Max Capacity,Total Weight (kg),Max Permitted (kg),Severity,Resolution Status\n";

    if (incidents.length === 0) {
      csvContent += "NONE,N/A,N/A,No overload incidents logged during this reporting period,N/A,N/A,N/A,N/A,NORMAL,COMPLIANT\n";
    } else {
      incidents.forEach(inc => {
        const cleanCause = `"${(inc.cause || '').replace(/"/g, '""')}"`;
        const cleanAction = `"${(inc.actionTaken || '').replace(/"/g, '""')}"`;
        csvContent += `${inc.id},${inc.date || today},${inc.timestamp},${cleanCause},${inc.passengerCount},${config.maxPassengerCapacity},${inc.totalWeightKg},${config.maxPermittedWeightKg},${inc.severity},${cleanAction}\n`;
      });
    }

    // Trigger Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SmartBus_Overload_Report_${config.busNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (window.showAppNotification) {
      window.showAppNotification("CSV Export Complete", "Daily overload telemetry audit report downloaded successfully.", "success");
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
        const isWeight = inc.cause.toLowerCase().includes('weight');
        const badgeColor = inc.severity.includes('CRITICAL') 
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
          : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

        return `
          <tr class="border-b border-slate-800 hover:bg-slate-800/40 transition-colors">
            <td class="px-4 py-3 font-mono-code text-cyan-400 font-semibold text-xs">${inc.id}</td>
            <td class="px-4 py-3 text-slate-300 text-xs">
              <div>${inc.timestamp}</div>
              <div class="text-[10px] text-slate-500">${inc.date || 'Today'}</div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1.5 font-medium text-xs text-slate-200">
                <span class="w-2 h-2 rounded-full ${isWeight ? 'bg-amber-400' : 'bg-rose-400'}"></span>
                ${inc.cause}
              </div>
            </td>
            <td class="px-4 py-3 text-xs">
              <span class="font-digital font-bold text-slate-200">${inc.passengerCount}</span>
              <span class="text-slate-500 text-[11px]"> / ${window.busState.config.maxPassengerCapacity}</span>
            </td>
            <td class="px-4 py-3 text-xs">
              <span class="font-digital font-bold text-amber-300">${inc.totalWeightKg} kg</span>
              <span class="text-slate-500 text-[11px]"> / ${window.busState.config.maxPermittedWeightKg} kg</span>
            </td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}">
                ${inc.severity}
              </span>
            </td>
            <td class="px-4 py-3 text-xs text-slate-400">
              ${inc.actionTaken || 'Audio Alarm Triggered'}
            </td>
          </tr>
        `;
      }).join('');
    });
  }
}

// Global reports manager instance
window.busReports = new BusReportsManager();
