(() => {
  'use strict';
  const $ = (s) => document.querySelector(s), C = window.Cron;
  const PRESETS = [['Every minute', '* * * * *'], ['Every 5 minutes', '*/5 * * * *'], ['Hourly', '0 * * * *'], ['Daily at 09:00', '0 9 * * *'], ['Weekdays at 09:30', '30 9 * * 1-5'], ['Weekly, Sunday', '0 0 * * 0'], ['Monthly, the 1st', '0 0 1 * *'], ['Yearly, Jan 1st', '0 0 1 1 *']];
  const toast = (t) => { const e = $('#toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toast.id); toast.id = setTimeout(() => e.classList.remove('show'), 1600); };
  const rel = (d) => {
    const m = Math.max(0, Math.round((d - new Date()) / 60000));
    if (m < 60) return 'in ' + m + ' min';
    const h = Math.round(m / 60);
    return h < 48 ? 'in ' + h + ' h' : 'in ' + Math.round(h / 24) + ' days';
  };
  const fmt = (d) => d.toLocaleString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  function render() {
    const v = $('#expr').value, err = $('#err'), res = $('#result');
    if (!v.trim()) { res.hidden = true; err.textContent = ''; return; }
    try {
      const d = C.describe(v);
      err.textContent = ''; res.hidden = false;
      $('#summary').textContent = d.summary;
      const box = $('#fields'); box.textContent = '';
      d.fields.forEach((f) => {
        const el = document.createElement('div'); el.className = 'fld';
        const l = document.createElement('span'); l.textContent = f.label;
        const c = document.createElement('code'); c.textContent = f.raw;
        const p = document.createElement('p'); p.textContent = f.text;
        el.append(l, c, p); box.appendChild(el);
      });
      $('#tz').textContent = 'Shown in your time zone: ' + Intl.DateTimeFormat().resolvedOptions().timeZone;
      const list = $('#runs'); list.textContent = '';
      const runs = C.nextRuns(d.parsed, new Date(), 10);
      if (!runs.length) { const li = document.createElement('li'); li.textContent = 'No run found in the next 8 years.'; list.appendChild(li); }
      runs.forEach((t) => { const li = document.createElement('li'), a = document.createElement('span'), b = document.createElement('em'); a.textContent = fmt(t); b.textContent = rel(t); li.append(a, b); list.appendChild(li); });
    } catch (e) { res.hidden = true; err.textContent = e.message; }
  }

  PRESETS.forEach(([name, expr]) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = name; b.title = expr;
    b.addEventListener('click', () => { $('#expr').value = expr; render(); });
    $('#presets').appendChild(b);
  });
  $('#expr').addEventListener('input', render);
  $('#copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#expr').value.trim()); toast('Expression copied'); } catch { toast('Copy is not available here'); }
  });

  const root = document.documentElement;
  try { root.dataset.theme = localStorage.getItem('cronlens-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); } catch { root.dataset.theme = 'dark'; }
  $('#theme').addEventListener('click', () => { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('cronlens-theme', root.dataset.theme); } catch { /* ignore */ } });
  render();
})();
