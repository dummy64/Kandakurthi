const API = (() => {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyQC28l9e8QVbphSVxdtlKVyNDVpGmHU66v8ONAKnMJLrvBSlrIsWecCU7lio7ysEp9XA/exec';
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

    // Use script injection (JSONP-style) to avoid CORS entirely
    const data = await loadViaScript(APPS_SCRIPT_URL + '?action=getItems&lang=' + lang + '&callback=__museumCb');
    _cache[lang] = data;
    sessionStorage.setItem('museum_items_' + lang, JSON.stringify(data));
    return _cache[lang];
  }

  function loadViaScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      window.__museumCb = function(data) {
        resolve(data);
        delete window.__museumCb;
        script.remove();
      };
      script.src = url;
      script.onerror = () => { script.remove(); reject(new Error('Failed to load')); };
      document.head.appendChild(script);
    });
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
    // no-cors POST — we don't need to read the response
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ name, phone, language, timestamp: new Date().toISOString() })
    });
  }

  function clearCache() {
    _cache = {};
    LANGUAGES.forEach(l => sessionStorage.removeItem('museum_items_' + l));
  }

  return { LANGUAGES, FALLBACK_LANG, fetchItems, fetchLang, getItem, getAllIds, registerUser, clearCache };
})();
