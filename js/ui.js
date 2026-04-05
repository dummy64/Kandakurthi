const UI = (() => {
  const $ = id => document.getElementById(id);
  let lang = localStorage.getItem('museum_lang') || 'en';

  const imgObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.src = e.target.dataset.src;
        e.target.classList.add('loaded');
        imgObserver.unobserve(e.target);
      }
    });
  }, { rootMargin: '200px' });

  function getLang() { return lang; }

  async function setLang(l) {
    lang = l;
    localStorage.setItem('museum_lang', l);
    updateLangButtons();
    await API.fetchItems(l);
  }

  function updateLangButtons() {
    const label = lang.toUpperCase();
    const b1 = $('btn-lang-toggle'), b2 = $('btn-lang-toggle-detail');
    if (b1) b1.textContent = label;
    if (b2) b2.textContent = label;
  }

  function showSkeleton(id) { $(id).classList.remove('hidden'); }
  function hideSkeleton(id) { $(id).classList.add('hidden'); }

  // Dynamic grid — only items that exist in the sheet
  function renderGrid() {
    const grid = $('item-grid');
    grid.innerHTML = '';
    const items = API.getAllItems(lang);

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'grid-item';
      card.dataset.id = item.id;

      // Thumbnail
      const firstImg = String(item.images || item.thumbnail || '').split(',')[0].trim();
      if (firstImg) {
        const img = document.createElement('img');
        img.className = 'grid-thumb';
        img.dataset.src = firstImg;
        img.alt = item.title || 'Exhibit ' + item.id;
        img.loading = 'lazy';
        imgObserver.observe(img);
        card.appendChild(img);
      } else {
        const ph = document.createElement('div');
        ph.className = 'grid-thumb-placeholder';
        ph.textContent = item.id;
        card.appendChild(ph);
      }

      // Info
      const info = document.createElement('div');
      info.className = 'grid-info';
      info.innerHTML = '<div class="grid-number">#' + item.id + '</div>' +
        '<div class="grid-name">' + (item.title || 'Exhibit ' + item.id) + '</div>';
      card.appendChild(info);

      grid.appendChild(card);
    });

    // Event delegation
    grid.onclick = e => {
      const card = e.target.closest('.grid-item');
      if (card) App.showDetail(card.dataset.id);
    };
  }

  function filterGrid(query) {
    const q = query.toLowerCase().trim();
    const cards = $('item-grid').children;
    for (const card of cards) {
      const id = card.dataset.id;
      const item = API.getItem(id, lang);
      const match = !q || String(id).includes(q) ||
        (item && item.title && item.title.toLowerCase().includes(q));
      card.style.display = match ? '' : 'none';
    }
  }

  function renderDetail(item) {
    $('detail-badge').textContent = 'Exhibit #' + item.id;
    $('detail-title').textContent = item.title || 'Untitled';
    $('detail-desc').textContent = item.desc || '';

    // Images
    const carousel = $('detail-images');
    carousel.innerHTML = '';
    String(item.images || '').split(',').map(s => s.trim()).filter(Boolean).forEach(url => {
      const img = document.createElement('img');
      img.dataset.src = url;
      img.alt = item.title || '';
      img.loading = 'lazy';
      imgObserver.observe(img);
      carousel.appendChild(img);
    });

    // Video
    const vw = $('detail-video');
    if (item.video) {
      vw.classList.remove('hidden');
      vw.innerHTML = '<video src="' + item.video + '" controls preload="none" playsinline></video>';
    } else {
      vw.classList.add('hidden');
      vw.innerHTML = '';
    }

    // Audio
    AudioPlayer.load(item.audio || '');
    if (item.audio) AudioPlayer.tryResume(item.audio);
  }

  async function toggleLang() {
    const langs = API.LANGUAGES;
    const idx = (langs.indexOf(lang) + 1) % langs.length;
    await setLang(langs[idx]);
    // Re-render if on detail page
    const dp = $('page-detail');
    if (dp.classList.contains('active') && dp.dataset.currentId) {
      const item = API.getItem(dp.dataset.currentId, lang);
      if (item) renderDetail(item);
    }
    // Re-render grid if on explorer
    if ($('page-explorer').classList.contains('active')) renderGrid();
  }

  return { getLang, setLang, updateLangButtons, renderGrid, filterGrid, renderDetail, toggleLang, showSkeleton, hideSkeleton };
})();
