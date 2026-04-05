// ===== ui.js — UI rendering, language handling, lazy loading =====
const UI = (() => {
  const $ = id => document.getElementById(id);
  let lang = localStorage.getItem('museum_lang') || 'en';

  const imgObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.src = e.target.dataset.src;
        imgObserver.unobserve(e.target);
      }
    });
  }, { rootMargin: '100px' });

  function getLang() { return lang; }

  async function setLang(l) {
    lang = l;
    localStorage.setItem('museum_lang', l);
    updateLangButtons();
    // Pre-fetch the new language data
    await API.fetchItems(l);
  }

  function updateLangButtons() {
    const label = lang.toUpperCase();
    const btn1 = $('btn-lang-toggle');
    const btn2 = $('btn-lang-toggle-detail');
    if (btn1) btn1.textContent = label;
    if (btn2) btn2.textContent = label;
  }

  function showSkeleton(id) { $(id).classList.remove('hidden'); }
  function hideSkeleton(id) { $(id).classList.add('hidden'); }

  function renderGrid() {
    const grid = $('item-grid');
    const ids = API.getAllIds();
    grid.innerHTML = '';
    for (let i = 1; i <= 150; i++) {
      const div = document.createElement('div');
      div.className = 'grid-item' + (ids.has(String(i)) ? ' has-data' : '');
      div.textContent = i;
      div.dataset.id = i;
      grid.appendChild(div);
    }
    grid.addEventListener('click', e => {
      const item = e.target.closest('.grid-item');
      if (item) App.showDetail(item.dataset.id);
    });
  }

  function filterGrid(query) {
    const q = query.toLowerCase().trim();
    const cells = $('item-grid').children;
    for (const cell of cells) {
      const id = cell.dataset.id;
      const item = API.getItem(id, lang);
      const match = !q || id.includes(q) ||
        (item && item.title.toLowerCase().includes(q));
      cell.style.display = match ? '' : 'none';
    }
  }

  function renderDetail(item) {
    $('detail-title').textContent = item.title || 'Untitled';
    $('detail-desc').textContent = item.desc || '';

    // Images
    const carousel = $('detail-images');
    carousel.innerHTML = '';
    String(item.images || '').split(',').map(s => s.trim()).filter(Boolean).forEach(url => {
      const img = document.createElement('img');
      img.dataset.src = url;
      img.alt = item.title;
      img.loading = 'lazy';
      imgObserver.observe(img);
      carousel.appendChild(img);
    });

    // Video
    const videoWrap = $('detail-video');
    if (item.video) {
      videoWrap.classList.remove('hidden');
      videoWrap.innerHTML = `<video src="${item.video}" controls preload="none" playsinline></video>`;
    } else {
      videoWrap.classList.add('hidden');
      videoWrap.innerHTML = '';
    }

    // Audio
    const audioUrl = item.audio || '';
    AudioPlayer.load(audioUrl);
    if (audioUrl) AudioPlayer.tryResume(audioUrl);
  }

  async function toggleLang() {
    // Cycle through languages: en → hi → te → mr → en
    const langs = API.LANGUAGES;
    const idx = (langs.indexOf(lang) + 1) % langs.length;
    await setLang(langs[idx]);

    // Re-render detail if visible
    const detailPage = $('page-detail');
    if (detailPage.classList.contains('active')) {
      const id = detailPage.dataset.currentId;
      if (id) {
        const item = API.getItem(id, lang);
        if (item) renderDetail(item);
      }
    }
  }

  return { getLang, setLang, updateLangButtons, renderGrid, filterGrid, renderDetail, toggleLang, showSkeleton, hideSkeleton };
})();
