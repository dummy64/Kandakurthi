const App = (() => {
  const $ = id => document.getElementById(id);
  const pages = {
    landing: $('page-landing'), home: $('page-home'), explorer: $('page-explorer'),
    detail: $('page-detail'), about: $('page-about'),
    map: $('page-map'), feedback: $('page-feedback')
  };

  function navigate(page) {
    Object.values(pages).forEach(p => p.classList.remove('active'));
    pages[page].classList.add('active');
    window.scrollTo(0, 0);
    $('audio-player').style.display = page === 'detail' ? '' : 'none';
    if (page !== 'detail') AudioPlayer.destroy();
  }

  function showWelcome() {
    const name = localStorage.getItem('museum_user_name');
    if (name) $('welcome-msg').textContent = I18n.t('welcome', UI.getLang()) + name + ' 🙏';
  }

  function updateExhibitCount() {
    const lang = UI.getLang();
    $('exhibit-count').textContent = API.getAllItems(lang).length + I18n.t('exhibitsToExplore', lang);
  }

  function isRegistered() { return !!localStorage.getItem('museum_registered'); }

  // Gate: if not registered, show login; otherwise load explorer
  function gotoExhibits() {
    if (isRegistered()) {
      loadExplorer();
    } else {
      navigate('landing');
    }
  }

  function shareItem(id) {
    const item = API.getItem(id, UI.getLang());
    const title = item?.title || 'Exhibit #' + id;
    const url = location.origin + location.pathname + '?id=' + id;
    const text = title + ' — Sri Keshava Spoorthi Mandir Audio Guide';
    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {});
    } else {
      window.open('https://wa.me/?text=' + encodeURIComponent(text + '\n' + url), '_blank');
    }
  }

  function initOffline() {
    const banner = $('offline-banner');
    const update = () => banner.classList.toggle('hidden', navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }

  let feedbackRating = 0;
  function initFeedback() {
    $('rating-row').addEventListener('click', e => {
      const btn = e.target.closest('.rating-btn');
      if (!btn) return;
      feedbackRating = parseInt(btn.dataset.val);
      for (const b of $('rating-row').children) {
        b.classList.toggle('selected', parseInt(b.dataset.val) === feedbackRating);
      }
    });

    $('form-feedback').addEventListener('submit', async e => {
      e.preventDefault();
      const status = $('fb-status');
      if (!feedbackRating) {
        status.textContent = I18n.t('fbSelectRating', UI.getLang());
        status.className = 'fb-status error';
        status.classList.remove('hidden');
        return;
      }
      $('btn-feedback').disabled = true;
      $('btn-feedback').textContent = I18n.t('fbSubmitting', UI.getLang());
      try {
        await API.submitFeedback(feedbackRating, document.getElementById('inp-feedback').value.trim());
        status.textContent = I18n.t('fbThanks', UI.getLang());
        status.className = 'fb-status success';
        $('form-feedback').reset();
        feedbackRating = 0;
        for (const b of $('rating-row').children) b.classList.remove('selected');
      } catch {
        status.textContent = I18n.t('fbError', UI.getLang());
        status.className = 'fb-status error';
      }
      status.classList.remove('hidden');
      $('btn-feedback').disabled = false;
      $('btn-feedback').textContent = I18n.t('btnSubmitFeedback', UI.getLang());
    });
  }

  function initBottomNav() {
    document.querySelectorAll('.bnav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        // Exhibits require login
        if (page === 'explorer') { gotoExhibits(); }
        else { navigate(page); }
        if (page === 'explorer' && isRegistered()) UI.updateVisitProgress();
        document.querySelectorAll('.bnav-item').forEach(b => {
          b.classList.toggle('active', b.dataset.page === page);
        });
      });
    });
    // Back buttons on about/map/feedback go to home
    document.querySelectorAll('.btn-nav-back').forEach(btn => {
      btn.addEventListener('click', () => {
        navigate('home');
        document.querySelectorAll('.bnav-item').forEach(b => {
          b.classList.toggle('active', b.dataset.page === 'home');
        });
      });
    });
  }

  async function init() {
    AudioPlayer.init();
    UI.updateLangButtons();
    initOffline();
    initFeedback();
    initBottomNav();

    // Language dropdown on login page
    const sel = $('sel-lang');
    sel.innerHTML = '';
    const labels = { en: 'English', te: 'తెలుగు', hi: 'हिन्दी' };
    API.LANGUAGES.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l;
      opt.textContent = labels[l] || l.toUpperCase();
      sel.appendChild(opt);
    });
    sel.value = UI.getLang();
    sel.addEventListener('change', () => I18n.applyAll(sel.value));

    I18n.applyAll(UI.getLang());

    // Registration → always go to explorer
    $('form-register').addEventListener('submit', async e => {
      e.preventDefault();
      const name = $('inp-name').value.trim();
      const phone = $('inp-phone').value.trim();
      const lang = $('sel-lang').value;
      const errEl = $('reg-error');
      errEl.classList.add('hidden');

      if (!/^[0-9]{10,15}$/.test(phone)) {
        errEl.textContent = I18n.t('regErrorPhone', lang);
        errEl.classList.remove('hidden');
        return;
      }

      $('btn-start').disabled = true;
      $('btn-start').textContent = I18n.t('entering', lang);
      try { await API.registerUser(name, phone, lang); } catch {}
      localStorage.setItem('museum_user_name', name);
      await UI.setLang(lang);
      I18n.applyAll(lang);
      localStorage.setItem('museum_registered', '1');
      $('btn-start').disabled = false;
      $('btn-start').textContent = I18n.t('btnStart', lang);
      await loadExplorer();
    });

    // Home page "Explore" button
    $('btn-explore').addEventListener('click', gotoExhibits);
    $('btn-landing-back').addEventListener('click', () => navigate('home'));

    $('inp-search').addEventListener('input', e => UI.filterGrid(e.target.value));
    $('btn-back').addEventListener('click', () => { history.pushState(null, '', location.pathname); navigate('explorer'); UI.updateVisitProgress(); });
    $('btn-lang-toggle').addEventListener('change', e => { UI.toggleLang(e.target.value); showWelcome(); updateExhibitCount(); });
    $('btn-lang-toggle-detail').addEventListener('change', e => UI.toggleLang(e.target.value));
    $('btn-lang-toggle-home').addEventListener('change', e => UI.toggleLang(e.target.value));
    $('btn-retry').addEventListener('click', loadExplorer);
    $('btn-prev').addEventListener('click', () => navigateItem(-1));
    $('btn-next').addEventListener('click', () => navigateItem(1));
    $('btn-share').addEventListener('click', () => shareItem(pages.detail.dataset.currentId));

    // Deep link / QR
    const deepId = new URLSearchParams(location.search).get('id');
    if (deepId) {
      if (isRegistered()) { await loadExplorer(); showDetail(deepId); }
      else { localStorage.setItem('museum_pending_id', deepId); navigate('landing'); }
    } else {
      navigate('home');
    }

    window.addEventListener('popstate', () => {
      if (pages.detail.classList.contains('active')) { navigate('explorer'); UI.updateVisitProgress(); }
    });

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  async function loadExplorer() {
    navigate('explorer');
    showWelcome();
    UI.showSkeleton('grid-skeleton');
    $('item-grid').innerHTML = '';
    $('grid-error').classList.add('hidden');

    try {
      await API.fetchItems(UI.getLang());
      UI.hideSkeleton('grid-skeleton');
      UI.renderGrid();
      updateExhibitCount();
      const pending = localStorage.getItem('museum_pending_id');
      if (pending) { localStorage.removeItem('museum_pending_id'); showDetail(pending); }
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
      $('detail-title').textContent = I18n.t('detailsNotAvailable', UI.getLang());
      $('detail-desc').textContent = '';
      $('detail-images').innerHTML = '';
      $('detail-video').classList.add('hidden');
      AudioPlayer.load('');
    } else {
      UI.renderDetail(item);
    }

    const items = API.getAllItems(UI.getLang());
    const idx = items.findIndex(i => String(i.id) === String(id));
    $('btn-prev').disabled = idx <= 0;
    $('btn-next').disabled = idx >= items.length - 1;

    localStorage.setItem('museum_last_item', id);
    history.pushState({ id }, '', '?id=' + id);
    navigate('detail');
  }

  function navigateItem(dir) {
    const items = API.getAllItems(UI.getLang());
    const idx = items.findIndex(i => String(i.id) === String(pages.detail.dataset.currentId));
    const next = items[idx + dir];
    if (next) showDetail(next.id);
  }

  document.addEventListener('DOMContentLoaded', init);
  return { showDetail };
})();
