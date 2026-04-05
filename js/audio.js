// ===== audio.js — Custom audio player controller =====
const AudioPlayer = (() => {
  let audio = null;
  const $ = id => document.getElementById(id);

  const els = {};
  function init() {
    els.btn = $('btn-play');
    els.iconPlay = els.btn.querySelector('.icon-play');
    els.iconPause = els.btn.querySelector('.icon-pause');
    els.seek = $('seek-bar');
    els.progress = $('progress-bar');
    els.buffer = $('buffer-bar');
    els.current = $('time-current');
    els.duration = $('time-duration');
    els.status = $('player-status');
    els.player = $('audio-player');

    els.btn.addEventListener('click', toggle);
    els.seek.addEventListener('input', seek);
  }

  function fmt(s) {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  }

  function load(url) {
    destroy();
    if (!url) {
      els.status.textContent = 'Audio not available';
      els.btn.disabled = true;
      return;
    }

    audio = new Audio();
    audio.preload = 'none';
    audio.src = url;

    els.status.textContent = 'Loading…';
    els.btn.disabled = true;
    els.progress.style.width = '0%';
    els.buffer.style.width = '0%';
    els.current.textContent = '0:00';
    els.duration.textContent = '0:00';
    els.seek.value = 0;
    showPlay();

    audio.addEventListener('loadedmetadata', () => {
      els.duration.textContent = fmt(audio.duration);
      els.btn.disabled = false;
      els.status.textContent = 'Ready';
    });

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      els.progress.style.width = pct + '%';
      els.seek.value = pct;
      els.current.textContent = fmt(audio.currentTime);
    });

    audio.addEventListener('progress', () => {
      if (audio.buffered.length) {
        const end = audio.buffered.end(audio.buffered.length - 1);
        els.buffer.style.width = (end / audio.duration) * 100 + '%';
      }
    });

    audio.addEventListener('waiting', () => { els.status.textContent = 'Buffering…'; });
    audio.addEventListener('playing', () => { els.status.textContent = ''; });
    audio.addEventListener('ended', () => { showPlay(); els.status.textContent = 'Finished'; });
    audio.addEventListener('error', () => {
      els.status.textContent = 'Audio not available';
      els.btn.disabled = true;
    });

    // Save resume position periodically
    audio.addEventListener('timeupdate', () => {
      if (audio.currentTime > 0) {
        localStorage.setItem('museum_resume', JSON.stringify({
          src: url, time: audio.currentTime
        }));
      }
    });
  }

  function toggle() {
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(showPause).catch(() => {
        els.status.textContent = 'Tap to play';
      });
    } else {
      audio.pause();
      showPlay();
    }
  }

  function seek() {
    if (!audio?.duration) return;
    audio.currentTime = (els.seek.value / 100) * audio.duration;
  }

  function showPlay() {
    els.iconPlay.classList.remove('hidden');
    els.iconPause.classList.add('hidden');
  }

  function showPause() {
    els.iconPlay.classList.add('hidden');
    els.iconPause.classList.remove('hidden');
  }

  function destroy() {
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio = null;
    }
    showPlay();
  }

  function tryResume(url) {
    try {
      const saved = JSON.parse(localStorage.getItem('museum_resume'));
      if (saved?.src === url && saved.time > 0) {
        audio.currentTime = saved.time;
      }
    } catch {}
  }

  return { init, load, destroy, tryResume };
})();
