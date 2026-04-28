/**
 * router.js — ハッシュベースSPAルーター
 */

const _routes = {};
let _currentPage = null;

export function registerRoute(hash, renderFn) {
  _routes[hash] = renderFn;
}

export function navigate(hash) {
  location.hash = hash;
}

export function initRouter(defaultHash = '#dashboard') {
  window.addEventListener('hashchange', _handleRoute);
  if (!location.hash || !_routes[location.hash]) {
    location.hash = defaultHash;
  } else {
    _handleRoute();
  }
}

function _handleRoute() {
  const hash = location.hash || '#dashboard';
  const render = _routes[hash];
  if (!render) return;

  _currentPage = hash;
  _updateNav(hash);

  const main = document.getElementById('main');
  const el = document.createElement('div');
  el.className = 'page';
  el.id = 'page-content';
  const old = document.getElementById('page-content');
  if (old) old.remove();
  main.appendChild(el);
  render(el);
}

function _updateNav(hash) {
  document.querySelectorAll('[data-nav]').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === hash);
  });
}

export function currentPage() { return _currentPage; }
