/* 초청장 공통 기능 + ① 축제 일정 + ② 시간표 + ③ 이동 맵
   (내용을 바꾸고 싶으면 이 파일이 아니라 config.js 를 고치세요) */
(function () {
  'use strict';
  var C = window.FESTIVAL;
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var KST = 9 * 3600 * 1000;
  var params = new URLSearchParams(location.search);

  /* ---------- 작은 도우미 ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  // 안전하게 화면 요소 만들기 (글자는 textContent로만 넣어서 이상한 코드가 실행되지 않게)
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v; // 코드 안에서 만든 고정 그림(SVG)에만 사용
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c != null) n.append(c.nodeType ? c : String(c)); });
    return n;
  }
  function tempBadge() { return el('span', { class: 'temp', text: '임시' }); }
  // "(임시)" 글자를 노란 배지로 바꿔서 보여 주기
  function withTemp(text) {
    var s = String(text || '');
    var isTemp = s.indexOf('(임시)') > -1;
    var clean = s.replace(/\s*\(임시\)\s*/g, ' ').trim();
    var frag = document.createDocumentFragment();
    if (clean) frag.append(clean);
    if (isTemp) { if (clean) frag.append(' '); frag.append(tempBadge()); }
    return frag;
  }

  // 지금 시각. 시험용: 주소 끝에 ?test=2026-10-27T19:00 을 붙이면 그 시각인 척해요.
  var testOffset = 0;
  if (params.get('test')) {
    var t = Date.parse(params.get('test') + (params.get('test').length <= 16 ? ':00+09:00' : ''));
    if (!isNaN(t)) testOffset = t - Date.now();
  }
  function now() { return Date.now() + testOffset; }
  function kstDay(ms) { return Math.floor((ms + KST) / 86400000); }
  function at(date, hhmm) { return Date.parse(date + 'T' + hhmm + ':00+09:00'); }
  function fmtKst(ms, withTime) {
    var d = new Date(ms + KST), w = '일월화수목금토'[d.getUTCDay()];
    var s = (d.getUTCMonth() + 1) + '월 ' + d.getUTCDate() + '일(' + w + ')';
    if (withTime) s += ' ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
    return s;
  }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  function copyText(text, okMsg) {
    function fallback() {
      var ta = el('textarea', { readonly: true, style: 'position:fixed;top:-100px;opacity:0' });
      ta.value = text; document.body.append(ta); ta.select(); ta.setSelectionRange(0, text.length);
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      toast(ok ? okMsg : '복사가 안 되면 길게 눌러 직접 복사해 주세요');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
    } else fallback();
  }
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = el('script', { src: src, async: true });
      s.onload = res; s.onerror = function () { rej(new Error('불러오기 실패')); };
      document.head.append(s);
    });
  }

  /* ---------- 운영진이 바꾼 설정 불러오기 ---------- */
  var S = { notice: C.notice, rsvpDeadline: C.rsvpDeadline, artistRevealDate: C.artistRevealDate };
  function api(action, data) {
    if (!C.apiUrl) return Promise.reject(Object.assign(new Error('응답 저장소가 아직 연결되지 않았어요'), { code: 'NO_API' }));
    return fetch(C.apiUrl, { method: 'POST', body: JSON.stringify(Object.assign({ action: action }, data || {})) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) throw Object.assign(new Error(j.error || '오류가 났어요'), { code: j.code }); return j; });
  }
  var settingsReady = C.apiUrl
    ? api('config').then(function (j) {
        Object.keys(j.settings || {}).forEach(function (k) { if (j.settings[k]) S[k] = j.settings[k]; });
      }).catch(function () {})
    : Promise.resolve();

  /* ---------- 받는 사람 이름 (?to=홍길동) ---------- */
  function cleanName(v) { return String(v || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20); }
  var invitee = cleanName(params.get('to'));

  /* ================= 탭 이동 ================= */
  var TABS = ['schedule', 'artists', 'map', 'rsvp', 'share'];
  var current = null;
  function showTab(name) {
    if (TABS.indexOf(name) < 0) name = 'schedule';
    if (name === current) return;
    current = name;
    TABS.forEach(function (t) { $('#page-' + t).hidden = t !== name; });
    $$('.tabbar a').forEach(function (a) {
      if (a.dataset.tab === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    Leaves.toggle(name === 'schedule');
    document.dispatchEvent(new CustomEvent('tabshown', { detail: name }));
  }
  function fromHash() { showTab(location.hash.replace('#', '') || 'schedule'); }
  window.addEventListener('hashchange', fromHash);

  /* ================= ① 축제 일정 ================= */
  var WAVES = '<svg viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
    '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f2a4a"/><stop offset=".55" stop-color="#1d5d86"/><stop offset="1" stop-color="#f3a45a"/></linearGradient></defs>' +
    '<rect width="400" height="600" fill="url(#sky)"/>' +
    '<circle cx="300" cy="360" r="60" fill="#ffc86b" opacity=".85"/>' +
    '<path d="M0 380 L60 330 L120 360 L170 320 L230 370 L400 350 L400 420 L0 420Z" fill="#12395e" opacity=".9"/>' +
    '<path d="M0 410 Q100 390 200 410 T400 410 V600 H0Z" fill="#0e7c7b"/>' +
    '<path d="M0 450 Q100 430 200 450 T400 450 V600 H0Z" fill="#0b5f6a"/>' +
    '<path d="M0 500 Q100 480 200 500 T400 500 V600 H0Z" fill="#0f2a4a"/></svg>';

  var cd = {};
  function buildSchedule() {
    var p = $('#page-schedule');
    var bg = el('div', { class: 'hero-bg' });
    if (C.heroImage) bg.style.backgroundImage = 'url("' + encodeURI(C.heroImage) + '")';
    else bg.innerHTML = WAVES;

    var inv = invitee ? el('p', { class: 'invitee' }, [el('b', { text: invitee }), ' 님을 초대합니다']) : null;
    var title = el('h1', null, [C.name]);
    if (C.nameIsTemp) title.append(' ', tempBadge());

    // 카운트다운: 일 / 시간 / 분 / 초
    var units = [['d', '일'], ['h', '시간'], ['m', '분'], ['s', '초']];
    var box = el('div', { class: 'countdown', role: 'timer', 'aria-label': '축제 시작까지 남은 시간' });
    units.forEach(function (u, i) {
      if (i) box.append(el('span', { class: 'cd-sep', 'aria-hidden': 'true', text: ':' }));
      var digits = el('div', { class: 'cd-digits', 'aria-hidden': 'true' });
      cd[u[0]] = digits;
      box.append(el('div', { class: 'cd-unit' }, [digits, el('span', { class: 'cd-label', text: u[1] })]));
    });
    cd.box = box;
    cd.status = el('div', { class: 'status', 'aria-live': 'polite' });
    cd.sr = el('p', { class: 'sr-only' });

    var actions = el('div', { class: 'hero-actions' }, [
      el('a', { class: 'btn', href: '#rsvp', text: '✉️ 참석 여부 알려주기' }),
      el('a', { class: 'btn ghost', href: '#artists', text: '🎤 공연 시간표 보기' })
    ]);

    p.append(el('header', { class: 'hero' }, [
      bg, inv,
      el('p', { class: 'hero-kicker', text: C.school }),
      title,
      el('p', { class: 'hero-date', text: C.dateText }),
      el('p', { class: 'hero-place', text: C.location.address }),
      el('div', null, [cd.status]), box, cd.sr, actions
    ]));

    cd.notice = el('div', { class: 'notice', role: 'note' });
    p.append(cd.notice);

    p.append(el('h2', { class: 'sec-title', text: '📌 날짜별 주요 일정' }));
    var cards = el('div', { class: 'day-cards' });
    C.days.forEach(function (d) {
      var card = el('article', { class: 'card day-card' }, [
        el('h3', null, [el('span', { class: 'day-chip', text: d.label }), d.title])
      ]);
      (d.highlights || []).forEach(function (h) {
        card.append(el('div', { class: 'hl' }, [
          el('div', { class: 'hl-time', text: h.time }),
          el('div', null, [el('div', { class: 'hl-title' }, [withTemp(h.title)]), h.desc ? el('div', { class: 'hl-desc' }, [withTemp(h.desc)]) : null])
        ]));
      });
      cards.append(card);
    });
    p.append(cards);

    // 사진첩 (옆으로 넘기기)
    p.append(el('h2', { class: 'sec-title', text: '📷 지난 축제 사진첩' }));
    var gal = el('div', { class: 'gallery', 'aria-label': '사진첩, 옆으로 넘겨 보세요' });
    var dots = el('div', { class: 'dots', 'aria-hidden': 'true' });
    C.gallery.forEach(function (g, i) {
      var media = g.src
        ? el('img', { src: g.src, alt: g.caption || '지난 축제 사진', loading: 'lazy', decoding: 'async', width: 400, height: 300 })
        : el('div', { class: 'ph', role: 'img', 'aria-label': '사진 준비 중' }, [el('span', { text: '🌊' }), '사진 준비 중']);
      gal.append(el('figure', { class: 'slide' }, [media,
        el('figcaption', null, [g.caption || '', el('small', null, [withTemp(g.credit || '출처 미기재')])])]));
      dots.append(el('i', { class: i ? '' : 'on' }));
    });
    gal.addEventListener('scroll', function () {
      var i = Math.round(gal.scrollLeft / (gal.firstChild.offsetWidth + 12));
      $$('i', dots).forEach(function (d, k) { d.classList.toggle('on', k === i); });
    }, { passive: true });
    p.append(gal, dots);
  }

  function setDigit(box, ch) {
    if (box.dataset.v === ch) return;
    box.dataset.v = ch;
    var old = box.lastElementChild;
    var n = el('span', { class: 'd' + (old && !REDUCED ? ' in' : ''), text: ch });
    if (old && !REDUCED) { old.className = 'd out'; box.append(n); setTimeout(function () { if (old.parentNode) old.remove(); }, 520); }
    else { box.textContent = ''; box.append(n); }
  }
  function setNumber(group, num, minLen) {
    var s = String(num).padStart(minLen, '0');
    while (group.children.length > s.length) group.lastChild.remove();
    while (group.children.length < s.length) group.append(el('span', { class: 'digit' }));
    s.split('').forEach(function (ch, i) { setDigit(group.children[i], ch); });
  }
  function tick() {
    var t = now(), s = Date.parse(C.start), e = Date.parse(C.end);
    var st = cd.status;
    if (t < s) {
      var dd = kstDay(s) - kstDay(t);
      st.className = 'status'; st.textContent = dd <= 0 ? 'D-DAY' : 'D-' + dd;
      var left = Math.floor((s - t) / 1000);
      var D = Math.floor(left / 86400), H = Math.floor(left % 86400 / 3600), M = Math.floor(left % 3600 / 60), Sx = left % 60;
      cd.box.hidden = false;
      setNumber(cd.d, D, 2); setNumber(cd.h, H, 2); setNumber(cd.m, M, 2); setNumber(cd.s, Sx, 2);
      if (Sx === 0 || !cd.sr.textContent) cd.sr.textContent = '축제 시작까지 ' + D + '일 ' + H + '시간 ' + M + '분 남았어요';
    } else if (t <= e) {
      st.className = 'status live'; st.textContent = '🎉 지금 축제 중!'; cd.box.hidden = true; cd.sr.textContent = '';
    } else {
      st.className = 'status after'; st.textContent = '함께해 주셔서 감사합니다 🧡'; cd.box.hidden = true; cd.sr.textContent = '';
    }
  }
  function renderNotice() {
    cd.notice.textContent = '';
    cd.notice.hidden = !S.notice;
    if (S.notice) cd.notice.append(el('strong', { text: '📢 공지' }), el('span', null, [withTemp(S.notice)]));
  }

  /* ---------- 떨어지는 낙엽 (가볍게, 글자 뒤에서) ---------- */
  var Leaves = (function () {
    var cv = $('#leaves'), ctx, leaves = [], running = false, want = false, raf, W, H, last = 0;
    var COLORS = ['#f08a24', '#f6c14b', '#e8651a', '#f3a93c', '#d9502a'];
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function make(initial) {
      return { x: Math.random() * W, y: initial ? Math.random() * H : -30, s: 10 + Math.random() * 10,
        vy: 18 + Math.random() * 22, sway: 20 + Math.random() * 30, ph: Math.random() * 6.28,
        rot: Math.random() * 6.28, vr: (Math.random() - .5) * 1.2, c: COLORS[(Math.random() * COLORS.length) | 0] };
    }
    function drawLeaf(l, x) {
      ctx.save(); ctx.translate(x, l.y); ctx.rotate(l.rot); ctx.fillStyle = l.c; ctx.globalAlpha = .55;
      var s = l.s; ctx.beginPath(); ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * .9, -s * .5, s * .7, s * .6, 0, s);
      ctx.bezierCurveTo(-s * .7, s * .6, -s * .9, -s * .5, 0, -s); ctx.fill();
      ctx.globalAlpha = .35; ctx.strokeStyle = '#7a2e0b'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -s * .8); ctx.lineTo(0, s * 1.2); ctx.stroke(); ctx.restore();
    }
    function frame(ts) {
      var dt = Math.min((ts - last) / 1000 || 0, .05); last = ts;
      ctx.clearRect(0, 0, W, H);
      leaves.forEach(function (l, i) {
        l.y += l.vy * dt; l.ph += dt * 1.2; l.rot += l.vr * dt;
        if (l.y > H + 30) leaves[i] = make(false);
        drawLeaf(l, l.x + Math.sin(l.ph) * l.sway);
      });
      raf = requestAnimationFrame(frame);
    }
    function sync() {
      var go = want && !REDUCED && !document.hidden && !!ctx;
      if (go && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      if (!go && running) { running = false; cancelAnimationFrame(raf); if (ctx) ctx.clearRect(0, 0, W, H); }
    }
    function init() {
      if (REDUCED || !cv.getContext) return;
      ctx = cv.getContext('2d'); size();
      for (var i = 0; i < 12; i++) leaves.push(make(true));
      window.addEventListener('resize', size);
      document.addEventListener('visibilitychange', sync);
    }
    return { init: init, toggle: function (on) { want = on; sync(); } };
  })();

  /* ================= ② 아티스트 시간표 ================= */
  var KIND = { artist: '아티스트', club: '동아리 공연', booth: '부스', fireworks: '불꽃놀이', event: '행사' };
  var ICON = { club: '🎸', booth: '🎪', fireworks: '🎆', event: '🎉', artist: '🎤' };
  var SILHOUETTE = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="22" r="12" fill="#8fb3d6"/><path d="M8 64c0-15 11-24 24-24s24 9 24 24z" fill="#8fb3d6"/></svg>';
  var artistsState = { day: null };

  function revealAt(item) { return Date.parse(item.revealAt || S.artistRevealDate); }
  function isRevealed(item) {
    if (item.type !== 'artist') return true;
    return !!(item.artist && item.artist.name) && now() >= revealAt(item);
  }
  function buildArtists() {
    var p = $('#page-artists');
    p.textContent = '';
    p.append(el('div', { class: 'page-head' }, [el('h1', { text: '🎤 아티스트 시간표' }), el('p', { text: '시간 순서대로 보여 드려요' })]));
    var seg = el('div', { class: 'seg', role: 'tablist' });
    C.days.forEach(function (d) {
      seg.append(el('button', { type: 'button', role: 'tab', 'data-day': d.id,
        onclick: function () { artistsState.day = d.id; renderSlots(); } },
        [d.label, el('small', { text: d.title })]));
    });
    p.append(seg, el('p', { class: 'reveal-note', id: 'revealNote' }), el('ol', { class: 'slots', id: 'slots' }));
    if (!artistsState.day) {
      var today = C.days.filter(function (d) { return kstDay(at(d.date, '12:00')) === kstDay(now()); })[0];
      artistsState.day = (today || C.days[0]).id;
    }
    renderSlots();
  }
  function renderSlots() {
    var day = C.days.filter(function (d) { return d.id === artistsState.day; })[0];
    $$('#page-artists .seg button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.day === day.id)); });
    var t = now();
    var hidden = day.timetable.some(function (i) { return i.type === 'artist' && !isRevealed(i); });
    var note = $('#revealNote');
    var ra = Date.parse(S.artistRevealDate);
    note.textContent = !hidden ? '' : t < ra ? '🔒 아티스트는 ' + fmtKst(ra, true) + '에 공개돼요' : '🔒 아직 공개되지 않은 아티스트가 있어요. 곧 공개됩니다';
    note.hidden = !hidden;

    var list = $('#slots'); list.textContent = '';
    var items = day.timetable.slice().sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
    var liveEl = null;
    items.forEach(function (it) {
      var s = at(day.date, it.start), e = at(day.date, it.end || it.start);
      var live = t >= s && t < e, past = t >= e;
      var shown = isRevealed(it);
      var thumb, name, desc;
      if (it.type === 'artist' && !shown) {
        thumb = el('div', { class: 'slot-thumb silhouette', html: SILHOUETTE });
        name = '추후 공개';
        var ra = revealAt(it);
        desc = t < ra ? fmtKst(ra, false) + ' 공개 예정' : '곧 공개됩니다';
      } else if (it.type === 'artist') {
        thumb = el('div', { class: 'slot-thumb' }, [it.artist.photo
          ? el('img', { src: it.artist.photo, alt: it.artist.name, loading: 'lazy' })
          : el('span', { text: ICON.artist })]);
        name = it.artist.name; desc = it.artist.desc || it.title || '';
      } else {
        thumb = el('div', { class: 'slot-thumb' }, [el('span', { text: ICON[it.type] || '📍' })]);
        name = it.title; desc = it.desc || '';
      }
      var li = el('li', { class: 'slot type-' + it.type + (live ? ' live' : '') + (past ? ' past' : '') + (it.type === 'artist' && !shown ? ' hidden-artist' : '') }, [
        live ? el('span', { class: 'live-badge', text: '● 지금 진행 중' }) : null,
        el('div', { class: 'slot-time' }, [it.start, it.end ? el('small', { text: '~' + it.end }) : null]),
        thumb,
        el('div', { class: 'slot-info' }, [el('span', { class: 'kind', text: KIND[it.type] || '행사' }),
          el('strong', null, [withTemp(name)]), desc ? el('p', null, [withTemp(desc)]) : null])
      ]);
      if (live && !liveEl) liveEl = li;
      list.append(li);
    });
    return liveEl;
  }

  /* ================= ③ 이동 맵 ================= */
  var MARK = { stage: ['🎤', '무대'], booth: ['🎪', '부스'], food: ['🍢', '먹거리'], toilet: ['🚻', '화장실'], medical: ['⛑️', '의무실'], parking: ['🅿️', '주차장'] };
  var MAP_PLACEHOLDER = '<svg viewBox="0 0 400 340" aria-hidden="true"><rect width="400" height="340" fill="#dfeee9"/>' +
    '<path d="M0 260 Q100 230 200 260 T400 250 V340 H0Z" fill="#9fd3d0"/>' +
    '<g fill="#fff" stroke="#b9d3cc" stroke-width="2"><rect x="50" y="60" width="90" height="60" rx="8"/><rect x="170" y="40" width="80" height="80" rx="8"/>' +
    '<rect x="280" y="70" width="80" height="55" rx="8"/><rect x="90" y="150" width="120" height="50" rx="8"/><rect x="240" y="150" width="90" height="50" rx="8"/></g>' +
    '<path d="M20 135 H380 M160 20 V240" stroke="#c9b99a" stroke-width="10" stroke-linecap="round" fill="none" opacity=".6"/>' +
    '<rect x="70" y="272" width="200" height="56" rx="14" fill="#0f2a4a" opacity=".9"/>' +
    '<text x="170" y="298" text-anchor="middle" font-size="20" font-weight="700" fill="#fff" font-family="sans-serif">학교 맵 준비 중</text>' +
    '<text x="170" y="318" text-anchor="middle" font-size="12" fill="#f6c14b" font-family="sans-serif">임시 그림 · 실제 맵으로 바뀔 예정</text></svg>';

  function buildMap() {
    var p = $('#page-map');
    p.append(el('div', { class: 'page-head' }, [el('h1', { text: '🗺️ 이동 맵' }), el('p', { text: '두 손가락으로 벌려 확대, 끌어서 이동' })]));

    var layer = el('div', { class: 'map-layer', id: 'mapLayer' });
    if (C.mapImage) layer.append(el('img', { src: C.mapImage, alt: '학교 축제 맵', draggable: 'false' }));
    else layer.innerHTML = MAP_PLACEHOLDER;
    C.mapMarkers.forEach(function (m) {
      var k = MARK[m.type] || ['📍', '장소'];
      layer.append(el('div', { class: 'marker', 'data-type': m.type, style: 'left:' + Number(m.x) + '%;top:' + Number(m.y) + '%' }, [
        el('div', { class: 'pin' }, [el('span', { text: k[0] })]),
        el('span', { class: 'lbl' }, [withTemp(m.label || k[1])])
      ]));
    });
    var stage = el('div', { class: 'map-stage', role: 'img', 'aria-label': '학교 축제 맵' }, [layer]);
    var ctrl = el('div', { class: 'map-ctrl' });
    p.append(el('div', { class: 'map-wrap' }, [stage, ctrl]));
    if (!C.mapImage) p.append(el('p', { class: 'map-hint' }, ['학교 맵 사진은 준비 중이에요. ', tempBadge()]));

    // 아이콘 켜고 끄기
    var chips = el('div', { class: 'chips', 'aria-label': '지도에 보일 장소 고르기' });
    Object.keys(MARK).forEach(function (type) {
      if (!C.mapMarkers.some(function (m) { return m.type === type; })) return;
      chips.append(el('button', { type: 'button', class: 'chip', 'aria-pressed': 'true', onclick: function () {
        var on = this.getAttribute('aria-pressed') !== 'true';
        this.setAttribute('aria-pressed', String(on));
        $$('.marker[data-type="' + type + '"]', layer).forEach(function (m) { m.hidden = !on; });
      } }, [MARK[type][0] + ' ' + MARK[type][1]]));
    });
    p.append(chips);
    initPanZoom(stage, layer, ctrl);

    // 학교까지 오는 길
    var L = C.location, nm = encodeURIComponent(L.name);
    p.append(el('h2', { class: 'sec-title', text: '🧭 학교까지 오는 길' }));
    var card = el('div', { class: 'card' }, [
      el('div', { class: 'addr' }, [
        el('p', null, [L.address, el('small', { text: L.name })]),
        el('button', { type: 'button', class: 'btn secondary', onclick: function () { copyText(L.address, '주소를 복사했어요 📋'); } }, ['주소 복사'])
      ]),
      el('div', { class: 'nav-apps' }, [
        el('a', { class: 'btn kakaomap', href: 'https://map.kakao.com/link/to/' + nm + ',' + L.lat + ',' + L.lng, target: '_blank', rel: 'noopener' }, ['카카오맵', el('small', { text: '길찾기' })]),
        el('a', { class: 'btn naver', href: '#', onclick: function (ev) {
          ev.preventDefault();
          openApp('nmap://route/public?dlat=' + L.lat + '&dlng=' + L.lng + '&dname=' + nm + '&appname=' + encodeURIComponent(location.hostname),
            'https://map.naver.com/p/search/' + encodeURIComponent(L.address));
        } }, ['네이버지도', el('small', { text: '길찾기' })]),
        el('a', { class: 'btn tmap', href: '#', onclick: function (ev) {
          ev.preventDefault();
          var store = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'https://apps.apple.com/kr/app/id431589174' : 'https://play.google.com/store/apps/details?id=com.skt.tmap.ku';
          openApp('tmap://route?goalname=' + nm + '&goalx=' + L.lng + '&goaly=' + L.lat, store);
        } }, ['티맵', el('small', { text: '길찾기' })])
      ])
    ]);
    p.append(card);
    C.transport.forEach(function (tr, i) {
      var ul = el('ul');
      tr.lines.forEach(function (l) { ul.append(el('li', null, [withTemp(l)])); });
      p.append(el('details', { class: 'acc', open: i === 0 }, [el('summary', null, [tr.title]), ul]));
    });
  }
  // 앱을 열어 보고, 앱이 없으면(화면이 그대로면) 웹/앱스토어로 이동
  function openApp(appUrl, fallback) {
    var left = false;
    function onHide() { if (document.hidden) left = true; }
    document.addEventListener('visibilitychange', onHide);
    location.href = appUrl;
    setTimeout(function () {
      document.removeEventListener('visibilitychange', onHide);
      if (!left && !document.hidden) location.href = fallback;
    }, 1600);
  }

  function initPanZoom(stage, layer, ctrl) {
    var s = 1, x = 0, y = 0, pts = new Map(), MAX = 4;
    function clamp() {
      var w = stage.clientWidth, h = stage.clientHeight;
      s = Math.min(MAX, Math.max(1, s));
      x = Math.min(0, Math.max(w - w * s, x)); y = Math.min(0, Math.max(h - h * s, y));
    }
    function apply() {
      clamp();
      layer.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
      layer.style.setProperty('--inv', String(1 / s));
    }
    function zoomAt(f, cx, cy) {
      var ns = Math.min(MAX, Math.max(1, s * f));
      x = cx - (cx - x) * (ns / s); y = cy - (cy - y) * (ns / s); s = ns; apply();
    }
    function rel(e) { var r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function geo() {
      var a = Array.from(pts.values());
      return { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
    }
    stage.addEventListener('pointerdown', function (e) {
      pts.set(e.pointerId, rel(e));
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    });
    stage.addEventListener('pointermove', function (e) {
      if (!pts.has(e.pointerId)) return;
      var p = rel(e);
      if (pts.size === 1) {
        var o = pts.get(e.pointerId); x += p.x - o.x; y += p.y - o.y; pts.set(e.pointerId, p); apply();
      } else if (pts.size === 2) {
        var g0 = geo(); pts.set(e.pointerId, p); var g1 = geo();
        x += g1.x - g0.x; y += g1.y - g0.y;
        if (g0.d > 0) zoomAt(g1.d / g0.d, g1.x, g1.y); else apply();
      }
    });
    function up(e) { pts.delete(e.pointerId); }
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { stage.addEventListener(t, up); });
    stage.addEventListener('wheel', function (e) { e.preventDefault(); var p = rel(e); zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, p.x, p.y); }, { passive: false });
    stage.addEventListener('dblclick', function (e) { var p = rel(e); if (s >= MAX - .01) { s = 1; x = y = 0; apply(); } else zoomAt(2, p.x, p.y); });
    function mid() { return [stage.clientWidth / 2, stage.clientHeight / 2]; }
    ctrl.append(
      el('button', { type: 'button', 'aria-label': '확대', text: '＋', onclick: function () { var m = mid(); zoomAt(1.5, m[0], m[1]); } }),
      el('button', { type: 'button', 'aria-label': '축소', text: '－', onclick: function () { var m = mid(); zoomAt(1 / 1.5, m[0], m[1]); } }),
      el('button', { type: 'button', 'aria-label': '처음 크기로', text: '⟲', onclick: function () { s = 1; x = y = 0; apply(); } })
    );
    window.addEventListener('resize', apply);
  }

  /* ================= 시작 ================= */
  window.App = { C: C, S: S, $: $, $$: $$, el: el, withTemp: withTemp, tempBadge: tempBadge, now: now, fmtKst: fmtKst,
    toast: toast, copyText: copyText, store: store, api: api, settingsReady: settingsReady, invitee: invitee,
    cleanName: cleanName, loadScript: loadScript, REDUCED: REDUCED };

  buildSchedule(); renderNotice(); tick();
  setInterval(tick, 1000);
  buildArtists(); buildMap();
  Leaves.init();
  fromHash();

  // 공연 중 강조를 30초마다 새로 고침, 시간표 탭을 열면 진행 중인 공연으로 이동
  setInterval(function () { if (current === 'artists') renderSlots(); }, 30000);
  document.addEventListener('tabshown', function (e) {
    if (e.detail !== 'artists') return;
    var live = renderSlots();
    if (live) live.scrollIntoView({ block: 'center', behavior: REDUCED ? 'auto' : 'smooth' });
  });
  settingsReady.then(function () { renderNotice(); buildArtists(); document.dispatchEvent(new Event('settingsready')); });
})();
