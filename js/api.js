const API = (() => {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxa8TOwW0Me7u7DGOyRadQzHxhDIy7lhsjWXo-v5IuqaxCUFfNUmMrgGZdoGovpvIvcIw/exec';
  const LANGUAGES = ['en', 'hi', 'te', 'mr'];
  const FALLBACK_LANG = 'en';

  let _cache = {};

  async function fetchLang(lang) {
    if (_cache[lang]) return _cache[lang];

    const cached = sessionStorage.getItem('museum_items_' + lang);
    if (cached) {
      _cache[lang] = JSON.parse(cached);
      return _cache[lang];
    }

    const url = APPS_SCRIPT_URL + '?action=getItems&lang=' + lang;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch ' + lang);
    const data = await res.json();
    _cache[lang] = data;
    sessionStorage.setItem('museum_items_' + lang, JSON.stringify(data));
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

  function getAllIds() {
    const ids = new Set();
    Object.values(_cache).forEach(items => items.forEach(i => ids.add(String(i.id))));
    return ids;
  }

  async function registerUser(name, phone, language) {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ name, phone, language, timestamp: new Date().toISOString() })
    });
  }

  function clearCache() {
    _cache = {};
    LANGUAGES.forEach(l => sessionStorage.removeItem('museum_items_' + l));
  }

  return { LANGUAGES, FALLBACK_LANG, fetchItems, fetchLang, getItem, getAllIds, registerUser, clearCache };
})();
