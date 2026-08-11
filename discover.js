// ════════════════════════════════════════════════════════
// DISCOVERY — quiet gamification for the Pavilion
//
// Guests who want to can find who Non is by walking the room.
// Nothing announces itself. A small counter ticks when something
// is found. Progress stays on this device only.
// ════════════════════════════════════════════════════════

const STORAGE_KEY = 'nonarkara.found';

/** @type {{ id: string, title: string, whisper: string }[]} */
export const SECRETS = [
  { id: 'cup',         title: 'สบายๆ',           whisper: 'something on the table' },
  { id: 'sky',         title: 'the overhead',     whisper: 'look up' },
  { id: 'ground',      title: 'where you stand',  whisper: 'look down' },
  { id: 'door',        title: 'still locked',     whisper: 'spin around' },
  { id: 'bookshelf',   title: 'the record',       whisper: 'the shelves' },
  { id: 'pedestal',    title: 'the network',      whisper: 'the globe' },
  { id: 'coffee',      title: 'take this with you', whisper: 'the table itself' },
  { id: 'vinyl',       title: 'side A',           whisper: 'the turntable' },
  { id: 'aphorism',    title: 'his words',        whisper: 'the wall behind you' },
  { id: 'bangkok',     title: 'home',             whisper: 'a city on the map' },
  { id: 'portraits',   title: 'a face',           whisper: 'the portraits' },
  { id: 'chandelier',  title: 'day / night',      whisper: 'the light above' },
  { id: 'konami',      title: '↑↑↓↓←→←→BA',       whisper: 'an old code' },
  { id: 'tv',          title: 'the work',         whisper: 'any screen on the wall' },
  // The estate does things now, and finding them counts.
  { id: 'arcade',      title: 'insert coin',      whisper: 'the glass house has cabinets' },
  { id: 'bkkroom',     title: 'bangkok, framed',  whisper: 'savoye’s living floor' },
  { id: 'truck',       title: 'the keys',         whisper: 'something is parked' },
  { id: 'goal',        title: 'back of the net',  whisper: 'there is a pitch' },
  { id: 'hoop',        title: 'swish',            whisper: 'there is a court' },
];

function readFound() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw.filter(id => SECRETS.some(s => s.id === id)));
  } catch (_) {
    return new Set();
  }
}

function writeFound(set) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); }
  catch (_) {}
}

/**
 * @param {{ counterEl?: HTMLElement | null, toastEl?: HTMLElement | null }} opts
 */
export function createDiscovery(opts = {}) {
  const found = readFound();
  const total = SECRETS.length;
  let toastTimer = 0;

  function paint() {
    const el = opts.counterEl;
    if (!el) return;
    el.textContent = `${found.size} / ${total}`;
    el.dataset.count = String(found.size);
    el.setAttribute('aria-label', `${found.size} of ${total} secrets found`);
  }

  function whisper(secret) {
    const el = opts.toastEl;
    if (!el) return;
    el.textContent = secret.title;
    el.classList.add('in');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('in'), 2200);
  }

  /**
   * Mark a secret found. Returns true only on the first find.
   * @param {string} id
   */
  function mark(id) {
    if (!SECRETS.some(s => s.id === id)) return false;
    if (found.has(id)) return false;
    found.add(id);
    writeFound(found);
    paint();
    const secret = SECRETS.find(s => s.id === id);
    if (secret) whisper(secret);
    return true;
  }

  function has(id) { return found.has(id); }

  function list() {
    return SECRETS.map(s => ({ ...s, found: found.has(s.id) }));
  }

  paint();
  return { mark, has, list, found, total, paint };
}
