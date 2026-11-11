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

    this.isInitialized = true;
  }

  // 1. Live Dual-Axis Realtime Timeline (Passenger Count & Weight)
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
            min: 0,
            max: Math.max(60, window.busState.config.maxPassengerCapacity + 10),
            title: {
              display: true,
              text: 'Passengers',
              color: '#06B6D4'
            },
            grid: { color: 'rgba(35, 53, 103, 0.4)' }
          },
          yWeight: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: Math.max(4500, window.busState.config.maxPermittedWeightKg + 500),
            title: {
              display: true,
              text: 'Weight (kg)',
              color: '#F59E0B'
            },
            grid: { drawOnChartArea: false }
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
            label: 'Passengers Boarded (IN)',
            data: hourly.map(h => h.entered),
            backgroundColor: '#10B981',
            borderRadius: 6,
          },
          {
            label: 'Passengers Alighted (OUT)',
            data: hourly.map(h => h.exited),
            backgroundColor: '#64748B',
            borderRadius: 6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true, boxWidth: 8 }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(35, 53, 103, 0.4)' } },
          y: {
            grid: { color: 'rgba(35, 53, 103, 0.4)' },
            title: { display: true, text: 'Passengers' }
          }
        }
      }
    });
  }

  // 3. Occupancy Donut Gauge
  initOccupancyDoughnut() {
    const ctx = document.getElementById('chartOccupancyDoughnut');
    if (!ctx) return;

    const count = window.busState.live.passengerCount;
    const available = window.busState.live.availableCapacity;

    this.chartOccupancyDoughnut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Occupied Seats', 'Available Space'],
        datasets: [{
          data: [count, available],
          backgroundColor: [
            window.busState.live.status === 'OVERLOAD' ? '#EF4444' : 
            window.busState.live.status === 'WARNING' ? '#F59E0B' : '#10B981',
            '#1E293B'
          ],
          borderColor: '#111C3A',
          borderWidth: 3,
          cutout: '76%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        }
      }
    });
  }

  // 4. Axle Load Weight Distribution (Front vs Rear)
  initAxleDistributionChart() {
    const ctx = document.getElementById('chartAxleDistribution');
    if (!ctx) return;

    const front = window.busState.live.frontAxleWeightKg;
    const rear = window.busState.live.rearAxleWeightKg;

    this.chartAxleDistribution = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Front Axle (Steering)', 'Rear Axle (Drive)'],
        datasets: [{
          label: 'Dynamic Load (kg)',
          data: [front, rear],
          backgroundColor: ['#3B82F6', '#8B5CF6'],
          borderRadius: 8,
          barThickness: 34
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
            grid: { color: 'rgba(35, 53, 103, 0.4)' },
            title: { display: true, text: 'Weight (kg)' }
          },
          y: { grid: { display: false } }
        }
      }
    });
  }

  // Update all charts on live state change
  update() {
    if (!this.isInitialized) {
      this.init();
      return;
    }

    // 1. Update Live Trend Chart
    if (this.chartLiveTrend) {
      const labels = window.busState.stats.timeSeries.map(p => p.time);
      const countData = window.busState.stats.timeSeries.map(p => p.count);
      const weightData = window.busState.stats.timeSeries.map(p => p.weight);

      this.chartLiveTrend.data.labels = labels;
      this.chartLiveTrend.data.datasets[0].data = countData;
      this.chartLiveTrend.data.datasets[1].data = weightData;

      // Update max axes if config changed
      this.chartLiveTrend.options.scales.yCount.max = Math.max(60, window.busState.config.maxPassengerCapacity + 10);
      this.chartLiveTrend.options.scales.yWeight.max = Math.max(4500, window.busState.config.maxPermittedWeightKg + 500);

      this.chartLiveTrend.update('none'); // Update smoothly without jerky animation
    }

    // 2. Update Occupancy Doughnut
    if (this.chartOccupancyDoughnut) {
      const count = window.busState.live.passengerCount;
      const available = window.busState.live.availableCapacity;
      const statusColor = window.busState.live.status === 'OVERLOAD' ? '#EF4444' : 
                          window.busState.live.status === 'WARNING' ? '#F59E0B' : '#10B981';

      this.chartOccupancyDoughnut.data.datasets[0].data = [count, available];
      this.chartOccupancyDoughnut.data.datasets[0].backgroundColor[0] = statusColor;
      this.chartOccupancyDoughnut.update('none');
    }

    // 3. Update Axle Distribution
    if (this.chartAxleDistribution) {
      this.chartAxleDistribution.data.datasets[0].data = [
        window.busState.live.frontAxleWeightKg,
        window.busState.live.rearAxleWeightKg
      ];
      this.chartAxleDistribution.update('none');
    }
  }
}

// Global charts instance
window.busCharts = new BusChartsManager();
