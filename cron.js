(function (root) {
  'use strict';
  const MON = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' '), DOW = 'sun mon tue wed thu fri sat'.split(' ');
  const MON_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const SPEC = [
    { k: 'minute', label: 'Minute', min: 0, max: 59 }, { k: 'hour', label: 'Hour', min: 0, max: 23 },
    { k: 'dom', label: 'Day of month', min: 1, max: 31 }, { k: 'month', label: 'Month', min: 1, max: 12, names: MON, off: 1 },
    { k: 'dow', label: 'Day of week', min: 0, max: 7, names: DOW, off: 0 }
  ];
  const MACROS = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };
  const isNum = (s) => /^\d+$/.test(s);

  function val(tok, sp) {
    const t = tok.toLowerCase();
    if (sp.names && /^[a-z]{3,}$/.test(t)) { const i = sp.names.indexOf(t.slice(0, 3)); if (i >= 0) return i + sp.off; throw new Error('Unknown name "' + tok + '" in the ' + sp.label.toLowerCase() + ' field'); }
    if (!isNum(t)) throw new Error('Invalid value "' + tok + '" in the ' + sp.label.toLowerCase() + ' field');
    const n = +t;
    if (n < sp.min || n > sp.max) throw new Error(sp.label + ' must be between ' + sp.min + ' and ' + (sp.k === 'dow' ? 6 : sp.max) + ', got ' + n);
    return n;
  }
  function parseField(text, sp) {
    const set = new Set(), top = sp.k === 'dow' ? 6 : sp.max;
    text.split(',').forEach((part) => {
      if (!part) throw new Error('Empty list item in the ' + sp.label.toLowerCase() + ' field');
      const [range, step, extra] = part.split('/');
      if (extra !== undefined) throw new Error('Too many "/" in "' + part + '"');
      let s = 1;
      if (step !== undefined) { if (!isNum(step) || +step < 1) throw new Error('Invalid step "' + step + '"'); s = +step; }
      let a, b;
      if (range === '*') { a = sp.min; b = top; }
      else if (range.includes('-')) { const [x, y] = range.split('-'); a = val(x, sp); b = val(y, sp); if (a > b) throw new Error('Range "' + range + '" goes backwards'); }
      else { a = val(range, sp); b = step !== undefined ? top : a; }
      for (let v = a; v <= b; v += s) set.add(sp.k === 'dow' && v === 7 ? 0 : v);
    });
    return { text, set, star: text.startsWith('*') };
  }
  function parse(expr) {
    let e = String(expr).trim().replace(/\s+/g, ' ');
    if (MACROS[e.toLowerCase()]) e = MACROS[e.toLowerCase()];
    const parts = e.split(' ');
    if (parts.length !== 5) throw new Error('Expected 5 fields (minute hour day-of-month month day-of-week), got ' + (e ? parts.length : 0));
    const out = {}; SPEC.forEach((sp, i) => { out[sp.k] = parseField(parts[i], sp); }); out.raw = e; return out;
  }
  function dayMatches(d, p) {
    const a = p.dom.set.has(d.getDate()), b = p.dow.set.has(d.getDay());
    return p.dom.star || p.dow.star ? a && b : a || b;
  }
  function nextRuns(p, from, count) {
    const out = [], start = new Date(from.getTime()); start.setSeconds(0, 0); start.setMinutes(start.getMinutes() + 1);
    const H = [...p.hour.set].sort((a, b) => a - b), M = [...p.minute.set].sort((a, b) => a - b);
    let day = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    for (let i = 0; i < 366 * 8 && out.length < count; i++, day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
      if (!p.month.set.has(day.getMonth() + 1) || !dayMatches(day, p)) continue;
      for (const h of H) for (const m of M) {
        const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
        if (t >= start) { out.push(t); if (out.length >= count) return out; }
      }
    }
    return out;
  }
  function runs(vals) { const v = [...vals].sort((a, b) => a - b), r = []; v.forEach((x) => { const l = r[r.length - 1]; if (l && x === l[1] + 1) l[1] = x; else r.push([x, x]); }); return r; }
  function fmtList(set, name, word) {
    const r = runs(set).map(([a, b]) => (a === b ? name(a) : b - a === 1 ? name(a) + ', ' + name(b) : name(a) + ' ' + word + ' ' + name(b)));
    return r.length > 8 ? r.slice(0, 8).join(', ') + ', ...' : r.join(', ');
  }
  const pad = (n) => String(n).padStart(2, '0');
  const stepOf = (t) => { const m = /^\*\/(\d+)$/.exec(t); return m ? +m[1] : 0; };
  function fieldText(f, sp) {
    const t = f.text, s = stepOf(t);
    if (t === '*') return { minute: 'every minute', hour: 'every hour', dom: 'every day', month: 'every month', dow: 'every day of the week' }[sp.k];
    if (s) return { minute: 'every ' + s + ' minutes', hour: 'every ' + s + ' hours', dom: 'every ' + s + ' days', month: 'every ' + s + ' months', dow: 'every ' + s + ' days' }[sp.k];
    if (sp.k === 'minute') return 'at minute ' + fmtList(f.set, String, 'to');
    if (sp.k === 'hour') return 'at hour ' + fmtList(f.set, String, 'to');
    if (sp.k === 'dom') return 'on day ' + fmtList(f.set, String, 'to');
    if (sp.k === 'month') return 'in ' + fmtList(f.set, (n) => MON_FULL[n - 1], 'through');
    return 'on ' + fmtList(f.set, (n) => DOW_FULL[n], 'through');
  }
  function describe(expr) {
    const p = parse(expr), fields = SPEC.map((sp) => ({ label: sp.label, raw: p[sp.k].text, text: fieldText(p[sp.k], sp) }));
    const one = (f) => f.set.size === 1 && !f.star;
    let parts = [];
    if (one(p.minute) && one(p.hour)) parts.push('At ' + pad([...p.hour.set][0]) + ':' + pad([...p.minute.set][0]));
    else { parts.push(fields[0].text.charAt(0).toUpperCase() + fields[0].text.slice(1)); if (p.hour.text !== '*') parts.push(fields[1].text); }
    if (!p.dom.star) parts.push(fields[2].text);
    if (p.month.text !== '*') parts.push(fields[3].text);
    if (!p.dow.star) parts.push(fields[4].text);
    let summary = parts.join(', ');
    if (!p.dom.star && !p.dow.star) summary += ' (runs when the day of month OR the weekday matches)';
    return { summary, fields, parsed: p };
  }
  const api = { parse, nextRuns, describe };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Cron = api;
})(typeof self !== 'undefined' ? self : this);
