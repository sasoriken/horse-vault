/**
 * charts.js — Chart.js ラッパー
 */

const CHART_DEFAULTS = {
  color: '#00F0FF',
  gridColor: 'rgba(0,240,255,0.07)',
  textColor: '#7A90B0',
  font: "'JetBrains Mono', monospace",
};

Chart.defaults.color = CHART_DEFAULTS.textColor;
Chart.defaults.font.family = CHART_DEFAULTS.font;
Chart.defaults.font.size = 11;

/** 累積ROI折れ線グラフ */
export function renderTimeSeriesChart(canvasId, timeSeries) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !timeSeries?.length) return null;

  const labels   = timeSeries.map(d => d.date.slice(5));
  const winData  = timeSeries.map(d => (d.cumulative_win_rate * 100).toFixed(1));
  const placeData = timeSeries.map(d => (d.cumulative_place_rate * 100).toFixed(1));

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Win Rate %',
          data: winData,
          borderColor: '#00F0FF',
          backgroundColor: 'rgba(0,240,255,0.05)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
        {
          label: 'Place Rate %',
          data: placeData,
          borderColor: '#00FF88',
          backgroundColor: 'rgba(0,255,136,0.04)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          backgroundColor: 'rgba(6,11,20,0.95)',
          borderColor: 'rgba(0,240,255,0.3)',
          borderWidth: 1,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}%`,
          },
        },
      },
      scales: {
        x: { grid: { color: CHART_DEFAULTS.gridColor } },
        y: {
          grid: { color: CHART_DEFAULTS.gridColor },
          ticks: { callback: v => `${v}%` },
        },
      },
    },
  });
}

/** 会場別勝率棒グラフ */
export function renderVenueChart(canvasId, byVenue) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !byVenue?.length) return null;

  const sorted = [...byVenue].sort((a, b) => b.win_rate - a.win_rate);

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(v => v.venue),
      datasets: [
        {
          label: 'Win Rate %',
          data: sorted.map(v => (v.win_rate * 100).toFixed(1)),
          backgroundColor: 'rgba(0,240,255,0.25)',
          borderColor: '#00F0FF',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Place Rate %',
          data: sorted.map(v => (v.place_rate * 100).toFixed(1)),
          backgroundColor: 'rgba(0,255,136,0.15)',
          borderColor: '#00FF88',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          backgroundColor: 'rgba(6,11,20,0.95)',
          borderColor: 'rgba(0,240,255,0.3)',
          borderWidth: 1,
        },
      },
      scales: {
        x: { grid: { color: CHART_DEFAULTS.gridColor } },
        y: {
          grid: { color: CHART_DEFAULTS.gridColor },
          ticks: { callback: v => `${v}%` },
        },
      },
    },
  });
}

/** 馬ごとのレーダーチャート */
export function renderRadarChart(canvasId, labels, data, label = '') {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  return new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label,
        data,
        backgroundColor: 'rgba(0,240,255,0.1)',
        borderColor: '#00F0FF',
        pointBackgroundColor: '#00F0FF',
        pointRadius: 3,
        borderWidth: 1.5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { display: false, stepSize: 25 },
          grid:  { color: CHART_DEFAULTS.gridColor },
          angleLines: { color: CHART_DEFAULTS.gridColor },
          pointLabels: { font: { size: 9 }, color: CHART_DEFAULTS.textColor },
        },
      },
    },
  });
}
