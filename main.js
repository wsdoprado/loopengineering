// Entry point: load → validate → start. Loading and content errors never count as attempts.
import { validateContent } from './engine/content.js';
import { startGame } from './ui/controls.js';

const app = document.getElementById('app');

function showMessage(title, lines, retry) {
  app.innerHTML = '';
  const section = document.createElement('section');
  section.className = 'panel error-panel';
  section.setAttribute('aria-labelledby', 'msg-title');
  const h = document.createElement('h2');
  h.id = 'msg-title';
  h.tabIndex = -1;
  h.textContent = title;
  section.appendChild(h);
  if (lines.length) {
    const ul = document.createElement('ul');
    for (const line of lines) {
      const li = document.createElement('li');
      li.textContent = line;
      ul.appendChild(li);
    }
    section.appendChild(ul);
  }
  if (retry) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Retry loading';
    btn.addEventListener('click', load);
    section.appendChild(btn);
  }
  app.appendChild(section);
  h.focus();
}

export async function load() {
  showMessage('Loading the exchange hall…', [], false);
  let doc;
  try {
    const res = await fetch('data/levels.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    doc = await res.json();
  } catch (err) {
    showMessage('The game content could not be loaded.',
      [`${err.message}. Start the game from a web server (see README) and retry.`], true);
    return;
  }
  const errors = validateContent(doc);
  if (errors.length > 0) {
    showMessage('Content error: the game cannot start.',
      errors.map((e) => `${e.at}: ${e.message}`), true);
    return;
  }
  startGame(app, doc);
}

load();
