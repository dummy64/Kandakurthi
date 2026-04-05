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
  }, { rootMargin: '200px' });

  // Visit tracking
  function getVisited() {
    try { return JSON.parse(localStorage.getItem('museum_visited') || '[]'); } catch { return []; }
  }
  function markVisited(id) {
    const v = getVisited();
    if (!v.includes(String(id))) { v.push(String(id)); localStorage.setItem('museum_visited', JSON.stringify(v)); }
  }
  function updateVisitProgress() {
    const visited = getVisited();
    const total = API.getAllItems(lang).length;
    const count = Math.min(visited.length, total);
    $('visited-count').textContent = count;
    $('total-count').textContent = total;
    $('visit-bar-fill').style.width = total ? (count / total * 100) + '%' : '0%';
  }

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

  function renderGrid() {
    const grid = $('item-grid');
    grid.innerHTML = '';
    const items = API.getAllItems(lang);
    const visited = getVisited();

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'grid-item' + (visited.includes(String(item.id)) ? ' visited' : '');
      card.dataset.id = item.id;

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

      const info = document.createElement('div');
      info.className = 'grid-info';
      const desc = item.desc ? String(item.desc).substring(0, 80) + (item.desc.length > 80 ? '…' : '') : '';
      info.innerHTML = '<div class="grid-number">#' + item.id + '</div>' +
        '<div class="grid-name">' + (item.title || 'Exhibit ' + item.id) + '</div>' +
        (desc ? '<div class="grid-desc">' + desc + '</div>' : '') +
        '<div class="grid-readmore">Read more →</div>';
      card.appendChild(info);
      grid.appendChild(card);
    });

    grid.onclick = e => {
      const card = e.target.closest('.grid-item');
      if (card) App.showDetail(card.dataset.id);
    };

    updateVisitProgress();
  }

  function filterGrid(query) {
    const q = query.toLowerCase().trim();
    for (const card of $('item-grid').children) {
      const id = card.dataset.id;
      const item = API.getItem(id, lang);
      card.style.display = (!q || String(id).includes(q) || (item?.title?.toLowerCase().includes(q))) ? '' : 'none';
    }
  }

  function renderDetail(item) {
    $('detail-badge').textContent = 'Exhibit #' + item.id;
    $('detail-title').textContent = item.title || 'Untitled';
    $('detail-desc').textContent = item.desc || '';

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

    const vw = $('detail-video');
    if (item.video) {
      vw.classList.remove('hidden');
      vw.innerHTML = '<video src="' + item.video + '" controls preload="none" playsinline></video>';
    } else { vw.classList.add('hidden'); vw.innerHTML = ''; }

    AudioPlayer.load(item.audio || '');
    if (item.audio) AudioPlayer.tryResume(item.audio);

    // Mark as visited
    markVisited(item.id);
  }

  async function toggleLang() {
    const langs = API.LANGUAGES;
    const idx = (langs.indexOf(lang) + 1) % langs.length;
    await setLang(langs[idx]);
    const dp = $('page-detail');
    if (dp.classList.contains('active') && dp.dataset.currentId) {
      const item = API.getItem(dp.dataset.currentId, lang);
      if (item) renderDetail(item);
    }
    if ($('page-explorer').classList.contains('active')) renderGrid();
  }

  return { getLang, setLang, updateLangButtons, renderGrid, filterGrid, renderDetail, toggleLang, showSkeleton, hideSkeleton, updateVisitProgress, markVisited };
})();
