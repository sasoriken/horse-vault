/**
 * analytics.js — System Performance Analytics ページ
 */
import { fetchData } from '../data.js';
import { renderTimeSeriesChart, renderVenueChart } from '../components/charts.js';

export async function renderAnalytics(el) {
  el.innerHTML = `<div class="page-header"><div class="page-title">Loading...</div></div>`;
  const data = await fetchData().catch(() => null);
  el.innerHTML = _buildPage(data);
  renderTimeSeriesChart('chart-ts-full', data?.system_stats?.time_series);
  renderVenueChart('chart-venue', data?.system_stats?.by_venue);
}

function _buildPage(data) {
  const stats  = data?.system_stats?.overall ?? {};
  const venue  = data?.system_stats?.by_venue ?? [];
  const ts     = data?.system_stats?.time_series ?? [];
  const noData = !data || stats.total_predicted === 0;

  const venueRows = venue
    .sort((a,b) => b.win_rate - a.win_rate)
    .map(v => `
      <tr>
        <td>${v.venue}</td>
        <td class="text-right mono">${v.races}</td>
        <td class="text-right">${_pct(v.win_rate)}</td>
        <td class="text-right">${_pct(v.place_rate)}</td>
        <td style="width:120px">
          <div class="ind-bar-track" style="height:6px">
            <div class="ind-bar-fill color-ability ind-bar-fill" style="width:${(v.win_rate*100).toFixed(0)}%"></div>
          </div>
        </td>
      </tr>
    `).join('');

  return `
    <div class="page-header">
      <div>
        <div class="page-title"><span>≋</span> System Analytics</div>
        <div class="page-subtitle">PERFORMANCE METRICS // PREDICTION ENGINE TELEMETRY</div>
      </div>
    </div>

    <!-- サマリKPI -->
    <div class="kpi-grid" style="margin-bottom:24px">
      <div class="kpi-card accent-cyan">
        <div class="kpi-label">Recommended Win Rate</div>
        <div class="kpi-value">${_pctNum(stats.recommended_win_rate)}<span class="kpi-unit">%</span></div>
      </div>
      <div class="kpi-card accent-green">
        <div class="kpi-label">Recommended Place Rate</div>
        <div class="kpi-value">${_pctNum(stats.recommended_place_rate)}<span class="kpi-unit">%</span></div>
      </div>
      <div class="kpi-card accent-amber">
        <div class="kpi-label">Top-1 Prediction Win Rate</div>
        <div class="kpi-value">${_pctNum(stats.predicted_top1_win_rate)}<span class="kpi-unit">%</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Sample Size (with results)</div>
        <div class="kpi-value mono">${stats.with_results ?? 0}</div>
        <div class="kpi-sub">of ${stats.total_predicted ?? 0} races</div>
      </div>
    </div>

    <!-- チャート 2列 -->
    <div class="grid-2" style="margin-bottom:24px">
      <div class="panel">
        <div class="section-title">
          <h3>Cumulative Win / Place Rate</h3>
          <div class="st-line"></div>
        </div>
        ${noData
          ? `<div class="empty-state"><div class="empty-icon">📈</div><p>データ蓄積後に表示</p></div>`
          : `<div class="chart-wrap" style="height:240px"><canvas id="chart-ts-full"></canvas></div>`
        }
      </div>
      <div class="panel">
        <div class="section-title">
          <h3>Win Rate by Venue</h3>
          <div class="st-line"></div>
        </div>
        ${venue.length
          ? `<div class="chart-wrap" style="height:240px"><canvas id="chart-venue"></canvas></div>`
          : `<div class="empty-state"><div class="empty-icon">🏟</div><p>会場データなし</p></div>`
        }
      </div>
    </div>

    <!-- 会場別テーブル -->
    <div class="panel">
      <div class="section-title">
        <h3>Venue Breakdown</h3>
        <div class="st-line"></div>
      </div>
      ${venue.length
        ? `<table class="data-table">
             <thead>
               <tr>
                 <th>Venue</th>
                 <th class="text-right">Races</th>
                 <th class="text-right">Win Rate</th>
                 <th class="text-right">Place Rate</th>
                 <th>Visual</th>
               </tr>
             </thead>
             <tbody>${venueRows}</tbody>
           </table>`
        : `<div class="empty-state"><div class="empty-icon">🏟</div><p>会場データなし</p></div>`
      }
    </div>
  `;
}

function _pct(v)    { return v != null ? `${(v*100).toFixed(1)}%` : '—'; }
function _pctNum(v) { return v != null ? (v*100).toFixed(1) : '0.0'; }
