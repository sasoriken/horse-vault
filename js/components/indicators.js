/**
 * indicators.js — インジケーターレンダリングエンジン
 *
 * JSON の indicators オブジェクト（カテゴリ→配列）を受け取り、
 * 設定不要で描画する。新指標はJSONに追加するだけでここに自動反映。
 */
import { INDICATOR_SLOTS, SLOT_ORDER } from '../config.js';

/**
 * 1馬分のインジケーター群をHTML文字列で返す
 * @param {object} indicators  { horse_ability: [{id,label,value,norm,unit}...], ... }
 * @param {object} opts
 */
export function renderIndicators(indicators = {}, opts = {}) {
  const { compact = false } = opts;
  if (!indicators || Object.keys(indicators).length === 0) {
    return '<span class="text-muted" style="font-size:.7rem">—</span>';
  }

  return SLOT_ORDER
    .filter(cat => indicators[cat]?.length)
    .map(cat => _renderCategory(cat, indicators[cat], compact))
    .join('');
}

/**
 * レーダーチャート用データ（Chart.js 形式）に変換
 * 全カテゴリの最初の指標をまとめる
 */
export function toRadarData(indicators = {}) {
  const labels = [];
  const data   = [];
  for (const cat of SLOT_ORDER) {
    const items = indicators[cat];
    if (!items?.length) continue;
    for (const item of items.slice(0, 2)) {
      labels.push(item.label);
      data.push(Math.round((item.norm ?? 0) * 100));
    }
  }
  return { labels, data };
}

function _renderCategory(cat, items, compact) {
  const slot = INDICATOR_SLOTS[cat];
  if (!slot) return '';
  const rows = items.map(item => _renderBar(item, slot.color, compact)).join('');
  if (compact) return rows;
  return `
    <div style="margin-bottom:${compact ? 4 : 10}px">
      <div class="label" style="margin-bottom:4px;color:${slot.accent}">${slot.label}</div>
      ${rows}
    </div>
  `;
}

function _renderBar(item, colorClass, compact) {
  const pct = Math.round((item.norm ?? 0) * 100);
  const highClass = pct >= 80 ? 'high' : '';
  const valStr = _formatValue(item.value, item.unit);
  const animDelay = Math.random() * 0.3;

  return `
    <div class="ind-row" style="margin-bottom:${compact ? 2 : 4}px">
      <div class="ind-label" title="${item.label}">${item.label}</div>
      <div class="ind-bar-track">
        <div class="ind-bar-fill ${colorClass} ${highClass}"
             style="width:${pct}%;animation-delay:${animDelay.toFixed(2)}s"></div>
      </div>
      <div class="ind-bar-val">${valStr}</div>
    </div>
  `;
}

function _formatValue(value, unit) {
  if (value == null) return '—';
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(n)) return '—';
  const str = Math.abs(n) >= 100 ? n.toFixed(0)
            : Math.abs(n) >= 10  ? n.toFixed(1)
            : n.toFixed(2);
  return unit ? `${str}<span style="font-size:.6rem;opacity:.7">${unit}</span>` : str;
}
