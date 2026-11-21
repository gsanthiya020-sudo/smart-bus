/**
 * SMART BUS OVERLOAD DETECTION & PASSENGER COUNTING SYSTEM
 * Interactive Data Visualizations & Chart.js Configurator
 */

class BusChartsManager {
  constructor() {
    this.chartLiveTrend = null;
    this.chartHourlyFlow = null;
    this.chartOccupancyDoughnut = null;
    this.chartAxleDistribution = null;
    this.chartWeightDistribution = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized || typeof Chart === 'undefined') return;

    // Apply global Chart.js dark theme styling
    Chart.defaults.color = '#94A3B8';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.borderColor = '#233567';

    this.initLiveTrendChart();
    this.initHourlyFlowChart();
    this.initOccupancyDoughnut();
    this.initAxleDistributionChart();
    this.initWeightDistributionChart();

    this.isInitialized = true;
  }

  // 1. Live Dual-Axis Realtime Timeline (Passenger Count vs Payload Weight)
  initLiveTrendChart() {
    const ctx = document.getElementById('chartLiveTrend');
    if (!ctx) return;

    const labels = window.busState.stats.timeSeries.map(p => p.time);
    const countData = window.busState.stats.timeSeries.map(p => p.count);
    const weightData = window.busState.stats.timeSeries.map(p => p.weight);

    this.chartLiveTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Passenger Count (Pax)',
            data: countData,
            borderColor: '#06B6D4',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 6,
            yAxisID: 'yCount',
          },
          {
            label: 'Total Weight (kg)',
            data: weightData,
            borderColor: '#F59E0B',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2.5,
            borderDash: [4, 4],
            fill: false,
            tension: 0.35,
            pointRadius: 2,
            pointHoverRadius: 5,
            yAxisID: 'yWeight',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              padding: 16
            }
          },
          tooltip: {
            backgroundColor: '#0F172A',
            titleColor: '#F8FAFC',
            bodyColor: '#CBD5E1',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(35, 53, 103, 0.4)' },
            ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }
          },
          yCount: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Passengers (pax)', color: '#06B6D4' },
            grid: { color: 'rgba(35, 53, 103, 0.3)' },
            suggestedMin: 0,
            suggestedMax: 60,
          },
          yWeight: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Payload (kg)', color: '#F59E0B' },
            grid: { drawOnChartArea: false },
            suggestedMin: 0,
            suggestedMax: 4000,
          }
        }
      }
    });
  }

  // 2. Hourly Passenger Flow (Entered vs Exited)
  initHourlyFlowChart() {
    const ctx = document.getElementById('chartHourlyFlow');
    if (!ctx) return;

    const hourly = window.busState.stats.hourlyData;

    this.chartHourlyFlow = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hourly.map(h => h.hour),
        datasets: [
          {
            label: 'Boarded (IR Entry)',
            data: hourly.map(h => h.entered),
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: '#10B981',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Alighted (IR Exit)',
            data: hourly.map(h => h.exited),
            backgroundColor: 'rgba(239, 68, 68, 0.75)',
            borderColor: '#EF4444',
            borderWidth: 1,
            borderRadius: 4,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { usePointStyle: true } }
        },
        scales: {
          x: { grid: { color: 'rgba(35, 53, 103, 0.4)' } },
          y: {
            grid: { color: 'rgba(35, 53, 103, 0.3)' },
            title: { display: true, text: 'Passenger Ingress/Egress' }
          }
        }
      }
    });
  }

  // 3. Occupancy Doughnut Gauge
  initOccupancyDoughnut() {
    const ctx = document.getElementById('chartOccupancyDoughnut');
    if (!ctx) return;

    const count = window.busState.live.passengerCount;
    const maxCapacity = window.busState.config.maxPassengerCapacity;
    const remaining = Math.max(0, maxCapacity - count);

    this.chartOccupancyDoughnut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Occupied', 'Available'],
        datasets: [{
          data: [count, remaining],
          backgroundColor: ['#06B6D4', '#1E293B'],
          borderColor: ['#0891B2', '#334155'],
          borderWidth: 1,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // 4. Axle Load Distribution Bar
  initAxleDistributionChart() {
    const ctx = document.getElementById('chartAxleDistribution');
    if (!ctx) return;

    const front = window.busState.live.frontAxleWeightKg;
    const rear = window.busState.live.rearAxleWeightKg;

    this.chartAxleDistribution = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Front Axle (Load Cell 1+2)', 'Rear Axle (Load Cell 3+4)'],
        datasets: [{
          label: 'Axle Weight (kg)',
          data: [front, rear],
          backgroundColor: ['rgba(6, 182, 212, 0.75)', 'rgba(168, 85, 247, 0.75)'],
          borderColor: ['#06B6D4', '#A855F7'],
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: 'rgba(35, 53, 103, 0.3)' },
            suggestedMax: 2200
          },
          y: { grid: { display: false } }
        }
      }
    });
  }

  // 5. Passenger Weight Distribution Histogram (35-50kg, 51-65kg, 66-80kg, 81-100kg)
  initWeightDistributionChart() {
    const ctx = document.getElementById('chartWeightDistribution');
    if (!ctx) return;

    const bins = this.calculateWeightBins();

    this.chartWeightDistribution = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['35 - 50 kg (Youth)', '51 - 65 kg (Medium)', '66 - 80 kg (Adult)', '81 - 100 kg (Heavy)'],
        datasets: [{
          label: 'Onboard Count',
          data: bins,
          backgroundColor: [
            'rgba(59, 130, 246, 0.75)',
            'rgba(16, 185, 129, 0.75)',
            'rgba(245, 158, 11, 0.75)',
            'rgba(239, 68, 68, 0.75)'
          ],
          borderColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { color: 'rgba(35, 53, 103, 0.3)' } },
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            grid: { color: 'rgba(35, 53, 103, 0.3)' }
          }
        }
      }
    });
  }

  calculateWeightBins() {
    const passengers = window.busState ? window.busState.passengers : [];
    let b1 = 0, b2 = 0, b3 = 0, b4 = 0;
    passengers.forEach(p => {
      const w = p.weight;
      if (w <= 50) b1++;
      else if (w <= 65) b2++;
      else if (w <= 80) b3++;
      else b4++;
    });
    return [b1, b2, b3, b4];
  }

  // Refresh all charts when state updates
  update() {
    if (!this.isInitialized || !window.busState) return;

    // 1. Update Live Trend
    if (this.chartLiveTrend) {
      const ts = window.busState.stats.timeSeries;
      this.chartLiveTrend.data.labels = ts.map(p => p.time);
      this.chartLiveTrend.data.datasets[0].data = ts.map(p => p.count);
      this.chartLiveTrend.data.datasets[1].data = ts.map(p => p.weight);
      this.chartLiveTrend.update('none');
    }

    // 2. Update Occupancy Doughnut
    if (this.chartOccupancyDoughnut) {
      const count = window.busState.live.passengerCount;
      const maxCapacity = window.busState.config.maxPassengerCapacity;
      const remaining = Math.max(0, maxCapacity - count);

      let sliceColor = '#06B6D4';
      if (window.busState.live.status === 'OVERLOAD') {
        sliceColor = '#EF4444';
      } else if (window.busState.live.status === 'WARNING') {
        sliceColor = '#F59E0B';
      } else {
        sliceColor = '#10B981';
      }

      this.chartOccupancyDoughnut.data.datasets[0].data = [count, remaining];
      this.chartOccupancyDoughnut.data.datasets[0].backgroundColor[0] = sliceColor;
      this.chartOccupancyDoughnut.update('none');
    }

    // 3. Update Axle Balance
    if (this.chartAxleDistribution) {
      this.chartAxleDistribution.data.datasets[0].data = [
        window.busState.live.frontAxleWeightKg,
        window.busState.live.rearAxleWeightKg
      ];
      this.chartAxleDistribution.update('none');
    }

    // 4. Update Weight Histogram
    if (this.chartWeightDistribution) {
      this.chartWeightDistribution.data.datasets[0].data = this.calculateWeightBins();
      this.chartWeightDistribution.update('none');
    }
  }
}

// Global charts manager instance
window.busCharts = new BusChartsManager();
