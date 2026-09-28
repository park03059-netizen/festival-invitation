/**
 * 🍁 축제 초청장 — 참석 응답 저장 프로그램 (구글 앱스 스크립트)
 *
 * 이 코드는 구글 시트의 [확장 프로그램 → Apps Script]에 붙여 넣어 사용합니다.
 * 설치 방법은 설정안내.md 1번을 보세요.
 *
 * 운영진 비밀번호는 코드에 적지 않고
 * [프로젝트 설정 → 스크립트 속성]에 ADMIN_PASSWORD 라는 이름으로 넣습니다.
 */

// ---- 바꿀 수 있는 값 ----
var FESTIVAL_END = '2026-10-28T23:59:59+09:00'; // 축제 끝나는 날 (연락처 자동 삭제 기준)
var PURGE_AFTER_DAYS = 30;                       // 축제 끝나고 며칠 뒤 연락처를 지울지
var ALLOWED_DAYS = ['10/27', '10/28'];           // 참석일 선택지 (config.js 의 days.id 와 같아야 해요)
var DEFAULTS = {
  notice: '초청장을 받으신 모든 분을 환영합니다. 자세한 공지는 추후 안내드립니다. (임시)',
  rsvpDeadline: '2026-10-24T23:59:59+09:00',
  artistRevealDate: '2026-10-13T12:00:00+09:00'
};

// ---- 여기부터는 고치지 않아도 돼요 ----
var SHEET_RESP = '응답';
var SHEET_SET = '설정';
var HEAD = ['처음 응답', '마지막 수정', '응답', '이름', '연락처', '개인정보 동의', '동반 인원', '참석일', '남길 말', '수정 횟수', '기기 키(암호화)'];
var COL = { first: 0, last: 1, status: 2, name: 3, phone: 4, consent: 5, guests: 6, days: 7, message: 8, edits: 9, key: 10 };
var LABEL = { yes: '참석', no: '불참', maybe: '미정' };
var CODE = { '참석': 'yes', '불참': 'no', '미정': 'maybe' };
var SET_DESC = {
  notice: '첫 화면 공지 문구',
  rsvpDeadline: '참석 응답 마감 (예: 2026-10-24T23:59:59+09:00)',
  artistRevealDate: '아티스트 공개일 (예: 2026-10-13T12:00:00+09:00)'
};

/** 처음 한 번 실행: 시트 만들기 + 연락처 자동 삭제 예약 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var r = ss.getSheetByName(SHEET_RESP) || ss.insertSheet(SHEET_RESP);
  if (r.getLastRow() === 0) {
    r.appendRow(HEAD);
    r.setFrozenRows(1);
    r.getRange(1, 1, 1, HEAD.length).setFontWeight('bold').setBackground('#fde7c8');
    r.getRange('E:E').setNumberFormat('@'); // 연락처 앞자리 0이 사라지지 않게
  }
  var s = ss.getSheetByName(SHEET_SET) || ss.insertSheet(SHEET_SET);
  if (s.getLastRow() === 0) {
    s.appendRow(['항목', '값', '설명']);
    s.getRange('B:B').setNumberFormat('@');
    Object.keys(DEFAULTS).forEach(function (k) { s.appendRow([k, DEFAULTS[k], SET_DESC[k]]); });
    s.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#d6f0ee');
  }
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'autoPurgeContacts') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('autoPurgeContacts').timeBased().everyDays(1).atHour(4).create();
  var pw = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  Logger.log(pw ? '✅ 준비 완료! 이제 [배포]를 해 주세요.' : '⚠️ 준비 완료. 스크립트 속성에 ADMIN_PASSWORD 를 꼭 넣어 주세요.');
}

function doGet() { return out({ ok: true, message: '축제 초청장 응답 저장소가 작동 중이에요.' }); }

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: '잘못된 요청이에요.' }); }
  try {
    switch (req.action) {
      case 'config': return out({ ok: true, settings: getSettings() });
      case 'get': return out(getMine(req));
      case 'submit': return out(submit(req));
      case 'adminLogin': return out(adminLogin(req));
      case 'adminData': return out(adminData(req));
      case 'adminSettings': return out(adminSettings(req));
      case 'adminPurge': return out(adminPurge(req));
      default: return out({ ok: false, error: '알 수 없는 요청이에요.' });
    }
  } catch (err) {
    return out({ ok: false, error: err && err.userMessage ? err.userMessage : '저장소에서 오류가 났어요. 잠시 후 다시 시도해 주세요.' });
  }
}

/* ---------------- 참석자용 ---------------- */
function getMine(req) {
  var key = keyOf(req.token);
  var found = findRow(key);
  return { ok: true, response: found ? toPublic(found.row) : null };
}

function submit(req) {
  var cache = CacheService.getScriptCache();
  var settings = getSettings();
  if (Date.now() > Date.parse(settings.rsvpDeadline)) fail('응답이 마감되었어요.');

  // 장난 방지 1: 사람 눈에 안 보이는 칸이 채워져 있으면 로봇 → 저장하지 않고 성공처럼 응답
  if (req.website) return { ok: true, response: null };
  // 장난 방지 2: 화면을 연 지 3초도 안 돼 제출하면 거절
  if (!(Number(req.elapsed) >= 3000)) fail('조금만 천천히 다시 눌러 주세요.');

  var key = keyOf(req.token);
  // 장난 방지 3: 같은 폰에서 10초 안에 또 제출하면 거절
  if (cache.get('rl_' + key)) fail('방금 보냈어요. 10초 뒤에 다시 시도해 주세요.');
  // 장난 방지 4: 전체적으로 1분에 60건 넘게 몰리면 잠시 막기
  var minute = 'g_' + Math.floor(Date.now() / 60000);
  var g = Number(cache.get(minute) || 0);
  if (g >= 60) fail('지금 응답이 몰려 있어요. 1분 뒤 다시 시도해 주세요.');
  cache.put(minute, String(g + 1), 120);

  // 입력값 검사
  var status = String(req.status);
  if (!LABEL[status]) fail('참석 여부를 골라 주세요.');
  var name = clean(req.name, 20);
  if (!name) fail('이름을 적어 주세요.');
  var phone = String(req.phone || '').replace(/\D/g, '');
  if (phone && !/^01\d{8,9}$/.test(phone)) fail('휴대폰 번호를 다시 확인해 주세요.');
  var consent = req.consent === true;
  if (phone && !consent) fail('연락처를 적으셨다면 개인정보 동의가 필요해요.');
  var guests = status === 'yes' ? Math.floor(Number(req.guests)) : 0;
  if (!(guests >= 0 && guests <= 5)) fail('동반 인원은 0~5명이에요.');
  var days = status === 'yes' && Array.isArray(req.days) ? req.days.filter(function (d) { return ALLOWED_DAYS.indexOf(d) > -1; }) : [];
  if (status === 'yes' && !days.length) fail('참석할 날짜를 골라 주세요.');
  var message = clean(req.message, 200);

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet(SHEET_RESP);
    var found = findRow(key);
    var nowText = kst(new Date());
    var edits = found ? Number(found.row[COL.edits] || 0) + 1 : 0;
    if (edits > 30) fail('수정 횟수가 너무 많아요. 운영진에게 문의해 주세요.');
    var row = [
      found ? found.row[COL.first] : nowText, nowText, LABEL[status], safe(name),
      phone ? formatPhone(phone) : '', phone ? '동의' : '', guests, days.join(', '), safe(message), edits, key
    ];
    if (found) sh.getRange(found.index, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);
    cache.put('rl_' + key, '1', 10);
    return { ok: true, response: toPublic(row) };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- 운영진용 ---------------- */
function adminLogin(req) {
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('admin_fail') || 0);
  if (fails >= 10) fail('비밀번호를 여러 번 틀려 15분 동안 잠겼어요.');
  var pw = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!pw) fail('스크립트 속성에 ADMIN_PASSWORD 가 없어요. 설정안내.md 를 확인하세요.');
  if (String(req.password || '') !== pw) {
    cache.put('admin_fail', String(fails + 1), 900);
    Utilities.sleep(800);
    fail('비밀번호가 맞지 않아요.');
  }
  var session = Utilities.getUuid() + Utilities.getUuid();
  cache.put('adm_' + session, '1', 21600); // 6시간 동안 로그인 유지
  return { ok: true, session: session };
}

function requireAdmin(req) {
  if (!req.session || !CacheService.getScriptCache().get('adm_' + req.session)) {
    var e = new Error('login'); e.userMessage = '로그인이 필요해요. 다시 로그인해 주세요.'; throw e;
  }
}

function adminData(req) {
  requireAdmin(req);
  var sh = sheet(SHEET_RESP);
  var values = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, HEAD.length).getValues() : [];
  var rows = values.filter(function (r) { return r[COL.key]; }).map(function (r) {
    return {
      first: String(r[COL.first]), last: String(r[COL.last]), status: CODE[r[COL.status]] || 'maybe',
      name: unsafe(r[COL.name]), phone: maskPhone(String(r[COL.phone] || '')), consent: r[COL.consent] === '동의',
      guests: Number(r[COL.guests] || 0), days: String(r[COL.days] || ''), message: unsafe(r[COL.message]),
      edits: Number(r[COL.edits] || 0)
    };
  });
  return { ok: true, rows: rows, settings: getSettings(), days: ALLOWED_DAYS, purgeDate: kst(purgeDate()) };
}

function adminSettings(req) {
  requireAdmin(req);
  var v = req.settings || {};
  var next = {};
  if (v.notice != null) next.notice = clean(v.notice, 300);
  ['rsvpDeadline', 'artistRevealDate'].forEach(function (k) {
    if (v[k] == null) return;
    if (isNaN(Date.parse(v[k]))) fail('날짜 모양이 올바르지 않아요.');
    next[k] = String(v[k]);
  });
  var sh = sheet(SHEET_SET);
  var data = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
  Object.keys(next).forEach(function (k) {
    var i = data.findIndex(function (r) { return r[0] === k; });
    if (i > -1) sh.getRange(i + 1, 2).setValue(next[k]);
    else sh.appendRow([k, next[k], SET_DESC[k] || '']);
  });
  return { ok: true, settings: getSettings() };
}

function adminPurge(req) {
  requireAdmin(req);
  return { ok: true, cleared: purgeContacts() };
}

/** 매일 새벽 4시에 자동 실행: 축제 종료 30일이 지나면 연락처를 지워요 */
function autoPurgeContacts() {
  if (Date.now() >= purgeDate().getTime()) purgeContacts();
}

function purgeContacts() {
  var sh = sheet(SHEET_RESP);
  var n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  var range = sh.getRange(2, COL.phone + 1, n, 2); // 연락처 + 동의 칸
  var vals = range.getValues();
  var count = vals.filter(function (r) { return r[0]; }).length;
  range.setValues(vals.map(function () { return ['', '']; }));
  return count;
}

/* ---------------- 도우미 ---------------- */
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function fail(msg) { var e = new Error(msg); e.userMessage = msg; throw e; }
function sheet(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) fail('시트가 없어요. setup 을 먼저 실행해 주세요.');
  return sh;
}
function getSettings() {
  var res = {};
  Object.keys(DEFAULTS).forEach(function (k) { res[k] = DEFAULTS[k]; });
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SET);
  if (!sh || sh.getLastRow() < 2) return res;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    if (!(r[0] in DEFAULTS)) return;
    var v = r[1];
    if (v instanceof Date) v = Utilities.formatDate(v, 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ss'+09:00'");
    if (r[0] === 'notice' || String(v)) res[r[0]] = String(v);
  });
  return res;
}
function keyOf(token) {
  if (!/^[a-f0-9]{32}$/.test(String(token || ''))) fail('잘못된 요청이에요.');
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'kmou-festival:' + token);
  return bytes.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function findRow(key) {
  var sh = sheet(SHEET_RESP);
  var n = sh.getLastRow() - 1;
  if (n < 1) return null;
  var values = sh.getRange(2, 1, n, HEAD.length).getValues();
  for (var i = 0; i < values.length; i++) if (values[i][COL.key] === key) return { index: i + 2, row: values[i] };
  return null;
}
function toPublic(r) {
  return {
    status: CODE[r[COL.status]] || 'maybe', name: unsafe(r[COL.name]),
    phone: String(r[COL.phone] || '').replace(/\D/g, ''), consent: r[COL.consent] === '동의',
    guests: Number(r[COL.guests] || 0),
    days: String(r[COL.days] || '').split(', ').filter(String), message: unsafe(r[COL.message])
  };
}
function clean(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }
// 시트에서 수식으로 실행되지 않게 = + - @ 로 시작하면 앞에 ' 를 붙여요
function safe(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; }
function unsafe(v) { return String(v == null ? '' : v); }
function formatPhone(p) { return p.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3'); }
function maskPhone(p) { return p ? p.replace(/^(\d{3})-?(\d{3,4})-?(\d{4})$/, '$1-****-$3') : ''; }
function kst(d) { return Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'); }
function purgeDate() { return new Date(Date.parse(FESTIVAL_END) + PURGE_AFTER_DAYS * 86400000); }
