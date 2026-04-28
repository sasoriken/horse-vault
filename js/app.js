/**
 * app.js — メインエントリーポイント
 */
import { runBootSequence } from './boot.js';
import { registerRoute, initRouter } from './router.js';
import { fetchData } from './data.js';
import { initTicker } from './components/ticker.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderRaceboard  } from './pages/raceboard.js';
import { renderAnalytics  } from './pages/analytics.js';
import { renderAudit      } from './pages/audit.js';

// ── ルート登録 ──
registerRoute('#dashboard', renderDashboard);
registerRoute('#raceboard', renderRaceboard);
registerRoute('#analytics', renderAnalytics);
registerRoute('#audit',     renderAudit);

// ── グローバルユーティリティ ──
window._showPaywall = () => showToast(
  '🔒 エンタープライズプランへのアップグレードが必要です。\n月額 ¥498,000 — お問い合わせください。',
  'amber'
);
window._showToast = showToast;

// ── 起動 ──
runBootSequence(async () => {
  document.getElementById('app').style.visibility = 'visible';

  // データをプリロードしてティッカーを初期化
  const data = await fetchData().catch(() => null);
  initTicker(data);

  // モバイルハンバーガー
  const hamburger = document.getElementById('hamburger');
  const sidebar   = document.getElementById('sidebar');
  hamburger?.addEventListener('click', () => sidebar?.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (sidebar?.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        e.target !== hamburger) {
      sidebar.classList.remove('open');
    }
  });

  initRouter('#dashboard');
});

// ── トースト通知 ──
export function showToast(msg, type = 'default') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, 3500);
}
