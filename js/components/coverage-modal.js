/**
 * coverage-modal.js — GallopMetrics Research カバレッジレポートモーダル
 *
 * openCoverageModal(horseName, entry, race, allRaces) で呼ぶ。
 * - レーダーチャート（全指標 norm 値）
 * - スピード指数時系列チャート（株価スタイル + MA5）
 * - BUY/HOLD/SELL レーティング + ターゲットオッズ
 * - 自動生成エグゼクティブサマリー
 */
import { toRadarData } from './indicators.js';

// Chart インスタンスを追跡（キャンバス再利用時に destroy）
const _chartInstances = new Map();

// ── 公開 API ───────────────────────────────────────────────────────────────

export function openCoverageModal(horseName, entry, race, allRaces) {
  // 既存モーダルを閉じる
  document.getElementById('gm-coverage-modal')?.remove();

  const rating     = _getRating(entry);
  const targetOdds = _targetOdds(entry);
  const summary    = _execSummary(entry, race);
  const speedHist  = _buildSpeedHistory(horseName, allRaces);
  const uid        = _uid(horseName);

  const overlay = document.createElement('div');
  overlay.id = 'gm-coverage-modal';
  overlay.className = 'gm-modal-overlay';
  overlay.innerHTML = _buildHtml(uid, horseName, entry, race, rating, targetOdds, summary, speedHist);
  document.body.appendChild(overlay);

  // 閉じるイベント
  overlay.querySelector('.gm-modal-close')?.addEventListener('click', () => _close(overlay));
  overlay.addEventListener('click', e => { if (e.target === overlay) _close(overlay); });
  document.addEventListener('keydown', function _esc(e) {
    if (e.key === 'Escape') { _close(overlay); document.removeEventListener('keydown', _esc); }
  });

  // チャート描画（DOM 挿入後）
  requestAnimationFrame(() => {
    _renderRadar(`gm-radar-${uid}`, entry.indicators);
    _renderSpeedChart(`gm-speed-${uid}`, speedHist);
  });
}

function _close(overlay) {
  overlay.classList.add('gm-modal-fadeout');
  setTimeout(() => overlay.remove(), 250);
}

// ── HTML 構築 ──────────────────────────────────────────────────────────────

function _buildHtml(uid, name, entry, race, rating, targetOdds, summary, speedHist) {
  const surf    = race.surface === 'turf' ? '芝' : race.surface === 'dirt' ? 'ダ' : race.surface ?? '?';
  const dateStr = race.date ?? '—';
  const now     = new Date().toLocaleDateString('ja-JP');
  const rank    = entry.prediction_rank ?? '?';
  const total   = race.field_size ?? '?';
  const winPct  = entry.predicted_win_rate != null ? (entry.predicted_win_rate * 100).toFixed(1) : '—';
  const odds    = entry.odds != null ? `${entry.odds}倍` : '—';

  // KPI ミニグリッド
  const v4Ind   = _findInd(entry, 'score_v4');
  const v4sigma = v4Ind?.value?.toFixed(2) ?? '—';
  const eloInd  = _findInd(entry, 'elo');
  const eloVal  = eloInd?.value != null ? eloInd.value.toFixed(0) : '—';
  const wasiInd = _findInd(entry, 'wasi');
  const wasiVal = wasiInd?.value != null ? wasiInd.value.toFixed(1) : '—';

  const kpiItems = [
    ['V4 Composite σ', v4sigma],
    ['スコアランク',   `#${rank} / ${total}`],
    ['予想勝率',       `${winPct}%`],
    ['市場オッズ',     odds],
    ['Elo Rating',    eloVal],
    ['WASI (pts)',    wasiVal],
    ['騎手',          entry.jockey ?? '—'],
    ['レース',        `${race.venue ?? '?'} R${race.race_number ?? '?'}`],
  ];
  const kpiHtml = kpiItems.map(([lbl, val]) => `
    <div style="border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:8px 10px;">
      <div style="font-size:.58rem;color:var(--text-muted);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">${lbl}</div>
      <div style="font-size:.85rem;font-family:var(--font-mono);color:var(--text-primary)">${val}</div>
    </div>`).join('');

  const speedSection = speedHist.length >= 2
    ? `<div class="chart-wrap" style="height:180px"><canvas id="gm-speed-${uid}"></canvas></div>`
    : `<div style="display:flex;align-items:center;justify-content:center;height:180px;color:var(--text-muted);font-size:.75rem">データ蓄積後に表示</div>`;

  return `
  <div class="gm-modal">
    <!-- ヘッダー -->
    <div style="border-bottom:1px solid var(--border);padding-bottom:14px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div>
          <div style="font-size:.6rem;font-family:var(--font-mono);color:var(--text-muted);letter-spacing:.12em;margin-bottom:4px">
            GALLOPMETRICS RESEARCH &nbsp;|&nbsp; EQUITY ANALOGUE COVERAGE &nbsp;|&nbsp; ${now}
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span style="font-size:1.3rem;font-weight:700;color:var(--text-primary)">${_esc(name)}</span>
            <span class="gm-rating-badge gm-rating-${rating.cls}">${rating.arrow}&nbsp;${rating.label}</span>
            <span style="font-size:.75rem;font-family:var(--font-mono);color:var(--amber)">Target: ${targetOdds}</span>
          </div>
          <div style="font-size:.68rem;color:var(--text-secondary);margin-top:4px;font-family:var(--font-mono)">
            Sector: ${surf}${race.distance ?? '?'}m &nbsp;·&nbsp; ${race.race_name ?? '?'} &nbsp;·&nbsp; ${dateStr} &nbsp;·&nbsp; Analyst: GallopMetrics v4.0
          </div>
        </div>
        <button class="gm-modal-close" title="閉じる">✕</button>
      </div>
    </div>

    <!-- エグゼクティブサマリー -->
    <div style="background:rgba(0,240,255,.04);border:1px solid rgba(0,240,255,.12);border-radius:6px;padding:12px 16px;margin-bottom:16px">
      <div style="font-size:.58rem;font-family:var(--font-mono);color:var(--cyan);letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">Executive Summary</div>
      <div style="font-size:.8rem;color:var(--text-secondary);line-height:1.7">${_esc(summary)}</div>
    </div>

    <!-- チャート 2カラム -->
    <div style="display:grid;grid-template-columns:240px 1fr;gap:16px;margin-bottom:16px">
      <div>
        <div style="font-size:.58rem;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">Capability Radar</div>
        <div style="height:220px;position:relative"><canvas id="gm-radar-${uid}"></canvas></div>
      </div>
      <div>
        <div style="font-size:.58rem;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">
          Speed Index — Historical (${speedHist.length} data points)
        </div>
        ${speedSection}
      </div>
    </div>

    <!-- KPI グリッド -->
    <div style="font-size:.58rem;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">Key Metrics</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:4px">
      ${kpiHtml}
    </div>

    <!-- フッター -->
    <div style="margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06);font-size:.6rem;color:var(--text-muted);font-family:var(--font-mono);line-height:1.6">
      This report is generated by GallopMetrics v4.0 Autonomous Research Engine. For entertainment purposes only.
      Past performance does not guarantee future results. Not financial advice.
      GallopMetrics, Inc. — Thoroughbred Intelligence Division — Tokyo, Japan
    </div>
  </div>`;
}

// ── チャート描画 ───────────────────────────────────────────────────────────

function _renderRadar(canvasId, indicators) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  _chartInstances.get(canvasId)?.destroy();

  const { labels, data } = toRadarData(indicators);
  if (!labels.length) return;

  const chart = new Chart(canvas.getContext('2d'), {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: 'rgba(0,240,255,.12)',
        borderColor: '#00F0FF',
        borderWidth: 1.5,
        pointBackgroundColor: '#00F0FF',
        pointRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0, max: 100,
          ticks:     { display: false },
          grid:      { color: 'rgba(255,255,255,.08)' },
          angleLines:{ color: 'rgba(255,255,255,.08)' },
          pointLabels: {
            color: 'rgba(200,220,255,.7)',
            font: { size: 9, family: 'JetBrains Mono, monospace' },
          },
        },
      },
      plugins: { legend: { display: false } },
    },
  });
  _chartInstances.set(canvasId, chart);
}

function _renderSpeedChart(canvasId, history) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || history.length < 2) return;
  _chartInstances.get(canvasId)?.destroy();

  const labels = history.map(p => p.date);
  const values = history.map(p => p.value);

  // MA5
  const ma5 = values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - 4), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });

  const chart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Speed Index',
          data: values,
          borderColor: '#00F0FF',
          backgroundColor: 'rgba(0,240,255,.08)',
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#00F0FF',
          tension: 0.3,
          fill: true,
        },
        {
          label: 'MA5',
          data: ma5,
          borderColor: '#FFB800',
          borderWidth: 1.5,
          borderDash: [4, 3],
          pointRadius: 0,
          tension: 0.3,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          ticks:  { color: 'rgba(200,220,255,.5)', font: { size: 9 } },
          grid:   { color: 'rgba(255,255,255,.05)' },
        },
        y: {
          ticks:  { color: 'rgba(200,220,255,.5)', font: { size: 9, family: 'JetBrains Mono, monospace' } },
          grid:   { color: 'rgba(255,255,255,.05)' },
        },
      },
      plugins: {
        legend: {
          labels: { color: 'rgba(200,220,255,.6)', font: { size: 10 }, boxWidth: 20 },
        },
        tooltip: {
          backgroundColor: 'rgba(6,11,20,.95)',
          borderColor: 'rgba(0,240,255,.4)',
          borderWidth: 1,
          titleColor: '#00F0FF',
          bodyColor: '#E8F0FF',
          callbacks: {
            title: ctx => history[ctx[0].dataIndex]?.race ?? ctx[0].label,
          },
        },
      },
    },
  });
  _chartInstances.set(canvasId, chart);
}

// ── レーティング計算 ───────────────────────────────────────────────────────

export function getRating(entry) { return _getRating(entry); }

function _getRating(entry) {
  const s = entry.predicted_win_rate ?? 0;
  if (s >= 0.65) return { label: 'STRONG BUY', cls: 'strong-buy', arrow: '▲▲' };
  if (s >= 0.50) return { label: 'BUY',         cls: 'buy',        arrow: '▲' };
  if (s >= 0.35) return { label: 'HOLD',         cls: 'hold',       arrow: '—' };
  if (s >= 0.20) return { label: 'SELL',         cls: 'sell',       arrow: '▼' };
  return           { label: 'STRONG SELL',  cls: 'sell',       arrow: '▼▼' };
}

function _targetOdds(entry) {
  const p = entry.predicted_win_rate;
  if (!p || p <= 0) return '—';
  return (1 / p).toFixed(1) + 'x';
}

// ── エグゼクティブサマリー自動生成 ────────────────────────────────────────

function _execSummary(entry, race) {
  const rank    = entry.prediction_rank ?? '?';
  const total   = race.field_size ?? '?';
  const v4Ind   = _findInd(entry, 'score_v4');
  const v4sigma = v4Ind?.value?.toFixed(2) ?? '—';
  const v4pct   = v4Ind?.norm != null ? Math.round(v4Ind.norm * 100) : null;

  const lines = [];

  lines.push(
    `V4 composite σ=${v4sigma}、${total}頭立て中第${rank}位` +
    (v4pct != null ? `（上位${100 - v4pct}パーセンタイル）` : '') + '。'
  );

  const wasiInd = _findInd(entry, 'wasi');
  if (wasiInd?.norm != null && wasiInd.norm >= 0.6)
    lines.push(`斤量補正SI（WASI）${wasiInd.value?.toFixed(1)} pts — 同条件ベスト比上位水準。重馬場・斤量優位を示唆。`);

  const eloInd = _findInd(entry, 'elo');
  if (eloInd?.norm != null && eloInd.norm >= 0.6)
    lines.push(`Eloレーティング ${eloInd.value?.toFixed(0)} — 過去対戦成績に基づく能力値は同メンバー上位水準。`);

  const momInd = _findInd(entry, 'momentum');
  if (momInd?.norm != null) {
    const trend = momInd.norm >= 0.6 ? '上昇トレンド継続中' : momInd.norm >= 0.4 ? '横ばい' : '調整局面';
    lines.push(`モメンタム指数は${trend}（${(momInd.norm * 100).toFixed(0)}パーセンタイル）。`);
  }

  const oqsInd = _findInd(entry, 'oqs');
  if (oqsInd?.norm != null && oqsInd.norm >= 0.65)
    lines.push(`対戦相手強度（OQS）が高水準 — 格上との競走経験を反映。`);

  const fatInd = _findInd(entry, 'fatigue');
  if (fatInd?.norm != null && fatInd.norm <= 0.3)
    lines.push(`疲労指数低値（フレッシュ状態）。前走からの回復が良好。`);

  lines.push(`Coverage initiated. Target odds: ${_targetOdds(entry)}.`);

  return lines.join(' ');
}

// ── スピード指数履歴構築 ──────────────────────────────────────────────────

function _buildSpeedHistory(horseName, allRaces) {
  const points = [];
  for (const race of (allRaces ?? [])) {
    const entry = (race.entries ?? []).find(e => e.horse_name === horseName);
    if (!entry) continue;
    // si_best (SpeedIndex BestSameCond) を優先、なければ score_v4 norm
    const siInd = _findInd(entry, 'si_best') ?? _findInd(entry, 'wasi');
    if (siInd?.value != null) {
      points.push({ date: race.date, value: +siInd.value.toFixed(2), race: race.race_name ?? race.race_id });
    }
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

// ── ユーティリティ ────────────────────────────────────────────────────────

function _findInd(entry, id) {
  for (const cat of Object.values(entry.indicators ?? {})) {
    const found = cat.find(i => i.id === id);
    if (found) return found;
  }
  return null;
}

function _uid(name) {
  return name.replace(/[^a-zA-Z0-9ぁ-んァ-ン一-龯]/g, '_').slice(0, 20) + '_' + Date.now();
}

function _esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
