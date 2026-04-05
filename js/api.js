const API = (() => {
  const SHEET_ID = '1yAt8FuRAKYtW22L5BBVpjbBJdxPA5xbkonBaGkAVOOI';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyAgZl78OEQqlXrtq4av9GC48LlHnPrqRZvY-7grkD2nldFypj491qvABiq1X_nUgoi3g/exec';
  const LANGUAGES = ['en', 'te', 'hi'];
  const FALLBACK_LANG = 'en';

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
    if (cached) { _cache[lang] = JSON.parse(cached); return _cache[lang]; }

    const url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:json&sheet=items_' + lang;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch ' + lang);
    _cache[lang] = parseGviz(await res.text());
    sessionStorage.setItem('museum_items_' + lang, JSON.stringify(_cache[lang]));
    return _cache[lang];
  }

  async function fetchItems(lang) {
    const fetches = [fetchLang(lang)];
    if (lang !== FALLBACK_LANG) fetches.push(fetchLang(FALLBACK_LANG));
    await Promise.all(fetches);
  }

  function getItem(id, lang) {
    const item = _cache[lang]?.find(i => String(i.id) === String(id));
    if (item?.title) return item;
    return _cache[FALLBACK_LANG]?.find(i => String(i.id) === String(id)) || null;
  }

  function getAllItems(lang) { return _cache[lang] || _cache[FALLBACK_LANG] || []; }
  function getAllIds() {
    const ids = new Set();
    Object.values(_cache).forEach(items => items.forEach(i => ids.add(String(i.id))));
    return ids;
  }

  async function registerUser(name, phone, language) {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      body: JSON.stringify({ action: 'register', name, phone, language, timestamp: new Date().toISOString() })
    });
  }

  async function submitFeedback(rating, comment) {
    const name = localStorage.getItem('museum_user_name') || 'Anonymous';
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      body: JSON.stringify({ action: 'feedback', name, rating, comment, timestamp: new Date().toISOString() })
    });
  }

  function clearCache() {
    _cache = {};
    LANGUAGES.forEach(l => sessionStorage.removeItem('museum_items_' + l));
  }

  return { LANGUAGES, FALLBACK_LANG, fetchItems, fetchLang, getItem, getAllItems, getAllIds, registerUser, submitFeedback, clearCache };
})();
