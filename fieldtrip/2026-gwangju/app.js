(() => {
  'use strict';
  const data = window.ALBUM;
  if (!data) return;
  const items = data.items;
  const byKey = new Map(items.map(item => [item.key, item]));
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const pad = number => String(number).padStart(3, '0');
  const duration = seconds => `${String(Math.floor(Math.round(seconds) / 60)).padStart(2, '0')}:${String(Math.round(seconds) % 60).padStart(2, '0')}`;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const onGallery = document.body.dataset.page === 'gallery';
  let storyKeys = [];
  const fullWidth = item => Math.round(item.width * Math.min(1, 2200 / Math.max(item.width, item.height)));
  const thumbWidth = item => Math.round(item.width * Math.min(1, 560 / Math.max(item.width, item.height)));
  $$('[data-photo]').forEach(figure => {
    const item = byKey.get('p' + pad(figure.dataset.photo));
    if (!item) return;
    const priority = figure.dataset.priority === 'high';
    figure.innerHTML = `<button class="photo-button" data-open="${item.key}" aria-label="${escape(item.title)} — 크게 보기"><img src="${item.src}" srcset="${item.thumb} ${thumbWidth(item)}w, ${item.src} ${fullWidth(item)}w" sizes="(max-width: 760px) 80vw, 65vw" alt="${escape(item.title)}" width="${item.width}" height="${item.height}" loading="${priority ? 'eager' : 'lazy'}" ${priority ? 'fetchpriority="high"' : ''} decoding="async"></button><figcaption><span>${escape(item.title)}</span><span class="photo-number">${pad(item.id)}</span></figcaption>`;
  });
  $$('[data-video]').forEach(container => {
    const item = byKey.get(container.dataset.video);
    if (!item) return;
    container.innerHTML = `<button class="video-button" data-open="${item.key}" aria-label="${escape(item.title)} — 영상 재생"><img src="${item.thumb}" loading="lazy" alt="${escape(item.title)}"><span class="play-circle" aria-hidden="true">▶</span><span class="video-duration">${duration(item.duration)}</span></button>`;
  });
  storyKeys = [...new Set($$('[data-open]').map(button => button.dataset.open))];
  const progress = document.createElement('div');
  progress.className = 'progress-line';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);
  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = `${total > 0 ? window.scrollY / total * 100 : 0}%`;
      scheduled = false;
    });
  }, {passive: true});

  const viewer = document.createElement('dialog');
  viewer.className = 'viewer';
  viewer.setAttribute('aria-label', '사진과 영상 크게 보기');
  viewer.innerHTML = `<div class="viewer-shell"><div class="viewer-top"><div class="viewer-actions"><button id="viewer-play" aria-label="연속 감상 시작">▷ 연속 감상</button><button id="viewer-zoom" aria-label="사진 확대" aria-pressed="false">확대 ＋</button><a id="viewer-download" download title="웹용 사본 저장">저장 ↓</a><button class="viewer-close" aria-label="닫기">×</button></div></div><div class="viewer-stage"><button class="viewer-nav viewer-prev" aria-label="이전 사진">‹</button><div class="viewer-media"></div><button class="viewer-nav viewer-next" aria-label="다음 사진">›</button></div><div class="viewer-bottom"><div class="viewer-caption"><h2 id="viewer-title"></h2><p id="viewer-file"></p></div><div><div class="viewer-count" aria-live="polite"></div><div class="viewer-hint">← → 이동 · ESC 닫기</div></div></div></div>`;
  document.body.append(viewer);
  const media = $('.viewer-media', viewer);
  let queue = [], position = 0, playing = false, timer, previousFocus, previousHash = '';
  const playButton = $('#viewer-play');
  const zoomButton = $('#viewer-zoom');
  function stopTimer() { window.clearTimeout(timer); }
  function setPlaying(value) {
    playing = value;
    playButton.textContent = value ? 'Ⅱ 일시 정지' : '▷ 연속 감상';
    playButton.setAttribute('aria-label', value ? '연속 감상 일시 정지' : '연속 감상 시작');
    playButton.setAttribute('aria-pressed', String(value));
    stopTimer();
    if (value) scheduleNext();
  }
  function scheduleNext() {
    stopTimer();
    if (!playing || !viewer.open) return;
    const video = $('video', media);
    if (video) {
      video.play().catch(() => setPlaying(false));
    } else timer = window.setTimeout(() => step(1), 4500);
  }
  function setHash(hash) {
    try { history.replaceState(null, '', location.pathname + location.search + hash); }
    catch { /* The album remains usable under restrictive local file policies. */ }
  }
  function showItem() {
    stopTimer();
    const oldVideo = $('video', media);
    if (oldVideo) oldVideo.pause();
    const item = byKey.get(queue[position]);
    if (!item) return;
    media.replaceChildren();
    media.classList.remove('zoomed');
    zoomButton.setAttribute('aria-pressed', 'false');
    zoomButton.textContent = '확대 ＋';
    zoomButton.hidden = item.type === 'video';
    const element = document.createElement(item.type === 'video' ? 'video' : 'img');
    if (item.type === 'video') {
      element.controls = true;
      element.playsInline = true;
      element.preload = 'metadata';
      element.poster = item.thumb;
      element.setAttribute('aria-label', item.title);
      element.addEventListener('ended', () => { if (playing) step(1); });
    } else {
      element.alt = item.title;
      element.decoding = 'async';
      element.addEventListener('load', scheduleNext, {once: true});
    }
    element.addEventListener('error', () => {
      setPlaying(false);
      const error = document.createElement('p');
      error.className = 'viewer-error';
      error.textContent = '파일을 불러오지 못했습니다. assets 폴더가 사진첩과 함께 있는지 확인해 주세요.';
      media.replaceChildren(error);
    });
    element.src = item.src;
    media.append(element);
    $('#viewer-title').textContent = item.title;
    $('#viewer-file').textContent = `${item.place} · ${item.type === 'video' ? '영상' : '사진'} ${pad(item.id)}`;
    $('.viewer-count').textContent = `${position + 1} / ${queue.length}`;
    $('#viewer-download').href = item.src;
    $('#viewer-download').download = `hongik-gwangju-${item.key}.${item.type === 'video' ? 'mp4' : 'webp'}`;
    $('#viewer-download').title = item.type === 'video' ? '웹용 영상 저장' : '웹용 사진 저장';
    $('.viewer-prev').disabled = queue.length < 2;
    $('.viewer-next').disabled = queue.length < 2;
    setHash('#photo-' + item.key);
    if (item.type === 'video') element.play().catch(() => {});
    if (playing) scheduleNext();
  }
  function openViewer(key, context, autoplay = false) {
    if (!byKey.has(key)) return;
    previousFocus = document.activeElement;
    previousHash = location.hash.startsWith('#photo-') ? '' : location.hash;
    queue = [...new Set(context || (onGallery ? filtered.map(item => item.key) : [...new Set($$('[data-open]').map(button => button.dataset.open))]))].filter(id => byKey.has(id));
    if (!queue.includes(key)) queue = [key, ...queue];
    position = queue.indexOf(key);
    viewer.showModal();
    document.body.classList.add('locked');
    showItem();
    setPlaying(autoplay);
    $('.viewer-close').focus({preventScroll: true});
  }
  function step(change) { position = (position + change + queue.length) % queue.length; showItem(); }
  function closeViewer() { viewer.close(); }
  viewer.addEventListener('close', () => {
    setPlaying(false);
    const video = $('video', media);
    if (video) video.pause();
    media.replaceChildren();
    document.body.classList.remove('locked');
    setHash(previousHash);
    if (previousFocus?.isConnected) previousFocus.focus({preventScroll: true});
  });
  $('.viewer-close').addEventListener('click', closeViewer);
  $('.viewer-prev').addEventListener('click', () => step(-1));
  $('.viewer-next').addEventListener('click', () => step(1));
  playButton.addEventListener('click', () => setPlaying(!playing));
  zoomButton.addEventListener('click', () => {
    const zoomed = media.classList.toggle('zoomed');
    zoomButton.setAttribute('aria-pressed', String(zoomed));
    zoomButton.textContent = zoomed ? '맞춤 －' : '확대 ＋';
    if (zoomed) setPlaying(false);
  });
  viewer.addEventListener('keydown', event => {
    if (event.target.tagName === 'VIDEO') return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
  });
  let touchX = 0, touchY = 0;
  media.addEventListener('touchstart', event => {
    touchX = event.changedTouches[0].clientX;
    touchY = event.changedTouches[0].clientY;
  }, {passive: true});
  media.addEventListener('touchend', event => {
    if (media.classList.contains('zoomed') || event.target.tagName === 'VIDEO') return;
    const x = event.changedTouches[0].clientX - touchX;
    const y = event.changedTouches[0].clientY - touchY;
    if (Math.abs(x) > 55 && Math.abs(x) > Math.abs(y) * 1.5) step(x < 0 ? 1 : -1);
  }, {passive: true});
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-open]');
    if (button) openViewer(button.dataset.open);
  });

  const params = new URLSearchParams(location.search);
  const validViews = ['all', 'selected', 'photo', 'video'];
  const validPlaces = ['all', 'yanglim', 'acc', 'songjeong', 'together', 'guide'];
  let view = validViews.includes(params.get('view')) ? params.get('view') : 'all';
  let place = validPlaces.includes(params.get('place')) ? params.get('place') : 'all';
  let query = '', sort = 'original', galleryPage = 0, filtered = [...items];
  let galleryCols = 4, galleryRows = 2, batchSize = 8, mobileShown = 0;
  const scrollGallery = () => window.innerWidth <= 900;
  let lastScrollGallery = scrollGallery();
  function sizeGallery() {
    const width = window.innerWidth, height = window.innerHeight;
    document.body.classList.toggle('scroll-reader',scrollGallery());
    galleryCols = width <= 640 ? 2 : width <= 1050 ? 3 : 4;
    galleryRows = width <= 640 ? (height >= 780 ? 2 : 1) : (height < 740 ? 1 : height >= 1050 ? 3 : 2);
    if (height < 560 && width > 640) galleryCols = 4;
    batchSize = scrollGallery() ? 24 : galleryCols * galleryRows;
    $('#gallery-grid').style.setProperty('--gallery-cols', galleryCols);
    $('#gallery-grid').style.setProperty('--gallery-rows', galleryRows);
  }
  function updateUrl() {
    const search = new URLSearchParams();
    if (view !== 'all') search.set('view', view);
    if (place !== 'all') search.set('place', place);
    try { history.replaceState(null, '', location.pathname + (search.size ? '?' + search : '') + location.hash); } catch {}
  }
  function buildCard(item) {
    const article = document.createElement('article');
    article.className = 'gallery-card';
    article.innerHTML = `<button class="photo-button" data-open="${item.key}" aria-label="${escape(item.title)} — ${item.type === 'video' ? '영상 재생' : '크게 보기'}"><img src="${item.thumb}" alt="${escape(item.title)}" width="${item.width}" height="${item.height}" loading="lazy" decoding="async">${item.selected ? '<span class="selected-badge">대표</span>' : ''}${item.type === 'video' ? `<span class="type-badge">▶ ${duration(item.duration)}</span>` : ''}</button><div class="card-caption"><span>${escape(item.title)}</span><span>${item.type === 'photo' ? '사진 ' + pad(item.id) : '영상 ' + String(item.id).padStart(2, '0')}</span></div>`;
    return article;
  }
  function renderGalleryPage(append = false) {
    if (scrollGallery()) {
      const start = append ? mobileShown : 0;
      const end = Math.min(start + batchSize, filtered.length);
      const fragment = document.createDocumentFragment();
      filtered.slice(start,end).forEach(item=>fragment.append(buildCard(item)));
      if (append) $('#gallery-grid').append(fragment);
      else $('#gallery-grid').replaceChildren(fragment);
      mobileShown = end;
      $('#gallery-grid').hidden = !filtered.length;
      $('#gallery-mobile-count').textContent = filtered.length ? `${filtered.length}개 중 ${mobileShown}개` : '';
      $('#gallery-more').hidden = mobileShown >= filtered.length;
      return;
    }
    const totalPages = Math.max(1, Math.ceil(filtered.length / batchSize));
    galleryPage = Math.max(0, Math.min(totalPages - 1, galleryPage));
    const start = galleryPage * batchSize;
    const end = Math.min(start + batchSize, filtered.length);
    const fragment = document.createDocumentFragment();
    filtered.slice(start, end).forEach(item => fragment.append(buildCard(item)));
    $('#gallery-grid').replaceChildren(fragment);
    $('#gallery-grid').hidden = !filtered.length;
    $('#loaded-count').textContent = filtered.length ? `${start + 1}–${end} / 전체 ${filtered.length}` : '검색 결과가 없습니다';
    $('#gallery-prev').disabled = galleryPage === 0 || !filtered.length;
    $('#gallery-next').disabled = galleryPage === totalPages - 1 || !filtered.length;
    $('#gallery-page').innerHTML = Array.from({length: totalPages}, (_, i) => `<option value="${i}">${i + 1}쪽</option>`).join('');
    $('#gallery-page').value = galleryPage;
    $('#gallery-page').disabled = !filtered.length;
    $('#gallery-pages-total').textContent = ` / ${totalPages}`;
  }
  function turnGallery(change) {
    const next = galleryPage + change;
    if (next < 0 || next >= Math.ceil(filtered.length / batchSize)) return;
    galleryPage = next;
    renderGalleryPage();
  }
  function applyFilters() {
    const normalized = query.trim().toLowerCase().normalize('NFC');
    filtered = items.filter(item =>
      (view === 'all' || (view === 'selected' ? item.selected : item.type === view)) &&
      (place === 'all' || item.category === place) &&
      (!normalized || `${item.title} ${item.place} ${item.file} ${item.key} ${pad(item.id)} ${item.category === 'acc' ? 'ACC' : ''}`.toLowerCase().normalize('NFC').includes(normalized))
    );
    if (sort === 'selected') filtered.sort((a, b) => Number(b.selected) - Number(a.selected));
    if (sort === 'reverse') filtered.reverse();
    $$('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === view)));
    $$('[data-place]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.place === place)));
    $('#result-count').textContent = `${filtered.length}개의 장면${view === 'selected' ? ' · 선별한 대표 사진' : ''}`;
    $('#empty-state').hidden = filtered.length !== 0;
    $('#gallery-slideshow').disabled = !filtered.length;
    galleryPage = 0;
    renderGalleryPage();
    updateUrl();
  }
  if (onGallery) {
    $$('[data-filter]').forEach(button => button.addEventListener('click', () => { view = button.dataset.filter; applyFilters(); }));
    $$('[data-place]').forEach(button => button.addEventListener('click', () => { place = button.dataset.place; applyFilters(); }));
    $('#search').addEventListener('input', event => { query = event.target.value; applyFilters(); });
    $('#sort').addEventListener('change', event => { sort = event.target.value; applyFilters(); });
    sizeGallery();
    $('#gallery-more').addEventListener('click',()=>renderGalleryPage(true));
    $('#gallery-prev').addEventListener('click', () => turnGallery(-1));
    $('#gallery-next').addEventListener('click', () => turnGallery(1));
    $('#gallery-page').addEventListener('change', event => { galleryPage = Number(event.target.value); renderGalleryPage(); });
    document.addEventListener('keydown', event => {
      if (scrollGallery() || viewer.open || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); turnGallery(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); turnGallery(-1); }
    });
    let galleryTouchX = 0, galleryTouchY = 0, swipedAt = 0;
    $('#gallery-grid').addEventListener('touchstart', event => {
      galleryTouchX = event.changedTouches[0].clientX;
      galleryTouchY = event.changedTouches[0].clientY;
    }, {passive:true});
    $('#gallery-grid').addEventListener('touchend', event => {
      if (scrollGallery()) return;
      const x = event.changedTouches[0].clientX - galleryTouchX;
      const y = event.changedTouches[0].clientY - galleryTouchY;
      if (Math.abs(x) > 55 && Math.abs(x) > Math.abs(y) * 1.5) {
        swipedAt = Date.now();
        turnGallery(x < 0 ? 1 : -1);
      }
    }, {passive:true});
    $('#gallery-grid').addEventListener('click', event => {
      if (Date.now() - swipedAt < 400) { event.preventDefault(); event.stopPropagation(); }
    }, true);
    let galleryResizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(galleryResizeTimer);
      galleryResizeTimer = setTimeout(() => {
        if (scrollGallery() && lastScrollGallery) return;
        lastScrollGallery = scrollGallery();
        const first = galleryPage * batchSize;
        sizeGallery();
        galleryPage = Math.floor(first / batchSize);
        renderGalleryPage();
      }, 120);
    });
    $('#reset-filters').addEventListener('click', () => { view = 'all'; place = 'all'; query = ''; sort = 'original'; $('#search').value = ''; $('#sort').value = sort; applyFilters(); });
    $('#gallery-slideshow').addEventListener('click', () => { if (filtered.length) openViewer(filtered[0].key, filtered.map(item => item.key), true); });
    applyFilters();
  }
  const deepLink = location.hash.match(/^#photo-(p\d{3}|v\d{2})$/);
  if (deepLink && byKey.has(deepLink[1])) openViewer(deepLink[1]);
})();
