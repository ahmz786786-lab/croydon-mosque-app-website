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

// ─── Prayer Times (Table Layout) ───
const API_BASE = 'https://techtronix.co.uk/shared/salaah_api.php?partner_id=5';

function formatApiTime(time24) {
  if (!time24) return '--:--';
  if (/am|pm/i.test(time24)) return time24.toUpperCase().replace(/\s+/g, ' ');
  const parts = time24.split(':');
  const hour = parseInt(parts[0]);
  const minutes = parts[1];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return (hour % 12 || 12) + ':' + minutes + ' ' + ampm;
}

function timeToMinutes(time24) {
  if (!time24) return 0;
  // Handle both 24h and 12h formats
  if (/am|pm/i.test(time24)) {
    const up = time24.toUpperCase().trim();
    const clean = up.replace(/(AM|PM)/g, '').trim();
    const [h, m] = clean.split(':').map(Number);
    let hrs = h;
    if (up.includes('PM') && h !== 12) hrs += 12;
    if (up.includes('AM') && h === 12) hrs = 0;
    return hrs * 60 + (m || 0);
  }
  const parts = time24.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

const PRAYERS = [
  { name: 'Fajr', key: 'fajr', ar: '\u0627\u0644\u0641\u062c\u0631' },
  { name: 'Zohr', key: 'zuhr', ar: '\u0627\u0644\u0638\u0647\u0631' },
  { name: 'Asr', key: 'asr', ar: '\u0627\u0644\u0639\u0635\u0631' },
  { name: 'Maghrib', key: 'maghrib', ar: '\u0627\u0644\u0645\u063a\u0631\u0628' },
  { name: 'Isha', key: 'isha', ar: '\u0627\u0644\u0639\u0634\u0627\u0621' }
];

const ALL_PRAYERS = [
  { name: 'Fajr', key: 'fajr' },
  { name: 'Sunrise', key: 'sunrise' },
  { name: 'Zohr', key: 'zuhr' },
  { name: 'Asr', key: 'asr' },
  { name: 'Maghrib', key: 'maghrib' },
  { name: 'Isha', key: 'isha' }
];

let cachedData = null;

async function fetchPrayerTimes() {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error();
    cachedData = await res.json();
    renderPrayerTable(cachedData);
  } catch {
    renderPrayerTable(null);
  }
}

function getNextPrayer(data) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (const p of ALL_PRAYERS) {
    const jamatTime = p.key === 'sunrise' ? data.sunrise : data[p.key + '_jamat'];
    if (jamatTime && timeToMinutes(jamatTime) > nowMin) return p;
  }
  return ALL_PRAYERS[0]; // All passed - next is Fajr
}

function renderPrayerTable(data) {
  const tbody = document.getElementById('prayer-tbody');
  if (!tbody || !data) return;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const next = getNextPrayer(data);

  let html = '';
  PRAYERS.forEach(p => {
    const begins = data[p.key + '_begins'];
    const jamat = data[p.key + '_jamat'];
    const isNext = p.name === next.name && next.name !== 'Sunrise';

    html += `<tr class="${isNext ? 'active-prayer' : ''}">`;
    html += `<td><div class="prayer-name">${p.name}`;
    if (isNext) html += ' <span class="next-badge">Next</span>';
    html += `</div><div class="prayer-name-ar">${p.ar}</div></td>`;
    html += `<td class="prayer-time">${formatApiTime(begins)}</td>`;
    html += `<td class="prayer-iqamah">${formatApiTime(jamat)}</td>`;
    html += '</tr>';
  });

  // Jumu'ah row
  const juma1 = data.juma_1st;
  const juma2 = data.juma_2nd;
  html += '<tr class="prayer-juma-row">';
  html += '<td><div class="prayer-name" style="color:var(--primary)">Jumu\'ah</div><div class="prayer-name-ar">\u0627\u0644\u062c\u0645\u0639\u0629</div></td>';
  html += `<td class="prayer-time">1st: ${formatApiTime(juma1)}</td>`;
  html += `<td class="prayer-iqamah">2nd: ${formatApiTime(juma2)}</td>`;
  html += '</tr>';

  tbody.innerHTML = html;

  // Update next prayer banner
  const nextEl = document.getElementById('next-prayer-name');
  const nextTimeEl = document.getElementById('next-prayer-time');
  if (nextEl && next.name !== 'Sunrise') {
    nextEl.textContent = next.name;
    if (nextTimeEl) nextTimeEl.textContent = formatApiTime(data[next.key + '_jamat']);
  } else if (nextEl) {
    nextEl.textContent = 'Sunrise';
    if (nextTimeEl) nextTimeEl.textContent = formatApiTime(data.sunrise);
  }

  // Extra times
  const sunriseEl = document.getElementById('sunrise-time');
  const ishraqEl = document.getElementById('ishraq-time');
  const zawaalEl = document.getElementById('zawaal-time');
  if (sunriseEl) sunriseEl.textContent = formatApiTime(data.sunrise);
  if (ishraqEl) ishraqEl.textContent = formatApiTime(data.ishraq_begins);
  if (zawaalEl) zawaalEl.textContent = formatApiTime(data.zawal_begins);
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
  // Re-render every 30 seconds to update next prayer highlight
  setInterval(() => { if (cachedData) renderPrayerTable(cachedData); }, 30000);
  // Refresh API data every 5 minutes
  setInterval(fetchPrayerTimes, 5 * 60 * 1000);
});
