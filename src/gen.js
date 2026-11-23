/* ───────── 공통 ───────── */
const rand = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rand(a.length)];
const between = (lo, hi) => lo + rand(hi - lo + 1);
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// limit: 타임어택 제한시간(초). speed: 속도만 겨루는 게임 → 시간 무제한 모드에서는 빠진다.
// style: turn(기기를 돌려 가며 각자 자기 문제) · secret(각자 몰래 선택 후 공개) · party(다같이 한 화면). minP: 최소 인원
const TYPES = {
  // 수학
  calc24:   { emoji: '🧮', label: '숫자 조합',     cat: '수학', limit: 45, desc: '네 숫자를 한 번씩만 써서 목표 숫자를 만들어라' },
  mental:   { emoji: '⚡', label: '암산 질주',     cat: '수학', limit: 40, desc: '암산 5문제를 최대한 빨리. 4개 이상 맞히면 득점' },
  sequence: { emoji: '🔢', label: '수열 추리',     cat: '수학', limit: 35, desc: '규칙을 찾아 ?에 들어갈 수를 맞혀라' },
  fruit:    { emoji: '🍎', label: '과일 방정식',   cat: '수학', limit: 45, desc: 'SNS에서 유행한 그 문제. 과일 값을 구해 마지막 식을 계산하라 (곱셈 먼저!)' },
  clock:    { emoji: '🕐', label: '시계 각도',     cat: '수학', limit: 35, desc: '시침과 분침 사이의 작은 각도는 몇 도?' },
  magic:    { emoji: '🔮', label: '마방진',        cat: '수학', limit: 45, desc: '가로·세로·대각선의 합이 모두 같다. ?에 들어갈 수는?' },
  pyramid:  { emoji: '🔺', label: '숫자 피라미드', cat: '수학', limit: 45, desc: '각 칸은 바로 아래 두 칸의 합. ?를 구하라' },
  ops:      { emoji: '➕', label: '연산자 넣기',   cat: '수학', limit: 45, desc: '빈칸에 + − × ÷ 를 넣어 등식을 완성하라 (곱셈·나눗셈 먼저)' },
  word:     { emoji: '📝', label: '문장제',        cat: '수학', limit: 50, desc: '닭과 토끼, 나이, 일률, 소금물… 숫자는 매번 바뀐다' },
  // 상식
  fermi:    { emoji: '📏', label: '어림 감각',     cat: '상식', limit: 25, desc: '정답에 가까운 수를 찍어라' },
  trivia:   { emoji: '🧠', label: '상식 번개',     cat: '상식', limit: 15, desc: '4지선다. 빠를수록 점수가 높다' },
  timeline: { emoji: '📜', label: '역사 줄 세우기', cat: '상식', limit: 25, desc: '사건들을 오래된 순서대로 눌러라' },
  chosung:  { emoji: '🔤', label: '초성 퀴즈',     cat: '상식', limit: 25, desc: '초성과 분류만 보고 단어를 맞혀라' },
  // 퍼즐
  liar:     { emoji: '🕵️', label: '범인 추리',     cat: '퍼즐', limit: 45, desc: '진실을 말한 사람 수로 범인을 가려내라' },
  code:     { emoji: '🔐', label: '금고 털기',     cat: '퍼즐', limit: 60, desc: '숫자야구 단서로 비밀번호를 찾아라' },
  lights:   { emoji: '💡', label: '불 끄기',       cat: '퍼즐', limit: 60, desc: '누르면 자신과 상하좌우가 뒤집힌다. 모든 불을 꺼라' },
  sudoku:   { emoji: '🔢', label: '미니 스도쿠',   cat: '퍼즐', limit: 75, desc: '가로·세로·굵은 칸마다 숫자가 한 번씩' },
  nono:     { emoji: '⬛', label: '노노그램',      cat: '퍼즐', limit: 80, desc: '숫자 단서대로 칸을 칠해 그림을 완성하라' },
  match:    { emoji: '🔥', label: '성냥개비',      cat: '퍼즐', limit: 60, desc: '성냥개비 딱 하나만 옮겨서 식을 참으로 만들어라' },
  knights:  { emoji: '😇', label: '기사와 건달',   cat: '퍼즐', limit: 60, desc: '기사는 늘 참, 건달은 늘 거짓만 말한다. 누가 기사일까?' },
  zebra:    { emoji: '🦓', label: '논리 그리드',   cat: '퍼즐', limit: 70, desc: '단서를 조합해 누가 무엇을 가졌는지 밝혀라' },
  coin:     { emoji: '⚖️', label: '가짜 동전',     cat: '퍼즐', limit: 50, desc: '저울 결과를 보고 무게가 다른 가짜 동전을 찾아라' },
  paths:    { emoji: '🗺️', label: '최단 경로',     cat: '퍼즐', limit: 50, desc: '오른쪽·아래로만 갈 때, 출발에서 도착까지 길은 몇 가지?' },
  // 두뇌
  memory:   { emoji: '🟦', label: '패턴 기억',     cat: '두뇌', limit: 16, desc: '잠깐 빛나는 칸을 그대로 눌러라' },
  simon:    { emoji: '🎹', label: '순서 기억',     cat: '두뇌', limit: 25, desc: '하나씩 빛나는 순서를 그대로 따라 눌러라' },
  digits:   { emoji: '📟', label: '숫자 기억',     cat: '두뇌', limit: 16, desc: '잠깐 보인 숫자를 그대로, 때로는 거꾸로' },
  count:    { emoji: '👀', label: '순간 포착',     cat: '두뇌', limit: 18, desc: '잠깐 보이는 그림 속 특정 그림의 개수를 세라' },
  stroop:   { emoji: '🎨', label: '색깔 함정',     cat: '두뇌', limit: 25, speed: true, desc: '글자 뜻과 색이 다르다. 묻는 것만 골라라' },
  odd:      { emoji: '🔍', label: '틀린 하나',     cat: '두뇌', limit: 20, speed: true, desc: '비슷한 것들 사이에 숨은 딱 하나를 찾아라' },
  schulte:  { emoji: '🔟', label: '순서대로 터치', cat: '두뇌', limit: 40, speed: true, desc: '1부터 차례대로 최대한 빨리 눌러라' },
  // 심리 (서바이벌 예능에서 나온 게임들)
  beauty:   { emoji: '🎯', label: '평균의 함정',   cat: '심리', limit: 20, social: true, desc: '모두의 평균 × 배율에 가장 가까운 사람이 승리 (배율은 매번 바뀐다)' },
  minority: { emoji: '⚖️', label: '소수결',        cat: '심리', limit: 15, social: true, desc: '두 선택지 중 사람이 더 적은 쪽이 승리' },
  lowest:   { emoji: '🥷', label: '최저 유일수',   cat: '심리', limit: 15, social: true, desc: '나만 고른 수 중 가장 작은 수가 승리' },
  split:    { emoji: '🗡️', label: '배신의 금고',   cat: '심리', limit: 15, social: true, desc: '모두 협력하면 다 같이 이득. 혼자 배신하면 대박, 다 배신하면 공멸' },
  indian:   { emoji: '🎴', label: '인디언 포커',   cat: '심리', limit: 20, social: true, desc: '내 카드만 안 보인다. 남의 카드를 보고 승부할지 포기할지' },
  goods:    { emoji: '💰', label: '공공재 게임',   cat: '심리', limit: 20, social: true, desc: '공동 금고에 낸 돈은 불어나서 모두에게 똑같이 나뉜다. 얼마나 낼까?' },
  auction:  { emoji: '🔨', label: '블라인드 경매', cat: '심리', limit: 25, social: true, desc: '숨은 숫자들의 합이 상품 가치. 나는 그중 하나만 안다. 최고가 낙찰!' },
  rps:      { emoji: '✊', label: '단체 가위바위보', cat: '심리', limit: 12, social: true, desc: '두 가지만 나오면 승부, 한 가지나 세 가지 다 나오면 무승부' },
  telepathy:{ emoji: '💞', label: '이심전심',      cat: '심리', limit: 15, social: true, minP: 3, desc: '다른 사람과 같은 답을 고를수록 점수! 남들은 뭘 고를까?' },
  // 파티 (다같이 한 화면을 둘러싸고)
  hap:      { emoji: '🃏', label: '결! 합!',       cat: '파티', limit: 150, style: 'party', desc: '더 지니어스의 그 게임. 「합」을 찾으면 버저! 더 없다고 생각되면 「결」! 판이 끝날 때까지 계속된다' },
  pair:     { emoji: '👯', label: '짝꿍 그림',     cat: '파티', limit: 90, style: 'party', desc: '두 카드에 딱 하나 겹치는 그림이 있다. 먼저 찾은 사람이 버저!' },
  quiz:     { emoji: '🔔', label: '버저 퀴즈',     cat: '파티', limit: 150, style: 'party', minP: 2, desc: '문제를 보고 아는 사람이 먼저 버저! 틀리면 그 문제는 다시 못 누른다' },
  reaction: { emoji: '🚦', label: '반응속도',      cat: '파티', limit: 60, style: 'party', minP: 2, speed: true, desc: '화면이 초록색이 되는 순간 자기 버튼을 눌러라. 먼저 누르면 감점!' },
  nunchi:   { emoji: '🙈', label: '눈치 게임',     cat: '파티', limit: 20, style: 'party', minP: 3, desc: '한 명씩 차례로 버튼! 동시에 누르면 둘 다 탈락, 끝까지 못 누르면 탈락' },
  updown:   { emoji: '💣', label: '업다운 폭탄',   cat: '파티', limit: 12, style: 'party', minP: 2, desc: '숨은 폭탄 숫자를 피해 차례로 숫자를 부른다. 폭탄을 부르면 펑!' },
  g369:     { emoji: '👏', label: '369 게임',      cat: '파티', limit: 3, style: 'party', minP: 2, desc: '차례대로 숫자를 세다가 규칙에 걸리면 짝! 규칙과 시작 숫자는 매번 바뀐다' },
  hilo:     { emoji: '📈', label: '하이 로우',     cat: '파티', limit: 8, style: 'party', desc: '다음 카드가 더 높을까 낮을까? 연속으로 맞힐수록 점수가 쌓인다' },
  stopwatch:{ emoji: '⏱️', label: '타이밍 스톱',   cat: '파티', limit: 30, style: 'party', desc: '눈 감고도 시간을 셀 수 있을까? 목표 시간에 가장 가깝게 멈춰라' },
  liarw:    { emoji: '🤥', label: '라이어 게임',   cat: '파티', limit: 120, style: 'party', minP: 3, desc: '모두 같은 제시어를 받지만 라이어만 모른다. 설명을 듣고 라이어를 찾아라' },
};
for (const t of Object.values(TYPES)) { if (!t.style) t.style = t.social ? 'secret' : 'turn'; if (!t.minP) t.minP = t.social ? 2 : 1; }

const SABOTAGE = {
  fog:    { emoji: '🌫️', label: '안개',     desc: '다음 문제를 5초간 흐리게' },
  mirror: { emoji: '🪞', label: '거울',     desc: '다음 문제를 좌우 반전' },
  shrink: { emoji: '⏳', label: '시간 단축', desc: '다음 제한시간 35% 삭감', timeOnly: true },
  steal:  { emoji: '🫳', label: '점수 강탈', desc: '즉시 40점을 빼앗는다' },
};

/* ───────── 숫자 조합 ───────── */
function solveTarget(nums, target) {
  let found = null, count = 0;
  (function rec(items) {
    if (items.length === 1) { const it = items[0]; if (it.d === 1 && it.n === target) { count++; if (!found) found = it.e; } return; }
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j], rest = items.filter((_, k) => k !== i && k !== j);
      const c = [
        { n: a.n * b.d + b.n * a.d, d: a.d * b.d, e: `(${a.e}+${b.e})` },
        { n: a.n * b.d - b.n * a.d, d: a.d * b.d, e: `(${a.e}-${b.e})` },
        { n: b.n * a.d - a.n * b.d, d: a.d * b.d, e: `(${b.e}-${a.e})` },
        { n: a.n * b.n, d: a.d * b.d, e: `(${a.e}*${b.e})` },
      ];
      if (b.n !== 0) c.push({ n: a.n * b.d, d: a.d * b.n, e: `(${a.e}/${b.e})` });
      if (a.n !== 0) c.push({ n: b.n * a.d, d: b.d * a.n, e: `(${b.e}/${a.e})` });
      for (const x of c) { if (x.d < 0) { x.n = -x.n; x.d = -x.d; } rec([...rest, x]); }
    }
  })(nums.map((x) => ({ n: x, d: 1, e: String(x) })));
  return { expr: found && found.replace(/^\((.*)\)$/, '$1'), count };
}
function makeCalc24(hard) {
  for (let t = 0; t < 600; t++) {
    const nums = [0, 0, 0, 0].map(() => 1 + rand(hard ? 13 : 10));
    const target = hard ? pick([24, 24, 24, 10, 17, 23, 27, 31, 36, 42, 48, 50]) : pick([24, 24, 24, 24, 10, 12, 18, 20, 30, 36]);
    const { expr, count } = solveTarget(nums, target);
    if (!expr) continue;
    if (hard ? count > 12 : count > 60 && Math.random() < 0.7) continue;
    return { pub: { nums, target }, secret: { nums, target, expr } };
  }
  return { pub: { nums: [3, 3, 8, 8], target: 24 }, secret: { nums: [3, 3, 8, 8], target: 24, expr: '8/(3-8/3)' } };
}

/* ───────── 암산 질주 ───────── */
function makeMental(hard) {
  const qs = [];
  for (const k of shuffle(['+', '-', '×', '÷', '+', '×', '-']).slice(0, 5)) {
    let a, b, ans;
    if (hard) {
      if (k === '+') { a = between(120, 899); b = between(120, 899); ans = a + b; }
      else if (k === '-') { a = between(300, 999); b = between(101, a - 30); ans = a - b; }
      else if (k === '×') { a = between(12, 39); b = between(12, 49); ans = a * b; }
      else { b = between(7, 19); ans = between(12, 49); a = b * ans; }
    } else if (k === '+') { a = 12 + rand(78); b = 12 + rand(78); ans = a + b; }
    else if (k === '-') { a = 40 + rand(60); b = 11 + rand(a - 15); ans = a - b; }
    else if (k === '×') { a = 3 + rand(7); b = 11 + rand(19); ans = a * b; }
    else { b = 3 + rand(10); ans = 4 + rand(12); a = b * ans; }
    qs.push({ t: `${a} ${k === '-' ? '−' : k} ${b}`, a: ans });
  }
  return { pub: { qs: qs.map((q) => q.t) }, secret: { ans: qs.map((q) => q.a) }, expl: qs.map((q) => `${q.t}=${q.a}`).join(' · ') };
}

/* ───────── 상식 / 어림 ───────── */
function fromPool(list, used, tag) {
  let idx = list.map((_, i) => i).filter((i) => !used.has(tag + i));
  if (!idx.length) idx = list.map((_, i) => i);
  const i = pick(idx); used.add(tag + i); return list[i];
}
function makeTrivia(used) {
  const [cat, text, right, ...rest] = fromPool(TRIVIA, used, 't');
  const options = shuffle([right, ...rest.slice(0, 3)]);
  return { pub: { cat, text, options }, secret: { ans: options.indexOf(right) }, answerText: right, expl: rest[3] || '' };
}
function makeFermi(used) {
  const [text, unit, value, note] = fromPool(FERMI, used, 'f');
  return { pub: { text, unit }, secret: { value }, answerText: `${value.toLocaleString('ko-KR')}${unit}`, expl: note || '' };
}
function makeTimeline(used, hard) {
  const n = hard ? 5 : 4, gap = hard ? 2 : 4;
  for (;;) {
    const ev = shuffle(EVENTS).slice(0, n);
    const ys = ev.map((e) => e[0]).sort((a, b) => a - b);
    if (ys.some((y, i) => i && y - ys[i - 1] < gap)) continue;
    const order = ev.map((_, i) => i).sort((a, b) => ev[a][0] - ev[b][0]);
    return { pub: { items: ev.map((e) => e[1]) }, secret: { ans: order }, answerText: order.map((i) => `${ev[i][1]}(${ev[i][0]})`).join(' → ') };
  }
}
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const toCho = (s) => [...s].map((ch) => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch; }).join('');
function makeChosung(used, hard) {
  const [cat, word] = fromPool(WORDS, used, 'w');
  return { pub: { cat: hard ? '???' : cat, cho: toCho(word) }, secret: { ans: word }, answerText: word, expl: hard ? `분류: ${cat}` : '' };
}

/* ───────── 수열 ───────── */
function makeSequence(hard) {
  const kinds = hard ? ['quad', 'fib', 'inter', 'lin', 'alt', 'trib', 'cubic', 'mulinc', 'sqpair', 'digsum'] : ['arith', 'geo', 'quad', 'fib', 'square', 'inter', 'lin', 'tri', 'prime'];
  const k = pick(kinds);
  let seq = [], ans, rule;
  if (k === 'arith') { const a = 1 + rand(20), d = pick([-1, 1]) * (2 + rand(11)); for (let i = 0; i < 7; i++) seq.push(a + d * i); ans = a + d * 7; rule = `등차수열 (공차 ${d})`; }
  else if (k === 'geo') { const a = 1 + rand(4), r = 2 + rand(3); for (let i = 0; i < 6; i++) seq.push(a * r ** i); ans = a * r ** 6; rule = `등비수열 (공비 ${r})`; }
  else if (k === 'quad') { const a = 1 + rand(9), d0 = 1 + rand(4), dd = 1 + rand(3) + (hard ? 1 : 0); let cur = a, d = d0; seq.push(cur); for (let i = 0; i < 6; i++) { cur += d; d += dd; seq.push(cur); } ans = cur + d; rule = `차이가 ${dd}씩 커짐`; }
  else if (k === 'fib') { seq = [1 + rand(5), 1 + rand(6)]; for (let i = 2; i < 7; i++) seq.push(seq[i - 1] + seq[i - 2]); ans = seq[6] + seq[5]; rule = '앞의 두 수의 합'; }
  else if (k === 'square') { const c = rand(8) - 3, p = pick([2, 2, 3]); for (let i = 1; i <= 6; i++) seq.push(i ** p + c); ans = 7 ** p + c; rule = `n${p === 2 ? '²' : '³'}${c > 0 ? '+' + c : c < 0 ? String(c) : ''}`; }
  else if (k === 'inter') { const a = 1 + rand(9), d = 2 + rand(5), b = 20 + rand(30), e = pick([-1, -2, -3, -4, 3, 5, 7]); for (let i = 0; i < 4; i++) { seq.push(a + d * i); seq.push(b + e * i); } seq = seq.slice(0, 7); ans = b + e * 3; rule = `두 수열이 번갈아 (+${d} / ${e >= 0 ? '+' : ''}${e})`; }
  else if (k === 'lin') { const m = pick([2, 3]), c = pick([-3, -2, -1, 1, 2, 3]); seq = [1 + rand(4)]; for (let i = 1; i < 6; i++) seq.push(seq[i - 1] * m + c); ans = seq[5] * m + c; rule = `앞의 수 × ${m} ${c >= 0 ? '+' : '−'} ${Math.abs(c)}`; }
  else if (k === 'tri') { const c = rand(6); for (let i = 1; i <= 7; i++) seq.push(i * (i + 1) / 2 + c); ans = 36 + c; rule = `삼각수${c ? ' + ' + c : ''}`; }
  else if (k === 'alt') { const m = pick([2, 3]), c = between(1, 6); seq = [between(1, 5)]; for (let i = 1; i < 7; i++) seq.push(i % 2 ? seq[i - 1] * m : seq[i - 1] + c); ans = 7 % 2 ? seq[6] * m : seq[6] + c; rule = `×${m}, +${c} 번갈아`; }
  else if (k === 'trib') { seq = [between(0, 2), between(1, 3), between(1, 4)]; for (let i = 3; i < 7; i++) seq.push(seq[i - 1] + seq[i - 2] + seq[i - 3]); ans = seq[6] + seq[5] + seq[4]; rule = '앞의 세 수의 합'; }
  else if (k === 'cubic') { const a = between(1, 3), c = between(-5, 5); for (let i = 1; i <= 6; i++) seq.push(a * i ** 3 + c); ans = a * 343 + c; rule = `${a > 1 ? a : ''}n³${c > 0 ? '+' + c : c < 0 ? c : ''} (계차가 2단계 등차)`; }
  else if (k === 'mulinc') { const s = between(1, 3); seq = [s]; for (let i = 1; i < 6; i++) seq.push(seq[i - 1] * (i + 1) + (i % 2 ? 0 : 1)); ans = seq[5] * 7 + 1; rule = '×2, ×3+1, ×4, ×5+1, … (곱하는 수가 1씩 증가, 짝수 번째에 +1)'; }
  else if (k === 'sqpair') { const c = between(0, 3); for (let i = 1; i <= 6; i++) seq.push(i * i + (i + c) * (i + c)); ans = 49 + (7 + c) ** 2; rule = `n² + (n+${c})²`; }
  else if (k === 'digsum') { let x = between(11, 40); seq = [x]; for (let i = 1; i < 7; i++) { x = x + [...String(x)].reduce((a, d) => a + Number(d), 0); seq.push(x); } ans = x + [...String(x)].reduce((a, d) => a + Number(d), 0); rule = '앞의 수 + 앞의 수의 각 자리 숫자 합'; }
  else { const pr = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31], s = rand(3); seq = pr.slice(s, s + 6); ans = pr[s + 6]; rule = '소수 나열'; }
  if (hard && seq.length >= 7) { ans = seq[6]; seq = seq.slice(0, 6); }
  return { pub: { seq }, secret: { ans }, answerText: String(ans), expl: rule };
}

/* ───────── 범인 추리 (해 1개 보장) ───────── */
const PEOPLE = ['철수', '영희', '민수', '지은', '하준', '서연', '도윤', '하은', '지호', '수아', '준우', '유나', '현우', '채원'];
const CRIMES = ['범인', '케이크를 먹은 사람', '꽃병을 깬 사람', '몰래 방귀 뀐 사람', '금고를 연 사람', '시험지를 훔친 사람'];
const hasB = (s) => { const c = s.charCodeAt(s.length - 1) - 0xac00; return c >= 0 && c % 28 !== 0; };
const josa = (s, a, b) => s + (hasB(s) ? a : b);
function stmtText(st, names, crime) {
  const x = names[st.x], y = names[st.y];
  if (st.k === 'is') return `${josa(crime, '은', '는')} ${josa(x, '이다', '다')}`;
  if (st.k === 'not') return `${josa(x, '은', '는')} ${josa(crime, '이', '가')} 아니다`;
  if (st.k === 'or') return `${josa(crime, '은', '는')} ${josa(x, '이나', '나')} ${josa(y, '이다', '다')}`;
  if (st.k === 'me') return `나는 ${josa(crime, '이', '가')} 아니다`;
  return `${josa(crime, '은', '는')} ${x}도 ${y}도 아니다`;
}
function stmtTruth(st, c) { return st.k === 'is' ? c === st.x : st.k === 'not' || st.k === 'me' ? c !== st.x : st.k === 'or' ? c === st.x || c === st.y : c !== st.x && c !== st.y; }
function makeLiar(hard) {
  const n = hard ? 5 : 4;
  for (;;) {
    const names = shuffle(PEOPLE).slice(0, n), crime = pick(CRIMES);
    const T = hard ? pick([1, 2, 3, 4]) : pick([1, 2, 2, 3]);
    const stmts = names.map((_, i) => { const k = pick(['is', 'not', 'not', 'or', 'nor', 'me']); const x = k === 'me' ? i : rand(n); let y = rand(n); while (y === x) y = rand(n); return { k, x, y }; });
    const sols = names.map((_, c) => c).filter((c) => stmts.filter((s) => stmtTruth(s, c)).length === T);
    if (sols.length !== 1) continue;
    const c = sols[0];
    return {
      pub: { names, lines: stmts.map((s, i) => `${names[i]}: “${stmtText(s, names, crime)}”`), T, crime },
      secret: { ans: c }, answerText: names[c], expl: stmts.map((s, i) => `${names[i]} ${stmtTruth(s, c) ? '참' : '거짓'}`).join(' · '),
    };
  }
}

/* ───────── 금고 털기 (숫자야구, 해 1개 보장) ───────── */
const ALLN = { 3: [], 4: [] };
for (let i = 0; i < 10000; i++) { for (const L of [3, 4]) { if (i >= 10 ** L) continue; const s = String(i).padStart(L, '0'); if (new Set(s).size === L) ALLN[L].push(s); } }
const ALL3 = ALLN[3];
function sb(g, x) { let s = 0, b = 0; for (let i = 0; i < g.length; i++) { if (g[i] === x[i]) s++; else if (x.includes(g[i])) b++; } return s * 10 + b; }
function makeCode(hard) {
  const L = hard ? 4 : 3, ALL = ALLN[L], maxClues = hard ? 7 : 5;
  for (let t = 0; t < 2000; t++) {
    const secret = pick(ALL); const clues = []; let cand = ALL;
    while (cand.length > 1 && clues.length < maxClues) {
      let best = null;
      for (let k = 0; k < 10; k++) {
        const g = pick(ALL); if (g === secret || clues.some((c) => c.g === g)) continue;
        const r = sb(g, secret); const nc = cand.filter((x) => sb(g, x) === r);
        if (nc.length === cand.length) continue;
        if (!best || nc.length < best.nc.length) best = { g, r, nc };
      }
      if (!best) break;
      clues.push({ g: best.g, s: Math.floor(best.r / 10), b: best.r % 10 }); cand = best.nc;
    }
    if (cand.length === 1 && clues.length >= 3) return { pub: { clues, L }, secret: { ans: secret }, answerText: secret };
  }
  return { pub: { clues: [{ g: '012', s: 0, b: 0 }, { g: '345', s: 1, b: 0 }, { g: '367', s: 0, b: 1 }, { g: '849', s: 1, b: 1 }], L: 3 }, secret: { ans: ALL3.find((x) => [['012', 0], ['345', 10], ['367', 1], ['849', 11]].every(([g, r]) => sb(g, x) === r)) }, answerText: '' };
}

/* ───────── 두뇌 ───────── */
function makeMemory(hard) {
  const n = hard ? 5 : 4, k = hard ? between(8, 11) : between(5, 8);
  const cells = shuffle([...Array(n * n).keys()]).slice(0, k).sort((a, b) => a - b);
  return { pub: { cells, n, showMs: hard ? 3600 : 3200 }, secret: { cells }, answerText: `${cells.length}칸` };
}
function makeDigits(hard) {
  const len = hard ? between(10, 12) : between(7, 9); let d = ''; for (let i = 0; i < len; i++) d += rand(10);
  const rev = Math.random() < (hard ? 0.5 : 0.4); const ans = rev ? [...d].reverse().join('') : d;
  return { pub: { d, rev, showMs: hard ? 4500 : 3500 }, secret: { ans }, answerText: ans, expl: rev ? `보인 숫자 ${d}를 거꾸로` : '' };
}
const COLORS = [['빨강', '#ff4d6d'], ['파랑', '#4cc9f0'], ['초록', '#3ddc97'], ['노랑', '#ffd23f']];
function makeStroop() {
  const items = [];
  for (let i = 0; i < 8; i++) { const w = rand(4); let c = rand(4); if (Math.random() < 0.85) while (c === w) c = rand(4); items.push({ w, c, a: Math.random() < 0.6 ? 'c' : 'w' }); }
  return { pub: { items }, secret: { ans: items.map((it) => (it.a === 'c' ? it.c : it.w)) }, answerText: '8문제' };
}

function makeQ(type, ctx) {
  ctx = ctx || {};
  const used = ctx.used || new Set(), hard = !!ctx.hard, ids = ctx.ids || [];
  switch (type) {
    case 'calc24': return makeCalc24(hard);
    case 'mental': return makeMental(hard);
    case 'sequence': return makeSequence(hard);
    case 'fermi': return makeFermi(used);
    case 'trivia': return makeTrivia(used);
    case 'timeline': return makeTimeline(used, hard);
    case 'chosung': return makeChosung(used, hard);
    case 'liar': return makeLiar(hard);
    case 'code': return makeCode(hard);
    case 'memory': return makeMemory(hard);
    case 'digits': return makeDigits(hard);
    case 'stroop': return makeStroop();
    default: return GEN2[type] ? GEN2[type](hard, ids) : { pub: {}, secret: {} };
  }
}
function buildPlan(n, playerCount, mode, cats) {
  let types = Object.keys(TYPES).filter((t) => playerCount >= TYPES[t].minP && !(mode === 'free' && TYPES[t].speed));
  if (cats && cats.length) { const f = types.filter((t) => cats.includes(TYPES[t].cat)); if (f.length) types = f; }
  const plan = [];
  while (plan.length < n) { const bag = shuffle(types); if (plan.length && bag[0] === plan[plan.length - 1]) bag.push(bag.shift()); plan.push(...bag); }
  return plan.slice(0, n);
}
