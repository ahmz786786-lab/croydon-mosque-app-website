// CMIC — Croydon Mosque Website

// ─── Navbar ───
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger?.addEventListener('click', () => navLinks.classList.toggle('open'));
// Close mobile menu on link click
navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));
// Sticky shadow
window.addEventListener('scroll', () => {
  document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 10);
});

// ─── Hero Clock ───
function updateClock() {
  const now = new Date();
  const h = now.getHours() % 12 || 12;
  const m = String(now.getMinutes()).padStart(2, '0');
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  const time = `${h}:${m} ${ampm}`;
  const date = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const heroTime = document.getElementById('heroTime');
  const heroDate = document.getElementById('heroDate');
  if (heroTime) heroTime.textContent = time;
  if (heroDate) heroDate.textContent = date;

  // Prayer date
  const pd = document.getElementById('prayerDate');
  if (pd) pd.textContent = date;
}
setInterval(updateClock, 1000);
updateClock();

// ─── Hijri Date (Arabic) ───
(function setHijri() {
  try {
    const fmt = new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' });
    const text = fmt.format(new Date());
    const el = document.getElementById('heroHijri');
    if (el) el.textContent = text;
  } catch {}
})();

// ─── Prayer Times ───
const PRAYER_ORDER = ['fajr', 'zohr', 'asr', 'maghrib', 'isha'];
const PRAYER_NAMES = { fajr: 'Fajr', zohr: 'Zohr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };

const DEFAULT_TIMES = {
  fajr: { begins: '6:30 AM', jamat: '7:00 AM' },
  sunrise: { begins: '7:45 AM' },
  zohr: { begins: '1:00 PM', jamat: '1:30 PM' },
  asr: { begins: '3:30 PM', jamat: '4:00 PM' },
  maghrib: { begins: '5:00 PM', jamat: '5:08 PM' },
  isha: { begins: '7:30 PM', jamat: '8:00 PM' },
};

async function fetchPrayerTimes() {
  try {
    const res = await fetch('https://techtronix.co.uk/shared/salaah_api.php?partner_id=5');
    if (!res.ok) throw new Error();
    const raw = await res.json();
    const data = raw?.today || raw;
    renderPrayerTimes(data || null);
  } catch {
    renderPrayerTimes(null);
  }
}

function to12(t) {
  if (!t) return '--:--';
  if (/am|pm/i.test(t)) return t.toUpperCase().replace(/\s+/g, ' ');
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function parseMin(t) {
  if (!t) return null;
  const up = t.toUpperCase().trim();
  const clean = up.replace(/(AM|PM)/g, '').trim();
  const [h, m] = clean.split(':').map(Number);
  let hrs = h;
  if (up.includes('PM') && h !== 12) hrs += 12;
  if (up.includes('AM') && h === 12) hrs = 0;
  return hrs * 60 + (m || 0);
}

let prayerMins = {};

function renderPrayerTimes(data) {
  // Map HTML IDs to API field names (API uses zuhr not zohr, sunrise_begins not sunrise)
  const MAP = {
    fajr:    { b: ['fajr_begins'], j: ['fajr_jamat'] },
    sunrise: { b: ['sunrise_begins', 'sunrise'], j: [] },
    zohr:    { b: ['zuhr_begins', 'zohr_begins'], j: ['zuhr_jamat', 'zohr_jamat'] },
    asr:     { b: ['asr_begins'], j: ['asr_jamat'] },
    maghrib: { b: ['maghrib_begins'], j: ['maghrib_jamat'] },
    isha:    { b: ['isha_begins'], j: ['isha_jamat'] },
  };

  function pick(keys) {
    for (const k of keys) { if (data?.[k]) return data[k]; }
    return null;
  }

  Object.entries(MAP).forEach(([p, fields]) => {
    const bEl = document.getElementById(p + '-begins');
    const jEl = document.getElementById(p + '-jamat');
    const begins = pick(fields.b) || DEFAULT_TIMES[p]?.begins;
    const jamat = pick(fields.j) || DEFAULT_TIMES[p]?.jamat;
    if (bEl) bEl.textContent = to12(begins);
    if (jEl) jEl.textContent = to12(jamat);
    if (p !== 'sunrise' && jamat) prayerMins[p] = parseMin(to12(jamat));
  });

  // Juma (API uses juma_1st/juma_2nd)
  const j1 = data?.juma_1st || data?.juma1;
  const j2 = data?.juma_2nd || data?.juma2;
  if (j1) document.getElementById('juma1').textContent = '1st — ' + to12(j1);
  if (j2) document.getElementById('juma2').textContent = '2nd — ' + to12(j2);

  highlightNext();
}

function highlightNext() {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let nextP = null;
  let nextMin = null;

  for (const p of PRAYER_ORDER) {
    if (prayerMins[p] && prayerMins[p] > nowMin) {
      nextP = p;
      nextMin = prayerMins[p];
      break;
    }
  }
  if (!nextP) {
    nextP = 'fajr';
    nextMin = (prayerMins.fajr || 360) + 1440;
  }

  // Highlight column
  document.querySelectorAll('.prayer-col').forEach(c => c.classList.remove('active'));
  const col = document.getElementById('col-' + nextP);
  if (col) col.classList.add('active');

  // Badge
  document.getElementById('nextPrayerName').textContent = PRAYER_NAMES[nextP] || nextP;
  startCountdown(nextMin);
}

let countdownInterval;
function startCountdown(targetMin) {
  if (countdownInterval) clearInterval(countdownInterval);
  function tick() {
    const now = new Date();
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    let diff = targetMin * 60 - nowSec;
    if (diff < 0) diff += 86400;
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    const el = document.getElementById('nextCountdown');
    if (el) el.textContent = h > 0
      ? `${h}h ${String(m).padStart(2, '0')}m`
      : `${m}m ${String(s).padStart(2, '0')}s`;
  }
  tick();
  countdownInterval = setInterval(tick, 1000);
}

// ─── Fade-in on scroll ───
function initFadeIn() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll('.service-card, .event-card, .donate-card, .contact-card, .about-facilities, .about-text').forEach(el => {
    el.classList.add('fade-in');
    obs.observe(el);
  });
}

// ─── Live Audio ───
let liveAudioPlaying = false;
function toggleLiveAudio(e) {
  e?.preventDefault();
  const audio = document.getElementById('liveAudio');
  const player = document.getElementById('livePlayer');
  const btn = document.getElementById('navLiveBtn');
  if (liveAudioPlaying) {
    audio.pause();
    audio.currentTime = 0;
    player.classList.remove('open');
    btn.classList.remove('playing');
    liveAudioPlaying = false;
  } else {
    audio.play().then(() => {
      player.classList.add('open');
      btn.classList.add('playing');
      liveAudioPlaying = true;
    }).catch(() => {
      alert('Unable to play stream. It may be offline.');
    });
  }
}

// ─── Monthly Prayer Modal ───
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = { Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat', Sunday:'Sun' };
let monthlyCache = null;

function openMonthlyModal() {
  const overlay = document.getElementById('monthlyModal');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  const now = new Date();
  document.getElementById('modalSubtitle').textContent = MONTHS[now.getMonth()] + ' ' + now.getFullYear();
  if (!monthlyCache) loadMonthly();
}
function closeMonthlyModal() {
  document.getElementById('monthlyModal').classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('monthlyModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeMonthlyModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMonthlyModal(); });

async function loadMonthly() {
  const body = document.getElementById('modalBody');
  try {
    const res = await fetch('https://techtronix.co.uk/shared/salaah_api.php?partner_id=5&type=month');
    if (!res.ok) throw new Error();
    const raw = await res.json();
    let rows = Array.isArray(raw) ? raw : (raw.data || raw.times || Object.values(raw));
    monthlyCache = rows;
    renderMonthlyTable(rows, body);
  } catch {
    body.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">Unable to load prayer times. Please try again.</p>';
  }
}

function fmtShort(raw) {
  if (!raw) return '\u2014';
  const parts = raw.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  h = h % 12 || 12;
  return h + ':' + m;
}

function renderMonthlyTable(rows, container) {
  const today = new Date().getDate();
  const prayers = [
    { name:'Fajr', b:'fajr_begins', j:'fajr_jamat' },
    { name:'Sunrise', b:'sunrise', j:null },
    { name:'Zohr', b:'zuhr_begins', j:'zuhr_jamat' },
    { name:'Asr', b:'asr_begins', j:'asr_jamat' },
    { name:'Maghrib', b:'maghrib_begins', j:null },
    { name:'Isha', b:'isha_begins', j:'isha_jamat' },
  ];

  let html = '<div class="pm-table-wrap"><table class="pm-table"><thead>';
  // Header row 1
  html += '<tr><th rowspan="2">Date</th><th rowspan="2">Day</th>';
  prayers.forEach(p => {
    if (p.j) html += `<th colspan="2" class="pm-group">${p.name}</th>`;
    else html += `<th rowspan="2" class="pm-group">${p.name}</th>`;
  });
  html += '</tr>';
  // Header row 2
  html += '<tr>';
  prayers.forEach(p => {
    if (p.j) html += '<th>Begins</th><th>Jamat</th>';
  });
  html += '</tr></thead><tbody>';

  rows.forEach(row => {
    const d = parseInt(String(row.date || '').split(/[-\/]/).pop(), 10) || '';
    const day = DAYS_SHORT[row.day] || (row.day || '').slice(0,3);
    const isFri = (row.day || '').toLowerCase().includes('fri');
    const isToday = d === today;
    let cls = '';
    if (isToday) cls += ' pm-today';
    if (isFri) cls += ' pm-friday';

    html += `<tr class="${cls}"><td><strong>${d}</strong></td><td>${day}</td>`;
    prayers.forEach(p => {
      html += `<td class="pm-group">${fmtShort(row[p.b])}</td>`;
      if (p.j) html += `<td><strong>${fmtShort(row[p.j])}</strong></td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

// Set button label
document.addEventListener('DOMContentLoaded', () => {
  const label = document.getElementById('monthlyBtnLabel');
  if (label) label.textContent = 'Prayer Times for ' + MONTHS[new Date().getMonth()];
});

// ─── Article Filters ───
function filterArticles(cat, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#articlesGrid .article-item').forEach(a => {
    a.style.display = (cat === 'all' || a.dataset.cat === cat) ? '' : 'none';
  });
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  fetchPrayerTimes();
  initFadeIn();
  setInterval(fetchPrayerTimes, 5 * 60 * 1000);
  setInterval(highlightNext, 60 * 1000);
});
