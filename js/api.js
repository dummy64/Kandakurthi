// ===== api.js — Google Sheets fetch + user registration =====
const API = (() => {
  // ⚠️ CONFIGURE THESE:
  const SHEET_ID = '1yAt8FuRAKYtW22L5BBVpjbBJdxPA5xbkonBaGkAVOOI';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw49IqiP5zhA3Gcppz02XHiHQ9kExI88V3gD7iXfWly21m-0p3h2AU-lw7xDSMSA4yu9Q/exec';
  const LANGUAGES = ['en', 'hi', 'te', 'mr'];
  const FALLBACK_LANG = 'en';

  // Cache: { en: [...items], hi: [...items], ... }
  let _cache = {};

  function parseGviz(text) {
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
    const cols = json.table.cols.map(c => c.label.toLowerCase().trim());
    return json.table.rows.map(r => {
      const obj = {};
      cols.forEach((col, i) => { obj[col] = r.c[i]?.v ?? ''; });
      return obj;
    });
  }

  async function fetchLang(lang) {
    if (_cache[lang]) return _cache[lang];

    const cached = sessionStorage.getItem('museum_items_' + lang);
    if (cached) {
      _cache[lang] = JSON.parse(cached);
      return _cache[lang];
    }

    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=items_${lang}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch ' + lang);
    const text = await res.text();
    _cache[lang] = parseGviz(text);
    sessionStorage.setItem('museum_items_' + lang, JSON.stringify(_cache[lang]));
    return _cache[lang];
  }

  // Fetch current language + fallback in parallel
  async function fetchItems(lang) {
    const fetches = [fetchLang(lang)];
    if (lang !== FALLBACK_LANG) fetches.push(fetchLang(FALLBACK_LANG));
    await Promise.all(fetches);
  }

  function getItem(id, lang) {
    const item = _cache[lang]?.find(i => String(i.id) === String(id));
    if (item?.title) return item;
    // Fallback to English
    return _cache[FALLBACK_LANG]?.find(i => String(i.id) === String(id)) || null;
  }

  // Get list of all item IDs (from any cached language)
  function getAllIds() {
    const ids = new Set();
    Object.values(_cache).forEach(items =>
      items.forEach(i => ids.add(String(i.id)))
    );
    return ids;
  }

  async function registerUser(name, phone, language) {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ name, phone, language, timestamp: new Date().toISOString() })
    });
    if (!res.ok) throw new Error('Registration failed');
    return res.json();
  }

  function clearCache() {
    _cache = {};
    LANGUAGES.forEach(l => sessionStorage.removeItem('museum_items_' + l));
  }

  return { LANGUAGES, FALLBACK_LANG, fetchItems, fetchLang, getItem, getAllIds, registerUser, clearCache };
})();
