/**
 * boot.js — 起動シークエンスアニメーション
 */

const LINES = [
  { msg: 'Establishing secure channel to JRA Data Matrix',   status: 'ok',   delay: 320  },
  { msg: 'Authenticating subsystem credentials',             status: 'ok',   delay: 480  },
  { msg: 'Fetching matrix_payload from vault node',          status: 'ok',   delay: 640  },
  { msg: 'Decompressing zlib bitstream',                     status: 'ok',   delay: 780  },
  { msg: 'Unpacking MessagePack binaries',                   status: 'ok',   delay: 920  },
  { msg: 'Calibrating quantum momentum vectors',             status: 'ok',   delay: 1100 },
  { msg: 'Loading Sabermetrics indicator engine v4',         status: 'ok',   delay: 1260 },
  { msg: 'Seeding Elo rating lattice',                       status: 'ok',   delay: 1400 },
  { msg: 'Normalizing cross-race feature space',             status: 'ok',   delay: 1560 },
  { msg: 'Verifying audit trail integrity hashes',           status: 'ok',   delay: 1700 },
  { msg: 'SYSTEM READY — ACCESS GRANTED',                    status: 'grant', delay: 1900 },
];

const ASCII_LOGO = `
 ██╗  ██╗ █████╗ ██╗  ██╗ ██████╗ ███╗  ██╗██╗██╗    ██╗ █████╗
 ██║  ██║██╔══██╗██║ ██╔╝██╔═══██╗████╗ ██║██║██║    ██║██╔══██╗
 ███████║███████║█████╔╝ ██║   ██║██╔██╗██║██║██║ █╗ ██║███████║
 ██╔══██║██╔══██║██╔═██╗ ██║   ██║██║╚████║██║██║███╗██║██╔══██║
 ██║  ██║██║  ██║██║  ██╗╚██████╔╝██║ ╚███║██║╚███╔███╔╝██║  ██║
 ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚══╝╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝
`.trim();

const SUBTITLE = 'VAULT ANALYTICS  //  INSTITUTIONAL GRADE  //  v4.0';

export function runBootSequence(onComplete) {
  const screen = document.getElementById('boot-screen');
  if (!screen) { onComplete(); return; }

  screen.innerHTML = `
    <div class="boot-terminal">
      <div class="boot-logo">
        <pre class="logo-ascii">${ASCII_LOGO}</pre>
        <div class="logo-sub">${SUBTITLE}</div>
      </div>
      <ul class="boot-lines" id="boot-lines"></ul>
      <div class="boot-progress">
        <div class="boot-progress-bar" id="boot-bar"></div>
      </div>
    </div>
  `;

  const list = document.getElementById('boot-lines');
  const bar  = document.getElementById('boot-bar');

  LINES.forEach((line, i) => {
    const li = document.createElement('li');
    li.innerHTML = _buildLine(line, i);
    list.appendChild(li);

    setTimeout(() => {
      li.classList.add('visible');
      bar.style.width = `${Math.round(((i + 1) / LINES.length) * 100)}%`;
      if (i === LINES.length - 1) {
        setTimeout(() => _finish(screen, onComplete), 700);
      }
    }, line.delay);
  });
}

function _buildLine(line, i) {
  const prefix = `<span class="bl-prefix">[${String(i).padStart(2,'0')}]</span>`;
  let statusHtml = '';
  if (line.status === 'ok') {
    statusHtml = `<span class="bl-ok">  OK</span>`;
  } else if (line.status === 'warn') {
    statusHtml = `<span class="bl-warn">  WARN</span>`;
  } else if (line.status === 'grant') {
    statusHtml = '';
  }
  const msgClass = line.status === 'grant' ? 'bl-grant' : 'bl-msg';
  return `${prefix} <span class="${msgClass}">${line.msg}</span>${statusHtml}`;
}

function _finish(screen, onComplete) {
  screen.classList.add('fade-out');
  screen.addEventListener('animationend', () => {
    screen.remove();
    onComplete();
  }, { once: true });
}
