/**
 * horses.js — 馬名鑑ページ（絶対値レーダーチャート付きランキング）
 */
import { fetchData } from '../data.js';

const RADAR_LABELS = ['スピード\n峰値', '現在\n調子', '格\n(Elo)', '上がり\n速度', '対戦\n品質', '安定性'];
const RADAR_KEYS   = ['speed_peak', 'current_form', 'class_grade', 'closing', 'quality_wins', 'consistency'];
const RADAR_COLORS = {
  fill:   'rgba(0,240,255,0.15)',
  stroke: 'rgba(0,240,255,0.8)',
  point:  '#00F0FF',
};

let _chartInst = null;

export async function renderHorses(el) {
  el.innerHTML = `<div class="page-header"><div class="page-title">Loading...</div></div>`;
  const data  = await fetchData().catch(() => null);
  const all   = data?.horses ?? [];
  el.innerHTML = _buildPage(all);
  _bindEvents(el, all);
}

// ── ページ構造 ──────────────────────────────────────────────────────────────

const DISPLAY_LIMIT = 100;

function _buildPage(horses) {
  return `
    <div class="page-header">
      <div>
        <div class="page-title"><span>◑</span> 馬名鑑</div>
        <div class="page-subtitle">HORSE REGISTRY // ${horses.length} HORSES // 絶対値グローバル百分位 // クリックでレーダーチャート</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input id="hr-search" type="text" placeholder="馬名で検索..." class="hr-search-input">
        <select id="hr-sort" class="filter-select">
          <option value="elo_raw">格・Elo順</option>
          <option value="speed_peak">スピード峰値順</option>
          <option value="current_form">現在調子順</option>
          <option value="quality_wins">対戦品質順</option>
          <option value="consistency">安定性順</option>
        </select>
      </div>
    </div>

    <div class="hr-tabs">
      <button class="hr-tab active" data-age="all">全馬</button>
      <button class="hr-tab" data-age="2">2歳</button>
      <button class="hr-tab" data-age="3">3歳</button>
      <button class="hr-tab" data-age="4+">4歳以上</button>
    </div>

    <div id="hr-list">
      ${_buildRankingTable(horses, 'all', 'elo_raw', '')}
    </div>

    <!-- レーダーモーダル -->
    <div id="hr-modal-overlay" class="gm-modal-overlay" style="display:none">
      <div class="gm-modal" style="max-width:520px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div>
            <div id="hr-modal-name" style="font-size:1.2rem;font-weight:700;color:var(--cyan)"></div>
            <div id="hr-modal-sub"  style="font-size:.75rem;color:var(--text-secondary);margin-top:2px"></div>
          </div>
          <button class="gm-modal-close" id="hr-modal-close">✕</button>
        </div>
        <div id="hr-radar-wrap" style="position:relative;height:320px;margin-bottom:20px">
          <canvas id="hr-radar-canvas"></canvas>
        </div>
        <div id="hr-stat-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px"></div>
      </div>
    </div>
  `;
}

// ── ランキングテーブル ──────────────────────────────────────────────────────

function _buildRankingTable(horses, ageFilter, sortKey, query) {
  const filtered  = _filter(horses, ageFilter);
  const searched  = _search(filtered, query);
  const sorted    = _sort(searched, sortKey);
  const isSearch  = query && query.trim().length > 0;
  const displayed = isSearch ? sorted : sorted.slice(0, DISPLAY_LIMIT);
  const hidden    = sorted.length - displayed.length;

  if (!sorted.length) {
    const msg = isSearch
      ? `「${_esc(query)}」に一致する馬が見つかりません`
      : 'データを準備中です';
    return `<div class="empty-state"><div class="empty-icon">🏇</div><p>${msg}</p></div>`;
  }

  const rows = displayed.map((h, i) => {
    const rank   = sorted.indexOf(h) + 1;
    const radar  = h.radar ?? {};
    const bars   = RADAR_KEYS.map(k => _miniBar(radar[k])).join('');
    const ageSex = [h.age != null ? `${h.age}歳` : '', h.sex ?? ''].filter(Boolean).join(' ');
    const eloDisp = h.elo_raw != null
      ? `<span class="mono" style="color:var(--cyan);font-size:.78rem">${h.elo_raw}</span>`
      : '<span style="color:var(--text-muted);font-size:.7rem">—</span>';
    return `
      <tr class="hr-row" data-name="${_esc(h.name)}" style="cursor:pointer">
        <td class="mono" style="color:var(--text-muted);font-size:.7rem;width:36px">#${rank}</td>
        <td>
          <div style="font-weight:700;font-size:.9rem">${_esc(h.name)}</div>
          <div style="font-size:.65rem;color:var(--text-muted)">${ageSex}</div>
        </td>
        <td>${eloDisp}</td>
        <td style="font-size:.65rem;color:var(--text-secondary)">${h.last_race_date ?? '—'}<br><span style="color:var(--text-muted)">${_esc(h.last_venue ?? '')} ${_esc(h.last_race_name ?? '')}</span></td>
        <td style="min-width:160px">${bars}</td>
      </tr>
    `;
  }).join('');

  const footerHtml = hidden > 0
    ? `<tr><td colspan="5" style="text-align:center;padding:12px;font-size:.72rem;color:var(--text-muted)">
         上位 ${DISPLAY_LIMIT} 頭を表示中 / 残り ${hidden} 頭は馬名で検索
       </td></tr>`
    : '';

  return `
    <div class="panel" style="padding:0">
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>馬名 / 年齢</th>
            <th>Elo</th>
            <th>最終出走</th>
            <th>能力レーダー（簡易）</th>
          </tr>
        </thead>
        <tbody>${rows}${footerHtml}</tbody>
      </table>
    </div>
  `;
}

function _miniBar(pct) {
  if (pct == null) return `<div class="hr-mini-bar" style="opacity:.2"><div class="hr-mini-fill" style="width:0%"></div></div>`;
  const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--cyan)' : pct >= 25 ? 'var(--amber)' : 'var(--magenta)';
  return `<div class="hr-mini-bar"><div class="hr-mini-fill" style="width:${pct}%;background:${color}"></div></div>`;
}

// ── フィルター・ソート ──────────────────────────────────────────────────────

function _search(horses, query) {
  if (!query || !query.trim()) return horses;
  const q = query.trim().toLowerCase();
  return horses.filter(h => h.name.toLowerCase().includes(q));
}

function _filter(horses, ageKey) {
  if (ageKey === 'all') return horses;
  if (ageKey === '4+')  return horses.filter(h => h.age != null && h.age >= 4);
  const n = parseInt(ageKey);
  return horses.filter(h => h.age === n);
}

function _sort(horses, key) {
  return [...horses].sort((a, b) => {
    const va = key === 'speed_peak' || key === 'current_form' || key === 'quality_wins' || key === 'consistency'
      ? (a.radar?.[key] ?? -1)
      : (a[key] ?? -1);
    const vb = key === 'speed_peak' || key === 'current_form' || key === 'quality_wins' || key === 'consistency'
      ? (b.radar?.[key] ?? -1)
      : (b[key] ?? -1);
    return vb - va;
  });
}

// ── レーダーモーダル ────────────────────────────────────────────────────────

function _openModal(horse) {
  const overlay = document.getElementById('hr-modal-overlay');
  if (!overlay) return;

  document.getElementById('hr-modal-name').textContent = horse.name;
  const ageSex = [horse.age != null ? `${horse.age}歳` : '', horse.sex ?? ''].filter(Boolean).join(' ');
  document.getElementById('hr-modal-sub').textContent =
    `${ageSex}  最終: ${horse.last_race_date ?? '—'} ${horse.last_venue ?? ''} / ${horse.last_race_name ?? ''}`;

  _renderStatGrid(horse);

  overlay.style.display = 'flex';
  overlay.classList.remove('gm-modal-fadeout');
  // CSS アニメーション(0.25s)完了後に描画。アニメーション中は opacity:0/scale:.97 で
  // getBoundingClientRect が不安定になるため setTimeout で待機する。
  const radarData = horse.radar ?? {};
  setTimeout(() => _renderRadar(radarData), 310);
}

function _closeModal() {
  const overlay = document.getElementById('hr-modal-overlay');
  if (!overlay) return;
  overlay.classList.add('gm-modal-fadeout');
  setTimeout(() => { overlay.style.display = 'none'; overlay.classList.remove('gm-modal-fadeout'); }, 260);
  if (_chartInst) { _chartInst.destroy(); _chartInst = null; }
}

function _renderRadar(radar) {
  if (_chartInst) { _chartInst.destroy(); _chartInst = null; }
  const canvas = document.getElementById('hr-radar-canvas');
  if (!canvas)               { console.warn('[horses] radar canvas not found'); return; }
  if (typeof Chart === 'undefined') { console.warn('[horses] Chart not loaded'); return; }

  const values = RADAR_KEYS.map(k => radar[k] ?? 0);

  _chartInst = new Chart(canvas.getContext('2d'), {
    type: 'radar',
    data: {
      labels: ['スピード峰値', '現在調子', '格 (Elo)', '上がり速度', '対戦品質', '安定性'],
      datasets: [{
        data:                values,
        backgroundColor:     RADAR_COLORS.fill,
        borderColor:         RADAR_COLORS.stroke,
        pointBackgroundColor: RADAR_COLORS.point,
        pointRadius:         4,
        borderWidth:         2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { display: false, stepSize: 25 },
          grid:       { color: 'rgba(255,255,255,0.08)' },
          angleLines: { color: 'rgba(255,255,255,0.12)' },
          pointLabels: {
            color: 'rgba(255,255,255,0.7)',
            font: { size: 11, family: "'JetBrains Mono', monospace" },
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.raw}パーセンタイル`,
          },
        },
      },
    },
  });
}

function _renderStatGrid(horse) {
  const grid = document.getElementById('hr-stat-grid');
  if (!grid) return;

  const r = horse.radar ?? {};
  const ITEMS = [
    { label: 'スピード峰値',  key: 'speed_peak',   color: 'var(--cyan)' },
    { label: '現在調子',     key: 'current_form', color: 'var(--green)' },
    { label: '格 (Elo)',    key: 'class_grade',  color: 'var(--amber)', raw: horse.elo_raw },
    { label: '上がり速度',    key: 'closing',      color: 'var(--cyan)' },
    { label: '対戦品質',     key: 'quality_wins', color: 'var(--green)' },
    { label: '安定性',       key: 'consistency',  color: 'var(--amber)' },
  ];

  grid.innerHTML = ITEMS.map(item => {
    const pct = r[item.key];
    const display = pct != null ? `${pct}<span style="font-size:.6rem">%ile</span>` : '—';
    const rawLine = item.raw != null ? `<div style="font-size:.6rem;color:var(--text-muted)">Elo ${item.raw}</div>` : '';
    return `
      <div style="background:rgba(255,255,255,.04);border-radius:var(--radius);padding:10px;text-align:center">
        <div style="font-size:.6rem;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase">${item.label}</div>
        <div style="font-size:1.1rem;font-weight:700;color:${item.color};font-family:var(--font-mono)">${display}</div>
        ${rawLine}
      </div>`;
  }).join('');
}

// ── イベント ────────────────────────────────────────────────────────────────

function _bindEvents(el, allHorses) {
  let currentAge    = 'all';
  let currentSort   = 'elo_raw';
  let currentSearch = '';
  let searchTimer   = null;

  const list = el.querySelector('#hr-list');

  const rerender = () => {
    list.innerHTML = _buildRankingTable(allHorses, currentAge, currentSort, currentSearch);
    _bindRowClicks(list, allHorses);
  };

  // 検索
  const searchInput = el.querySelector('#hr-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentSearch = searchInput.value;
        rerender();
      }, 200);
    });
  }

  // タブ切替
  el.querySelectorAll('.hr-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.hr-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAge = btn.dataset.age;
      rerender();
    });
  });

  // ソート切替
  const sortSel = el.querySelector('#hr-sort');
  if (sortSel) {
    sortSel.addEventListener('change', () => {
      currentSort = sortSel.value;
      rerender();
    });
  }

  // モーダル閉じる
  document.getElementById('hr-modal-close')?.addEventListener('click', _closeModal);
  document.getElementById('hr-modal-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'hr-modal-overlay') _closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') _closeModal(); });

  // 行クリック
  _bindRowClicks(list, allHorses);
}

function _bindRowClicks(container, allHorses) {
  container.querySelectorAll('.hr-row').forEach(row => {
    row.addEventListener('click', () => {
      const name  = row.dataset.name;
      const horse = allHorses.find(h => h.name === name);
      if (horse) _openModal(horse);
    });
  });
}

function _esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
