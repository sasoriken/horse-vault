/**
 * raceboard.js — Race Intelligence ページ（予測一覧）
 */
import { fetchData } from '../data.js';
import { renderIndicators } from '../components/indicators.js';
import { openCoverageModal, getRating } from '../components/coverage-modal.js';
import { SURFACE_LABELS, CONDITION_LABELS, CLASS_ACCENT } from '../config.js';

let _allRaces = [];

export async function renderRaceboard(el) {
  el.innerHTML = `<div class="page-header"><div class="page-title">Loading...</div></div>`;
  const data  = await fetchData().catch(() => null);
  _allRaces   = data?.races ?? [];
  el.innerHTML = _buildPage(_allRaces);
  _bindEvents(el, _allRaces);
}

function _buildPage(races) {
  return `
    <div class="page-header">
      <div>
        <div class="page-title"><span>◉</span> Race Intelligence</div>
        <div class="page-subtitle">AI PREDICTION MATRIX // ${races.length} RACES LOADED // 馬名クリックでカバレッジレポート</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="paywall-btn" onclick="window._showPaywall()">
          🔒 Unlock Institutional Data
        </button>
        <select id="filter-status" class="filter-select">
          <option value="all">All Races</option>
          <option value="predicted">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </div>

    <style>
      .filter-select {
        background: var(--bg-input);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--text-primary);
        padding: 6px 10px;
        font-family: var(--font-mono);
        font-size: .78rem;
        cursor: pointer;
      }
    </style>

    <div id="race-list">
      ${races.length
        ? races.map(_buildRaceCard).join('')
        : `<div class="empty-state">
             <div class="empty-icon">🏇</div>
             <p>まだ予測データがありません。<br>scrape.py と Claude の予測を実行してください。</p>
           </div>`
      }
    </div>
  `;
}

function _buildRaceCard(race) {
  const surf  = SURFACE_LABELS[race.surface]  ?? race.surface  ?? '?';
  const cond  = CONDITION_LABELS[race.condition] ?? race.condition ?? '?';
  const accentColor = CLASS_ACCENT[race.race_class] ?? 'var(--text-secondary)';
  const isDone = race.status === 'completed';

  const topPicks = (race.entries ?? [])
    .filter(e => e.is_recommended)
    .slice(0, 3);

  const topPicksHtml = topPicks.map(e => `
    <span class="badge ${isDone && e.hit_win ? 'badge-green' : isDone ? 'badge-muted' : 'badge-cyan'}">
      ${e.horse_name}
      ${isDone ? (e.hit_win ? ' ✓1着' : e.hit_top3 ? ' ✓3着' : ` ${e.actual_position}着`) : ''}
    </span>
  `).join('');

  return `
    <div class="race-card" data-race-id="${race.race_id}" data-status="${race.status}">
      <div class="race-card-header">
        <span class="badge" style="color:${accentColor};border-color:${accentColor};background:transparent">
          ${race.race_class ?? '—'}
        </span>
        <span style="font-weight:700;font-size:.95rem">${race.race_name}</span>
        <span class="badge badge-muted">${race.date}</span>
        <span class="badge badge-muted">${race.venue} R${race.race_number}</span>
        <span class="badge badge-muted">${race.distance}m ${surf} ${cond}</span>
        ${topPicksHtml}
        <span class="badge ${isDone ? 'badge-green' : 'badge-amber'}" style="margin-left:auto;margin-right:24px">
          ${isDone ? 'COMPLETED' : 'PREDICTED'}
        </span>
      </div>
      <div class="race-card-body">
        ${_buildEntryTable(race)}
      </div>
    </div>
  `;
}

function _buildEntryTable(race) {
  const entries = [...(race.entries ?? [])].sort(
    (a, b) => (a.horse_number ?? 99) - (b.horse_number ?? 99)
  );
  const isDone  = race.status === 'completed';

  const rows = entries.map(e => {
    const numCls  = `horse-num hn-${e.horse_number ?? 0}`;
    const hitWin  = isDone ? (e.hit_win  ? '<span class="hit-icon hit-win">●</span>'  : '<span class="hit-icon hit-miss">×</span>') : '—';
    const hitTop3 = isDone ? (e.hit_top3 ? '<span class="hit-icon hit-win">●</span>'  : '<span class="hit-icon hit-miss">×</span>') : '—';
    const pos     = isDone ? (e.actual_position ?? '?') : '—';
    const conf    = e.ai_confidence
      ? `<div class="confidence-bar">
           <div class="conf-track"><div class="conf-fill ${e.ai_confidence >= 80 ? 'pulse-glow' : ''}" style="width:${e.ai_confidence}%"></div></div>
           <span class="conf-val">${e.ai_confidence}%</span>
         </div>`
      : '—';

    const indHtml = renderIndicators(e.indicators, { compact: true });

    const rating = getRating(e);
    return `
      <tr class="entry-row ${e.is_recommended ? 'recommended' : ''}"
          data-horse="${e.horse_name}">
        <td><span class="${numCls}">${e.horse_number ?? '?'}</span></td>
        <td>
          <div style="font-weight:${e.is_recommended ? 700 : 400};display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span class="horse-name-link" style="cursor:pointer;text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(0,240,255,.4)"
                  data-horse="${_esc(e.horse_name)}" data-race-id="${_esc(race.race_id)}">
              ${_esc(e.horse_name)}
            </span>
            ${e.is_recommended ? '<span class="badge badge-cyan" style="font-size:.58rem">◆ REC</span>' : ''}
            <span class="gm-rating-badge gm-rating-${rating.cls}" style="font-size:.55rem;padding:1px 5px">${rating.arrow}&nbsp;${rating.label}</span>
          </div>
          <div style="font-size:.68rem;color:var(--text-secondary)">${e.jockey ?? '—'}</div>
        </td>
        <td class="mono" style="color:var(--cyan);font-size:.85rem">${(e.predicted_win_rate * 100).toFixed(1)}%</td>
        <td>${conf}</td>
        <td style="font-size:.75rem">${e.odds != null ? `${e.odds}倍` : '—'}</td>
        <td class="text-center">${pos}</td>
        <td class="text-center">${hitWin}</td>
        <td class="text-center">${hitTop3}</td>
        <td style="min-width:200px">${indHtml}</td>
      </tr>
    `;
  }).join('');

  const summaryHtml = race.overall_summary
    ? `<div style="padding:12px 18px;font-size:.78rem;color:var(--text-secondary);border-top:1px solid var(--border);line-height:1.6">
         <span style="color:var(--cyan);font-family:var(--font-mono);font-size:.65rem;text-transform:uppercase;margin-right:8px">AI Summary</span>
         ${_esc(race.overall_summary)}
       </div>`
    : '';

  const payoffsHtml = _buildPayoffs(race.payoffs);

  return `
    <div class="race-meta-row">
      <span class="label">出走数</span><span>${race.field_size ?? '?'}頭</span>
      <span class="label">方向</span><span>${race.direction ?? '—'}</span>
      <span class="label">予測日時</span><span class="mono" style="font-size:.7rem">${race.predicted_at ? new Date(race.predicted_at).toLocaleString('ja-JP') : '—'}</span>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th>番</th>
          <th>馬名 / 騎手</th>
          <th>予想勝率</th>
          <th>Confidence</th>
          <th>オッズ</th>
          <th>着順</th>
          <th>1着</th>
          <th>3着内</th>
          <th>Indicators</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${summaryHtml}
    ${payoffsHtml}
  `;
}

function _buildPayoffs(payoffs) {
  if (!payoffs || Object.keys(payoffs).length === 0) return '';
  const BET_LABELS = {
    tansho: '単勝', fukusho: '複勝', wakuren: '枠連', umaren: '馬連',
    wide: 'ワイド', umatan: '馬単', fuku3: '三連複', tan3: '三連単',
  };
  const rows = Object.entries(payoffs).map(([type, items]) =>
    items.map(p => `
      <div style="display:flex;gap:10px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04)">
        <span class="badge badge-amber" style="font-size:.65rem;min-width:54px;justify-content:center">${BET_LABELS[type] ?? type}</span>
        <span class="mono" style="font-size:.75rem;color:var(--text-secondary)">${p.numbers.join('-')}</span>
        <span class="mono" style="font-size:.85rem;color:var(--amber);font-weight:700">${p.payout.toLocaleString()}円</span>
        ${p.popularity ? `<span style="font-size:.65rem;color:var(--text-muted)">${p.popularity}人気</span>` : ''}
      </div>
    `).join('')
  ).join('');

  return `
    <div style="padding:12px 18px;border-top:1px solid var(--border)">
      <div class="label" style="margin-bottom:8px">払い戻し</div>
      ${rows}
    </div>
  `;
}

function _bindEvents(el, allRaces) {
  // アコーディオン
  el.querySelectorAll('.race-card-header').forEach(header => {
    header.addEventListener('click', () => {
      const card = header.closest('.race-card');
      card.classList.toggle('expanded');
    });
  });

  // フィルター
  const sel = el.querySelector('#filter-status');
  if (sel) {
    sel.addEventListener('change', () => {
      const val = sel.value;
      el.querySelectorAll('.race-card').forEach(card => {
        card.style.display =
          val === 'all' || card.dataset.status === val ? '' : 'none';
      });
    });
  }

  // 馬名クリック → カバレッジレポートモーダル
  el.addEventListener('click', e => {
    const link = e.target.closest('.horse-name-link');
    if (!link) return;
    e.stopPropagation();
    const horseName = link.dataset.horse;
    const raceId    = link.dataset.raceId;
    const race      = allRaces.find(r => r.race_id === raceId);
    if (!race) return;
    const entry = (race.entries ?? []).find(en => en.horse_name === horseName);
    if (!entry) return;
    openCoverageModal(horseName, entry, race, allRaces);
  });
}

function _esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
