const $ = s => document.querySelector(s);
const app = $('#app');
app.addEventListener('scroll', () => { app.scrollLeft = 0; app.scrollTop = 0; }); // clip 미지원 브라우저용

// 화면 맞춤: 폰은 가로를 꽉 채우고, 넓은 화면은 높이에 맞춘 세로 기둥으로
function fit() {
  const vv = window.visualViewport || { width: innerWidth, height: innerHeight };
  const z = (innerWidth < 600 ? innerWidth / 402 : Math.min(1, innerHeight / 874)) * (window.bigScale || 1); // 큰 글씨 모드면 더 확대
  document.documentElement.style.setProperty('--z', z);
  document.documentElement.style.setProperty('--h', (vv.height / z) + 'px');
  document.documentElement.style.setProperty('--w', (innerWidth < 600 ? innerWidth / z : 402) + 'px');
  window.scrollTo(0, 0);
}
fit(); addEventListener('resize', fit); window.visualViewport && visualViewport.addEventListener('resize', fit);

// 화면 이동
const stack = ['home'];
function show(fromId, id, back) {
  const cur = $('#' + fromId), next = $('#' + id);
  if (cur === next) return;
  if (back) { cur.classList.remove('active'); next.classList.remove('behind'); next.classList.add('active'); }
  else { cur.classList.remove('active'); cur.classList.add('behind'); next.classList.add('active'); }
  setTimeout(() => document.querySelectorAll('.screen.behind').forEach(s => { if (s !== next) s.classList.remove('behind'); }), 340);
  onEnter(id);
}
function go(id) { show(stack[stack.length - 1], id); stack.push(id); }
function back() { if (stack.length < 2) return; const from = stack.pop(); show(from, stack[stack.length - 1], true); onLeave(from); }
function home() { tab('home'); }
// 하단바 이동: 기록을 비우고 그 화면을 새 출발점으로
// 지금 화면을 다른 화면으로 바꿔치기 (뒤로 가면 그 전 화면으로)
function replace(id) { const from = stack.pop(); stack.push(id); show(from, id); onLeave(from); }
function tab(id) { const from = stack[stack.length - 1]; if (from === id) return; stack.length = 0; stack.push(id); show(from, id, true); onLeave(from); }

let toastT;
function toast(msg) { const t = $('#toast'); t.querySelector('span').textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2000); }

document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.go) go(b.dataset.go);
  else if (b.dataset.tab) tab(b.dataset.tab);
  else if ('back' in b.dataset) back();
  else if ('home' in b.dataset) home();
  else if ('close' in b.dataset) closeLayers();
  else if (b.dataset.done) { toast(b.dataset.done); back(); }
  else if (b.dataset.layer) openLayer($('#' + b.dataset.layer));
  else if (b.dataset.toast) toast(b.dataset.toast);
  else if ('sheet' in b.dataset) openSheet();
  else if (b.dataset.say) { pending = b.dataset.say; go('voice'); }
});

// 민원 유형 분류 (시연용 키워드 규칙)
const TYPES = [
  { k: '환경·쓰레기', name: '생활폐기물 · 쓰레기 무단투기', ic: 'i-delete', re: /쓰레기|투기|악취|폐기물/ },
  { k: '불법주정차', name: '불법주정차 · 주차 단속', ic: 'i-location', re: /주차|주정차|차가|킥보드/ },
  { k: '도로·교통', name: '도로·교통 · 도로 파손', ic: 'i-location', re: /도로|보도|블록|포트홀|횡단보도|신호/ },
  { k: '시설물', name: '시설물 · 가로등 고장', ic: 'i-tool', re: /가로등|고장|깜빡|파손|시설/ },
  { k: '생활안전', name: '생활안전 · 위험 요소 신고', ic: 'i-location', re: /위험|안전|사고|낙하/ },
  { k: '기타 민원', name: '기타 민원', ic: 'i-check', re: /$^/ },
];
let state = { text: '', photo: null, type: TYPES[0] };
const classify = t => TYPES.find(x => x.re.test(t)) || TYPES[5];
function setType(t) { state.type = t; $('#typeName').textContent = t.name; $('#typeIc use').setAttribute('href', '#' + t.ic); }
function toConfirm(text, photo, nav = go) {
  state.text = text; state.photo = photo || null;
  const q = $('#quote'); q.className = photo ? 'pcard' : 'quote';
  if (photo) {
    state.text = '골목에 쓰레기가 쌓여 지나다니기 어렵습니다.\n빠른 수거를 요청드립니다.';
    q.innerHTML = `<div class="pimg" style="background-image:url(${photo})"></div><div class="pt"><span>AI가 작성한 내용</span><button id="editAi">직접 수정하기</button></div><textarea id="aiText" rows="2" readonly></textarea>`;
    $('#aiText').value = state.text;
  } else q.textContent = '“' + text + '”';
  document.querySelector('#confirm .badge').lastChild.textContent = photo ? '사진 분석 완료' : '분석 완료';
  document.querySelector('#confirm .h-title').textContent = photo ? '이 내용으로 접수할까요?' : '민원 유형을 확인해주세요';
  $('#cSub').style.display = photo ? 'none' : '';
  setType(photo ? TYPES[0] : classify(text));
  nav('confirm');
}
document.addEventListener('click', e => { if (e.target.id !== 'editAi') return; const t = $('#aiText'); t.readOnly = false; t.rows = 4; t.focus(); e.target.textContent = '수정 중'; });
document.addEventListener('input', e => { if (e.target.id === 'aiText') state.text = e.target.value; });

// 시트·다이얼로그 공통
function openLayer(el) { $('#dim').classList.add('on'); el.classList.add('on'); }
function closeLayers() { document.querySelectorAll('#dim, .sheet.on, .dlg.on').forEach(x => x.classList.remove('on')); }
$('#dim').onclick = closeLayers;
function openSheet() {
  document.querySelectorAll('#types button').forEach(b => b.classList.toggle('sel', TYPES[b.dataset.i] === state.type));
  openLayer($('#sheet'));
}
$('#types').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setType(TYPES[b.dataset.i]); closeLayers(); toast('유형을 바꿨어요'); });

// 접수
$('#submit').onclick = () => state.photo ? submitNow() : go('loc');
function finishSubmit() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  const no = `N-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${String(Math.floor(Math.random() * 900) + 100)}`;
  $('#dNo').textContent = no;
  $('#dType').textContent = state.type.name;
  addMine(no, d);
  replace('done');
}

// 음성 입력: 지원 브라우저는 실제 인식, 아니면 시연 문장을 받아쓰기처럼 보여준다
let pending = null, rec = null, typing = null;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function resetVoice() { $('#heard').textContent = ''; $('#reply').classList.remove('on'); $('#mic').classList.remove('listening'); clearInterval(typing); rec && rec.abort(); rec = null; }
function finishVoice(text) {
  $('#mic').classList.remove('listening');
  if (!text.trim()) { toast('잘 못 들었어요. 다시 말해 주세요'); return; }
  $('#heard').textContent = text; $('#reply').classList.add('on');
  setTimeout(() => stack[stack.length - 1] === 'voice' && toConfirm(text), 1200);
}
function fakeType(text) {
  $('#mic').classList.add('listening'); let i = 0; $('#heard').textContent = '';
  typing = setInterval(() => { $('#heard').textContent = text.slice(0, ++i); if (i >= text.length) { clearInterval(typing); setTimeout(() => finishVoice(text), 400); } }, 70);
}
$('#mic').onclick = () => {
  if ($('#mic').classList.contains('listening')) { rec ? rec.stop() : null; return; }
  resetVoice();
  if (!SR) return fakeType('우리 골목에 쓰레기가 쌓였어요. 처리해 주세요.');
  rec = new SR(); rec.lang = 'ko-KR'; rec.interimResults = true; let final = '';
  rec.onresult = e => { final = Array.from(e.results).map(r => r[0].transcript).join(''); $('#heard').textContent = final; };
  rec.onerror = () => { rec = null; fakeType('우리 골목에 쓰레기가 쌓였어요. 처리해 주세요.'); };
  rec.onend = () => { if (rec) { rec = null; finishVoice(final); } };
  $('#mic').classList.add('listening'); rec.start();
};

// 텍스트 입력
$('#composer').onsubmit = e => {
  e.preventDefault(); const v = $('#msg').value.trim(); if (!v) return;
  const chat = $('#chat'); const me = document.createElement('div'); me.className = 'bubble me'; me.textContent = v; chat.append(me);
  $('#msg').value = ''; $('#msg').blur();
  setTimeout(() => { const bot = document.createElement('div'); bot.className = 'bubble bot'; bot.textContent = '안녕하세요, 주신 민원 빠르게 처리하겠습니다.'; chat.append(bot); chat.scrollTop = 1e6; }, 500);
  setTimeout(() => stack[stack.length - 1] === 'text' && toConfirm(v), 1600);
  chat.scrollTop = 1e6;
};
$('#chat').addEventListener('click', () => $('#msg').blur());

// 사진으로 바로: 폰 카메라를 바로 연다
$('#photoCard').onclick = () => go('camera');

function onEnter(id) {
  if (id === 'live') renderLive();
  if (id === 'camera') startCam();
  if (id === 'typepick') renderTypes();
  if (id === 'voice') { resetVoice(); if (pending) { const t = pending; pending = null; setTimeout(() => fakeType(t), 350); } }
  if (id === 'text') setTimeout(() => $('#msg').focus(), 350);
}
function onLeave(id) { if (id === 'voice') resetVoice(); if (id === 'camera') stopCam(); }

/* ───────── 내 민원 ───────── */
const ST = {
  '접수됨': { bg: '#EAF0FF', c: '#3564D8', step: 1 },
  '검토 중': { bg: '#EEF1FA', c: '#7386C9', step: 2 },
  '처리 중': { bg: '#EDF1FF', c: '#486FFF', step: 3 },
  '완료': { bg: '#E7EEFF', c: '#0046FF', step: 4 },
};
const STEP_DESC = ['접수 완료', '담당 기관 배정', '현장 점검·\n수리', '결과 통보'];
const mine = [
  { id: 'pothole', title: '포트홀 보수 완료', st: '완료', date: '2026.09.08 · 공릉동 화랑로', pct: 100, foot: '도로관리과 · 보수가 완료됐어요', no: 'N-260905-118' },
  { id: 'lamp-broken', title: '가로등 파손 신고', st: '처리 중', date: '2026.09.07 · 인공폭포 앞', pct: 68, foot: '도로관리과 · 9월 12일 완료 예정',
    no: 'N-260907-028', at: '2026.09.07 접수 · 서울 노원구 공릉2동', place: '공릉동 인공폭포 앞', type: '가로등 파손', cat: '생활안전 · 시설물',
    desc: '공릉동 인공폭포 앞 가로등이 파손되어 보행 안전이 우려됩니다. 현장 확인과 교체를 요청합니다.', org: '노원구청 도로관리과', next: '완료 예정 · 9월 12일', left: ['문의하기', 'ask'] },
  { id: 'lamp-off', title: '가로등 고장 신고', st: '검토 중', date: '2026.09.06 · 공릉동 주택가', pct: 32, foot: '도로관리과 · 09.10 접수',
    no: 'N-260910-052', at: '2026.09.10 10:30 접수 · 서울 노원구 공릉2동', place: '공릉2동 화랑로 51길 인근', type: '가로등 미점등', cat: '생활안전 · 시설물',
    desc: '공릉2동 화랑로 51길 인근 가로등이 켜지지 않아 야간 보행이 위험합니다. 현장 확인과 수리를 요청합니다.', org: '노원구청 도로관리과 배정 중', next: '예상 다음 안내  ·  9월 11일 오후', left: ['접수 취소', 'cancel'] },
  { id: 'parking', title: '불법 주정차 신고', st: '접수됨', date: '2026.09.10 · 태릉입구역 인근', pct: 12, foot: '접수번호 N-260910-041 · 담당 배정 중',
    no: 'N-260910-041', at: '2026.09.10 접수 · 서울 노원구 공릉2동', place: '태릉입구역 6번 출구 인근', type: '불법 주정차', cat: '교통 · 불법 주정차',
    desc: '태릉입구역 인근 횡단보도 앞 불법 주정차 차량으로 보행자 시야가 가려집니다. 현장 확인을 요청합니다.', org: '노원구청 교통지도과 배정 중', next: '담당자 배정 후 알림 예정', left: ['접수 취소', 'cancel'] },
];
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function addMine(no, d) {
  const p = n => String(n).padStart(2, '0'), day = `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
  const short = (state.text || '사진으로 접수한 민원').replace(/[.!?。].*$/, '');
  mine.unshift({ id: 'new' + Date.now(), title: state.type.k + ' 신고', st: '접수됨', date: day + ' · 공릉2동', pct: 12, foot: `접수번호 ${no} · 담당 배정 중`, isNew: true,
    no, at: day + ' 접수 · 서울 노원구 공릉2동', place: '서울 노원구 공릉2동', type: state.type.k, cat: state.type.name,
    desc: state.text || short, org: '담당 기관 배정 중', next: '담당자 배정 후 알림 예정', left: ['접수 취소', 'cancel'], photo: state.photo });
}

let liveFilter = '전체';
function renderLive() {
  const ing = mine.filter(m => m.st !== '완료').length;
  $('#sumText').textContent = `진행 중 ${ing}건 · 완료 ${4 + mine.filter(m => m.st === '완료').length}건`;
  $('#sumRing').textContent = ing + '건';
  $('#filters').innerHTML = ['전체', '접수됨', '검토 중', '처리 중', '완료'].map(f => `<button class="${f === liveFilter ? 'on' : ''}" data-f="${f}">${f}</button>`).join('');
  const list = mine.filter(m => liveFilter === '전체' || m.st === liveFilter);
  $('#cards').innerHTML = list.length ? list.map(m => { const s = ST[m.st]; return `
    <button class="mcard card-press ${m.st === '완료' || m.isNew ? 'hl' : ''}" data-m="${m.id}">
      <div class="top"><div><b>${esc(m.title)}</b><small>${esc(m.date)}</small></div><span class="stag" style="background:${s.bg};color:${s.c}">${m.st}</span></div>
      <div class="prow"><div class="pbar"><i style="width:${m.pct}%;background:${s.c}"></i></div><em style="color:${s.c}">${m.pct}%</em></div>
      <div class="foot"><span>${esc(m.foot)}</span><span>자세히 보기</span></div>
    </button>`; }).join('') : '<p class="empty">해당하는 민원이 없어요</p>';
  $('#notiDot').classList.toggle('off', !notis.some(n => n.unread));
}
$('#filters').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { liveFilter = b.dataset.f; renderLive(); } });
$('#cards').addEventListener('click', e => { const b = e.target.closest('.mcard'); if (b) openDetail(b.dataset.m); });

let cur = null;
function openDetail(id) {
  cur = mine.find(m => m.id === id); if (!cur) return;
  const m = cur, s = ST[m.st];
  if (m.st === '완료') return openDone(m);
  $('#dTitle').textContent = '민원 신고 상세';
  const step = s.step;
  const steps = ['접수됨', '검토 중', '처리 중', '완료'].map((n, i) => {
    const k = i + 1 < step ? 'done' : i + 1 === step ? 'cur' : '';
    return `<div class="st ${k}"><span class="c">${k === 'done' ? '<svg width="14" height="14"><use href="#i-done"/></svg>' : '<i></i>'}</span><span class="n">${n}</span><span class="d">${STEP_DESC[i]}</span></div>`;
  }).join('');
  $('#dBody').innerHTML = `
    <div class="dc"><div class="h"><b>${esc(m.title)}</b><span class="stag" style="background:${s.bg};color:${s.c}">${m.st}</span></div>
      <p class="meta1">신고 번호&nbsp;&nbsp;${m.no}</p><p class="meta2">${esc(m.at)}</p></div>
    <div class="proc"><div class="h"><span class="sec-t">처리 프로세스</span><em>${step} / 4 단계</em></div>
      <div class="steps4"><span class="line"><i style="width:${(step - 1) / 3 * 100}%"></i></span>${steps}</div></div>
    <div class="dc loc"><div class="h"><span class="sec-t">신고 위치</span><span>서울 노원구 공릉2동</span></div>
      <div class="dmap"${m.photo ? ` style="background-image:url(${m.photo})"` : ''}><span><svg width="18" height="18"><use href="#i-location"/></svg><b>${esc(m.place)}</b></span></div></div>
    <div class="dc body"><div class="ty"><span class="ib"><svg width="20" height="20"><use href="#i-lamp"/></svg></span><div><b>${esc(m.type)}</b><small>${esc(m.cat)}</small></div></div>
      <p class="desc">${esc(m.desc)}</p><div class="hr"></div>
      <div class="kv2"><span>담당 기관</span><b>${esc(m.org)}</b></div><div class="next">${esc(m.next)}</div></div>`;
  $('#dActions').innerHTML = `<button class="btn neutral" style="width:126px" data-act="${m.left[1]}">${m.left[0]}</button><button class="btn brand" data-act="extra">추가 자료 보내기</button>`;
  go('detail');
}
function openDone(m) {
  $('#dTitle').textContent = '민원 상세';
  const dates = ['09.05', '09.06', '09.07', '09.08'];
  const steps = ['접수됨', '검토 중', '처리 중', '완료'].map((n, i) => `<div class="st ${i < 3 ? 'done' : 'fin'}"><span class="c"><svg width="14" height="14"><use href="#i-done"/></svg></span><span class="n">${n}</span><span class="d">${dates[i]}</span></div>`).join('');
  $('#dBody').innerHTML = `
    <div class="donehead"><div class="r"><span><i><svg width="14" height="14"><use href="#i-done"/></svg></i>처리 완료</span>100%</div><b>포트홀 보수 완료</b><p>공릉동 화랑로 · 2026.09.08 완료</p></div>
    <div class="dc soft"><span style="font-size:12px;line-height:16px;font-weight:600">처리 전후 사진</span>
      <div class="ba"><figure><div class="ph" style="background-image:url(img/pothole-before.jpg)"><span>접수 사진</span></div>2026.09.05 접수</figure>
      <figure><div class="ph after" style="background-image:url(img/pothole-after.jpg)"><span>처리 완료</span></div>2026.09.08 처리</figure></div></div>
    <div class="dc soft" style="gap:8px"><span class="sec-t">처리 단계</span><div class="steps4 allDone"><span class="line"></span>${steps}</div></div>
    <div class="dc soft" style="gap:4px;padding:14px"><span class="sec-t" style="margin-bottom:4px">민원 정보</span>
      <div class="kv3"><span>접수번호</span><b>N-260905-118</b></div><div class="kv3"><span>담당기관</span><b>노원구청 도로관리과</b></div>
      <div class="kv3"><span>처리 위치</span><b>서울 노원구 공릉동 화랑로</b></div><div class="kv3"><span>완료일</span><b>2026년 9월 8일</b></div></div>
    <div class="fin-note"><i><svg width="20" height="20"><use href="#i-done"/></svg></i><div><b>요청하신 보수가 완료됐어요</b><span>처리 결과를 확인하고 만족도를 알려주세요.</span></div></div>
    <button class="pub" id="pubRow"><div><b id="pubT">${pub ? '우리동네 소식에 공개 중' : '우리동네 소식에 공개 안 함'}</b><span>처리 전·후 사진이 이웃에게 보여요</span></div><span class="toggle ${pub ? '' : 'off'}" id="pubTg"></span></button>`;
  $('#dActions').innerHTML = `<button class="btn neutral" style="width:110px" data-act="ask">문의하기</button><button class="btn brand" data-act="rate">처리 결과 평가하기</button>`;
  go('detail');
}
let pub = true;
function setPub(v) { pub = v; $('#pubTg').classList.toggle('off', !v); $('#pubT').textContent = v ? '우리동네 소식에 공개 중' : '우리동네 소식에 공개 안 함'; }
$('#dBody').addEventListener('click', e => { if (e.target.closest('#pubRow')) { if (pub) openLayer($('#stopDlg')); else { setPub(true); toast('우리동네 소식에 다시 공개했어요'); } } });
$('#stopGo').onclick = () => { closeLayers(); setPub(false); toast('소식 공개를 중지했어요'); };

// 상세 하단 버튼
function fillTarget(scr) {
  const m = cur; scr.querySelectorAll('.tTitle').forEach(x => x.textContent = m.title.replace(' 완료', ''));
  scr.querySelectorAll('.tNo').forEach(x => x.textContent = `${m.no} · ${m.st === '완료' ? '처리 완료' : m.st}`);
  scr.querySelectorAll('.tOrg').forEach(x => x.textContent = m.org ? m.org.replace(' 배정 중', '') : '노원구청 도로관리과');
}
$('#dActions').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const a = b.dataset.act;
  if (a === 'cancel') return openLayer($('#cancelSheet'));
  if (a === 'ask' || a === 'extra') { resetForm($('#' + a)); fillTarget($('#' + a)); }
  if (a === 'rate') resetForm($('#rate'));
  go(a);
});

// 접수 취소
$('#reasons').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
  [...$('#reasons').children].forEach(x => { const on = x === b; x.classList.toggle('on', on); x.querySelector('use').setAttribute('href', on ? '#i-radio-on' : '#i-radio-off'); }); });
$('#cancelGo').onclick = () => { closeLayers(); mine.splice(mine.indexOf(cur), 1); back(); toast('접수를 취소했어요'); renderLive(); };

// 평가
const STAR_T = ['', '매우 불만족', '불만족', '보통', '만족', '매우 만족'];
let stars = 0;
$('#stars').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; stars = +b.dataset.s;
  [...$('#stars').children].forEach((x, i) => x.classList.toggle('on', i < stars)); $('#starLabel').textContent = STAR_T[stars]; });
$('#rateSubmit').onclick = () => { if (!stars) return toast('별을 눌러 만족도를 선택해 주세요'); toast('평가를 보냈어요. 고마워요!'); back(); };

// 폼 공통: 글자 수, 문의 유형, 사진 첨부
document.querySelectorAll('.tabox').forEach(b => { const t = b.querySelector('textarea'), c = b.querySelector('.count'); t.addEventListener('input', () => c.textContent = `${t.value.length} / 500`); });
$('#askType').addEventListener('click', e => { const b = e.target.closest('button'); if (b) [...$('#askType').children].forEach(x => x.classList.toggle('on', x === b)); });
function resetForm(scr) {
  scr.querySelectorAll('textarea').forEach(t => { t.value = ''; t.dispatchEvent(new Event('input')); });
  scr.querySelectorAll('.thumbs').forEach(t => t.innerHTML = '');
  if (scr.id === 'rate') { stars = 0; [...$('#stars').children].forEach(x => x.classList.remove('on')); $('#starLabel').innerHTML = '&nbsp;'; }
  scr.querySelector('.scroll').scrollTop = 0;
}
let pickFor = null;
document.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (!b) return;
  pickFor = b.dataset.pick; const p = $('#picker'); b.dataset.cap ? p.setAttribute('capture', 'environment') : p.removeAttribute('capture'); p.click(); });
$('#picker').onchange = e => {
  const box = document.querySelector(`[data-thumbs="${pickFor}"]`);
  [...e.target.files].slice(0, 5 - box.children.length).forEach(f => { const s = document.createElement('span'); s.style.backgroundImage = `url(${URL.createObjectURL(f)})`;
    s.innerHTML = '<button aria-label="삭제"><svg width="12" height="12"><use href="#i-close"/></svg></button>'; box.append(s); });
  const info = box.parentElement.querySelector('.pickInfo'); if (info) info.textContent = `${box.children.length}장 첨부됨 · 최대 5장`;
  e.target.value = '';
};
document.addEventListener('click', e => { const x = e.target.closest('.thumbs span button'); if (x) { e.stopPropagation(); x.parentElement.remove(); } }, true);

// 알림
const notis = [
  { bd: ['처리 상태', '#E5EAFF', '#0046FF'], t: '가로등 고장 신고가 처리 중이에요', m: '노원구 도로관리과 배정 · 방금', unread: true, to: () => openDetail('lamp-off') },
  { bd: ['추가 자료', '#FFF1DC', '#B26A00'], t: '사진을 한 장 더 보내주세요', m: '불법 주정차 신고 · 2시간 전', unread: true, to: () => { cur = mine.find(x => x.id === 'parking'); if (!cur) return; resetForm($('#extra')); fillTarget($('#extra')); go('extra'); } },
  { bd: ['처리 완료', '#E5EAFF', '#0046FF'], t: '포트홀 보수가 완료됐어요', m: '처리 결과를 확인해주세요 · 9월 8일', to: () => openDetail('pothole') },
  { bd: ['포인트', '#F5F8FF', '#526491'], t: '동네 포인트 5,000P가 적립됐어요', m: '불법 주정차 신고 · 9월 8일', to: () => go('piggy') },
  { bd: ['동네 소식', '#F5F8FF', '#526491'], t: '공릉2동 상수도 공사 안내', m: '9월 15일부터 단수 · 9월 9일', to: () => go('notice') },
];
function renderNotis() {
  $('#notis').innerHTML = notis.map((n, i) => `<button class="ncard card-press ${n.unread ? 'new' : ''}" data-n="${i}">${n.unread ? '<i class="u"></i>' : ''}<div>
    <span class="bd" style="background:${n.bd[1]};color:${n.bd[2]}">${n.bd[0]}</span><p>${n.t}</p><small>${n.m}</small></div></button>`).join('');
}
$('#notis').addEventListener('click', e => { const b = e.target.closest('.ncard'); if (!b) return; const n = notis[b.dataset.n]; n.unread = false; renderNotis(); n.to(); });
renderNotis();
const _enter = onEnter;
onEnter = id => { _enter(id); if (id === 'noti') renderNotis(); };

/* ───────── 민원 접수: 유형·위치·자료·제출 ───────── */
const TSUB = ['무단투기·수거', '차량 신고', '도로 파손·신호', '가로등·공공시설', '위험·방범', '직접 설명하기'];
const TICON = ['i-delete', 'i-location', 'i-map', 'i-home', 'i-security', 'i-more'];
const TORDER = [0, 2, 1, 3, 4, 5]; // Figma 배치 순서: 환경, 도로, 불법주정차, 시설물, 생활안전, 기타
let tSel = null;
function renderTypes() {
  tSel = state.type; $('#tq').value = '';
  drawTypes();
}
function drawTypes() {
  const q = $('#tq').value.trim();
  $('#tgrid').innerHTML = TORDER.filter(i => !q || (TYPES[i].k + TSUB[i]).includes(q)).map(i => `<button class="tcard ${TYPES[i] === tSel ? 'sel' : ''}" data-t="${i}">
    <span class="ti2"><svg width="24" height="24"><use href="#${TICON[i]}"/></svg><svg class="ok" width="18" height="18"><use href="#i-check"/></svg></span><b>${TYPES[i].k}</b><small>${TSUB[i]}</small></button>`).join('') || '<p class="empty" style="grid-column:1/-1;padding:20px 0">찾는 유형이 없어요. 기타 민원을 골라주세요</p>';
  $('#tcur').textContent = '현재 선택: ' + tSel.k;
}
$('#tq').addEventListener('input', drawTypes);
$('#tgrid').addEventListener('click', e => { const b = e.target.closest('.tcard'); if (b) { tSel = TYPES[b.dataset.t]; drawTypes(); } });
$('#tpick').onclick = () => { setType(tSel); back(); toast('유형을 바꿨어요'); };

// 위치: 지도를 탭하면 핀이 그 자리로 옮겨 간다
const SPOTS = ['공릉2동 화랑로 51길 인근', '공릉2동 주민센터 앞', '화랑로 골목 분리수거장 옆', '공릉동 도깨비시장 입구', '태릉입구역 6번 출구 인근'];
let spot = 0;
$('#lmap').addEventListener('click', e => {
  if (e.target.closest('#mylo')) { Object.assign($('#lpin').style, { left: '50%', top: '113px' }); spot = 0; }
  else { const r = $('#lmap').getBoundingClientRect(), z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--z')) || 1;
    const x = (e.clientX - r.left) / z, y = (e.clientY - r.top) / z;
    Object.assign($('#lpin').style, { left: Math.min(Math.max(x, 110), 240) + 'px', top: Math.min(Math.max(y, 30), 240) + 'px' }); spot = 1 + (spot % 4); }
  $('#lpinT').textContent = SPOTS[spot]; $('#addrSub').textContent = SPOTS[spot].replace(/^공릉2?동 /, '');
});
$('#consent').onclick = () => { const c = $('#consent'); c.classList.toggle('on'); c.querySelector('use').setAttribute('href', c.classList.contains('on') ? '#i-box-on' : '#i-box-off'); };
document.addEventListener('click', e => { if (e.target.closest('[data-send]')) submitNow(); });

// 06 제출 중 / 11 사진 분석 중: 단계가 차례로 켜진다
function runBusy(cfg, done) {
  $('#bTitle').textContent = cfg.title; $('#bSub').textContent = cfg.sub; $('#bNote').textContent = cfg.note;
  const bin = $('#bin'); bin.style.backgroundImage = cfg.photo ? `url(${cfg.photo})` : ''; bin.innerHTML = cfg.photo ? '' : '<svg width="28" height="28"><use href="#i-send"/></svg>';
  $('#bsteps').innerHTML = cfg.steps.map(t => `<div><i></i><span>${t}</span><em>예정</em></div>`).join('');
  const rows = [...$('#bsteps').children]; let i = 0;
  const tick = () => {
    rows.forEach((r, k) => { r.className = k < i ? 'ok' : k === i ? 'on' : ''; r.querySelector('em').textContent = k < i ? '완료' : k === i ? '진행 중' : '예정'; });
    if (i++ < rows.length) setTimeout(tick, 700); else setTimeout(done, 300);
  };
  tick();
}
function submitNow() {
  if (!navigator.onLine) return go('fail');
  go('busy');
  runBusy({ title: '민원을 접수하고 있어요', sub: '내용을 확인하고 담당 기관을 찾는 중입니다.', note: '완료되면 자동으로 다음 화면으로 이동해요.', steps: ['내용 확인', '담당 기관 찾기', '접수번호 생성'] }, finishSubmit);
}
$('#retry').onclick = () => { back(); submitNow(); };

// 09 카메라: 폰 후면 카메라를 실제로 띄운다
let camStream = null, torch = false;
async function startCam() {
  $('#camOff').textContent = '카메라를 켜는 중이에요…';
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    $('#video').srcObject = camStream; $('#camOff').textContent = '';
  } catch (err) { $('#camOff').textContent = '카메라를 쓸 수 없어요. 셔터를 누르면 사진을 고를 수 있어요.'; camStream = null; }
}
function stopCam() { camStream && camStream.getTracks().forEach(t => t.stop()); camStream = null; torch = false; $('#flashBtn').classList.remove('on'); }
function toReview(src) {
  const d = new Date(), p = n => String(n).padStart(2, '0'), h = d.getHours();
  $('#rvGeo').textContent = `서울 노원구 공릉2동 · ${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${p(d.getMinutes())}`;
  $('#rvPhoto').style.backgroundImage = `url(${src})`; state.shot = src; go('review');
}
$('#shutter').onclick = () => {
  const v = $('#video');
  if (!camStream || !v.videoWidth) return camPick.click();
  const c = $('#snap'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0);
  const fx = $('#flashfx'); fx.classList.remove('on'); void fx.offsetWidth; fx.classList.add('on');
  setTimeout(() => toReview(c.toDataURL('image/jpeg', .85)), 250);
};
const camPick = document.createElement('input'); camPick.type = 'file'; camPick.accept = 'image/*'; camPick.id = 'camPick'; camPick.hidden = true; document.body.append(camPick);
camPick.onchange = e => { const f = e.target.files[0]; if (f) toReview(URL.createObjectURL(f)); e.target.value = ''; };
$('#album').onclick = () => camPick.click();
$('#flashBtn').onclick = async () => {
  const t = camStream && camStream.getVideoTracks()[0];
  if (t && t.getCapabilities && t.getCapabilities().torch) { torch = !torch; await t.applyConstraints({ advanced: [{ torch }] }); $('#flashBtn').classList.toggle('on', torch); }
  else toast('이 기기에서는 플래시를 켤 수 없어요');
};
document.addEventListener('click', e => { const b = e.target.closest('[data-swap]'); if (b) replace(b.dataset.swap); });
$('#usePhoto').onclick = () => {
  go('busy');
  runBusy({ title: '사진을 분석하고 있어요', sub: '사진 속 상황과 위치를 확인하는 중입니다.', note: '분석이 끝나면 내용을 확인하고 고칠 수 있어요.', photo: state.shot, steps: ['사진 확인', '민원 유형 찾기', '신고 내용 작성'] },
    () => toConfirm('', state.shot, replace)); // 뒤로 가면 사진 확인 화면
};

/* ───────── 지도 전체보기 ───────── */
const PIN_C = { done: ['#0046FF', 'i-done', '해결 완료'], ing: ['#F59E0B', 'i-tool', '처리 중'], new: ['#94A3B8', 'i-flag', '접수됨'] };
const PINS = [
  { x: 60, y: 300, s: 'done', cat: '도로·교통', t: '화랑로 포트홀 보수 완료', m: '공릉동 화랑로 · 노원구 도로관리과 · 9월 8일 완료', detail: 'pothole' },
  { x: 150, y: 390, s: 'ing', cat: '시설물', t: '공릉2동 가로등 고장 신고', m: '화랑로 51길 인근 · 노원구 도로관리과 · 9월 10일 접수', detail: 'lamp-off' },
  { x: 268, y: 316, s: 'done', cat: '환경·쓰레기', t: '골목 무단투기 수거 완료', m: '공릉2동 주택가 · 노원구 자원순환과 · 9월 6일 완료' },
  { x: 96, y: 508, s: 'new', cat: '불법주정차', t: '태릉입구역 불법 주정차', m: '태릉입구역 6번 출구 · 교통지도과 배정 중 · 9월 10일 접수', detail: 'parking' },
  { x: 244, y: 540, s: 'ing', cat: '시설물', t: '인공폭포 앞 가로등 파손', m: '공릉동 인공폭포 앞 · 노원구 도로관리과 · 9월 12일 완료 예정', detail: 'lamp-broken' },
  { x: 186, y: 236, s: 'done', cat: '도로·교통', t: '화랑로 보도블록 교체 완료', m: '화랑로 51길 · 노원구 도로관리과 · 9월 3일 완료' },
  { x: 312, y: 452, s: 'new', cat: '생활안전', t: '공원 산책로 난간 흔들림', m: '경춘선숲길 공릉구간 · 공원녹지과 배정 중 · 9월 11일 접수' },
];
let mapF = '전체', mz = 1, mx = 0, my = 0, pinSel = -1;
const sameDone = new Set();
function drawMap() {
  $('#mapcanvas').innerHTML = PINS.map((p, i) => `<button class="mpin ${mapF !== '전체' && PIN_C[p.s][2] !== mapF ? 'hide' : ''} ${i === pinSel ? 'sel' : ''}" data-p="${i}" style="left:${p.x + 119}px;top:${p.y + 119}px;background:${PIN_C[p.s][0]}"><svg width="20" height="20"><use href="#${PIN_C[p.s][1]}"/></svg></button>`).join('');
  $('#mfilters').innerHTML = [['전체'], ['해결 완료', '#0046FF'], ['처리 중', '#F59E0B'], ['접수됨', '#94A3B8']].map(([f, c]) => `<button class="${f === mapF ? 'on' : ''}" data-mf="${f}">${c ? `<i style="background:${c}"></i>` : ''}${f}</button>`).join('');
  const shown = PINS.filter(p => mapF === '전체' || PIN_C[p.s][2] === mapF).length;
  $('#mstripT').textContent = mapF === '전체' ? '이 지역 이슈 18건 · 해결 12건' : `이 지역 ${mapF} 이슈 ${shown}건`;
}
function placeMap(anim) { const c = $('#mapcanvas'); c.classList.toggle('anim', !!anim); c.style.transform = `translate(${mx}px, ${my}px) scale(${mz})`; }
function selectPin(i) {
  pinSel = i; drawMap();
  const sh = $('#pinsheet');
  if (i < 0) { sh.classList.remove('on'); $('#mstrip').classList.remove('off'); $('#mapfull').classList.remove('mtoast-up'); return; }
  const p = PINS[i], c = PIN_C[p.s];
  const st = { done: ['#E5EAFF', '#0046FF'], ing: ['#FFF1DC', '#B26A00'], new: ['#F5F8FF', '#526491'] }[p.s];
  $('#psBadges').innerHTML = `<span style="background:#F5F8FF;color:#526491">${p.cat}</span><span style="background:${st[0]};color:${st[1]}">${c[2]}</span>`;
  $('#psTitle').textContent = p.t; $('#psMeta').textContent = p.m;
  $('#psSame').textContent = sameDone.has(i) ? '함께 알렸어요' : '같은 문제 알리기';
  sh.classList.add('on'); $('#mstrip').classList.add('off'); $('#mapfull').classList.add('mtoast-up');
}
$('#mfilters').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { mapF = b.dataset.mf; selectPin(-1); } });
document.querySelectorAll('[data-z]').forEach(b => b.onclick = () => { mz = Math.min(2, Math.max(.8, mz + .25 * b.dataset.z)); placeMap(true); });
$('#mhome').onclick = () => { mz = 1; mx = 0; my = 0; placeMap(true); toast('내 위치로 이동했어요'); };
$('#research').onclick = () => { $('#research').classList.remove('on'); toast('이 지역 이슈를 다시 찾았어요'); };
$('#psSame').onclick = () => { if (sameDone.has(pinSel)) { sameDone.delete(pinSel); $('#psSame').textContent = '같은 문제 알리기'; return; }
  sameDone.add(pinSel); $('#psSame').textContent = '함께 알렸어요'; toast('같은 문제로 함께 알렸어요'); };
$('#psMore').onclick = () => { const p = PINS[pinSel]; if (p.detail) openDetail(p.detail); else openNews(p.news || 0); };
// 끌어서 지도 이동 (04 이동 중 상태 표시)
(() => {
  const w = $('#mapwrap'); let st = null, moved = false;
  w.addEventListener('pointerdown', e => { st = { x: e.clientX, y: e.clientY, mx, my }; moved = false; });
  w.addEventListener('pointermove', e => { if (!st) return; const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--z')) || 1;
    const dx = (e.clientX - st.x) / z, dy = (e.clientY - st.y) / z; if (!moved && Math.hypot(dx, dy) < 6) return;
    if (!moved) { moved = true; selectPin(-1); $('#moving').classList.add('on'); $('#research').classList.remove('on'); }
    mx = st.mx + dx; my = st.my + dy; placeMap(); });
  const end = e => { if (!st) return; st = null; $('#moving').classList.remove('on');
    if (moved) { $('#research').classList.add('on'); return; }
    const b = e.target.closest('.mpin'); selectPin(b ? +b.dataset.p : -1); };
  w.addEventListener('pointerup', end); w.addEventListener('pointercancel', () => { st = null; $('#moving').classList.remove('on'); });
})();

/* ───────── 전체 서비스 · 최근 활동 ───────── */
const SVCS = [
  ['민원', 4, [['민원 신청', 'i-doc', () => go('text')], ['사진으로 신고', 'i-photo', () => go('camera')], ['음성으로 신고', 'i-mic', () => go('voice')], ['최근 활동', 'i-history', () => go('recent')]]],
  ['내 민원', 3, [['내 민원 Live', 'i-time', () => tab('live')], ['처리 결과 평가', 'i-feedback', () => { cur = mine.find(m => m.id === 'pothole') || mine[0]; resetForm($('#rate')); go('rate'); }],
    ['추가 자료 보내기', 'i-attach', () => { cur = mine.find(m => m.st !== '완료') || mine[0]; resetForm($('#extra')); fillTarget($('#extra')); go('extra'); }]]],
  ['동네', 3, [['우리동네 해결 소식', 'i-map', () => tab('news')], ['동네 공지', 'i-notice', () => go('notice')], ['이슈 지도', 'i-location', () => go('mapfull')]]],
  ['혜택', 3, [['포상 저금통', 'i-card', () => go('piggy')], ['지역상생페이 전환', 'i-cart', () => go('cpay')], ['기부하기', 'i-heart', () => go('cdon')]]],
];
$('#svcs').innerHTML = SVCS.map(([g, n, items], gi) => `<div class="sgroup"><span>${g}</span><div class="sgrid" style="grid-template-columns:repeat(${n},1fr)">${items.map((it, i) => `<button data-sv="${gi}.${i}"><svg width="24" height="24"><use href="#${it[1]}"/></svg>${it[0]}</button>`).join('')}</div></div>`).join('');
$('#svcs').addEventListener('click', e => { const b = e.target.closest('[data-sv]'); if (!b) return; const [g, i] = b.dataset.sv.split('.'); SVCS[g][2][i][2](); });

const RECENT = [
  ['작성 중인 민원', [['임시저장', '공릉동 횡단보도 턱이 높아 유모차가 못 넘어가요', '2026.10.18 · 사진 2장 · 위치 입력 완료', 'draft']]],
  ['최근 AI 대화', [['AI 대화', '우리 골목에 쓰레기가 쌓였어요. 처리해 주세요.', '2026.10.17 · 환경·쓰레기로 분류됨', 'ai'],
    ['AI 대화', '가로등이 깜빡여요', '2026.10.15 · 접수 완료 · 가로등 고장', 'lamp-off'], ['AI 대화', '아파트 앞 불법주차 신고하고 싶어요', '2026.10.12 · 접수 완료 · 불법 주정차', 'parking']]],
];
$('#recents').innerHTML = RECENT.map(([h, items]) => `<span>${h}</span>` + items.map(([tag, t, m, k]) => `<button class="rcard card-press" data-rc="${k}" data-t="${t}"><em>${tag}</em><b>${t}</b><small>${m}</small></button>`).join('')).join('');
$('#recents').addEventListener('click', e => { const b = e.target.closest('.rcard'); if (!b) return; const k = b.dataset.rc, t = b.dataset.t;
  if (k === 'draft') { go('text'); setTimeout(() => { $('#msg').value = t; }, 360); }
  else if (k === 'ai') toConfirm(t);
  else if (mine.find(m => m.id === k)) openDetail(k); else toConfirm(t); });

const _enter2 = onEnter;
onEnter = id => { _enter2(id); if (id === 'mapfull') { selectPin(-1); mx = my = 0; mz = 1; placeMap(); drawMap(); } };

/* ───────── 우리동네 소식 ───────── */
const NEWS = [
  { cat: '환경·쓰레기', grp: '생활안전', t: '골목 무단투기 쓰레기 수거 완료', m: '노원구 청소행정과 · 9월 8일 완료', ph: 'img/news-trash.jpg', before: 'img/trash-before.jpg', place: '공릉2동 화랑로 51길 일대', org: '노원구 청소행정과', dur: '접수 후 3일', end: '2026년 9월 8일', help: 24, re: '우리 골목에 쓰레기가 다시 쌓였어요.' },
  { cat: '시설물', grp: '교통·시설', t: '공릉2동 가로등 3개 교체 완료', m: '노원구 도로관리과 · 9월 6일 완료', ph: 'img/news-lamp.jpg', place: '공릉2동 화랑로 51길 인근', org: '노원구 도로관리과', dur: '접수 후 4일', end: '2026년 9월 6일', help: 17, re: '가로등이 다시 깜빡여요.' },
  { cat: '교통·시설', grp: '교통·시설', t: '화랑로 보도블록 파손 보수 완료', m: '노원구 건설관리과 · 9월 3일 완료', place: '공릉동 화랑로 보행로', org: '노원구 건설관리과', dur: '접수 후 6일', end: '2026년 9월 3일', help: 9, re: '화랑로 보도블록이 다시 깨졌어요.' },
];
let newsF = '전체', region = '공릉2동', helped = new Set(), sortSel = { 정렬: '최신순', 상태: '전체', 분야: '전체', 기간: '최근 1개월' };
function renderNews() {
  $('#regionT').textContent = region;
  const empty = region !== '공릉2동';
  $('#nsumT').textContent = empty ? '이번 주 해결 소식이 없어요' : '이번 주 12건이 해결됐어요';
  $('#nsumP').textContent = empty ? `${region}에서 처리 완료된 민원이 아직 없어요.` : `${region} 이웃들이 알린 문제가 처리됐어요.`;
  $('#nchips').innerHTML = ['전체', '해결 완료', '생활안전', '교통·시설', '동네 공지'].map(c => `<button class="${c === newsF ? 'on' : ''}" data-nf="${c}">${c}</button>`).join('');
  let items = empty ? [] : NEWS.map((n, i) => ({ ...n, i }));
  if (newsF === '동네 공지') items = [];
  else if (newsF !== '전체' && newsF !== '해결 완료') items = items.filter(n => n.grp === newsF);
  if (sortSel.분야 !== '전체') items = items.filter(n => sortSel.분야 === '환경·쓰레기' ? n.cat === '환경·쓰레기' : n.cat !== '환경·쓰레기');
  if (sortSel.상태 === '처리 중') items = [];
  if (sortSel.정렬 === '오래된순') items.reverse();
  let html = items.map(n => `<button class="ncardx card-press" data-ni="${n.i}"><span class="ph" ${n.ph ? `style="background-image:url(${n.ph})"` : ''}>${n.ph ? '' : '<svg width="30" height="30"><use href="#i-photo"/></svg>'}</span>
    <span class="bd"><span class="pbadges"><span style="background:#F5F8FF;color:#526491">${n.cat}</span><span style="background:#E5EAFF;color:#0046FF">해결 완료</span></span><b>${n.t}</b><small>${n.m}</small></span></button>`).join('');
  if (!empty && (newsF === '전체' || newsF === '동네 공지')) html += `<button class="ncardx card-press" data-notice="1"><span class="ph"><svg width="30" height="30"><use href="#i-notice"/></svg></span><span class="bd"><span class="pbadges"><span style="background:#F5F8FF;color:#526491">동네 공지</span><span style="background:#E5EAFF;color:#0046FF">노원구청</span></span><b>화랑로 51길 상수도 정비 공사 안내</b><small>9월 15일부터 단수 · 9월 9일 게시</small></span></button>`;
  $('#ncards').innerHTML = html || `<div class="nempty"><svg width="48" height="48" style="color:#A7B5F9"><use href="#i-notice"/></svg><b>아직 해결 소식이 없어요</b><p>이웃이 알린 문제가 처리되면<br>여기에서 결과를 볼 수 있어요.</p><button class="btn brand" data-go="voice">첫 민원 알리기</button></div>`;
  $('.fbtn').classList.toggle('dot', JSON.stringify(sortSel) !== JSON.stringify(SORT_DEF));
}
const SORT_DEF = { ...sortSel };
$('#nchips').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { newsF = b.dataset.nf; renderNews(); } });
$('#ncards').addEventListener('click', e => { const b = e.target.closest('.ncardx'); if (!b) return; if (b.dataset.notice) go('notice'); else openNews(+b.dataset.ni); });
let newsCur = 0;
function openNews(i) {
  newsCur = i; const n = NEWS[i];
  const photos = n.before && n.ph ? `<div class="nphotos"><div style="background-image:url(${n.before})"><span>처리 전</span></div><div style="background-image:url(${n.ph})"><span>처리 후</span></div></div><p class="ninfo"><svg width="16" height="16"><use href="#i-info"/></svg>신고자가 공개에 동의한 사진이에요. 얼굴과 차량번호는 가려집니다.</p>`
    : n.ph ? `<div class="nphotos"><div style="background-image:url(${n.ph})"><span>처리 후</span></div></div><p class="ninfo"><svg width="16" height="16"><use href="#i-info"/></svg>처리 전 사진은 신고자가 공개하지 않았어요. 처리 후 사진은 담당 기관이 제공했어요.</p>`
    : `<p class="ninfo box"><svg width="18" height="18"><use href="#i-info"/></svg>이 민원은 사진이 공개되지 않았어요. 처리 과정은 아래에서 확인할 수 있어요.</p>`;
  const on = helped.has(i);
  $('#ndBody').innerHTML = `
    <div class="pbadges"><span style="background:#F5F8FF;color:#526491">${n.cat}</span><span style="background:#E5EAFF;color:#0046FF">해결 완료</span></div>
    <b class="nd-title">${n.t}</b>${photos}
    <div class="ncard2"><div class="kv"><span>위치</span><b>${n.place}</b></div><div class="kv"><span>처리 기관</span><b>${n.org}</b></div><div class="kv"><span>소요 기간</span><b>${n.dur}</b></div><div class="kv"><span>완료일</span><b>${n.end}</b></div></div>
    <div class="ncard2 nproc" style="gap:10px"><div class="h"><span>처리 과정</span><em>4 / 4</em></div><div class="bars"><i></i><i></i><i></i><i></i></div><div class="lb"><span>접수됨</span><span>검토 중</span><span>처리 중</span><span>완료</span></div></div>
    <button class="helpful ${on ? 'on' : ''}" id="helpful"><svg width="18" height="18"><use href="#i-thumb"/></svg>도움이 됐어요&nbsp;&nbsp;<span>${n.help + (on ? 1 : 0)}</span></button>
    <button class="btn brand" id="reReport" style="flex:none">이 문제가 다시 발생했어요</button>
    <p class="cta-note">위치와 민원 유형이 자동으로 채워져요.</p>
    <div class="similar"><b>주변의 비슷한 신고</b>
      <button class="simcard card-press" data-sim="ing"><div><span class="bd2" style="background:#FFF1DC;color:#B26A00">처리 중</span><p>화랑로 51길 쓰레기 재발 신고</p><small>공릉2동 · 9월 10일</small></div><svg width="18" height="18"><use href="#i-chev"/></svg></button>
      <button class="simcard card-press" data-sim="${(i + 1) % NEWS.length}"><div><span class="bd2" style="background:#E5EAFF;color:#0046FF">해결 완료</span><p>${NEWS[(i + 1) % NEWS.length].t}</p><small>공릉2동 · ${NEWS[(i + 1) % NEWS.length].end.replace('2026년 ', '')}</small></div><svg width="18" height="18"><use href="#i-chev"/></svg></button></div>`;
  $('#spv').querySelector('b').textContent = n.t;
  if (stack[stack.length - 1] === 'newsDetail') { $('#newsDetail .scroll').scrollTop = 0; } else go('newsDetail');
}
$('#ndBody').addEventListener('click', e => {
  if (e.target.closest('#helpful')) { helped.has(newsCur) ? helped.delete(newsCur) : (helped.add(newsCur), toast('이웃에게 고마움을 전했어요')); openNews(newsCur); return; }
  if (e.target.closest('#reReport')) return toConfirm(NEWS[newsCur].re);
  const s = e.target.closest('[data-sim]'); if (!s) return;
  if (s.dataset.sim === 'ing') toast('처리 중인 이웃 신고예요. 해결되면 알려드릴게요'); else openNews(+s.dataset.sim);
});
// 공지 알림 신청 (08 → 08b)
let noticeOn = false;
$('#noticeSub').onclick = () => { noticeOn = !noticeOn; const b = $('#noticeSub');
  b.className = noticeOn ? 'btn neutral' : 'btn brand'; b.style.flex = '1'; b.textContent = noticeOn ? '알림 신청됨 · 취소' : '공사 시작 전 알림 받기';
  toast(noticeOn ? '공사 시작 전날 알림을 보내드릴게요' : '알림 신청을 취소했어요'); };
// 06 지역 변경
const REGIONS = ['공릉2동', '공릉1동', '하계동', '중계본동', '상계1동', '월계동', '태릉동'];
function drawRegions() { const q = $('#rq').value.trim(); $('#rlist').innerHTML = REGIONS.filter(r => !q || r.includes(q)).slice(0, q ? 7 : 4).map(r => `<button class="${r === region ? 'on' : ''}" data-region="${r}">${r}${r === region ? '<svg width="20" height="20"><use href="#i-done"/></svg>' : ''}</button>`).join(''); }
$('#rq').addEventListener('input', drawRegions);
document.addEventListener('click', e => { const b = e.target.closest('[data-region]'); if (!b) return; region = b.dataset.region; closeLayers(); renderNews(); toast(`${region} 소식을 보여드릴게요`); });
// 07 정렬과 필터
const SORT_OPT = { 정렬: ['최신순', '오래된순'], 상태: ['전체', '해결 완료', '처리 중'], 분야: ['전체', '환경·쓰레기', '교통·시설'], 기간: ['최근 1주', '최근 1개월', '전체'] };
let sortDraft = { ...sortSel };
function drawSort() { $('#sortGroups').innerHTML = Object.entries(SORT_OPT).map(([g, os]) => `<div class="sgrp"><span>${g}</span><div>${os.map(o => `<button class="${sortDraft[g] === o ? 'on' : ''}" data-sg="${g}" data-so="${o}">${o}</button>`).join('')}</div></div>`).join(''); }
$('#sortGroups').addEventListener('click', e => { const b = e.target.closest('[data-sg]'); if (b) { sortDraft[b.dataset.sg] = b.dataset.so; drawSort(); } });
$('#sortReset').onclick = () => { sortDraft = { ...SORT_DEF }; drawSort(); };
$('#sortApply').onclick = () => { sortSel = { ...sortDraft }; closeLayers(); renderNews(); toast('필터를 적용했어요'); };
// 10 공유
document.addEventListener('click', async e => { const b = e.target.closest('[data-share]'); if (!b) return; const url = location.href.split('#')[0];
  if (b.dataset.share === 'copy') { try { await navigator.clipboard.writeText(url); toast('링크를 복사했어요'); } catch { toast('링크를 복사하지 못했어요'); } }
  else if (navigator.share) { try { await navigator.share({ title: $('#spv b').textContent, url }); } catch {} }
  else toast('이 기기에서는 공유 창을 열 수 없어요');
  closeLayers(); });
const _openLayer = openLayer;
openLayer = el => { if (el.id === 'regionSheet') { $('#rq').value = ''; drawRegions(); } if (el.id === 'sortSheet') { sortDraft = { ...sortSel }; drawSort(); } _openLayer(el); };
const _enter3 = onEnter;
onEnter = id => { _enter3(id); if (id === 'news') renderNews(); };

/* ───────── 동네 포인트 ───────── */
const won = n => n.toLocaleString('ko-KR');
let pts = 12500;
const EARN = [
  { bd: ['지급 완료', '#E5EAFF', '#0046FF'], t: '불법 주정차 신고', m: '과태료 부과 확정 · 9월 8일', v: '+5,000P', c: '#0046FF', d: { amt: '+5,000P', date: '2026년 9월 8일 지급', no: 'N-260903-041', place: '공릉2동 화랑로 51길', org: '노원구 교통지도과', s: [['신고 접수', '9월 3일'], ['현장 확인·과태료 부과 확정', '9월 6일'], ['동네 포인트 적립', '9월 8일']], mine: 'parking' } },
  { bd: ['지급 완료', '#E5EAFF', '#0046FF'], t: '쓰레기 무단투기 신고', m: '과태료 부과 확정 · 9월 5일', v: '+3,000P', c: '#0046FF', d: { amt: '+3,000P', date: '2026년 9월 5일 지급', no: 'N-260901-017', place: '공릉2동 주택가 골목', org: '노원구 청소행정과', s: [['신고 접수', '9월 1일'], ['현장 확인·과태료 부과 확정', '9월 4일'], ['동네 포인트 적립', '9월 5일']] } },
  { bd: ['지급 예정', '#FFF1DC', '#B26A00'], t: '도로 파손 신고', m: '처리 완료 후 지급 · 심사 중', v: '+4,500P', c: '#B26A00', d: { amt: '+4,500P', date: '처리 완료 후 지급 예정', no: 'N-260905-118', place: '공릉동 화랑로', org: '노원구 도로관리과', s: [['신고 접수', '9월 5일'], ['처리 완료', '9월 8일'], ['포상 심사 중', '진행 중']], mine: 'pothole', pending: 1 } },
  { bd: ['대상 아님', '#F5F8FF', '#526491'], t: '가로등 고장 신고', m: '과태료 부과 건이 아니에요', v: '—', c: '#646B7A' },
];
const USED = [
  { t: '노원구 지역상생페이 전환', m: '2026.09.11 · 바로 사용 가능', v: '-10,000P' },
  { t: '노원 이웃돌봄 기금 기부', m: '2026.08.20 · 영수증 발급됨', v: '-5,000P' },
  { t: '자동차세 1기분 충당', m: '2026.06.28 · 위택스 반영', v: '-8,000P' },
];
function renderPiggy() {
  const empty = pts === 0 && !EARN.length;
  $('#ptsBody').innerHTML = `
    <div class="phero"><span>모은 동네 포인트</span><b>${won(pts)}P</b><small>누적 포인트</small>
      <div class="ov"><div><b>8000P</b><span>이번 달</span></div><div><b>3회</b><span>포상 횟수</span></div><div><b>4,500P</b><span>지급 예정</span></div></div></div>
    <button class="rulebar" data-layer="ruleSheet"><svg width="18" height="18"><use href="#i-info"/></svg><span>동네 포인트는 과태료가 부과된 신고에만 적립돼요</span><svg width="16" height="16"><use href="#i-chev"/></svg></button>
    <div class="lhead"><b>적립 내역</b><button data-go="phist" data-tabto="earn">전체보기</button></div>
    ${empty ? `<div class="pempty"><b>아직 모은 동네 포인트가 없어요</b><p>불법 주정차나 무단투기를 신고하면<br>과태료 부과가 확정된 뒤 포인트가 쌓여요.</p><button class="btn brand" data-go="voice">신고하러 가기</button></div>`
      : EARN.map((e, i) => `<button class="hcard card-press" data-earn="${i}"><span><span class="bd" style="background:${e.bd[1]};color:${e.bd[2]}">${e.bd[0]}</span><p>${e.t}</p><small>${e.m}</small></span><em style="color:${e.c}">${e.v}</em></button>`).join('')}
    <button class="btn brand" data-go="convert" style="flex:none">전환하기</button>
    <p class="pnote" style="margin-top:0">지역상생페이·지방세 납부·기부로 전환할 수 있어요. 현금 출금은 되지 않아요.</p>`;
}
$('#ptsBody').addEventListener('click', e => { const b = e.target.closest('[data-earn]'); if (!b) return; const x = EARN[b.dataset.earn];
  if (!x.d) return toast('과태료 부과 건이 아니라 포인트 대상이 아니에요'); openEarn(x); });
function openEarn(x) {
  const d = x.d;
  $('#earnBody').innerHTML = `
    <div class="pcard2 center"><span class="bd" style="display:inline-block;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:600;background:${x.bd[1]};color:${x.bd[2]}">${x.bd[0]}</span><b style="margin:0">${d.amt}</b><span>${d.date}</span></div>
    <div class="ncard2"><b style="font-size:14px;font-weight:500">대상 민원</b><div class="kv"><span>민원</span><b>${x.t}</b></div><div class="kv"><span>접수번호</span><b>${d.no}</b></div><div class="kv"><span>신고 위치</span><b>${d.place}</b></div><div class="kv"><span>담당 기관</span><b>${d.org}</b></div></div>
    <div class="ncard2"><b style="font-size:14px;font-weight:500">지급 경위</b><div class="steps3">${d.s.map(([a, b]) => `<div><i></i><span>${a}</span><small>${b}</small></div>`).join('')}</div></div>
    ${d.mine ? `<button class="linkbtn" data-mine="${d.mine}">민원 상세 보기</button>` : ''}`;
  go('earn');
}
$('#earnBody').addEventListener('click', e => { const b = e.target.closest('[data-mine]'); if (b) openDetail(b.dataset.mine); });

// 전환 금액 입력 공통
const amtVal = box => +box.querySelector('input').value.replace(/[^0-9]/g, '') || 0;
function syncAmt(box) {
  const kind = box.dataset.amt, v = amtVal(box), ok = v > 0 && v <= pts;
  box.querySelector('input').value = v ? won(v) : '';
  box.classList.toggle('err', v > pts);
  box.querySelector('.ptBalTxt').textContent = v > pts ? `보유 포인트(${won(pts)}P)보다 많아요` : `보유 ${won(pts)}P`;
  box.querySelectorAll('[data-q]').forEach(q => q.classList.toggle('on', q.dataset.q === 'all' ? v === pts : +q.dataset.q === v));
  const scr = box.closest('.screen');
  if (kind === 'pay') { scr.querySelector('.cWon').textContent = won(v) + '원'; scr.querySelector('.cLeft').textContent = won(Math.max(0, pts - v)) + 'P'; }
  const btn = scr.querySelector('.cGo'); btn.textContent = `${won(v)}P ${kind === 'pay' ? '전환하기' : '기부하기'}`; btn.disabled = !ok; btn.style.opacity = ok ? 1 : .4;
}
document.querySelectorAll('[data-amt]').forEach(box => {
  box.querySelector('input').addEventListener('input', () => syncAmt(box));
  box.addEventListener('click', e => { const q = e.target.closest('[data-q]'); if (!q) return; box.querySelector('input').value = q.dataset.q === 'all' ? pts : q.dataset.q; syncAmt(box); });
});
// 지방세
function syncTax() { const b = $('#bills .on'), due = +b.dataset.due, use = Math.min(pts, due);
  $('.tUse').textContent = won(use) + 'P'; $('.tRemain').textContent = won(due - use) + '원'; $('.tLeft').textContent = won(pts - use) + 'P';
  const g = $('#ctax .cGo'); g.textContent = `${won(use)}P 충당하기`; g.disabled = !use; g.style.opacity = use ? 1 : .4; }
$('#bills').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; [...$('#bills').children].forEach(x => x.classList.toggle('on', x === b)); syncTax(); });
$('#orgs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; [...$('#orgs').children].forEach(x => { x.classList.toggle('on', x === b); x.querySelector('use').setAttribute('href', x === b ? '#i-radio-on' : '#i-radio-off'); }); });
$('#receipt').onclick = () => { const c = $('#receipt'); c.classList.toggle('on'); c.querySelector('use').setAttribute('href', c.classList.contains('on') ? '#i-box-on' : '#i-box-off'); };
// 전환 실행 → 09 / 09b / 09c
document.querySelectorAll('.cGo').forEach(b => b.onclick = () => {
  const kind = b.dataset.kind, d = new Date(), p = n => String(n).padStart(2, '0');
  const when = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${p(d.getHours())}:${p(d.getMinutes())}`;
  let v, title, sub, rows, note, link;
  if (kind === 'pay') { v = amtVal($('#cpay [data-amt]')); title = '지역상생페이로 전환했어요'; sub = '동네 가맹점에서 바로 사용할 수 있어요.'; rows = [['전환 금액', won(v) + '원', 1], ['전환처', '노원구 지역상생페이']]; note = '사용은 지역상생페이 앱에서 할 수 있어요. 잔액은 그쪽에서 확인해주세요.'; link = '전환 내역 보기'; USED.unshift({ t: '노원구 지역상생페이 전환', m: '방금 · 바로 사용 가능', v: `-${won(v)}P` }); }
  if (kind === 'tax') { const bill = $('#bills .on'); v = Math.min(pts, +bill.dataset.due); title = '지방세 납부에 사용했어요'; sub = '다음 고지서에 자동으로 반영돼요.'; rows = [['전환 금액', won(v) + '원', 1], ['충당 대상', bill.dataset.bill]]; note = '납부 내역은 위택스에서도 확인할 수 있어요.'; link = '납부 내역 보기'; USED.unshift({ t: bill.dataset.bill + ' 충당', m: '방금 · 위택스 반영 예정', v: `-${won(v)}P` }); }
  if (kind === 'don') { v = amtVal($('#cdon [data-amt]')); const org = $('#orgs .on').dataset.org; title = '기부했어요'; sub = `${org}에 전달됐어요.`; rows = [['기부 금액', won(v) + '원', 1], ['기부처', org]]; note = $('#receipt').classList.contains('on') ? '기부금 영수증은 다음 달 초에 발급돼요.' : '기부금 영수증은 받지 않기로 했어요.'; link = '기부 내역 보기'; USED.unshift({ t: org + ' 기부', m: '방금 · ' + (note.includes('발급돼요') ? '영수증 발급 예정' : '영수증 없음'), v: `-${won(v)}P` }); }
  pts -= v;
  rows.push(['남은 포인트', won(pts) + 'P'], ['전환 일시', when]);
  $('#cdoneBody').innerHTML = `<span class="okic"><svg width="38" height="38"><use href="#i-check"/></svg></span><p class="h-title center" style="margin-top:0">${title}</p><p class="center" style="margin-top:-6px;font-size:12px;line-height:18px;color:var(--text-2)">${sub}</p>
    <div class="ncard2">${rows.map(([a, b, hl]) => `<div class="kv2" style="align-items:center"><span>${a}</span>${hl ? `<b style="font-size:16px;font-weight:700;color:var(--primary)">${b}</b>` : `<b style="font-size:14px;font-weight:500;color:var(--text)">${b}</b>`}</div>`).join('')}</div>
    <p class="pinfo"><svg width="18" height="18"><use href="#i-info"/></svg>${note}</p>
    <div class="actions"><button class="btn neutral" data-backto="piggy" style="width:130px">저금통으로</button><button class="btn brand" data-backto="piggy" data-then="phist">${link}</button></div>`;
  replace('cdone');
});
// 화면 기록을 되감아 특정 화면으로 (저금통으로)
document.addEventListener('click', e => { const b = e.target.closest('[data-backto]'); if (!b) return; const to = b.dataset.backto, then = b.dataset.then;
  const from = stack[stack.length - 1]; while (stack.length > 1 && stack[stack.length - 1] !== to) stack.pop();
  if (stack[stack.length - 1] !== to) stack.push(to);
  show(from, to, true); onLeave(from); if (then) setTimeout(() => { phTab = 'use'; go(then); }, 340); });
// 10 포인트 내역
let phTab = 'use';
function renderHist() {
  [...$('#phTabs').children].forEach(b => b.classList.toggle('on', b.dataset.ph === phTab));
  $('#phList').innerHTML = (phTab === 'use' ? USED.map(u => `<div class="hcard"><span><span class="bd" style="background:#F5F8FF;color:#526491">사용</span><p>${u.t}</p><small>${u.m}</small></span><em>${u.v}</em></div>`)
    : EARN.map(e => `<div class="hcard"><span><span class="bd" style="background:${e.bd[1]};color:${e.bd[2]}">${e.bd[0]}</span><p>${e.t}</p><small>${e.m}</small></span><em style="color:${e.c}">${e.v}</em></div>`)).join('');
}
$('#phTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { phTab = b.dataset.ph; renderHist(); } });
document.addEventListener('click', e => { const b = e.target.closest('[data-tabto]'); if (b) phTab = b.dataset.tabto; }, true);
const _enter4 = onEnter;
onEnter = id => { _enter4(id);
  if (id === 'piggy') renderPiggy();
  if (id === 'convert') document.querySelectorAll('.ptBal').forEach(x => x.textContent = won(pts) + 'P');
  if (id === 'cpay' || id === 'cdon') syncAmt(document.querySelector(`#${id} [data-amt]`));
  if (id === 'ctax') syncTax();
  if (id === 'phist') renderHist(); };

/* ───────── 내 화면 · 설정 ───────── */
const prefs = { '전체 알림': true, '처리 상태 알림': true, '지역 소식 알림': false, '큰 글씨 모드': false, '고대비 모드': false };
const SET = [
  ['계정', [['i-acct', '프로필 관리', 'profile'], ['i-signin', '로그인 계정 관리', 'account']]],
  ['알림', [['i-bell', '전체 알림', 0], ['i-update', '처리 상태 알림', 0], ['i-notice', '지역 소식 알림', 0]]],
  ['화면 · 접근성', [['i-zoomin', '큰 글씨 모드', 0], ['i-eye', '고대비 모드', 0]]],
  ['보안', [['i-lock', '비밀번호 변경', 'pw'], ['i-security', '개인정보 처리방침', 'privacy']]],
  ['기타', [['i-info', '버전 정보', '1.0.0'], [null, '로그아웃', 'logout']]],
];
function renderSettings() {
  $('#setBody').innerHTML = SET.map(([g, rows]) => `<div class="setg" data-g="${g}"><span>${g}</span><div class="menu">${rows.map(([ic, t, a]) => {
    if (a === 'logout') return `<button class="out" data-layer="logoutDlg">로그아웃</button>`;
    const right = a === 0 ? `<span class="toggle ${prefs[t] ? '' : 'off'}"></span>` : a === '1.0.0' ? `<em>1.0.0</em>` : `<svg width="16" height="16"><use href="#i-chev"/></svg>`;
    return `<button data-set="${t}" ${typeof a === 'string' && a !== '1.0.0' ? `data-go="${a}"` : ''}><span class="mi"><svg width="16" height="16"><use href="#${ic}"/></svg></span>${t}${right}</button>`; }).join('')}</div></div>`).join('');
}
function applyPrefs() {
  document.documentElement.classList.toggle('hc', prefs['고대비 모드']);
  window.bigScale = prefs['큰 글씨 모드'] ? 1.08 : 1; fit();
}
$('#setBody').addEventListener('click', e => { const b = e.target.closest('[data-set]'); if (!b || !(b.dataset.set in prefs)) return;
  const t = b.dataset.set; prefs[t] = !prefs[t]; b.querySelector('.toggle').classList.toggle('off', !prefs[t]);
  if (t === '큰 글씨 모드' || t === '고대비 모드') applyPrefs();
  toast(`${t}${prefs[t] ? '을 켰어요' : '을 껐어요'}`.replace('모드을', '모드를').replace('알림을', '알림을')); });
let setScroll = null;
document.addEventListener('click', e => { const b = e.target.closest('[data-sec]'); if (b) setScroll = b.dataset.sec; }, true);
function renderMe() { $('#meIng').textContent = `진행중 ${mine.filter(m => m.st !== '완료').length}건`; $('#mePts').textContent = won(pts) + 'P'; }
$('#logoutGo').onclick = () => { closeLayers(); toast('로그아웃했어요'); setTimeout(() => (typeof goLogin === 'function' ? goLogin() : tab('home')), 300); };
// 계정 연결
const LINK = [['카카오', '#FEE500', '#191600', 'K', 'chan***@kakao.com'], ['네이버', '#03C75A', '#FFFFFF', 'N', null], ['애플', '#000000', '#FFFFFF', '', null]];
function renderLinked() { $('#linked').innerHTML = LINK.map((l, i) => `<button class="acc" data-ln="${i}"><i style="background:${l[1]};color:${l[2]}">${l[3]}</i><span>${l[0]}<small>${l[4] ? '연결됨 · ' + l[4] : '연결 안 됨'}</small></span><em>${l[4] ? '해제' : '연결'}</em></button>`).join(''); }
$('#linked').addEventListener('click', e => { const b = e.target.closest('[data-ln]'); if (!b) return; const l = LINK[b.dataset.ln];
  if (l[4]) { if (LINK.filter(x => x[4]).length < 2) return toast('연결된 계정이 하나뿐일 때는 해제할 수 없어요'); l[4] = null; toast(`${l[0]} 연결을 해제했어요`); }
  else { l[4] = l[0] === '네이버' ? 'chan***@naver.com' : 'chan***@icloud.com'; toast(`${l[0]} 계정을 연결했어요`); } renderLinked(); });
// 비밀번호 변경 (입력 검증)
const pwOk = v => v.length >= 8 && /\d/.test(v) && /[a-zA-Z가-힣]/.test(v);
function checkPw() { const a = $('#pw1').value, b = $('#pw2').value;
  $('#pw1m').textContent = !a ? '' : pwOk(a) ? '사용할 수 있는 비밀번호예요' : '8자 이상, 숫자와 문자를 함께 써주세요'; $('#pw1m').className = !a ? '' : pwOk(a) ? 'good' : 'bad';
  $('#pw2m').textContent = !b ? '' : a === b ? '비밀번호가 같아요' : '비밀번호가 서로 달라요'; $('#pw2m').className = !b ? '' : a === b ? 'good' : 'bad'; }
['#pw1', '#pw2'].forEach(s => $(s).addEventListener('input', checkPw));
$('#pwGo').onclick = () => { if (!$('#pw0').value) return toast('현재 비밀번호를 입력해주세요'); if (!pwOk($('#pw1').value) || $('#pw1').value !== $('#pw2').value) return toast('새 비밀번호를 다시 확인해주세요');
  ['#pw0', '#pw1', '#pw2'].forEach(s => $(s).value = ''); checkPw(); toast('비밀번호를 바꿨어요'); back(); };
// 프로필
document.addEventListener('change', e => { if (e.target.id === 'nick') { toast('닉네임을 바꿨어요'); document.querySelector('.pn b').textContent = e.target.value || '찬희님'; } });
const _pickChange = $('#picker').onchange;
$('#picker').onchange = e => { if (pickFor === 'avatar') { const f = e.target.files[0]; if (f) { const u = `url(${URL.createObjectURL(f)})`; document.querySelectorAll('.av').forEach(a => a.style.backgroundImage = u); toast('프로필 사진을 바꿨어요'); } e.target.value = ''; return; } _pickChange(e); };
// FAQ
const FAQ = [
  ['접수', '접수한 민원을 취소할 수 있나요?', '담당 기관이 배정되기 전(접수됨·검토 중)에는 내 민원 › 민원 상세에서 바로 취소할 수 있어요. 처리 중인 민원은 문의하기로 요청해주세요.'],
  ['처리', '처리가 얼마나 걸리나요?', '유형에 따라 다르지만 보통 접수 후 3~5일 안에 처리돼요. 단계가 바뀔 때마다 알림으로 알려드려요.'],
  ['처리', '담당 기관이 바뀌면 다시 신고해야 하나요?', '아니요. 기관이 바뀌어도 접수 내용은 그대로 넘어가요. 다시 신고하지 않아도 돼요.'],
  ['포인트', '동네 포인트는 어떻게 적립되나요?', '불법 주정차·무단투기처럼 과태료가 부과되는 신고가 확정되면 적립돼요. 기준은 동네 포인트 화면에서 볼 수 있어요.'],
  ['포인트', '포인트를 현금으로 받을 수 있나요?', '현금 출금은 안 돼요. 지역상생페이 전환, 지방세 충당, 기부로 쓸 수 있어요.'],
  ['접수', '사진 없이도 신고할 수 있나요?', '네. 말이나 글로 설명만 해도 접수돼요. 사진이 있으면 담당 기관이 더 빨리 확인할 수 있어요.'],
];
let faqF = '전체';
function renderFaq() { const q = $('#fq').value.trim();
  $('#fchips').innerHTML = ['전체', '접수', '처리', '포인트'].map(c => `<button class="${c === faqF ? 'on' : ''}" data-fc="${c}">${c}</button>`).join('');
  const list = FAQ.filter(([c, t, a]) => (faqF === '전체' || c === faqF) && (!q || (t + a).includes(q)));
  $('#faqs').innerHTML = list.map(([c, t, a]) => `<div class="faq"><button><em>${c}</em><b>${t}</b><svg width="16" height="16"><use href="#i-chev"/></svg></button><p>${a}</p></div>`).join('') || '<p class="empty">찾는 질문이 없어요. 고객센터로 문의해주세요</p>'; }
$('#fq').addEventListener('input', renderFaq);
$('#fchips').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { faqF = b.dataset.fc; renderFaq(); } });
$('#faqs').addEventListener('click', e => { const f = e.target.closest('.faq'); if (f && e.target.closest('button')) f.classList.toggle('open'); });
// 고객센터 문의 → 07c
$('#csType').addEventListener('click', e => { const b = e.target.closest('button'); if (b) [...$('#csType').children].forEach(x => x.classList.toggle('on', x === b)); });
$('#csGo').onclick = () => { const t = $('#cs textarea'); if (!t.value.trim()) return toast('문의 내용을 적어주세요');
  const n = document.querySelector('[data-thumbs="cs"]').children.length, d = new Date(), p = x => String(x).padStart(2, '0');
  $('#csInfo').innerHTML = `<div class="hd"><b>문의 정보</b><span class="tag">접수됨</span></div><div class="kv"><span>문의 유형</span><b>${$('#csType .on').textContent}</b></div><div class="kv"><span>첨부</span><b>${n ? `화면 캡처 ${n}장` : '없음'}</b></div><div class="kv"><span>접수 번호</span><b>CS-${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.floor(Math.random() * 900) + 100}</b></div><div class="kv"><span>답변 예정</span><b>${d.getMonth() + 1}월 ${d.getDate() + 2}일까지</b></div>`;
  t.value = ''; document.querySelector('[data-thumbs="cs"]').innerHTML = ''; replace('csdone'); };
const _enter5 = onEnter;
onEnter = id => { _enter5(id);
  if (id === 'me') renderMe();
  if (id === 'settings') { renderSettings(); if (setScroll) { const g = document.querySelector(`.setg[data-g="${setScroll}"]`); setTimeout(() => g && g.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350); setScroll = null; } else $('#settings .scroll').scrollTop = 0; }
  if (id === 'account') renderLinked();
  if (id === 'faq') { $('#fq').value = ''; faqF = '전체'; renderFaq(); } };

/* ───────── 진입·인증 ───────── */
const seen = (() => { try { return sessionStorage.getItem('gukmin-seen') === '1'; } catch { return false; } })();
function markSeen() { try { sessionStorage.setItem('gukmin-seen', '1'); } catch {} }
function goLogin() { $('#lerr').textContent = ''; $('#llinks').hidden = true; tab('login'); }
// 처음 열면 스플래시 → 로그인, 한 번 본 뒤에는 바로 홈
if (!seen) { $('#home').classList.remove('active'); $('#splash').classList.add('active'); stack[0] = 'splash'; setTimeout(() => tab('login'), 1600); }
let loginFail = 0;
$('#loginGo').onclick = () => {
  const id = $('#lid').value.trim(), pw = $('#lpw').value;
  if (!id || pw.length < 4) { loginFail = Math.min(5, loginFail + 1); $('#lerr').textContent = `아이디 또는 비밀번호가 맞지 않아요. 5회 틀리면 잠시 잠겨요. (${loginFail}/5)`; $('#llinks').hidden = false; return; }
  toast('로그인했어요'); go('verify');
};
let snsName = '카카오';
document.addEventListener('click', e => { const b = e.target.closest('[data-sns]'); if (!b) return; snsName = b.dataset.sns;
  const c = { 카카오: ['#FEE500', '#191600', 'K'], 네이버: ['#03C75A', '#FFFFFF', 'N'], 애플: ['#000000', '#FFFFFF', ''], 구글: ['#FFFFFF', '#4285F4', 'G'] }[snsName];
  $('#csnT').textContent = snsName + ' 로그인'; $('#csnL').textContent = snsName + (snsName === '네이버' ? ' 아이디' : ' 계정');
  Object.assign($('#csnI').style, { background: c[0], color: c[1], border: snsName === '구글' ? '1px solid #E4EAF7' : '0' }); $('#csnI').textContent = c[2];
  $('#csnGo').className = 'btn sns-go' + (snsName === '네이버' ? ' naver' : ''); if (snsName === '애플' || snsName === '구글') Object.assign($('#csnGo').style, { background: 'var(--primary)', color: 'var(--on-brand)' }); else $('#csnGo').style.cssText = '';
  go('consent'); });
$('#agrees').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.req) return toast('닉네임은 꼭 필요한 정보예요'); b.classList.toggle('on'); b.querySelector('use').setAttribute('href', b.classList.contains('on') ? '#i-box-on' : '#i-box-off'); });
$('#csnGo').onclick = () => { toast(`${snsName} 계정으로 로그인했어요`); replace('verify'); };
$('#csnNo').onclick = () => { back(); $('#lerr').textContent = `${snsName} 로그인을 취소했어요. 다른 방법으로도 시작할 수 있어요.`; };
// 본인인증 → 인증번호
let otpTimer = null, otpLeft = 180;
$('#vSend').onclick = () => {
  const ph = $('#vPhone').value.replace(/[^0-9]/g, '');
  if (ph.length < 10) return toast('휴대폰 번호를 확인해주세요');
  $('#otpSub').textContent = `${$('#vPhone').value}로 6자리 숫자를 보냈어요.`; $('#otpIn').value = ''; drawOtp(); go('otp');
  otpLeft = 180; clearInterval(otpTimer); otpTimer = setInterval(() => { otpLeft = Math.max(0, otpLeft - 1); $('#otpT').textContent = `남은 시간 ${Math.floor(otpLeft / 60)}:${String(otpLeft % 60).padStart(2, '0')}`; }, 1000);
  setTimeout(() => toast('시연용 인증번호: 482915'), 900);
};
function drawOtp() { const v = $('#otpIn').value.replace(/\D/g, '').slice(0, 6); $('#otpIn').value = v;
  $('#otpBox').innerHTML = [...Array(6)].map((_, i) => `<i class="${i === v.length ? 'cur' : ''}">${v[i] || ''}</i>`).join('');
  $('#otpGo').style.opacity = v.length === 6 ? 1 : .4; }
$('#otpIn').addEventListener('input', drawOtp);
$('#otpRe').onclick = () => { otpLeft = 180; $('#otpIn').value = ''; drawOtp(); toast('인증번호를 다시 보냈어요'); };
$('#otpGo').onclick = () => { if ($('#otpIn').value.length < 6) return toast('6자리를 모두 입력해주세요'); clearInterval(otpTimer); toast('본인인증을 완료했어요'); go('nbhd'); };
// 동네 설정
const NB = ['공릉2동', '공릉1동', '하계동', '중계본동', '상계1동', '월계동', '태릉동'];
let nbSel = '공릉2동';
function drawNb() { const q = $('#nbq').value.trim(); $('#nbList').innerHTML = NB.filter(n => !q || n.includes(q)).slice(0, q ? 7 : 4).map(n => `<button class="${n === nbSel ? 'on' : ''}" data-nb="${n}"><span><b>${n}</b><small>서울 노원구</small></span><svg width="22" height="22"><use href="#${n === nbSel ? 'i-radio-on' : 'i-radio-off'}"/></svg></button>`).join('') || '<p class="empty">찾는 동네가 없어요</p>';
  $('#nbGo').textContent = `${nbSel}${/[가-힣]/.test(nbSel) && (nbSel.charCodeAt(nbSel.length - 1) - 0xAC00) % 28 ? '으로' : '로'} 시작하기`; }
$('#nbq').addEventListener('input', drawNb);
$('#nbList').addEventListener('click', e => { const b = e.target.closest('[data-nb]'); if (b) { nbSel = b.dataset.nb; drawNb(); } });
$('#nbGps').onclick = () => { const done = () => { nbSel = '공릉2동'; $('#nbq').value = ''; drawNb(); toast('현재 위치는 공릉2동이에요'); };
  if (navigator.geolocation) navigator.geolocation.getCurrentPosition(done, done, { timeout: 4000 }); else done(); };
$('#nbGo').onclick = () => { region = nbSel; go('perm'); };
$('#permGo').onclick = () => { if (navigator.geolocation) navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 3000 }); go('onb'); };
// 온보딩
const sl = $('#slides');
const onbIdx = () => Math.round(sl.scrollLeft / sl.clientWidth);
sl.addEventListener('scroll', () => { const i = onbIdx(); [...$('#dots').children].forEach((d, k) => d.classList.toggle('on', k === i)); $('#onbGo').textContent = i === 2 ? '시작하기' : '다음'; });
function finishOnb() { markSeen(); tab('home'); setTimeout(() => toast(`${region}에서 시작해요`), 400); }
$('#onbGo').onclick = () => { const i = onbIdx(); if (i >= 2) return finishOnb(); sl.scrollTo({ left: (i + 1) * sl.clientWidth, behavior: 'smooth' }); };
$('#onbSkip').onclick = finishOnb;
const _enter6 = onEnter;
onEnter = id => { _enter6(id);
  if (id === 'nbhd') { $('#nbq').value = ''; drawNb(); }
  if (id === 'onb') sl.scrollLeft = 0;
  if (id === 'login') { $('#lpw').value = ''; } };
requestAnimationFrame(() => requestAnimationFrame(() => app.classList.remove('boot'))); // 첫 화면은 미끄러지지 않게
