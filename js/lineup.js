/* ② 시간표 맨 위 LINE-UP: 페스티벌 포스터 느낌 아티스트 사진 + 소개 영상
   - 포스터: 사진을 흑백으로 바꾼 뒤 두 가지 색을 입혀(듀오톤) 굵은 이름을 올려요.
   - 소개 영상: config.js 에 video(영상 파일)가 있으면 그걸 재생하고,
     없으면 사진으로 "예고 → 빠른 컷 → 번쩍 → 마무리" 흐름의 영상을 화면에서 바로 만들어 재생해요. */
(function () {
  'use strict';
  var A = window.App, C = A.C, el = A.el, $ = A.$;
  var WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  var TINTS = [
    { dark: '#0f2a4a', light: '#f08a24' }, // 남색 + 단풍 주황
    { dark: '#2b0a3d', light: '#ff3d7f' }, // 보라 + 분홍
    { dark: '#063b3a', light: '#46f2c8' }, // 청록
    { dark: '#1a1446', light: '#8a7bff' }, // 남보라
    { dark: '#3a1200', light: '#ffc14b' }  // 노을
  ];

  function dayText(day) { // "10.28 WED"
    var p = day.date.split('-'), w = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
    return +p[1] + '.' + p[2] + ' ' + WEEK[w];
  }
  function items() {
    var list = [];
    C.days.forEach(function (d, di) {
      d.timetable.forEach(function (it) {
        if (it.type !== 'artist') return;
        var shown = A.isRevealed(it), a = it.artist || {};
        list.push({
          day: d, dayNo: di + 1, it: it, shown: shown, headliner: !!it.headliner,
          name: shown ? a.name : '', nameEn: shown ? (a.nameEn || '') : '', desc: shown ? (a.desc || '') : '',
          photo: shown ? a.photo : '', photos: shown ? [a.photo].concat(a.photos || []).filter(Boolean) : [],
          video: shown ? a.video : '', revealAt: A.revealAt(it)
        });
      });
    });
    // 헤드라이너 먼저, 그다음 날짜·시간 순
    return list.sort(function (x, y) { return (y.headliner - x.headliner) || (x.dayNo - y.dayNo) || (x.it.start < y.it.start ? -1 : 1); });
  }

  /* ---------- 포스터 카드 ---------- */
  var SIL = '<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
    '<defs><radialGradient id="spot" cx=".5" cy=".42" r=".55"><stop offset="0" stop-color="#f6c14b" stop-opacity=".55"/><stop offset="1" stop-color="#f6c14b" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="300" height="400" fill="url(#spot)"/>' +
    '<g fill="#07121f"><ellipse cx="150" cy="150" rx="34" ry="40"/><path d="M118 190h64l40 60-8 150H86l-8-150z"/></g>' +
    '<g fill="#07121f" opacity=".9"><circle cx="30" cy="385" r="30"/><circle cx="90" cy="392" r="28"/><circle cx="210" cy="390" r="30"/><circle cx="270" cy="384" r="30"/></g></svg>';

  function poster(x) {
    var media = x.photo
      ? el('img', { src: x.photo, alt: x.name + ' 사진', loading: 'lazy', decoding: 'async' })
      : el('div', { class: 'poster-sil', html: SIL });
    var big = x.shown ? (x.nameEn || x.name) : 'COMING SOON';
    var card = el('article', { class: 'poster' + (x.shown ? '' : ' locked') + (x.headliner ? ' headliner' : '') }, [
      el('div', { class: 'poster-img' }, [media, el('i', { class: 'tone' }), el('i', { class: 'grain' })]),
      el('div', { class: 'poster-top' }, [
        el('span', { class: 'ptag', text: x.headliner ? 'HEADLINER' : 'LINE-UP' }),
        el('span', { class: 'pday', text: 'DAY ' + x.dayNo + ' · ' + dayText(x.day) })
      ]),
      el('div', { class: 'poster-bottom' }, [
        el('p', { class: 'ptime', text: x.it.start + ' MAIN STAGE' }),
        el('h3', { class: 'pname' + (big.length > 9 ? ' long' : ''), text: big }),
        x.shown && x.nameEn ? el('p', { class: 'psub', text: x.name }) : null,
        !x.shown ? el('p', { class: 'psub', text: A.now() < x.revealAt ? A.fmtKst(x.revealAt, false) + ' 공개' : '곧 공개됩니다' }) : null,
        el('p', { class: 'pfest', text: 'KMOU AUTUMN FESTIVAL 2026' })
      ]),
      el('button', { type: 'button', class: 'pplay', 'aria-label': (x.shown ? x.name + ' 소개 영상' : '티저 영상') + ' 재생', onclick: function () { Player.open(x); } }, [
        el('span', { class: 'pplay-ic', 'aria-hidden': 'true' }), x.shown ? '소개 영상' : '티저 보기'
      ])
    ]);
    return card;
  }

  function render() {
    var page = $('#page-artists');
    var old = $('#lineup', page); if (old) old.remove();
    var list = items();
    if (!list.length) return;
    var track = el('div', { class: 'lineup-track', 'aria-label': '출연 아티스트, 옆으로 넘겨 보세요' });
    list.forEach(function (x) { track.append(poster(x)); });
    var sec = el('section', { id: 'lineup', class: 'lineup' }, [
      el('h2', { class: 'sec-title lineup-title' }, [el('span', { text: 'LINE-UP' }), el('small', { text: '옆으로 넘겨 보세요 →' })]),
      track
    ]);
    var head = $('.page-head', page);
    head.after(sec);
  }

  /* ---------- 소개 영상 플레이어 ---------- */
  var Player = (function () {
    var ov, cv, ctx, bar, raf, t0 = 0, paused = false, pausedAt = 0, spec, imgs = [], vid = null, endBox, W = 360, H = 640, DUR = 17;
    var noise;

    function open(x) {
      spec = x;
      close();
      ov = el('div', { class: 'reel-ov', role: 'dialog', 'aria-label': (x.shown ? x.name : '아티스트') + ' 소개 영상' });
      var frame = el('div', { class: 'reel-frame' });
      bar = el('i', { class: 'reel-bar' });
      var closeBtn = el('button', { type: 'button', class: 'reel-close', 'aria-label': '닫기', text: '✕', onclick: close });
      endBox = el('div', { class: 'reel-end', hidden: true }, [
        el('button', { type: 'button', class: 'btn', text: '↺ 다시 보기', onclick: function () { endBox.hidden = true; start(); } }),
        el('a', { class: 'btn ghost', href: '#rsvp', text: '✉️ 참석 여부 알려주기', onclick: close })
      ]);
      frame.append(el('div', { class: 'reel-progress' }, [bar]), closeBtn, endBox);

      if (x.video) {
        vid = el('video', { src: x.video, playsinline: true, 'webkit-playsinline': true, controls: true, autoplay: true, preload: 'auto', poster: x.photo || null });
        vid.className = 'reel-media';
        vid.addEventListener('timeupdate', function () { bar.style.width = (vid.currentTime / (vid.duration || 1) * 100) + '%'; });
        vid.addEventListener('ended', function () { endBox.hidden = false; });
        frame.prepend(vid);
      } else {
        cv = el('canvas', { class: 'reel-media', 'aria-hidden': 'true' });
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = W * dpr; cv.height = H * dpr;
        ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        frame.prepend(cv);
        cv.addEventListener('click', togglePause);
      }
      ov.append(frame, el('p', { class: 'reel-hint', text: x.video ? '' : (A.REDUCED ? '"동작 줄이기"가 켜져 있어 멈춘 화면으로 보여 드려요' : '화면을 누르면 멈춤 / 재생') }));
      document.body.append(ov);
      document.documentElement.style.overflow = 'hidden';
      document.addEventListener('keydown', onKey);
      if (!x.video) prepare().then(start);
    }
    function onKey(e) { if (e.key === 'Escape') close(); if (e.key === ' ' && cv) { e.preventDefault(); togglePause(); } }
    function close() {
      cancelAnimationFrame(raf);
      if (vid) { vid.pause(); vid = null; }
      if (ov) ov.remove();
      ov = cv = ctx = null;
      document.documentElement.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    }
    function prepare() {
      var fontReady = document.fonts && document.fonts.load ? document.fonts.load('40px "Black Han Sans"').catch(function () {}) : Promise.resolve();
      imgs = [];
      var loads = spec.photos.map(function (src) {
        return new Promise(function (res) {
          var im = new Image(); im.decoding = 'async';
          im.onload = function () { imgs.push(im); res(); }; im.onerror = function () { res(); };
          im.src = src;
        });
      });
      if (!noise) {
        noise = document.createElement('canvas'); noise.width = noise.height = 128;
        var nx = noise.getContext('2d'), d = nx.createImageData(128, 128);
        for (var i = 0; i < d.data.length; i += 4) { var v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 40; }
        nx.putImageData(d, 0, 0);
      }
      return Promise.all(loads.concat([fontReady]));
    }
    function start() {
      paused = false; t0 = performance.now();
      if (A.REDUCED) { draw(DUR - 1.2); bar.style.width = '100%'; endBox.hidden = false; return; }
      loop();
    }
    function loop() {
      if (!ctx) return;
      var t = (performance.now() - t0) / 1000;
      if (t >= DUR) { draw(DUR - 0.01); bar.style.width = '100%'; endBox.hidden = false; return; }
      draw(t); bar.style.width = (t / DUR * 100) + '%';
      raf = requestAnimationFrame(loop);
    }
    function togglePause() {
      if (!endBox.hidden || A.REDUCED) return;
      if (paused) { t0 += performance.now() - pausedAt; paused = false; loop(); }
      else { paused = true; pausedAt = performance.now(); cancelAnimationFrame(raf); }
    }

    /* ----- 그리기 도우미 ----- */
    function rnd(seed) { var x = Math.sin(seed * 999.13) * 43758.5453; return x - Math.floor(x); }
    function font(px) { return '400 ' + px + 'px "Black Han Sans", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'; }
    function fitText(text, maxW, px) {
      ctx.font = font(px);
      while (ctx.measureText(text).width > maxW && px > 18) { px -= 2; ctx.font = font(px); }
      return px;
    }
    // 사진을 화면에 꽉 차게 + 흑백 + 두 가지 색(듀오톤)
    function photo(im, tint, zoom, ox, oy, alpha) {
      ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
      if (im) {
        var s = Math.max(W / im.width, H / im.height) * zoom;
        var w = im.width * s, h = im.height * s;
        ctx.drawImage(im, (W - w) / 2 + ox, (H - h) / 2 + oy, w, h);
      } else silhouette(zoom, ox, oy);
      ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'color-dodge'; ctx.fillStyle = '#555'; ctx.fillRect(0, 0, W, H); // 밝게
      ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(cv, 0, 0, W, H); // 대비 높이기
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = tint.light; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = tint.dark; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    function silhouette(zoom, ox, oy) { // 사진이 없을 때: 조명 아래 실루엣
      ctx.fillStyle = '#1b1b1b'; ctx.fillRect(0, 0, W, H);
      var g = ctx.createRadialGradient(W / 2 + ox, 250 + oy, 10, W / 2 + ox, 250 + oy, 260 * zoom);
      g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2 + ox, 330 + oy); ctx.scale(zoom, zoom); ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(0, -80, 34, 40, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-32, -40); ctx.lineTo(32, -40); ctx.lineTo(75, 30); ctx.lineTo(60, 330); ctx.lineTo(-60, 330); ctx.lineTo(-75, 30); ctx.fill();
      ctx.restore();
    }
    function grain() {
      ctx.save(); ctx.globalAlpha = .5;
      ctx.translate(-Math.random() * 128, -Math.random() * 128);
      ctx.fillStyle = ctx.createPattern(noise, 'repeat'); ctx.fillRect(0, 0, W + 128, H + 128);
      ctx.restore();
    }
    function glitchText(text, y, px, amt, color) {
      px = fitText(text, W - 48, px);
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (amt > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,40,80,.9)'; ctx.fillText(text, W / 2 - amt * 6, y + amt * 1.5);
        ctx.fillStyle = 'rgba(40,220,255,.9)'; ctx.fillText(text, W / 2 + amt * 6, y - amt * 1.5);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillStyle = color || '#fff'; ctx.fillText(text, W / 2, y);
      ctx.restore();
      if (amt > .3) slices(y - px, px * 2, amt);
    }
    function slices(y0, h, amt) { // 가로로 찢어지는 글리치
      var dpr = cv.width / W;
      for (var i = 0; i < 5; i++) {
        var sy = y0 + Math.random() * h, sh = 3 + Math.random() * 10, dx = (Math.random() - .5) * 40 * amt;
        ctx.drawImage(cv, 0, sy * dpr, cv.width, sh * dpr, dx, sy, W, sh);
      }
    }
    function bottomLogo(alpha) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, H - 86, W, 86);
      var nm = spec.shown ? (spec.nameEn || spec.name) : 'COMING SOON';
      ctx.fillStyle = '#fff'; fitText(nm, W - 80, 26); ctx.fillText(nm, W / 2, H - 50);
      ctx.font = '700 11px sans-serif'; ctx.fillStyle = '#f6c14b';
      ctx.fillText('🍁 KMOU AUTUMN FESTIVAL 2026', W / 2, H - 24);
      ctx.restore();
    }

    // 컷 박자표: 예고(0~3.6초) 뒤 점점 빨라지는 컷
    var CUTS = (function () {
      var gaps = [.9, .7, .7, .5, .5, .9, .35, .35, .6, .5, .4, .4, .8, .3, .3], t = 3.6, out = [];
      gaps.forEach(function (g) { out.push(t); t += g; });
      out.push(t); return out; // 마지막 값 ≈ 12초
    })();

    function draw(t) {
      var title = spec.shown ? (spec.nameEn || spec.name) : '???';
      var dateLine = dayText(spec.day) + '  ' + spec.it.start;
      var n = Math.max(imgs.length, 1);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

      if (t < 3.6) { // ① 예고: 검은 화면 + 글리치 이름 + 날짜 한 글자씩
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.font = '700 11px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.textAlign = 'center';
        ctx.fillText(spec.headliner ? 'HEADLINER' : 'LINE-UP', W / 2, 200);
        var burst = t < .9 ? 1 - t / .9 : ((t * 10 | 0) % 9 === 0 ? .6 : 0);
        if (t > .15) glitchText(title, 280, 58, burst);
        var chars = Math.max(0, Math.floor((t - .9) / .09));
        ctx.font = '700 22px sans-serif'; ctx.fillStyle = '#f6c14b'; ctx.textAlign = 'center';
        ctx.fillText(dateLine.slice(0, chars), W / 2, 350);
        if (!spec.shown && t > 2.2) { ctx.font = '600 14px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('COMING SOON', W / 2, 390); }
        grain();
        return;
      }

      if (t < 12) { // ② 빠른 컷: 사진마다 다른 색, 확대·흔들림, 컷마다 번쩍
        var i = 0; while (i < CUTS.length - 2 && t >= CUTS[i + 1]) i++;
        var local = t - CUTS[i], len = CUTS[i + 1] - CUTS[i];
        var im = imgs[i % n], tint = TINTS[i % TINTS.length];
        var zoom = 1.12 + .12 * (local / len) + (i % 3 === 0 ? .15 : 0);
        var ox = (rnd(i) - .5) * 40 + Math.sin(t * 40) * (local < .12 ? 6 : 0), oy = (rnd(i + 7) - .5) * 30;
        photo(im, tint, zoom, ox, oy, 1);
        if (i % 4 === 2) photo(imgs[(i + 1) % n], TINTS[(i + 2) % TINTS.length], zoom * 1.05, ox + 14, oy, .35); // 잔상 겹치기
        if (local < .09) { ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * (1 - local / .09)) + ')'; ctx.fillRect(0, 0, W, H); }
        if (i === 6) { // 중간에 굵은 글씨 끼워 넣기 (잡지 표지 느낌)
          ctx.save(); ctx.globalAlpha = .9; ctx.translate(W / 2, H / 2 - 40); ctx.rotate(-.12);
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; fitText(title, W * 1.1, 84); ctx.fillText(title, 0, 0);
          ctx.restore();
        }
        grain(); bottomLogo(1);
        return;
      }

      if (t < 14) { // ③ 절정: 0.2초마다 번쩍번쩍
        var k = Math.floor((t - 12) / .2), l2 = (t - 12) % .2;
        photo(imgs[k % n], TINTS[(k + 1) % TINTS.length], 1.3 - .03 * k, (rnd(k + 3) - .5) * 30, 0, 1);
        var flash = k % 2 === 0 ? .9 * (1 - l2 / .2) : 0;
        if (flash) { ctx.fillStyle = 'rgba(255,255,255,' + flash + ')'; ctx.fillRect(0, 0, W, H); }
        grain(); bottomLogo(1);
        return;
      }

      // ④ 마무리: 천천히 멀어지는 사진 + 큰 이름 + 날짜
      var u = Math.min(1, (t - 14) / 3);
      photo(imgs[0], TINTS[0], 1.22 - .14 * u, 0, 0, 1);
      var g = ctx.createLinearGradient(0, H * .35, 0, H);
      g.addColorStop(0, 'rgba(15,42,74,0)'); g.addColorStop(1, 'rgba(15,42,74,.95)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      var a = Math.min(1, (t - 14.2) / .5);
      ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.textAlign = 'center';
      ctx.font = '700 12px sans-serif'; ctx.fillStyle = '#f6c14b';
      ctx.fillText(spec.headliner ? '★ HEADLINER ★' : 'LINE-UP', W / 2, H - 250);
      ctx.fillStyle = '#fff'; fitText(title, W - 40, 64); ctx.fillText(title, W / 2, H - 190 + (1 - a) * 20);
      if (spec.shown && spec.nameEn) { ctx.font = '700 18px sans-serif'; ctx.fillText(spec.name, W / 2, H - 150); }
      ctx.font = '800 24px sans-serif'; ctx.fillStyle = '#f6c14b'; ctx.fillText(dateLine, W / 2, H - 108);
      ctx.font = '600 13px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.fillText(C.school + ' · ' + C.name, W / 2, H - 76);
      if (!spec.shown) ctx.fillText(A.now() < spec.revealAt ? A.fmtKst(spec.revealAt, true) + ' 공개' : '곧 공개됩니다', W / 2, H - 52);
      ctx.restore();
      grain();
    }

    return { open: open, close: close };
  })();

  document.addEventListener('artistsbuilt', render);
  render();
})();
