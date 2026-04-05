const AudioPlayer = (() => {
  let audio = null;
  let onEndedCallback = null;
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
    els.container = $('audio-player');

    // Create a persistent <audio> element in the DOM (iOS Safari needs this)
    audio = document.createElement('audio');
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');
    audio.preload = 'metadata';
    els.container.appendChild(audio);

    els.btn.addEventListener('click', toggle);
    els.seek.addEventListener('input', seek);
  }

  function fmt(s) {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  }

  function load(url) {
    // Reset state
    audio.pause();
    audio.removeAttribute('src');
    while (audio.firstChild) audio.removeChild(audio.firstChild);

    els.progress.style.width = '0%';
    els.buffer.style.width = '0%';
    els.current.textContent = '0:00';
    els.duration.textContent = '0:00';
    els.seek.value = 0;
    showPlay();

    if (!url) {
      els.status.textContent = 'Audio not available';
      els.btn.disabled = true;
      return;
    }

    // Use <source> with explicit MIME type for iOS compatibility
    const source = document.createElement('source');
    source.src = url;
    source.type = 'audio/mpeg';
    audio.appendChild(source);
    audio.load();

    els.status.textContent = 'Tap ▶ to play';
    els.btn.disabled = false;

    // Remove old listeners by cloning trick — skip, we use named handlers
    audio.onloadedmetadata = () => {
      els.duration.textContent = fmt(audio.duration);
      els.status.textContent = 'Ready';
    };
    audio.oncanplay = () => {
      if (els.status.textContent === 'Loading…') els.status.textContent = 'Ready';
    };
    audio.ontimeupdate = () => {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      els.progress.style.width = pct + '%';
      els.seek.value = pct;
      els.current.textContent = fmt(audio.currentTime);
      if (els.duration.textContent === '0:00') els.duration.textContent = fmt(audio.duration);
      if (audio.currentTime > 0) {
        localStorage.setItem('museum_resume', JSON.stringify({ src: url, time: audio.currentTime }));
      }
    };
    audio.onprogress = () => {
      if (audio.buffered.length && audio.duration) {
        els.buffer.style.width = (audio.buffered.end(audio.buffered.length - 1) / audio.duration) * 100 + '%';
      }
    };
    audio.onwaiting = () => { els.status.textContent = 'Buffering…'; };
    audio.onplaying = () => { els.status.textContent = ''; showPause(); };
    audio.onended = () => { showPlay(); els.status.textContent = 'Finished'; if (onEndedCallback) onEndedCallback(); };
    audio.onerror = () => { els.status.textContent = 'Audio not available'; els.btn.disabled = true; };
  }

  function toggle() {
    if (!audio || !audio.querySelector('source')) return;
    if (audio.paused) {
      els.status.textContent = 'Loading…';
      var p = audio.play();
      if (p) p.then(() => { showPause(); }).catch(() => { els.status.textContent = 'Tap ▶ to play'; showPlay(); });
    } else {
      audio.pause();
      showPlay();
    }
  }

  function seek() { if (audio?.duration) audio.currentTime = (els.seek.value / 100) * audio.duration; }
  function showPlay() { els.iconPlay.classList.remove('hidden'); els.iconPause.classList.add('hidden'); }
  function showPause() { els.iconPlay.classList.add('hidden'); els.iconPause.classList.remove('hidden'); }

  function destroy() {
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      while (audio.firstChild) audio.removeChild(audio.firstChild);
    }
    showPlay();
  }

  function tryResume(url) {
    try {
      const saved = JSON.parse(localStorage.getItem('museum_resume'));
      if (saved?.src === url && saved.time > 0) audio.currentTime = saved.time;
    } catch {}
  }

  function setOnEnded(cb) { onEndedCallback = cb; }

  return { init, load, destroy, tryResume, setOnEnded };
})();
