/**
 * ticker.js — ヘッダーKPIティッカーバー
 */

export function initTicker(data) {
  const bar = document.getElementById('ticker-bar');
  if (!bar) return;

  const stats = data?.system_stats?.overall ?? {};
  const meta  = data?.meta ?? {};

  const items = [
    { label: 'TOTAL RACES',  value: stats.total_predicted ?? 0,         cls: '' },
    { label: 'WITH RESULTS', value: stats.with_results ?? 0,            cls: '' },
    { label: 'WIN RATE',     value: _pct(stats.recommended_win_rate),   cls: 'ts' },
    { label: 'PLACE RATE',   value: _pct(stats.recommended_place_rate), cls: 'ts' },
    { label: 'LAST UPDATE',  value: _shortTime(meta.generated_at),      cls: '' },
    { label: 'COMMIT',       value: meta.commit_hash ?? '—',            cls: '' },
    { label: 'SCHEMA',       value: `v${meta.schema_version ?? '?'}`,   cls: '' },
    { label: 'STATUS',       value: 'OPERATIONAL',                      cls: 'ts' },
  ];

  // ティッカーを2重にしてシームレスに見せる
  const itemsHtml = [...items, ...items].map(it => `
    <span class="ticker-item">
      <span class="tv">${it.label}</span>
      <span class="${it.cls || ''}">${it.value}</span>
    </span>
  `).join('');

  bar.innerHTML = `
    <div class="ticker-live">
      <span class="status-dot"></span>LIVE
    </div>
    <div class="ticker-scroll-wrap">
      <div class="ticker-scroll" id="ticker-inner">
        ${itemsHtml}
      </div>
    </div>
  `;
}

function _pct(v) {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

function _shortTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } catch { return '—'; }
}
