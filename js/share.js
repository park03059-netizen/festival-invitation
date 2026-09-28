/* ⑤ 초청장 공유 */
(function () {
  'use strict';
  var A = window.App, C = A.C, el = A.el, $ = A.$;
  var page = $('#page-share');
  var OG_IMAGE = C.siteUrl + 'images/og-image.png';
  var toName = A.invitee || '';

  function link() { return C.siteUrl + (toName ? '?to=' + encodeURIComponent(toName) : ''); }
  function message() {
    return (toName ? toName + ' 님, ' : '') + C.name + '에 초대합니다!\n' + C.dateText + ' · ' + C.location.name + '\n' + link();
  }

  page.append(el('div', { class: 'page-head' }, [el('h1', { text: '🔗 초청장 공유' }), el('p', { text: '친구에게 초청장을 보내 보세요' })]));

  // 초청장 카드 미리보기 (사진으로 저장되는 부분)
  var toLine = el('p', { class: 'ic-to' });
  var card = el('div', { class: 'invite-card', id: 'inviteCard' }, [
    el('span', { class: 'ic-leaf a', text: '🍁', 'aria-hidden': 'true' }),
    el('span', { class: 'ic-leaf b', text: '🍂', 'aria-hidden': 'true' }),
    el('p', { class: 'ic-school', text: C.school }),
    toLine,
    el('h3', { text: C.name }),
    el('p', { class: 'ic-date', text: C.dateText }),
    el('p', { class: 'ic-place', text: C.location.address }),
    el('svg', { class: 'ic-wave', html: '' })
  ]);
  // 카드 아래 물결 그림
  card.lastChild.outerHTML = '<svg class="ic-wave" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 20 Q50 5 100 20 T200 20 T300 20 T400 20 V40 H0Z" fill="#f08a24" opacity=".9"/></svg>';
  page.append(card);

  // 개인 초대 링크 만들기
  var nameInput = el('input', { class: 'input', type: 'text', maxlength: 20, placeholder: '예: 홍길동 (비워 두면 이름 없이)', autocomplete: 'off' });
  nameInput.value = toName;
  var linkBox = el('div', { class: 'linkbox' });
  nameInput.addEventListener('input', function () { toName = A.cleanName(nameInput.value); update(); });
  function update() {
    toLine.textContent = '';
    if (toName) toLine.append(el('b', { text: toName }), ' 님을 초대합니다');
    else toLine.textContent = '당신을 초대합니다';
    linkBox.textContent = link();
  }
  update();

  page.append(el('div', { class: 'card', style: 'margin-top:16px' }, [
    el('label', { class: 'field', style: 'display:block' }, [el('span', { text: '초대할 사람 이름' }), nameInput]),
    el('p', { style: 'margin:8px 0 0;color:var(--muted);font-size:14px', text: '이름을 넣으면 받는 사람 화면에 "○○○ 님을 초대합니다"가 떠요.' }),
    linkBox
  ]));

  var btns = el('div', { class: 'btn-col', style: 'margin-top:16px' }, [
    el('button', { type: 'button', class: 'btn kakao', text: '💬 카카오톡으로 보내기', onclick: kakao }),
    el('div', { class: 'btn-row' }, [
      el('button', { type: 'button', class: 'btn secondary', text: '🔗 링크 복사', onclick: function () { A.copyText(link(), '링크를 복사했어요 📋'); } }),
      el('button', { type: 'button', class: 'btn secondary', text: '📤 다른 앱 공유', onclick: nativeShare })
    ]),
    el('button', { type: 'button', class: 'btn ghost', text: '🖼️ 초청장 카드 사진으로 저장', onclick: saveImage })
  ]);
  page.append(btns);

  /* 카카오톡 보내기 */
  var kakaoReady = null;
  function kakao() {
    if (!C.kakaoAppKey) {
      A.copyText(message(), '카톡 버튼 준비 중(임시)이라 링크를 복사했어요. 카톡에 붙여 넣어 주세요');
      return;
    }
    kakaoReady = kakaoReady || A.loadScript('https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js')
      .then(function () { if (!Kakao.isInitialized()) Kakao.init(C.kakaoAppKey); });
    kakaoReady.then(function () {
      var url = link();
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: (toName ? toName + ' 님을 초대합니다 · ' : '') + C.name,
          description: C.dateText + ' · ' + C.location.name,
          imageUrl: OG_IMAGE, imageWidth: 1200, imageHeight: 630,
          link: { mobileWebUrl: url, webUrl: url }
        },
        buttons: [{ title: '초청장 열기', link: { mobileWebUrl: url, webUrl: url } }]
      });
    }).catch(function () {
      kakaoReady = null;
      A.copyText(message(), '카톡을 열지 못해 링크를 복사했어요');
    });
  }

  /* 폰 기본 공유 */
  function nativeShare() {
    if (navigator.share) {
      navigator.share({ title: C.name, text: (toName ? toName + ' 님, ' : '') + C.name + '에 초대합니다!', url: link() }).catch(function () {});
    } else A.copyText(message(), '공유 기능이 없는 화면이라 링크를 복사했어요');
  }

  /* 카드를 사진으로 저장 */
  var h2c = null;
  function saveImage() {
    var btn = this; btn.disabled = true; var old = btn.textContent; btn.textContent = '사진 만드는 중…';
    h2c = h2c || A.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    h2c.then(function () {
      return window.html2canvas(card, { scale: 2, backgroundColor: '#0f2a4a', logging: false });
    }).then(function (canvas) {
      var url = canvas.toDataURL('image/png');
      var fname = '초청장' + (toName ? '_' + toName : '') + '.png';
      var ov = el('div', { class: 'overlay', role: 'dialog', 'aria-label': '초청장 사진' }, [
        el('img', { src: url, alt: '초청장 카드 사진' }),
        el('p', { text: '사진을 길게 눌러 "사진 저장"을 누르세요' }),
        el('div', { class: 'btn-col' }, [
          el('a', { class: 'btn', href: url, download: fname, text: '⬇️ 파일로 내려받기' }),
          el('button', { type: 'button', class: 'btn ghost', text: '닫기', onclick: function () { ov.remove(); } })
        ])
      ]);
      document.body.append(ov);
    }).catch(function () {
      h2c = null; A.toast('사진을 만들지 못했어요. 화면 캡처로 저장해 주세요');
    }).then(function () { btn.disabled = false; btn.textContent = old; });
  }
})();
