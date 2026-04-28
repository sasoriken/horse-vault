/**
 * analytics.js — System Analytics ページ
 *
 * data.json  → 予測勝率・会場別実績（リアルタイム累積）
 * analytics.json → バックテスト分析（指標的中率・LR係数・ROIシミュレーション）
 */
import { fetchData, fetchAnalytics } from '../data.js';
import { renderTimeSeriesChart, renderVenueChart } from '../components/charts.js';

export async function renderAnalytics(el) {
  el.innerHTML = `<div class="page-header"><div class="page-title">Loading...</div></div>`;

  const [data, analytics] = await Promise.all([
    fetchData().catch(() => null),
    fetchAnalytics().catch(() => null),
  ]);

  el.innerHTML = _buildPage(data, analytics);
  renderTimeSeriesChart('chart-ts-full', data?.system_stats?.time_series);
  renderVenueChart('chart-venue', data?.system_stats?.by_venue);
  _renderLrChart('chart-lr-coef', analytics?.lr_model?.coefficients);
}

// ── ページ全体 ────────────────────────────────────────────────────────────────

function _buildPage(data, analytics) {
  const stats = data?.system_stats?.overall ?? {};
  const venue = data?.system_stats?.by_venue ?? [];
  const noData = !data || stats.total_predicted === 0;
  const noAnalytics = !analytics;

  const gen = analytics?.meta?.generated_at
    ? new Date(analytics.meta.generated_at).toLocaleString('ja-JP')
    : '—';

  return `
    <div class="page-header">
      <div>
        <div class="page-title"><span>≋</span> System Analytics</div>
        <div class="page-subtitle">PREDICTION ENGINE TELEMETRY // BACKTEST INTELLIGENCE</div>
      </div>
      <div style="font-size:.68rem;font-family:var(--font-mono);color:var(--text-muted)">
        analytics updated: ${gen}
      </div>
    </div>

    <!-- ── Section 1: Live Performance ── -->
    <div class="section-label">LIVE PERFORMANCE</div>

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
        <div class="kpi-label">Top-1 Win Rate</div>
        <div class="kpi-value">${_pctNum(stats.predicted_top1_win_rate)}<span class="kpi-unit">%</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Sample Size</div>
        <div class="kpi-value mono">${stats.with_results ?? 0}</div>
        <div class="kpi-sub">of ${stats.total_predicted ?? 0} races</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:24px">
      <div class="panel">
        <div class="section-title"><h3>Cumulative Win / Place Rate</h3><div class="st-line"></div></div>
        ${noData
          ? `<div class="empty-state"><div class="empty-icon">📈</div><p>データ蓄積後に表示</p></div>`
          : `<div class="chart-wrap" style="height:220px"><canvas id="chart-ts-full"></canvas></div>`
        }
      </div>
      <div class="panel">
        <div class="section-title"><h3>Win Rate by Venue</h3><div class="st-line"></div></div>
        ${venue.length
          ? `<div class="chart-wrap" style="height:220px"><canvas id="chart-venue"></canvas></div>`
          : `<div class="empty-state"><div class="empty-icon">🏟</div><p>会場データなし</p></div>`
        }
      </div>
    </div>

    <!-- ── Section 2: LR Model Intelligence ── -->
    <div class="section-label">MODEL INTELLIGENCE</div>
    ${noAnalytics ? _emptyState() : _buildLrSection(analytics.lr_model)}

    <!-- ── Section 3: Indicator Performance Matrix ── -->
    <div class="section-label">INDICATOR PERFORMANCE MATRIX</div>
    ${noAnalytics ? _emptyState() : _buildHitrateTable(analytics.indicator_hitrates)}

    <!-- ── Section 4: ROI Simulation ── -->
    <div class="section-label">ROI SIMULATION</div>
    ${noAnalytics ? _emptyState() : _buildRoiTable(analytics.simulation_roi)}

    <!-- ── Section 5: Odds Gap Analysis ── -->
    <div class="section-label">ODDS GAP ANALYSIS</div>
    ${noAnalytics ? _emptyState() : _buildOddsGapTable(analytics.odds_gap_bins)}
  `;
}

// ── LR モデルセクション ────────────────────────────────────────────────────

function _buildLrSection(lr) {
  if (!lr || !lr.coefficients?.length) return _emptyState();

  const lr_model = lr;
  const aucHtml = `
    <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap;margin-bottom:16px">
      <div>
        <span class="kpi-label">Train AUC</span>
        <span class="mono" style="color:var(--cyan);font-size:1.4rem;margin-left:8px">${lr_model.auc_train?.toFixed(4) ?? '—'}</span>
      </div>
      <div>
        <span class="kpi-label">Test AUC</span>
        <span class="mono" style="color:var(--green);font-size:1.4rem;margin-left:8px">${lr_model.auc_test?.toFixed(4) ?? '—'}</span>
      </div>
      ${lr_model.n_train ? `<div style="font-size:.72rem;color:var(--text-muted)">Train: ${lr_model.n_train?.toLocaleString()} / Test: ${lr_model.n_test?.toLocaleString()}</div>` : ''}
    </div>
  `;

  const maxCoef = Math.max(...lr_model.coefficients.map(c => Math.abs(c.coef)));

  const coefRows = [...lr_model.coefficients]
    .sort((a, b) => Math.abs(b.coef) - Math.abs(a.coef))
    .map(c => {
      const pct   = (Math.abs(c.coef) / maxCoef * 100).toFixed(1);
      const color = c.sign === 'positive' ? 'var(--cyan)' : 'var(--magenta)';
      const label = c.sign === 'positive' ? '▲' : '▼';
      return `
        <div style="display:grid;grid-template-columns:180px 1fr 70px;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">
          <div style="font-size:.78rem;font-family:var(--font-mono);color:${c.starred ? 'var(--amber)' : 'var(--text-primary)'}">
            ${c.starred ? '★' : '　'}${c.feature}
          </div>
          <div class="ind-bar-track" style="height:8px">
            <div style="height:8px;border-radius:4px;background:${color};width:${pct}%;transition:width .4s"></div>
          </div>
          <div class="mono" style="font-size:.78rem;color:${color};text-align:right">
            ${label}${c.coef.toFixed(4)}
          </div>
        </div>
      `;
    }).join('');

  const weightRows = (lr_model.weights_comparison ?? []).map(w => {
    const arrow = w.direction === 'up'
      ? `<span style="color:var(--green)">▲</span>`
      : `<span style="color:var(--magenta)">▼</span>`;
    const deltaColor = w.delta > 0 ? 'var(--green)' : 'var(--magenta)';
    return `
      <tr>
        <td class="mono">${w.feature}</td>
        <td class="text-right mono">${w.current.toFixed(4)}</td>
        <td class="text-right mono">${w.optimized.toFixed(4)}</td>
        <td class="text-right mono" style="color:${deltaColor}">${w.delta > 0 ? '+' : ''}${w.delta.toFixed(4)}</td>
        <td class="text-center">${arrow}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="grid-2" style="margin-bottom:24px">
      <div class="panel">
        <div class="section-title"><h3>Feature Coefficients</h3><div class="st-line"></div>
          <span class="badge badge-amber">★=key feature</span>
        </div>
        ${aucHtml}
        <div style="padding:0 4px">${coefRows}</div>
      </div>
      <div class="panel">
        <div class="section-title"><h3>Weight Optimization</h3><div class="st-line"></div></div>
        ${weightRows.length
          ? `<table class="data-table">
               <thead><tr><th>Feature</th><th class="text-right">Current</th><th class="text-right">Optimized</th><th class="text-right">Delta</th><th></th></tr></thead>
               <tbody>${weightRows}</tbody>
             </table>`
          : `<div class="empty-state"><p>optimize_weights.py を実行してください</p></div>`
        }
      </div>
    </div>
  `;
}

// ── 指標的中率テーブル ────────────────────────────────────────────────────

function _buildHitrateTable(hitrates) {
  if (!hitrates?.length) return _emptyState();

  const maxWin = Math.max(...hitrates.map(h => h.win_r1));

  const rows = hitrates.map((h, i) => {
    const barW = (h.win_r1 / maxWin * 100).toFixed(0);
    const spColor = h.spearman >= 0.3 ? 'var(--cyan)' : h.spearman >= 0.1 ? 'var(--amber)' : h.spearman < 0 ? 'var(--magenta)' : 'var(--text-secondary)';
    const rankBadge = i < 3 ? `<span class="badge badge-amber" style="font-size:.55rem;margin-left:4px">#${i+1}</span>` : '';
    return `
      <tr>
        <td style="font-size:.78rem;white-space:nowrap">
          ${_esc(h.name)}${rankBadge}
        </td>
        <td class="text-right mono" style="font-size:.72rem;color:var(--text-muted)">${h.n.toLocaleString()}</td>
        <td class="text-right mono" style="color:${spColor};font-size:.78rem">
          ${h.spearman >= 0 ? '+' : ''}${h.spearman.toFixed(4)}
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <div class="ind-bar-track" style="height:6px;flex:1">
              <div style="height:6px;border-radius:3px;background:var(--cyan);width:${barW}%"></div>
            </div>
            <span class="mono" style="font-size:.72rem;color:var(--cyan);width:38px;text-align:right">${h.win_r1.toFixed(1)}%</span>
          </div>
        </td>
        <td class="text-right mono" style="font-size:.72rem">${h.win_r2.toFixed(1)}%</td>
        <td class="text-right mono" style="font-size:.72rem">${h.win_r3.toFixed(1)}%</td>
        <td class="text-right mono" style="font-size:.72rem;color:var(--green)">${h.place_r1.toFixed(1)}%</td>
        <td class="text-right mono" style="font-size:.72rem">${h.place_r2.toFixed(1)}%</td>
        <td class="text-right mono" style="font-size:.72rem;color:var(--amber)">${h.wide_12.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="panel" style="margin-bottom:24px">
      <div class="section-title">
        <h3>Indicator Hit Rate Matrix</h3>
        <div class="st-line"></div>
        <span class="badge badge-muted" style="font-size:.6rem">単勝r1降順 / バーは単勝r1を最大=100%で正規化</span>
      </div>
      <div style="overflow-x:auto">
        <table class="data-table" style="min-width:700px">
          <thead>
            <tr>
              <th>指標</th>
              <th class="text-right">N</th>
              <th class="text-right">Spearman ρ</th>
              <th style="min-width:160px">単勝 R1</th>
              <th class="text-right">単 R2</th>
              <th class="text-right">単 R3</th>
              <th class="text-right">複 R1</th>
              <th class="text-right">複 R2</th>
              <th class="text-right">W1-2</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ── ROI シミュレーション ────────────────────────────────────────────────────

function _buildRoiTable(sim) {
  if (!sim?.length) return _emptyState();

  const rows = sim.map(r => {
    const roi = r['roi_%'];
    const roiColor = roi >= 100 ? 'var(--green)' : roi >= 80 ? 'var(--cyan)' : roi >= 60 ? 'var(--amber)' : 'var(--magenta)';
    const roiStar = roi >= 100 ? ' ★' : '';
    return `
      <tr>
        <td style="font-size:.78rem">${_esc(r.label)}</td>
        <td class="text-right mono">${r.n_bets?.toLocaleString()}</td>
        <td class="text-right mono">${r.n_hits?.toLocaleString()}</td>
        <td class="text-right mono">${r['win_rate_%']?.toFixed(1)}%</td>
        <td class="text-right mono" style="color:${roiColor};font-weight:700">${roi?.toFixed(1)}%${roiStar}</td>
        <td class="text-right mono" style="font-size:.7rem;color:var(--text-muted)">${r.avg_payout?.toFixed(0)}円</td>
        <td class="text-right mono" style="font-size:.7rem;color:var(--text-muted)">${r.max_consecutive_loss}連敗</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="panel" style="margin-bottom:24px">
      <div class="section-title">
        <h3>ROI Simulation (LR Composite)</h3>
        <div class="st-line"></div>
        <span class="badge badge-muted" style="font-size:.6rem">★=ROI≥100%</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>戦略</th>
            <th class="text-right">賭け数</th>
            <th class="text-right">的中</th>
            <th class="text-right">的中率</th>
            <th class="text-right">ROI</th>
            <th class="text-right">平均払戻</th>
            <th class="text-right">最大連敗</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ── オッズギャップ分析 ────────────────────────────────────────────────────

function _buildOddsGapTable(bins) {
  if (!bins?.length) return _emptyState();

  const rows = bins.map(b => {
    const roi = b['roi_tansho_%'];
    const roiColor = roi >= 100 ? 'var(--green)' : roi >= 80 ? 'var(--cyan)' : roi >= 60 ? 'var(--amber)' : 'var(--magenta)';
    return `
      <tr>
        <td class="mono" style="color:var(--cyan)">${_esc(b.odds_gap_bin)}</td>
        <td class="text-right mono">${b.n_races?.toLocaleString()}</td>
        <td class="text-right mono">${b['win_rate_%']?.toFixed(1)}%</td>
        <td class="text-right mono" style="color:var(--green)">${b['place_rate_%']?.toFixed(1)}%</td>
        <td class="text-right mono" style="font-size:.72rem;color:var(--text-muted)">${b.avg_market_odds?.toFixed(1)}倍</td>
        <td class="text-right mono" style="color:${roiColor};font-weight:700">${roi?.toFixed(1)}%</td>
        <td class="text-right mono" style="font-size:.72rem;color:var(--text-muted)">${b['roi_fukusho_%']?.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="panel" style="margin-bottom:24px">
      <div class="section-title">
        <h3>Odds Gap Analysis</h3>
        <div class="st-line"></div>
        <span class="badge badge-muted" style="font-size:.6rem">モデルスコアランク vs 市場人気乖離度</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>OddsGap区間</th>
            <th class="text-right">R数</th>
            <th class="text-right">単勝率</th>
            <th class="text-right">複勝率</th>
            <th class="text-right">平均オッズ</th>
            <th class="text-right">単勝ROI</th>
            <th class="text-right">複勝ROI</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ── Chart.js LR係数 ──────────────────────────────────────────────────────

function _renderLrChart(canvasId, coefs) {
  // Chart.jsで描画したい場合はここに実装
  // 現在はCSS描画のみなので何もしない
}

// ── ユーティリティ ────────────────────────────────────────────────────────

function _emptyState() {
  return `
    <div class="empty-state" style="margin-bottom:24px">
      <div class="empty-icon">📊</div>
      <p>run_analysis.py を実行すると表示されます</p>
    </div>
  `;
}

function _pct(v)    { return v != null ? `${(v * 100).toFixed(1)}%` : '—'; }
function _pctNum(v) { return v != null ? (v * 100).toFixed(1) : '0.0'; }
function _esc(s)    { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
