/**
 * dashboard.js — Command Center ページ
 */
import { fetchData } from '../data.js';
import { initThreeScene } from '../components/threescene.js';
import { renderTimeSeriesChart } from '../components/charts.js';

export async function renderDashboard(el) {
  el.innerHTML = _skeleton();
  const data = await fetchData().catch(() => null);
  el.innerHTML = _build(data);

  const cleanup = initThreeScene('three-canvas');
  renderTimeSeriesChart('chart-timeseries', data?.system_stats?.time_series);
  _animateKpis();
  _startTerminalLog(data);

  el.addEventListener('remove', () => cleanup?.(), { once: true });
}

function _skeleton() {
  return `<div class="page-header"><div class="page-title">Loading...</div></div>`;
}

function _build(data) {
  const stats  = data?.system_stats?.overall ?? {};
  const meta   = data?.meta ?? {};
  const ts     = data?.system_stats?.time_series ?? [];

  const noData = !data || stats.total_predicted === 0;
  const bench  = _computeBenchmarks(data);

  return `
    <div class="page-header">
      <div>
        <div class="page-title">
          <span>◈</span> Command Center
        </div>
        <div class="page-subtitle">
          GALLOPMETRICS // ${meta.commit_hash ?? 'N/A'} // ${_fmtTime(meta.generated_at)}
        </div>
      </div>
      <button class="paywall-btn" onclick="window._showPaywall()">
        🔒 Unlock Institutional Data
      </button>
    </div>

    <!-- KPI グリッド -->
    <div class="kpi-grid">
      <div class="kpi-card accent-cyan">
        <div class="kpi-label">Total Races Analyzed</div>
        <div class="kpi-value" data-target="${stats.total_predicted ?? 0}">0</div>
      </div>
      <div class="kpi-card accent-green">
        <div class="kpi-label">Recommended Win Rate</div>
        <div class="kpi-value" data-pct="${stats.recommended_win_rate ?? 0}">0.0<span class="kpi-unit">%</span></div>
      </div>
      <div class="kpi-card accent-amber">
        <div class="kpi-label">Place Rate</div>
        <div class="kpi-value" data-pct="${stats.recommended_place_rate ?? 0}">0.0<span class="kpi-unit">%</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">With Results</div>
        <div class="kpi-value" data-target="${stats.with_results ?? 0}">0</div>
        <div class="kpi-sub">of ${stats.total_predicted ?? 0} predicted</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Top-1 Win Rate</div>
        <div class="kpi-value" data-pct="${stats.predicted_top1_win_rate ?? 0}">0.0<span class="kpi-unit">%</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Schema Version</div>
        <div class="kpi-value text-secondary" style="font-size:1.2rem">v${meta.schema_version ?? '?'}</div>
        <div class="kpi-sub mono" style="font-size:.65rem">${meta.commit_hash ?? '—'}</div>
      </div>
    </div>

    <!-- ベンチマーク比較 -->
    ${bench ? _buildBenchmarkPanel(stats, bench) : ''}

    <!-- 3D + ターミナル -->
    <div class="grid-2" style="margin-bottom:24px">
      <div class="panel panel-scan">
        <div class="section-title">
          <h3>Quantum Momentum Visualizer</h3>
          <div class="st-line"></div>
          <span class="badge badge-amber">DECORATIVE</span>
        </div>
        <div id="three-canvas" style="height:280px;width:100%"></div>
      </div>
      <div class="panel">
        <div class="section-title">
          <h3>System Event Log</h3>
          <div class="st-line"></div>
        </div>
        <div class="terminal-log" id="term-log"></div>
      </div>
    </div>

    <!-- 累積推移チャート -->
    <div class="panel" style="margin-bottom:24px">
      <div class="section-title">
        <h3>Cumulative Performance</h3>
        <div class="st-line"></div>
      </div>
      ${noData
        ? `<div class="empty-state"><div class="empty-icon">📊</div><p>予測データが蓄積されると表示されます</p></div>`
        : `<div class="chart-wrap" style="height:220px"><canvas id="chart-timeseries"></canvas></div>`
      }
    </div>
  `;
}

function _computeBenchmarks(data) {
  const races = data?.races ?? [];
  if (!races.length) return null;
  let totalField = 0, totalRaces = 0, favWins = 0, favN = 0;
  for (const race of races) {
    const entries = race.entries ?? [];
    if (!entries.length) continue;
    totalField += entries.length;
    totalRaces++;
    const withResult = entries.filter(e => e.actual_position != null);
    if (!withResult.length) continue;
    const fav = entries.find(e => e.popularity === 1);
    if (fav && fav.actual_position != null) {
      favN++;
      if (fav.actual_position === 1) favWins++;
    }
  }
  if (totalRaces === 0) return null;
  return {
    avgFieldSize:  totalField / totalRaces,
    randomWinRate: totalRaces > 0 ? 1 / (totalField / totalRaces) : 1/15,
    favWinRate:    favN > 0 ? favWins / favN : 0.33,
  };
}

function _buildBenchmarkPanel(stats, bench) {
  const model  = (stats.recommended_win_rate ?? 0) * 100;
  const random = bench.randomWinRate * 100;
  const fav    = bench.favWinRate * 100;
  const maxV   = Math.max(model, random, fav, 1);
  const n      = stats.with_results ?? 0;

  const _row = (label, val, color, delta) => {
    const dColor = delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--magenta)' : 'var(--text-muted)';
    return `
      <div style="display:grid;grid-template-columns:150px 1fr 72px 72px;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04)">
        <div style="font-size:.76rem;font-family:var(--font-mono);color:${color}">${label}</div>
        <div class="ind-bar-track" style="height:6px">
          <div style="height:6px;border-radius:3px;background:${color};width:${(val/maxV*100).toFixed(0)}%;transition:width .5s"></div>
        </div>
        <div class="mono" style="font-size:.82rem;color:${color};text-align:right">${val.toFixed(1)}%</div>
        <div class="mono" style="font-size:.72rem;color:${dColor};text-align:right">
          ${delta != null ? (delta > 0 ? '+' : '') + delta.toFixed(1) + 'pp' : '—'}
        </div>
      </div>`;
  };

  return `
    <div class="panel" style="margin-bottom:24px">
      <div class="section-title">
        <h3>ベンチマーク比較</h3>
        <div class="st-line"></div>
        <span class="badge badge-muted" style="font-size:.6rem">N=${n}レース / 平均${bench.avgFieldSize.toFixed(1)}頭立て</span>
      </div>
      ${_row('▶ GallopMetrics', model, 'var(--cyan)', null)}
      ${_row('◇ 市場1番人気', fav, 'var(--amber)', model - fav)}
      ${_row('○ ランダム基準', random, 'var(--text-muted)', model - random)}
    </div>
  `;
}

function _animateKpis() {
  document.querySelectorAll('[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    _countUp(el, target);
  });
  document.querySelectorAll('[data-pct]').forEach(el => {
    const target = parseFloat(el.dataset.pct) * 100;
    _countUp(el, target, true);
  });
}

function _countUp(el, target, isPct = false) {
  const duration = 900;
  const start    = performance.now();
  const unitHtml = isPct ? '<span class="kpi-unit">%</span>' : '';
  const tick = now => {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const v = target * ease;
    el.innerHTML = (isPct ? v.toFixed(1) : Math.round(v)) + unitHtml;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function _startTerminalLog(data) {
  const log = document.getElementById('term-log');
  if (!log) return;
  const meta = data?.meta ?? {};
  const lines = [
    { cls: 'tl-sys',  msg: `SYSTEM BOOT COMPLETE` },
    { cls: 'tl-info', msg: `schema_version=${meta.schema_version ?? '?'}` },
    { cls: 'tl-info', msg: `commit=${meta.commit_hash ?? 'N/A'}` },
    { cls: 'tl-info', msg: `generated_at=${meta.generated_at ?? 'N/A'}` },
    { cls: 'tl-info', msg: `total_predicted=${data?.system_stats?.overall?.total_predicted ?? 0}` },
    { cls: 'tl-info', msg: `audit_log_entries=${data?.audit_log?.length ?? 0}` },
    { cls: 'tl-sys',  msg: `indicator_engine=v4 SABERMETRICS` },
    { cls: 'tl-sys',  msg: `STATUS: ALL SYSTEMS NOMINAL` },
  ];
  lines.forEach((line, i) => {
    setTimeout(() => {
      const t = new Date();
      const time = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}:${String(t.getSeconds()).padStart(2,'0')}`;
      const div = document.createElement('div');
      div.className = 'tl-line';
      div.innerHTML = `<span class="tl-time">[${time}]</span><span class="${line.cls}">${line.msg}</span>`;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
    }, i * 180);
  });

  // 定期的にダミーログを追加
  setInterval(() => {
    const msgs = [
      { cls: 'tl-info', msg: 'Polling JRA data matrix... idle' },
      { cls: 'tl-sys',  msg: 'Heartbeat OK' },
      { cls: 'tl-info', msg: 'Elo lattice: stable' },
      { cls: 'tl-warn', msg: 'No new race entries detected' },
      { cls: 'tl-sys',  msg: 'Feature space: normalized' },
    ];
    const pick = msgs[Math.floor(Math.random() * msgs.length)];
    const t = new Date();
    const time = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}:${String(t.getSeconds()).padStart(2,'0')}`;
    const div = document.createElement('div');
    div.className = 'tl-line';
    div.innerHTML = `<span class="tl-time">[${time}]</span><span class="${pick.cls}">${pick.msg}</span>`;
    log.appendChild(div);
    while (log.children.length > 80) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
  }, 4000);
}

function _fmtTime(iso) {
  if (!iso) return 'N/A';
  try { return new Date(iso).toLocaleString('ja-JP'); } catch { return iso; }
}
