/* ④ 참석 여부 */
(function () {
  'use strict';
  var A = window.App, C = A.C, S = A.S, el = A.el, $ = A.$;
  var page = $('#page-rsvp');
  var STATUS = [
    { v: 'yes', icon: '🙆', text: '참석합니다' },
    { v: 'no', icon: '🙅', text: '불참합니다' },
    { v: 'maybe', icon: '🤔', text: '아직 모르겠습니다' }
  ];
  var LABEL = { yes: '참석', no: '불참', maybe: '미정' };
  var PURGE_TEXT = (function () {
    var d = new Date(Date.parse(C.end) + 30 * 86400000);
    return A.fmtKst(d.getTime(), false).replace(/\(.\)/, '');
  })();

  // 이 폰을 알아보는 무작위 열쇠 (서버에는 암호화된 값만 저장돼요)
  function token() {
    var t = A.store.get('rsvp_token');
    if (!t || !/^[a-f0-9]{32}$/.test(t)) {
      var b = new Uint8Array(16); crypto.getRandomValues(b);
      t = Array.from(b, function (x) { return x.toString(16).padStart(2, '0'); }).join('');
      A.store.set('rsvp_token', t);
    }
    return t;
  }
  var state = { data: null, openedAt: Date.now() };

  function head() {
    return el('div', { class: 'page-head' }, [el('h1', { text: '✉️ 참석 여부' }),
      el('p', { text: '마감: ' + A.fmtKst(Date.parse(S.rsvpDeadline), true) })]);
  }
  function closed() { return A.now() > Date.parse(S.rsvpDeadline); }

  function render(view) {
    page.textContent = '';
    page.append(head());
    if (view === 'loading') page.append(el('div', { class: 'banner', text: '내 응답을 확인하고 있어요…' }));
    else if (view === 'done') renderDone();
    else if (closed()) {
      page.append(el('div', { class: 'card done' }, [el('div', { class: 'big', text: '⏰' }),
        el('h2', { text: '응답이 마감되었어요' }),
        el('p', { text: state.data ? '보내 주신 응답(' + LABEL[state.data.status] + ')은 잘 저장되어 있어요.' : '관심 가져 주셔서 감사합니다. 축제 현장에서 만나요!' })]));
    } else renderForm();
  }

  function renderForm() {
    var d = state.data || { status: '', name: A.invitee || '', phone: '', consent: false, guests: 0, days: [], message: '' };
    var f = { status: d.status, guests: d.guests };

    if (!C.apiUrl) page.append(el('div', { class: 'banner warn' }, ['응답 저장소를 연결하는 중이에요. 지금은 제출이 되지 않아요. ', A.tempBadge()]));
    if (state.data) page.append(el('div', { class: 'banner', text: '이미 응답하셨어요. 고친 뒤 다시 보내면 수정돼요.' }));

    var form = el('form', { class: 'card form-card', novalidate: true, style: 'margin-top:16px' });

    // 1) 참석 여부 버튼 3개
    var choice = el('div', { class: 'choice3', role: 'radiogroup', 'aria-label': '참석 여부' });
    STATUS.forEach(function (s) {
      choice.append(el('button', { type: 'button', role: 'radio', 'aria-checked': String(f.status === s.v), onclick: function () {
        f.status = s.v;
        Array.prototype.forEach.call(choice.children, function (b) { b.setAttribute('aria-checked', String(b === this)); }, this);
        sync();
      } }, [el('span', { text: s.icon }), s.text]));
    });
    form.append(el('div', { class: 'field' }, [el('span', null, ['참석하시나요?', el('em', { text: '필수' })]), choice]), errBox('status'));

    // 2) 이름
    var name = el('input', { class: 'input', type: 'text', name: 'name', maxlength: 20, autocomplete: 'name', placeholder: '예: 홍길동', required: true });
    name.value = d.name;
    form.append(el('label', { class: 'field' }, [el('span', null, ['이름', el('em', { text: '필수' })]), name]), errBox('name'));

    // 3) 연락처 (선택) + 개인정보 동의
    var phone = el('input', { class: 'input', type: 'tel', name: 'phone', inputmode: 'numeric', maxlength: 13, autocomplete: 'tel', placeholder: '010-0000-0000' });
    phone.value = d.phone || '';
    phone.addEventListener('input', function () {
      var n = phone.value.replace(/\D/g, '').slice(0, 11);
      phone.value = n.length < 4 ? n : n.length < 8 ? n.slice(0, 3) + '-' + n.slice(3) : n.slice(0, 3) + '-' + n.slice(3, n.length - 4) + '-' + n.slice(-4);
      sync();
    });
    var consent = el('input', { type: 'checkbox', name: 'consent' });
    consent.checked = !!d.consent;
    var consentBox = el('div', { class: 'consent' }, [
      el('strong', { text: '개인정보 수집·이용 동의 (연락처를 적으면 필수)' }),
      el('ul', null, [
        el('li', { text: '수집 항목: 연락처' }),
        el('li', { text: '이용 목적: 축제 관련 안내 연락' }),
        el('li', { text: '보관 기간: 축제 종료 30일 후(' + PURGE_TEXT + ') 삭제' }),
        el('li', { text: '동의하지 않으면 연락처 없이 응답할 수 있어요.' })
      ]),
      el('label', { class: 'check' }, [consent, '위 내용에 동의합니다'])
    ]);
    form.append(el('label', { class: 'field' }, [el('span', null, ['연락처 ', el('small', { text: '(선택)' })]), phone]), consentBox, errBox('phone'));

    // 4) 참석일, 동반 인원 (참석할 때만)
    var dayBox = el('div', { class: 'checks' });
    C.days.forEach(function (day) {
      var cb = el('input', { type: 'checkbox', name: 'days', value: day.id });
      cb.checked = (d.days || []).indexOf(day.id) > -1;
      dayBox.append(el('label', { class: 'check' }, [cb, day.title + ' · ' + day.label]));
    });
    var out = el('output', { text: f.guests + '명' });
    function step(n) { f.guests = Math.max(0, Math.min(5, f.guests + n)); out.textContent = f.guests + '명'; }
    var yesPart = el('div', null, [
      el('div', { class: 'field', style: 'margin-top:18px' }, [el('span', null, ['참석할 날짜', el('em', { text: '필수' })]), dayBox]), errBox('days'),
      el('div', { class: 'field', style: 'margin-top:18px' }, [el('span', null, ['함께 오는 사람 ', el('small', { text: '(본인 제외, 0~5명)' })]),
        el('div', { class: 'stepper' }, [
          el('button', { type: 'button', 'aria-label': '한 명 빼기', text: '－', onclick: function () { step(-1); } }), out,
          el('button', { type: 'button', 'aria-label': '한 명 더하기', text: '＋', onclick: function () { step(1); } })
        ])])
    ]);
    form.append(yesPart);

    // 5) 남길 말
    var msg = el('textarea', { class: 'input', name: 'message', maxlength: 200, placeholder: '축하 인사나 궁금한 점 (200자까지)' });
    msg.value = d.message || '';
    form.append(el('label', { class: 'field' }, [el('span', null, ['남길 말 ', el('small', { text: '(선택)' })]), msg]));

    // 장난 방지용 숨은 칸 (사람에게는 안 보여요)
    var hp = el('input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off' });
    form.append(el('div', { class: 'hp', 'aria-hidden': 'true' }, [hp]));

    var submit = el('button', { type: 'submit', class: 'btn', style: 'margin-top:22px', text: state.data ? '수정해서 보내기' : '응답 보내기' });
    form.append(submit, errBox('form'));
    page.append(form);

    function sync() {
      consentBox.hidden = !phone.value.trim();
      yesPart.hidden = f.status !== 'yes';
    }
    sync();

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      form.querySelectorAll('.err').forEach(function (e) { e.textContent = ''; });
      var days = Array.prototype.filter.call(form.querySelectorAll('input[name=days]'), function (c) { return c.checked; }).map(function (c) { return c.value; });
      var digits = phone.value.replace(/\D/g, '');
      var bad = null;
      function fail(k, m) { $('[data-err=' + k + ']', form).textContent = m; bad = bad || k; }
      if (!f.status) fail('status', '참석 여부를 골라 주세요.');
      if (!name.value.trim()) fail('name', '이름을 적어 주세요.');
      if (digits && !/^01\d{8,9}$/.test(digits)) fail('phone', '휴대폰 번호를 다시 확인해 주세요.');
      else if (digits && !consent.checked) fail('phone', '연락처를 적으셨다면 개인정보 동의가 필요해요.');
      if (f.status === 'yes' && !days.length) fail('days', '참석할 날짜를 하나 이상 골라 주세요.');
      if (bad) { var t = $('[data-err=' + bad + ']', form); t.scrollIntoView({ block: 'center' }); return; }
      if (!C.apiUrl) { fail('form', '아직 응답 저장소가 연결되지 않아 보낼 수 없어요. (임시)'); return; }
      if (closed()) { render(); return; }

      var body = {
        token: token(), status: f.status, name: name.value.trim(), phone: digits, consent: !!(digits && consent.checked),
        guests: f.status === 'yes' ? f.guests : 0, days: f.status === 'yes' ? days : [], message: msg.value.trim(),
        website: hp.value, elapsed: Date.now() - state.openedAt
      };
      submit.disabled = true; submit.textContent = '보내는 중…';
      A.api('submit', body).then(function (j) {
        state.data = j.response; render('done'); window.scrollTo(0, 0);
      }).catch(function (e) {
        fail('form', e.message || '보내지 못했어요. 잠시 후 다시 시도해 주세요.');
        submit.disabled = false; submit.textContent = state.data ? '수정해서 보내기' : '응답 보내기';
      });
    });
  }
  function errBox(k) { return el('div', { class: 'err', 'data-err': k, role: 'alert' }); }

  function renderDone() {
    var d = state.data;
    var icon = d.status === 'yes' ? '🎉' : d.status === 'no' ? '🍂' : '🤔';
    var title = d.status === 'yes' ? '참석 응답 고마워요!' : d.status === 'no' ? '응답 고마워요' : '천천히 정해 주세요';
    var dl = el('dl', { class: 'summary' });
    function row(k, v) { dl.append(el('div', null, [el('dt', { text: k }), el('dd', { text: v })])); }
    row('이름', d.name); row('응답', LABEL[d.status]);
    if (d.status === 'yes') { row('참석일', (d.days || []).join(', ')); row('동반 인원', d.guests + '명'); }
    if (d.phone) row('연락처', d.phone.replace(/^(\d{3})\d+(\d{4})$/, '$1-****-$2'));

    var card = el('div', { class: 'card done', style: 'margin-top:16px' }, [
      el('div', { class: 'big', text: icon }), el('h2', { text: title }),
      el('p', { text: '응답이 안전하게 저장되었어요. 이 폰으로 다시 오면 수정할 수 있어요.' }), dl
    ]);
    var btns = el('div', { class: 'btn-col' });
    if (d.status !== 'no') {
      btns.append(
        el('a', { class: 'btn', href: googleCal(), target: '_blank', rel: 'noopener', text: '📅 내 달력에 추가 (구글)' }),
        el('button', { type: 'button', class: 'btn secondary', text: '📅 내 달력에 추가 (아이폰·기타)', onclick: downloadIcs })
      );
    }
    if (!closed()) btns.append(el('button', { type: 'button', class: 'btn ghost', text: '✏️ 응답 수정하기', onclick: function () { state.openedAt = Date.now(); render('form'); } }));
    card.append(btns);
    page.append(card);
  }

  /* 달력에 추가 */
  function stamp(ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function googleCal() {
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(C.name) +
      '&dates=' + stamp(Date.parse(C.start)) + '/' + stamp(Date.parse(C.end)) +
      '&location=' + encodeURIComponent(C.location.name + ', ' + C.location.address) +
      '&details=' + encodeURIComponent('초청장: ' + C.siteUrl);
  }
  function downloadIcs() {
    function esc(s) { return String(s).replace(/([,;\\])/g, '\\$1'); }
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KMOU Festival//KO', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:festival-2026@kmou-invite', 'DTSTAMP:' + stamp(Date.now()),
      'DTSTART:' + stamp(Date.parse(C.start)), 'DTEND:' + stamp(Date.parse(C.end)),
      'SUMMARY:' + esc(C.name), 'LOCATION:' + esc(C.location.name + ', ' + C.location.address),
      'DESCRIPTION:' + esc('초청장: ' + C.siteUrl),
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc('내일은 ' + C.name + '!'), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    var a = el('a', { href: url, download: 'festival-2026.ics' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    A.toast('카톡 안에서 안 되면 오른쪽 위 메뉴 → 다른 브라우저로 열기');
  }

  /* 시작: 이 폰으로 이미 응답했는지 확인 */
  render('loading');
  A.settingsReady.then(function () {
    var t = A.store.get('rsvp_token');
    if (!C.apiUrl || !t) { render(); return; }
    A.api('get', { token: t }).then(function (j) {
      state.data = j.response || null;
      render(state.data ? 'done' : undefined);
    }).catch(function () { render(); });
  });
})();
