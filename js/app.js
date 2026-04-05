const App = (() => {
  const $ = id => document.getElementById(id);
  const pages = { landing: $('page-landing'), explorer: $('page-explorer'), detail: $('page-detail') };

  function navigate(page) {
    Object.values(pages).forEach(p => p.classList.remove('active'));
    pages[page].classList.add('active');
    window.scrollTo(0, 0);
    if (page !== 'detail') AudioPlayer.destroy();
  }

  async function init() {
    AudioPlayer.init();
    UI.updateLangButtons();

    // Populate language dropdown
    const sel = $('sel-lang');
    sel.innerHTML = '';
    const labels = { en: 'English', te: 'తెలుగు', hi: 'हिन्दी', mr: 'मराठी' };
    API.LANGUAGES.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l;
      opt.textContent = labels[l] || l.toUpperCase();
      sel.appendChild(opt);
    });

    // Registration
    $('form-register').addEventListener('submit', async e => {
      e.preventDefault();
      const name = $('inp-name').value.trim();
      const phone = $('inp-phone').value.trim();
      const lang = $('sel-lang').value;
      const errEl = $('reg-error');
      errEl.classList.add('hidden');

      if (!/^[0-9]{10,15}$/.test(phone)) {
        errEl.textContent = 'Enter a valid phone number (10-15 digits)';
        errEl.classList.remove('hidden');
        return;
      }

      const btn = $('btn-start');
      btn.disabled = true;
      btn.textContent = 'Entering…';
      try { await API.registerUser(name, phone, lang); } catch {}
      await UI.setLang(lang);
      localStorage.setItem('museum_registered', '1');
      btn.disabled = false;
      btn.textContent = 'Enter the Mandir';
      await loadExplorer();
    });

    $('inp-search').addEventListener('input', e => UI.filterGrid(e.target.value));
    $('btn-back').addEventListener('click', () => { history.pushState(null, '', location.pathname); navigate('explorer'); });
    $('btn-lang-toggle').addEventListener('click', UI.toggleLang);
    $('btn-lang-toggle-detail').addEventListener('click', UI.toggleLang);
    $('btn-retry').addEventListener('click', loadExplorer);

    // Deep link / QR
    const deepId = new URLSearchParams(location.search).get('id');

    if (localStorage.getItem('museum_registered')) {
      await loadExplorer();
      if (deepId) showDetail(deepId);
    } else {
      if (deepId) localStorage.setItem('museum_pending_id', deepId);
      navigate('landing');
    }

    window.addEventListener('popstate', () => {
      if (pages.detail.classList.contains('active')) navigate('explorer');
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  async function loadExplorer() {
    navigate('explorer');
    UI.showSkeleton('grid-skeleton');
    $('item-grid').innerHTML = '';
    $('grid-error').classList.add('hidden');

    try {
      await API.fetchItems(UI.getLang());
      UI.hideSkeleton('grid-skeleton');
      UI.renderGrid();

      const pending = localStorage.getItem('museum_pending_id');
      if (pending) {
        localStorage.removeItem('museum_pending_id');
        showDetail(pending);
      }
    } catch {
      UI.hideSkeleton('grid-skeleton');
      $('grid-error').classList.remove('hidden');
    }
  }

  function showDetail(id) {
    const item = API.getItem(id, UI.getLang());
    pages.detail.dataset.currentId = id;

    if (!item) {
      $('detail-badge').textContent = 'Exhibit #' + id;
      $('detail-title').textContent = 'Details not available';
      $('detail-desc').textContent = '';
      $('detail-images').innerHTML = '';
      $('detail-video').classList.add('hidden');
      AudioPlayer.load('');
    } else {
      UI.renderDetail(item);
    }

    localStorage.setItem('museum_last_item', id);
    history.pushState({ id }, '', '?id=' + id);
    navigate('detail');
  }

  document.addEventListener('DOMContentLoaded', init);
  return { showDetail };
})();
