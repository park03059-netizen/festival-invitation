/* 운영진 화면 (admin.html) */
(function () {
  'use strict';
  var C = window.FESTIVAL;
  var root = document.getElementById('admin');
  var LABEL = { yes: '참석', no: '불참', maybe: '미정' };
  var data = null, query = '';

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v); else n.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) { if (c != null) n.append(c.nodeType ? c : String(c)); });
    return n;
  }
  function toast(m) {
    var t = document.getElementById('toast'); t.textContent = m; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  var session = { get: function () { try { return sessionStorage.getItem('adm'); } catch (e) { return null; } },
    set: function (v) { try { v ? sessionStorage.setItem('adm', v) : sessionStorage.removeItem('adm'); } catch (e) {} } };

  function api(action, body) {
    return fetch(C.apiUrl, { method: 'POST', body: JSON.stringify(Object.assign({ action: action, session: session.get() }, body || {})) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok) { if (/로그인/.test(j.error || '')) { session.set(null); login(); } throw new Error(j.error); }
        return j;
      });
  }

  function head(sub) {
    return el('div', { class: 'page-head' }, [el('h1', { text: '🔐 운영진 화면' }), el('p', { text: sub })]);
  }

  /* 로그인 */
  function login(msg) {
    root.textContent = '';
    root.append(head(C.name));
    if (!C.apiUrl) {
      root.append(el('div', { class: 'banner warn', text: '아직 응답 저장소(구글 시트)가 연결되지 않았어요. 설정안내.md 1번을 먼저 해 주세요. (임시)' }));
      return;
    }
    var pw = el('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: '운영진 비밀번호' });
    var err = el('div', { class: 'err', role: 'alert', text: msg || '' });
    var btn = el('button', { class: 'btn', type: 'submit', text: '로그인' });
    var form = el('form', { class: 'card', style: 'margin-top:16px' }, [
      el('label', { class: 'field', style: 'display:block' }, [el('span', { text: '비밀번호' }), pw]), err,
      el('div', { style: 'margin-top:16px' }, [btn])
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); btn.disabled = true; err.textContent = '';
      api('adminLogin', { password: pw.value }).then(function (j) { session.set(j.session); load(); })
        .catch(function (e) { err.textContent = e.message; btn.disabled = false; });
    });
    root.append(form);
    pw.focus();
  }

  function load() {
    root.textContent = ''; root.append(head('불러오는 중…'));
    api('adminData').then(function (j) { data = j; render(); }).catch(function (e) { if (session.get()) toast(e.message); });
  }

  /* 대시보드 */
  function render() {
    var rows = data.rows;
    var cnt = { yes: 0, no: 0, maybe: 0 }, total = 0, perDay = {};
    data.days.forEach(function (d) { perDay[d] = 0; });
    rows.forEach(function (r) {
      cnt[r.status]++;
      if (r.status === 'yes') {
        total += 1 + r.guests;
        r.days.split(', ').forEach(function (d) { if (d in perDay) perDay[d] += 1 + r.guests; });
      }
    });

    root.textContent = '';
    root.append(head('응답 ' + rows.length + '건 · ' + new Date().toLocaleString('ko-KR')));

    var stats = el('div', { class: 'stats', style: 'margin-top:12px' }, [
      stat('yes', cnt.yes, '참석'), stat('no', cnt.no, '불참'), stat('maybe', cnt.maybe, '미정'),
      el('div', { class: 'stat wide' }, [el('b', { text: total + '명' }), el('span', { text: '동반 포함 총 참석 예상 인원' })])
    ]);
    var dayStats = el('div', { class: 'stats', style: 'margin-top:8px;grid-template-columns:repeat(' + data.days.length + ',1fr)' });
    data.days.forEach(function (d) {
      dayStats.append(el('div', { class: 'stat' }, [el('b', { text: perDay[d] + '명' }), el('span', { text: d + ' 예상 인원' })]));
    });
    root.append(stats, dayStats);

    root.append(el('div', { class: 'btn-row', style: 'margin-top:12px' }, [
      el('button', { class: 'btn', type: 'button', text: '📥 엑셀 내려받기', onclick: downloadCsv }),
      el('button', { class: 'btn secondary', type: 'button', text: '🔄 새로고침', onclick: load })
    ]));

    // 이름 검색 + 목록
    var search = el('input', { class: 'input', type: 'search', placeholder: '🔍 이름으로 찾기', style: 'margin-top:16px' });
    search.value = query;
    var list = el('div', { class: 'rows' });
    function draw() {
      list.textContent = '';
      var q = query.trim();
      var shown = rows.filter(function (r) { return !q || r.name.indexOf(q) > -1; })
        .sort(function (a, b) { return a.last < b.last ? 1 : -1; });
      if (!shown.length) list.append(el('div', { class: 'row', text: q ? '찾는 이름이 없어요.' : '아직 응답이 없어요.' }));
      shown.forEach(function (r) {
        list.append(el('div', { class: 'row' }, [
          el('div', { class: 'top' }, [el('span', { text: r.name }), el('span', { class: 'pill ' + r.status, text: LABEL[r.status] })]),
          el('div', { class: 'meta', text: [r.status === 'yes' ? '참석일 ' + r.days + ' · 동반 ' + r.guests + '명' : '', r.phone ? '☎ ' + r.phone : '', '수정 ' + r.last].filter(Boolean).join(' · ') }),
          r.message ? el('div', { text: '💬 ' + r.message, style: 'margin-top:4px' }) : null
        ]));
      });
    }
    search.addEventListener('input', function () { query = search.value; draw(); });
    draw();
    root.append(el('h2', { class: 'sec-title', text: '📋 응답 목록' }), search, list);

    renderSettings();

    root.append(el('h2', { class: 'sec-title', text: '🗑️ 연락처 삭제' }), el('div', { class: 'card' }, [
      el('p', { style: 'margin-top:0', text: '연락처는 ' + data.purgeDate + '(축제 종료 30일 후)에 자동으로 지워져요. 지금 바로 지우려면 아래 버튼을 누르세요. 이름·응답은 남고 연락처만 지워지며, 되돌릴 수 없어요.' }),
      el('button', { class: 'btn ghost', type: 'button', text: '모든 연락처 지금 삭제', onclick: function () {
        if (!confirm('모든 연락처를 삭제할까요? 되돌릴 수 없어요.')) return;
        api('adminPurge').then(function (j) { toast('연락처 ' + j.cleared + '개를 삭제했어요'); load(); }).catch(function (e) { toast(e.message); });
      } })
    ]));
    root.append(el('div', { style: 'margin:24px 0' }, [el('button', { class: 'btn ghost', type: 'button', text: '로그아웃', onclick: function () { session.set(null); login(); } })]));
  }
  function stat(cls, n, label) { return el('div', { class: 'stat ' + cls }, [el('b', { text: n }), el('span', { text: label })]); }

  /* 설정 바꾸기 */
  function toLocal(iso) { // "2026-10-24T23:59:59+09:00" → 입력 칸용 "2026-10-24T23:59"
    var t = Date.parse(iso); if (isNaN(t)) return '';
    return new Date(t + 9 * 3600000).toISOString().slice(0, 16);
  }
  function renderSettings() {
    var s = data.settings;
    var notice = el('textarea', { class: 'input', maxlength: 300 }); notice.value = s.notice || '';
    var deadline = el('input', { class: 'input', type: 'datetime-local' }); deadline.value = toLocal(s.rsvpDeadline);
    var reveal = el('input', { class: 'input', type: 'datetime-local' }); reveal.value = toLocal(s.artistRevealDate);
    var btn = el('button', { class: 'btn', type: 'submit', text: '설정 저장', style: 'margin-top:16px' });
    var form = el('form', { class: 'card form-card' }, [
      el('label', { class: 'field', style: 'margin-top:0' }, [el('span', { text: '📢 공지 문구' }), notice]),
      el('label', { class: 'field' }, [el('span', { text: '⏰ 참석 응답 마감 (한국 시간)' }), deadline]),
      el('label', { class: 'field' }, [el('span', { text: '🎤 아티스트 공개일 (한국 시간)' }), reveal]),
      btn
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); btn.disabled = true;
      function iso(v) { return v ? v + ':00+09:00' : null; }
      api('adminSettings', { settings: { notice: notice.value, rsvpDeadline: iso(deadline.value), artistRevealDate: iso(reveal.value) } })
        .then(function (j) { data.settings = j.settings; toast('저장했어요. 초청장에 바로 반영돼요'); })
        .catch(function (e) { toast(e.message); })
        .then(function () { btn.disabled = false; });
    });
    root.append(el('h2', { class: 'sec-title', text: '⚙️ 초청장 설정' }), form);
  }

  /* 엑셀(CSV) 내려받기 — 맨 앞에 BOM을 넣어 엑셀에서 한글이 깨지지 않아요 */
  function downloadCsv() {
    var head = ['이름', '응답', '참석일', '동반 인원', '연락처(가림)', '개인정보 동의', '남길 말', '처음 응답', '마지막 수정', '수정 횟수'];
    function cell(v) {
      var s = String(v == null ? '' : v);
      if (/^[=+\-@]/.test(s)) s = "'" + s; // 엑셀에서 수식으로 실행되지 않게
      return '"' + s.replace(/"/g, '""') + '"';
    }
    var lines = [head.map(cell).join(',')].concat(data.rows.map(function (r) {
      return [r.name, LABEL[r.status], r.days, r.guests, r.phone, r.consent ? '동의' : '', r.message, r.first, r.last, r.edits].map(cell).join(',');
    }));
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = el('a', { href: URL.createObjectURL(blob), download: '축제_참석응답_' + new Date().toISOString().slice(0, 10) + '.csv' });
    document.body.append(a); a.click(); a.remove();
  }

  if (session.get() && C.apiUrl) load(); else login();
})();
