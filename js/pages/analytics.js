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

  const bench = _computeBenchmarks(data);
  const n     = stats.with_results ?? 0;
  const wins  = Math.round((stats.recommended_win_rate ?? 0) * n);
  const [ciLo, ciHi] = _wilsonCI(wins, n);

  return `
    <div class="page-header">
      <div>
        <div class="page-title"><span>≋</span> System Analytics</div>
        <div class="page-subtitle">PREDICTION ENGINE TELEMETRY // BACKTEST INTELLIGENCE</div>
      </div>
      <div style="font-size:.68rem;font-family:var(--font-mono);color:var(--text-muted)">
        分析更新: ${gen}
      </div>
    </div>

    <!-- ── Section 1: Live Performance ── -->
    <div class="section-label">ライブ実績</div>

    <div class="kpi-grid" style="margin-bottom:16px">
      <div class="kpi-card accent-cyan">
        <div class="kpi-label">推奨馬 単勝的中率</div>
        <div class="kpi-value">${_pctNum(stats.recommended_win_rate)}<span class="kpi-unit">%</span></div>
        ${n > 0 ? `<div class="kpi-sub mono" style="font-size:.62rem;color:var(--text-muted)">95% CI: ${(ciLo*100).toFixed(1)}–${(ciHi*100).toFixed(1)}%</div>` : ''}
      </div>
      <div class="kpi-card accent-green">
        <div class="kpi-label">推奨馬 複勝的中率</div>
        <div class="kpi-value">${_pctNum(stats.recommended_place_rate)}<span class="kpi-unit">%</span></div>
      </div>
      <div class="kpi-card accent-amber">
        <div class="kpi-label">スコア1位 単勝的中率</div>
        <div class="kpi-value">${_pctNum(stats.predicted_top1_win_rate)}<span class="kpi-unit">%</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">サンプル数</div>
        <div class="kpi-value mono">${n.toLocaleString()}</div>
        <div class="kpi-sub">${stats.total_predicted ?? 0} レース中</div>
      </div>
    </div>

    <!-- ベンチマーク比較 -->
    ${bench ? _buildBenchmarkPanel(stats, bench, n, wins) : ''}

    <div class="grid-2" style="margin-bottom:24px">
      <div class="panel">
        <div class="section-title"><h3>累積 単勝 / 複勝的中率推移</h3><div class="st-line"></div></div>
        ${noData
          ? `<div class="empty-state"><div class="empty-icon">📈</div><p>データ蓄積後に表示されます</p></div>`
          : `<div class="chart-wrap" style="height:220px"><canvas id="chart-ts-full"></canvas></div>`
        }
      </div>
      <div class="panel">
        <div class="section-title"><h3>会場別 単勝的中率</h3><div class="st-line"></div></div>
        ${venue.length
          ? `<div class="chart-wrap" style="height:220px"><canvas id="chart-venue"></canvas></div>`
          : `<div class="empty-state"><div class="empty-icon">🏟</div><p>会場データなし</p></div>`
        }
      </div>
    </div>

    <!-- ── Section 2: LR Model Intelligence ── -->
    <div class="section-label">モデル詳細</div>
    ${noAnalytics ? _emptyState() : _buildLrSection(analytics.lr_model)}

    <!-- ── Section 3: Indicator Performance Matrix ── -->
    <div class="section-label">指標パフォーマンス行列</div>
    ${noAnalytics ? _emptyState() : _buildHitrateTable(analytics.indicator_hitrates)}

    <!-- ── Section 4: ROI Simulation ── -->
    <div class="section-label">ROIシミュレーション</div>
    ${noAnalytics ? _emptyState() : _buildRoiTable(analytics.simulation_roi)}

    <!-- ── Section 5: Odds Gap Analysis ── -->
    <div class="section-label">オッズギャップ分析</div>
    ${noAnalytics ? _emptyState() : _buildOddsGapTable(analytics.odds_gap_bins)}
  `;
}

// ── ベンチマーク比較パネル ────────────────────────────────────────────────────

function _buildBenchmarkPanel(stats, bench, n, wins) {
  const modelRate  = (stats.recommended_win_rate ?? 0) * 100;
  const randomRate = bench.randomWinRate * 100;
  const favRate    = bench.favWinRate * 100;

  const vsRandom   = modelRate - randomRate;
  const vsFav      = modelRate - favRate;

  const _delta = (v, inv = false) => {
    const color = (inv ? v < 0 : v > 0) ? 'var(--green)' : v < 0 ? 'var(--magenta)' : 'var(--text-muted)';
    return `<span style="color:${color};font-size:.75rem;font-family:var(--font-mono)">${v > 0 ? '+' : ''}${v.toFixed(1)}pp</span>`;
  };

  const maxRate = Math.max(modelRate, randomRate, favRate, 1);
  const _bar = (v, color) =>
    `<div class="ind-bar-track" style="height:6px;flex:1;min-width:60px">
       <div style="height:6px;border-radius:3px;background:${color};width:${(v/maxRate*100).toFixed(0)}%;transition:width .4s"></div>
     </div>`;

  return `
    <div class="panel" style="margin-bottom:24px">
      <div class="section-title">
        <h3>ベンチマーク比較</h3>
        <div class="st-line"></div>
        <span class="badge badge-muted" style="font-size:.6rem">平均出走頭数 ${bench.avgFieldSize.toFixed(1)}頭 / N=${n}レース</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;padding:4px 0">
        <div style="display:grid;grid-template-columns:160px 1fr 80px 80px;align-items:center;gap:8px">
          <div style="font-size:.78rem;color:var(--cyan);font-family:var(--font-mono)">▶ GallopMetrics</div>
          ${_bar(modelRate, 'var(--cyan)')}
          <div class="mono" style="font-size:.88rem;color:var(--cyan);text-align:right">${modelRate.toFixed(1)}%</div>
          <div style="text-align:right">—</div>
        </div>
        <div style="display:grid;grid-template-columns:160px 1fr 80px 80px;align-items:center;gap:8px">
          <div style="font-size:.78rem;color:var(--amber);font-family:var(--font-mono)">◇ 市場1番人気</div>
          ${_bar(favRate, 'var(--amber)')}
          <div class="mono" style="font-size:.88rem;color:var(--amber);text-align:right">${favRate.toFixed(1)}%</div>
          <div style="text-align:right">${_delta(vsFav, true)}</div>
        </div>
        <div style="display:grid;grid-template-columns:160px 1fr 80px 80px;align-items:center;gap:8px">
          <div style="font-size:.78rem;color:var(--text-muted);font-family:var(--font-mono)">○ ランダム基準</div>
          ${_bar(randomRate, 'var(--text-muted)')}
          <div class="mono" style="font-size:.88rem;color:var(--text-muted);text-align:right">${randomRate.toFixed(1)}%</div>
          <div style="text-align:right">${_delta(vsRandom)}</div>
        </div>
      </div>
      <div style="font-size:.65rem;color:var(--text-muted);font-family:var(--font-mono);margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)">
        ※ pp = パーセントポイント差（対各ベンチマーク比）　ランダム基準 = 1 / 平均出走頭数
      </div>
    </div>
  `;
}

// ── LR モデルセクション ────────────────────────────────────────────────────

function _buildLrSection(lr) {
  if (!lr || !lr.coefficients?.length) return _emptyState();

  const aucHtml = `
    <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap;margin-bottom:16px">
      <div>
        <span class="kpi-label">訓練 AUC</span>
        <span class="mono" style="color:var(--cyan);font-size:1.4rem;margin-left:8px">${lr.auc_train?.toFixed(4) ?? '—'}</span>
      </div>
      <div>
        <span class="kpi-label">テスト AUC</span>
        <span class="mono" style="color:var(--green);font-size:1.4rem;margin-left:8px">${lr.auc_test?.toFixed(4) ?? '—'}</span>
      </div>
      ${lr.n_train ? `<div style="font-size:.72rem;color:var(--text-muted)">訓練: ${lr.n_train?.toLocaleString()} 件 / テスト: ${lr.n_test?.toLocaleString()} 件</div>` : ''}
    </div>
  `;

  const maxCoef = Math.max(...lr.coefficients.map(c => Math.abs(c.coef)));

  const coefRows = [...lr.coefficients]
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

  const weightRows = (lr.weights_comparison ?? []).map(w => {
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
        <div class="section-title"><h3>特徴量係数</h3><div class="st-line"></div>
          <span class="badge badge-amber">★=主要特徴量</span>
        </div>
        ${aucHtml}
        <div style="padding:0 4px">${coefRows}</div>
      </div>
      <div class="panel">
        <div class="section-title"><h3>重み最適化比較</h3><div class="st-line"></div></div>
        ${weightRows.length
          ? `<table class="data-table">
               <thead><tr><th>特徴量</th><th class="text-right">現在値</th><th class="text-right">最適値</th><th class="text-right">差分</th><th></th></tr></thead>
               <tbody>${weightRows}</tbody>
             </table>`
          : `<div class="empty-state"><p>データを準備中です</p></div>`
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
        <h3>指標別 的中率マトリクス</h3>
        <div class="st-line"></div>
        <span class="badge badge-muted" style="font-size:.6rem">Spearman ρ降順 / バーは単勝1位的中率を最大=100%で正規化</span>
      </div>
      <div style="overflow-x:auto">
        <table class="data-table" style="min-width:700px">
          <thead>
            <tr>
              <th>指標名</th>
              <th class="text-right">件数</th>
              <th class="text-right">Spearman ρ</th>
              <th style="min-width:160px">単勝 1位</th>
              <th class="text-right">単勝 2位</th>
              <th class="text-right">単勝 3位</th>
              <th class="text-right">複勝 1位</th>
              <th class="text-right">複勝 2位</th>
              <th class="text-right">ワイド 1-2</th>
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
    const roi      = r['roi_%'];
    const winRate  = (r['win_rate_%'] ?? 0) / 100;
    const avgPay   = r.avg_payout ?? 0;
    const sharpe   = _sharpeRatio(winRate, avgPay);
    const kelly    = _kelly(winRate, avgPay);

    const roiColor   = roi >= 100 ? 'var(--green)' : roi >= 80 ? 'var(--cyan)' : roi >= 60 ? 'var(--amber)' : 'var(--magenta)';
    const roiStar    = roi >= 100 ? ' ★' : '';
    const sharpeColor = sharpe == null ? 'var(--text-muted)' : sharpe >= 0.1 ? 'var(--green)' : sharpe >= 0 ? 'var(--amber)' : 'var(--magenta)';
    const kellyColor  = kelly == null ? 'var(--text-muted)' : kelly > 0.05 ? 'var(--green)' : kelly > 0 ? 'var(--amber)' : 'var(--magenta)';

    return `
      <tr>
        <td style="font-size:.78rem">${_esc(r.label)}</td>
        <td class="text-right mono">${r.n_bets?.toLocaleString()}</td>
        <td class="text-right mono">${r.n_hits?.toLocaleString()}</td>
        <td class="text-right mono">${r['win_rate_%']?.toFixed(1)}%</td>
        <td class="text-right mono" style="color:${roiColor};font-weight:700">${roi?.toFixed(1)}%${roiStar}</td>
        <td class="text-right mono" style="color:${sharpeColor}">${sharpe != null ? sharpe.toFixed(3) : '—'}</td>
        <td class="text-right mono" style="color:${kellyColor}">${kelly != null ? (kelly * 100).toFixed(1) + '%' : '—'}</td>
        <td class="text-right mono" style="font-size:.7rem;color:var(--text-muted)">${r.avg_payout?.toFixed(0)}円</td>
        <td class="text-right mono" style="font-size:.7rem;color:var(--text-muted)">${r.max_consecutive_loss}連敗</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="panel" style="margin-bottom:24px">
      <div class="section-title">
        <h3>ROIシミュレーション（LR合成スコア）</h3>
        <div class="st-line"></div>
        <span class="badge badge-muted" style="font-size:.6rem">★=回収率100%超</span>
      </div>
      <div style="overflow-x:auto">
        <table class="data-table" style="min-width:720px">
          <thead>
            <tr>
              <th>戦略</th>
              <th class="text-right">賭け数</th>
              <th class="text-right">的中数</th>
              <th class="text-right">的中率</th>
              <th class="text-right">回収率</th>
              <th class="text-right">Sharpe比</th>
              <th class="text-right">Kelly基準</th>
              <th class="text-right">平均払戻</th>
              <th class="text-right">最大連敗</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="font-size:.63rem;color:var(--text-muted);font-family:var(--font-mono);margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)">
        Sharpe比 = 1賭けあたり期待収益 / 収益標準偏差　／　Kelly基準 = 理論最適賭け比率（負値は見送り推奨）
      </div>
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
        <h3>オッズギャップ分析</h3>
        <div class="st-line"></div>
        <span class="badge badge-muted" style="font-size:.6rem">モデルスコア順位 vs 市場人気順位の乖離度</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>乖離度区間</th>
            <th class="text-right">レース数</th>
            <th class="text-right">単勝的中率</th>
            <th class="text-right">複勝的中率</th>
            <th class="text-right">平均市場オッズ</th>
            <th class="text-right">単勝回収率</th>
            <th class="text-right">複勝回収率</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ── Chart.js LR係数 ──────────────────────────────────────────────────────

function _renderLrChart(canvasId, coefs) {
  // CSS描画で代替済み
}

// ── 統計ユーティリティ ────────────────────────────────────────────────────

/**
 * ベンチマーク値を data.json のレースデータから計算する。
 */
function _computeBenchmarks(data) {
  const races = data?.races ?? [];
  if (!races.length) return null;

  let totalField = 0, totalRaces = 0;
  let favWins = 0, favN = 0;

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
  const avgFieldSize  = totalField / totalRaces;
  const randomWinRate = 1 / avgFieldSize;
  const favWinRate    = favN > 0 ? favWins / favN : 0.33;

  return { avgFieldSize, randomWinRate, favWinRate };
}

/**
 * Wilson 95% 信頼区間 [lo, hi] を返す。
 */
function _wilsonCI(k, n) {
  if (n === 0) return [0, 0];
  const z = 1.96;
  const p = k / n;
  const denom  = 1 + z * z / n;
  const center = (p + z * z / (2 * n)) / denom;
  const spread = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom;
  return [Math.max(0, center - spread), Math.min(1, center + spread)];
}

/**
 * 二値ベット（勝ち/負け）のSharpe比を返す。
 *   E = p * r_win - (1-p)
 *   std = sqrt(p*(1-p)) * (r_win + 1)
 *   Sharpe = E / std
 */
function _sharpeRatio(winRate, avgPayout) {
  if (!winRate || !avgPayout || avgPayout <= 0) return null;
  const rWin = avgPayout / 100 - 1;
  const E    = winRate * rWin - (1 - winRate);
  const std  = Math.sqrt(winRate * (1 - winRate)) * (rWin + 1);
  if (std === 0) return null;
  return E / std;
}

/**
 * Kelly基準: f = (b*p - q) / b
 *   b = 正味オッズ (avg_payout/100 - 1)
 *   p = 的中率, q = 1 - p
 */
function _kelly(winRate, avgPayout) {
  if (!winRate || !avgPayout || avgPayout <= 0) return null;
  const b = avgPayout / 100 - 1;
  if (b <= 0) return null;
  return (b * winRate - (1 - winRate)) / b;
}

// ── 汎用ユーティリティ ────────────────────────────────────────────────────

function _emptyState() {
  return `
    <div class="empty-state" style="margin-bottom:24px">
      <div class="empty-icon">📊</div>
      <p>データを準備中です</p>
    </div>
  `;
}

function _pct(v)    { return v != null ? `${(v * 100).toFixed(1)}%` : '—'; }
function _pctNum(v) { return v != null ? (v * 100).toFixed(1) : '0.0'; }
function _esc(s)    { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
