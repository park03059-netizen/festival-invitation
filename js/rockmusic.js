/* 소개 영상 배경음악: 웅장한 록 음악을 폰 안에서 직접 연주해서 만들어요.
   (녹음된 음악 파일이 아니라 드럼·일렉기타·베이스 소리를 코드로 합성 → 저작권 걱정 없음)
   박자: 150 BPM (한 박 = 0.4초) — 영상의 컷이 이 박자에 맞춰 넘어가요.

   구성 (영상과 똑같이 맞춤)
   0 ~ 3.6초   : 낮게 깔리는 기타 울림 + 점점 차오르는 소리 + 심장 박동 같은 북소리 + 마지막 드럼 필인
   3.6 ~ 12초  : 강렬한 기타 리프 + 드럼 비트 (사진이 빠르게 넘어가는 부분)
   12 ~ 14초   : 드럼 연타로 절정까지 몰아치기
   14 ~ 17초   : 크게 "쾅!" 하고 울리며 마무리 */
window.RockMusic = (function () {
  'use strict';
  var SR = 32000, LEN = 17.5, BEAT = 0.4, E8 = 0.2;
  var cache = null;
  var N = { E: 82.41, F: 87.31, G: 98.0, A: 110.0, B: 123.47, C: 65.41, D: 73.42 };

  function render() {
    if (cache) return cache;
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return Promise.reject(new Error('no audio'));
    var ctx = new OAC(2, Math.ceil(SR * LEN), SR);

    // 마스터: 컴프레서로 소리를 단단하게
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .2;
    var master = ctx.createGain(); master.gain.value = .5;
    var limit = ctx.createWaveShaper(), lc = new Float32Array(1024); // 소리가 찢어지지 않게 부드럽게 눌러 주기
    for (var q = 0; q < 1024; q++) lc[q] = Math.tanh((q / 512 - 1) * 1.3) / Math.tanh(1.3);
    limit.curve = lc;
    comp.connect(master); master.connect(limit); limit.connect(ctx.destination);

    // 공연장 울림(리버브)
    var verb = ctx.createConvolver();
    var ir = ctx.createBuffer(2, SR * 2.2, SR);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2);
    }
    verb.buffer = ir;
    var verbGain = ctx.createGain(); verbGain.gain.value = .22;
    verb.connect(verbGain); verbGain.connect(comp);

    var noise = ctx.createBuffer(1, SR * 2, SR);
    var nd = noise.getChannelData(0);
    for (var n = 0; n < nd.length; n++) nd[n] = Math.random() * 2 - 1;

    function out(node, wet) { node.connect(comp); if (wet) node.connect(verb); }
    function env(g, t, peak, a, dur) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }

    /* ---------- 드럼 ---------- */
    function kick(t, v) {
      v = v || 1;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + .14);
      env(g, t, 1.1 * v, .002, .38);
      o.connect(g); out(g); o.start(t); o.stop(t + .4);
      var c = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), cg = ctx.createGain(); // 때리는 소리
      c.buffer = noise; hp.type = 'highpass'; hp.frequency.value = 2500;
      env(cg, t, .25 * v, .001, .02);
      c.connect(hp); hp.connect(cg); out(cg); c.start(t); c.stop(t + .03);
    }
    function snare(t, v) {
      v = v || 1;
      var s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; bp.type = 'highpass'; bp.frequency.value = 1400;
      env(g, t, .7 * v, .001, .22);
      s.connect(bp); bp.connect(g); out(g, true); s.start(t, Math.random()); s.stop(t + .25);
      var o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(160, t + .08);
      env(og, t, .5 * v, .001, .12);
      o.connect(og); out(og, true); o.start(t); o.stop(t + .15);
    }
    function hat(t, v) {
      var s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; hp.type = 'highpass'; hp.frequency.value = 8000;
      env(g, t, .16 * (v || 1), .001, .05);
      s.connect(hp); hp.connect(g); out(g); s.start(t, Math.random()); s.stop(t + .06);
    }
    function crash(t, v, len) {
      var s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; s.loop = true; hp.type = 'highpass'; hp.frequency.value = 4500;
      env(g, t, .42 * (v || 1), .002, len || 1.8);
      s.connect(hp); hp.connect(g); out(g, true); s.start(t, Math.random()); s.stop(t + (len || 1.8));
    }
    function tom(t, f, v) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + .1);
      env(g, t, .9 * (v || 1), .002, .5);
      o.connect(g); out(g, true); o.start(t); o.stop(t + .55);
    }

    /* ---------- 일렉기타 (파워코드 + 디스토션) ---------- */
    var curve = new Float32Array(4096);
    for (var k = 0; k < curve.length; k++) { var x = k / 2048 - 1; curve[k] = Math.tanh(x * 18) * .9; }
    function guitar(t, root, dur, muted, v) {
      var bus = ctx.createGain(); bus.gain.value = .22;
      var shaper = ctx.createWaveShaper(); shaper.curve = curve;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = muted ? 900 : 3600; lp.Q.value = .8;
      var mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 1600; mid.gain.value = 5;
      var g = ctx.createGain();
      bus.connect(shaper); shaper.connect(lp); lp.connect(mid); mid.connect(g);
      [1, 1.4983, 2].forEach(function (mult) { // 근음 · 5도 · 옥타브 = 파워코드
        [-7, 7].forEach(function (cents) {       // 두 대가 동시에 치는 듯 두껍게
          var o = ctx.createOscillator(); o.type = 'sawtooth';
          o.frequency.value = root * mult; o.detune.value = cents;
          o.connect(bus); o.start(t); o.stop(t + dur + .05);
        });
      });
      var peak = (v || 1) * (muted ? .32 : .42);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + .006);
      g.gain.setValueAtTime(peak, t + Math.max(.01, dur - (muted ? .05 : .12)));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      out(g, !muted);
    }
    function bass(t, root, dur) {
      var o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = root / 2;
      lp.type = 'lowpass'; lp.frequency.value = 380;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.55, t + .01);
      g.gain.setValueAtTime(.55, t + dur - .03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(lp); lp.connect(g); out(g); o.start(t); o.stop(t + dur + .02);
    }

    /* ===== ① 예고 (0 ~ 3.6초) ===== */
    // 길게 깔리는 기타 울림 (필터가 서서히 열림)
    (function () {
      var bus = ctx.createGain(); bus.gain.value = .2;
      var shaper = ctx.createWaveShaper(); shaper.curve = curve;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(200, 0); lp.frequency.exponentialRampToValueAtTime(2600, 3.5);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, 0); g.gain.exponentialRampToValueAtTime(.35, 1.2);
      g.gain.setValueAtTime(.35, 3.45); g.gain.exponentialRampToValueAtTime(0.0001, 3.6);
      bus.connect(shaper); shaper.connect(lp); lp.connect(g); out(g, true);
      [N.E, N.E * 1.4983, N.E * 2].forEach(function (f) {
        var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(bus); o.start(0); o.stop(3.65);
      });
    })();
    // 점점 차오르는 쉬익 소리
    (function () {
      var s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; s.loop = true; bp.type = 'bandpass'; bp.Q.value = 3;
      bp.frequency.setValueAtTime(300, .4); bp.frequency.exponentialRampToValueAtTime(6000, 3.55);
      g.gain.setValueAtTime(0.0001, .4); g.gain.exponentialRampToValueAtTime(.35, 3.55); g.gain.linearRampToValueAtTime(0, 3.62);
      s.connect(bp); bp.connect(g); out(g); s.start(.4); s.stop(3.65);
    })();
    tom(.15, 70, 1.2); crash(.15, .6, 2.5);               // 글리치로 이름이 뜰 때 "둥!"
    [.9, 1.3, 1.7, 2.1, 2.5, 2.8].forEach(function (t) { kick(t, .8); }); // 심장 박동
    [3.0, 3.1, 3.2, 3.3].forEach(function (t, i) { tom(t, 140 - i * 20, .9); }); // 드럼 필인
    [3.4, 3.45, 3.5, 3.55].forEach(function (t) { snare(t, .8); });

    /* ===== ② 리프 (3.6 ~ 12초, 150 BPM) ===== */
    // 한 마디(1.6초) = 8분음표 8개. 소문자 = 기타 줄을 손으로 막고 "둥둥" 끊어 치기
    var RIFF = [
      ['E', 'e', 'e', 'G', 'e', 'e', 'A', 'G'],
      ['E', 'e', 'e', 'G', 'e', 'e', 'D', 'C'],
      ['E', 'e', 'e', 'G', 'e', 'e', 'A', 'G'],
      ['C', 'c', 'D', 'd', 'E', 'e', 'e', 'e'],
      ['E', 'e', 'G', 'e', 'A', 'e', 'B', 'B']
    ];
    var t0 = 3.6, idx = 0;
    for (var bar = 0; bar < 5 && t0 + bar * 1.6 < 12; bar++) {
      RIFF[bar].forEach(function (nt, j) {
        var t = t0 + bar * 1.6 + j * E8;
        if (t >= 12) return;
        var up = nt.toUpperCase(), muted = nt !== up;
        guitar(t, N[up], E8 * (muted ? .8 : .98), muted, muted ? .9 : 1);
        bass(t, N[up], E8 * .95);
        idx++;
      });
      for (var b = 0; b < 4; b++) { // 드럼: 쿵(1,3박) 짝(2,4박) + 하이햇 8분음표
        var bt = t0 + bar * 1.6 + b * BEAT;
        if (bt >= 12) break;
        if (b % 2 === 0) { kick(bt); kick(bt + E8 * 1.5, .7); } else snare(bt);
        hat(bt); hat(bt + E8, .7);
      }
    }
    crash(3.6, 1, 2.2); crash(6.8, .8); crash(10.0, .8);

    /* ===== ③ 절정 (12 ~ 14초): 영상의 번쩍임(0.2초)마다 쾅쾅 ===== */
    for (var f = 0; f < 10; f++) {
      var ft = 12 + f * E8, grow = .6 + f * .045;
      guitar(ft, f < 6 ? N.E : (f < 8 ? N.G : N.A), E8 * .95, false, grow);
      bass(ft, f < 6 ? N.E : (f < 8 ? N.G : N.A), E8 * .9);
      kick(ft, grow);
      snare(ft + .1, .5 + f * .05); snare(ft, .4 + f * .05);
      if (f % 2 === 0) crash(ft, .5 + f * .03, .6);
    }

    /* ===== ④ 마무리 (14 ~ 17초): "쾅!" + 길게 울림 ===== */
    guitar(14, N.E, 3.3, false, 1.1);
    guitar(14, N.E * 2, 3.3, false, .6);
    bass(14, N.E, 3.2);
    kick(14, 1.3); tom(14, 60, 1.3); crash(14, 1.2, 3.4); crash(14.02, .8, 3.4);
    snare(14, 1);

    cache = ctx.startRendering ? new Promise(function (res, rej) {
      ctx.oncomplete = function (e) { res(e.renderedBuffer); };
      var p = ctx.startRendering();
      if (p && p.then) p.then(res, rej);
    }) : Promise.reject(new Error('no render'));
    cache.catch(function () { cache = null; });
    return cache;
  }

  /* ---------- 재생기 ---------- */
  var ac = null, src = null, gain = null, fileAudio = null, muted = false, playToken = 0;
  function ctxGet() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ac || ac.state === 'closed') { ac = new AC(); gain = ac.createGain(); gain.connect(ac.destination); }
    gain.gain.value = muted ? 0 : 1;
    return ac;
  }
  return {
    render: render,
    // 버튼을 누른 순간에 불러야 폰에서 소리가 나요
    unlock: function () { var c = ctxGet(); if (c && c.state === 'suspended') c.resume(); },
    prepare: function (fileUrl) {
      if (fileUrl) { fileAudio = new Audio(fileUrl); fileAudio.preload = 'auto'; fileAudio.muted = muted; return Promise.resolve(); }
      fileAudio = null;
      render().catch(function () {}); // 기다리지 않고 영상부터 시작 (준비되면 박자 맞춰 합류)
      return Promise.resolve();
    },
    // getElapsed: 영상이 지금 몇 초째인지 알려 주는 함수 (음악이 늦게 준비돼도 영상과 박자를 맞춰요)
    play: function (getElapsed) {
      this.stop();
      var token = ++playToken;
      if (fileAudio) { fileAudio.currentTime = 0; fileAudio.play().catch(function () {}); return; }
      var c = ctxGet(); if (!c) return;
      render().then(function (buf) {
        if (token !== playToken) return;
        if (c.state === 'suspended') c.resume();
        var off = getElapsed ? Math.max(0, getElapsed()) : 0;
        if (off >= buf.duration) return;
        src = c.createBufferSource(); src.buffer = buf; src.connect(gain); src.start(0, off);
      }, function () {});
    },
    pause: function () { if (fileAudio) fileAudio.pause(); else if (ac) ac.suspend(); },
    resume: function () { if (fileAudio) fileAudio.play().catch(function () {}); else if (ac) ac.resume(); },
    stop: function () {
      playToken++;
      if (src) { try { src.stop(); } catch (e) {} src.disconnect(); src = null; }
      if (fileAudio) fileAudio.pause();
      if (ac && ac.state === 'suspended') ac.resume();
    },
    setMuted: function (m) { muted = m; if (gain) gain.gain.value = m ? 0 : 1; if (fileAudio) fileAudio.muted = m; },
    isMuted: function () { return muted; }
  };
})();
