const $ = s => document.querySelector(s);
const app = $('#app');
app.addEventListener('scroll', () => { app.scrollLeft = 0; app.scrollTop = 0; }); // clip 미지원 브라우저용

// 화면 맞춤: 폰은 가로를 꽉 채우고, 넓은 화면은 높이에 맞춘 세로 기둥으로
function fit() {
  const vv = window.visualViewport || { width: innerWidth, height: innerHeight };
  const z = innerWidth < 600 ? innerWidth / 402 : Math.min(1, innerHeight / 874);
  document.documentElement.style.setProperty('--z', z);
  document.documentElement.style.setProperty('--h', (vv.height / z) + 'px');
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
function toConfirm(text, photo) {
  state.text = text; state.photo = photo || null;
  const q = $('#quote'); q.innerHTML = '';
  if (photo) { const img = new Image(); img.src = photo; q.append(img); }
  q.append(document.createTextNode(photo ? '사진에서 도로 파손이 보여요. 위치는 사진과 함께 기록됐어요.' : '“' + text + '”'));
  $('#cSub').textContent = photo ? '찍어주신 사진을 바탕으로 가장 알맞은 유형을 찾았어요.' : '말씀하신 내용을 바탕으로 가장 알맞은 유형을 찾았어요.';
  setType(photo ? TYPES[2] : classify(text));
  go('confirm');
}

// 유형 변경 시트
$('#types').innerHTML = TYPES.map((t, i) => `<button data-i="${i}">${t.k}</button>`).join('');
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
$('#submit').onclick = () => {
  $('#loading').classList.add('on');
  setTimeout(() => {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    const no = `N-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${String(Math.floor(Math.random() * 900) + 100)}`;
    $('#dNo').textContent = no;
    $('#dType').textContent = state.type.name;
    addMine(no, d);
    $('#loading').classList.remove('on');
    go('done');
  }, 1300);
};

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
$('#photoCard').onclick = () => $('#camera').click();
$('#camera').onchange = e => { const f = e.target.files[0]; if (f) toConfirm('', URL.createObjectURL(f)); e.target.value = ''; };

function onEnter(id) {
  if (id === 'live') renderLive();
  if (id === 'voice') { resetVoice(); if (pending) { const t = pending; pending = null; setTimeout(() => fakeType(t), 350); } }
  if (id === 'text') setTimeout(() => $('#msg').focus(), 350);
}
function onLeave(id) { if (id === 'voice') resetVoice(); }

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
  { bd: ['포인트', '#F5F8FF', '#526491'], t: '동네 포인트 5,000P가 적립됐어요', m: '불법 주정차 신고 · 9월 8일', to: () => toast('포상 저금통은 다음 업데이트에서 열려요') },
  { bd: ['동네 소식', '#F5F8FF', '#526491'], t: '공릉2동 상수도 공사 안내', m: '9월 15일부터 단수 · 9월 9일', to: () => toast('동네 공지는 다음 업데이트에서 열려요') },
];
function renderNotis() {
  $('#notis').innerHTML = notis.map((n, i) => `<button class="ncard card-press ${n.unread ? 'new' : ''}" data-n="${i}">${n.unread ? '<i class="u"></i>' : ''}<div>
    <span class="bd" style="background:${n.bd[1]};color:${n.bd[2]}">${n.bd[0]}</span><p>${n.t}</p><small>${n.m}</small></div></button>`).join('');
}
$('#notis').addEventListener('click', e => { const b = e.target.closest('.ncard'); if (!b) return; const n = notis[b.dataset.n]; n.unread = false; renderNotis(); n.to(); });
renderNotis();
const _enter = onEnter;
onEnter = id => { _enter(id); if (id === 'noti') renderNotis(); };
