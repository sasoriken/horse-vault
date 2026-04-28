/**
 * audit.js — Audit Trail ページ（予測vs結果 証跡）
 */
import { fetchData } from '../data.js';

const PAGE_SIZE = 50;

export async function renderAudit(el) {
  el.innerHTML = `<div class="page-header"><div class="page-title">Loading...</div></div>`;
  const data = await fetchData().catch(() => null);
  const log  = data?.audit_log ?? [];
  el.innerHTML = _buildPage(log, data?.meta);
  _bindEvents(el, log);
}

function _buildPage(log, meta) {
  const wins   = log.filter(e => e.hit_win).length;
  const top3s  = log.filter(e => e.hit_top3).length;
  const n      = log.length || 1;

  return `
    <div class="page-header">
      <div>
        <div class="page-title"><span>⊞</span> Audit Trail</div>
        <div class="page-subtitle">
          IMMUTABLE PREDICTION LEDGER // ${log.length} RECORDS //
          COMMIT ${meta?.commit_hash ?? 'N/A'}
        </div>
      </div>
      <button class="paywall-btn" onclick="window._showPaywall()">
        🔒 Unlock Institutional Data
      </button>
    </div>

    <!-- サマリ -->
    <div class="kpi-grid" style="margin-bottom:24px">
      <div class="kpi-card accent-cyan">
        <div class="kpi-label">Total Audited Races</div>
        <div class="kpi-value mono">${log.length}</div>
      </div>
      <div class="kpi-card accent-green">
        <div class="kpi-label">Win Hits</div>
        <div class="kpi-value">${wins}<span class="kpi-unit">${log.length ? `/ ${(wins/n*100).toFixed(1)}%` : ''}</span></div>
      </div>
      <div class="kpi-card accent-amber">
        <div class="kpi-label">Place Hits (Top 3)</div>
        <div class="kpi-value">${top3s}<span class="kpi-unit">${log.length ? `/ ${(top3s/n*100).toFixed(1)}%` : ''}</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Miss Rate</div>
        <div class="kpi-value text-secondary">${((1 - wins/n)*100).toFixed(1)}<span class="kpi-unit">%</span></div>
      </div>
    </div>

    <!-- フィルター -->
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <input id="audit-search" type="text" placeholder="馬名・競馬場で検索..."
        style="background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);
               color:var(--text-primary);padding:6px 12px;font-family:var(--font-sans);font-size:.82rem;
               outline:none;min-width:200px">
      <select id="audit-filter-hit" class="filter-select">
        <option value="all">All Results</option>
        <option value="win">Win ✓</option>
        <option value="top3">Top 3 ✓</option>
        <option value="miss">Miss</option>
      </select>
      <span id="audit-count" class="mono" style="font-size:.7rem;color:var(--text-muted);margin-left:4px">
        ${log.length} records
      </span>
    </div>

    <!-- ログテーブル -->
    <div class="panel panel-scan" style="padding:0">
      <div class="audit-row header">
        <span>Date</span>
        <span>Venue</span>
        <span>Race</span>
        <span>Recommended</span>
        <span>Win Rate</span>
        <span>Pos</span>
        <span>Win / Top3</span>
      </div>
      <div id="audit-body">
        ${log.length
          ? _buildRows(log.slice(0, PAGE_SIZE))
          : `<div class="empty-state">
               <div class="empty-icon">🔍</div>
               <p>予測＋結果が揃ったレースの記録がここに表示されます</p>
             </div>`
        }
      </div>
      ${log.length > PAGE_SIZE
        ? `<div style="text-align:center;padding:14px">
             <button id="load-more" class="paywall-btn" style="border-color:var(--border);color:var(--text-secondary)">
               Load More (${log.length - PAGE_SIZE} remaining)
             </button>
           </div>`
        : ''
      }
    </div>
  `;
}

function _buildRows(entries) {
  return entries.map(e => {
    const winIcon  = e.hit_win  === true  ? '<span class="hit-icon hit-win">●</span>'
                   : e.hit_win  === false ? '<span class="hit-icon hit-miss">×</span>'
                   : '<span class="hit-icon hit-none">—</span>';
    const top3Icon = e.hit_top3 === true  ? '<span class="hit-icon hit-win">●</span>'
                   : e.hit_top3 === false ? '<span class="hit-icon hit-miss">×</span>'
                   : '<span class="hit-icon hit-none">—</span>';
    const predicted = new Date(e.predicted_at);
    const timeStr   = `${String(predicted.getHours()).padStart(2,'0')}:${String(predicted.getMinutes()).padStart(2,'0')}`;

    return `
      <div class="audit-row" data-hit="${e.hit_win ? 'win' : e.hit_top3 ? 'top3' : 'miss'}"
           data-search="${(e.venue+e.race_name+e.recommended_horse).toLowerCase()}">
        <span class="mono" style="font-size:.75rem">${e.date}</span>
        <span>${e.venue}</span>
        <span style="font-size:.78rem">
          <div>${e.race_name}</div>
          <div class="hash-tag" title="予測タイムスタンプ: ${e.predicted_at}">
            ${timeStr} pre-race
          </div>
        </span>
        <span style="font-weight:${e.hit_win ? 700 : 400};color:${e.hit_win ? 'var(--green)' : 'var(--text-primary)'}">
          ${e.recommended_horse}
        </span>
        <span class="mono" style="color:var(--cyan)">${(e.predicted_win_rate*100).toFixed(1)}%</span>
        <span class="mono">${e.actual_position ?? '—'}</span>
        <span style="display:flex;gap:6px">${winIcon} ${top3Icon}</span>
      </div>
    `;
  }).join('');
}

function _bindEvents(el, fullLog) {
  let shown = PAGE_SIZE;

  const search = el.querySelector('#audit-search');
  const filter = el.querySelector('#audit-filter-hit');
  const body   = el.querySelector('#audit-body');
  const countEl = el.querySelector('#audit-count');
  const loadMore = el.querySelector('#load-more');

  const applyFilter = () => {
    const q   = (search?.value ?? '').toLowerCase();
    const hit = filter?.value ?? 'all';
    const rows = body?.querySelectorAll('.audit-row:not(.header)') ?? [];
    let visible = 0;
    rows.forEach(row => {
      const matchSearch = !q || (row.dataset.search ?? '').includes(q);
      const matchHit    = hit === 'all' || row.dataset.hit === hit;
      const show = matchSearch && matchHit;
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (countEl) countEl.textContent = `${visible} records`;
  };

  search?.addEventListener('input', applyFilter);
  filter?.addEventListener('change', applyFilter);

  loadMore?.addEventListener('click', () => {
    const next = fullLog.slice(shown, shown + PAGE_SIZE);
    shown += next.length;
    const html = _buildRows(next);
    const div = document.createElement('div');
    div.innerHTML = html;
    body.appendChild(div);
    loadMore.textContent = `Load More (${fullLog.length - shown} remaining)`;
    if (shown >= fullLog.length) loadMore.remove();
  });
}
