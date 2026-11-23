/* ───────── 공통 ───────── */
const rand = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rand(a.length)];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const TYPES = {
  calc24:   { emoji: '🧮', label: '숫자 조합',     cat: '수학', limit: 45, desc: '네 숫자를 한 번씩만 써서 목표 숫자를 만들어라' },
  mental:   { emoji: '⚡', label: '암산 질주',     cat: '수학', limit: 40, desc: '암산 5문제를 최대한 빨리. 4개 이상 맞히면 득점' },
  sequence: { emoji: '🔢', label: '수열 추리',     cat: '수학', limit: 35, desc: '규칙을 찾아 ?에 들어갈 수를 맞혀라' },
  fermi:    { emoji: '📏', label: '어림 감각',     cat: '상식', limit: 25, desc: '정답에 가까운 수를 찍어라' },
  trivia:   { emoji: '🧠', label: '상식 번개',     cat: '상식', limit: 15, desc: '4지선다. 빠를수록 점수가 높다' },
  timeline: { emoji: '📜', label: '역사 줄 세우기', cat: '상식', limit: 25, desc: '네 사건을 오래된 순서대로 눌러라' },
  chosung:  { emoji: '🔤', label: '초성 퀴즈',     cat: '상식', limit: 25, desc: '초성과 분류만 보고 단어를 맞혀라' },
  liar:     { emoji: '🕵️', label: '범인 추리',     cat: '퍼즐', limit: 45, desc: '진실을 말한 사람 수로 범인을 가려내라' },
  code:     { emoji: '🔐', label: '금고 털기',     cat: '퍼즐', limit: 60, desc: '숫자야구 단서로 세 자리 비밀번호를 찾아라' },
  memory:   { emoji: '🟦', label: '패턴 기억',     cat: '두뇌', limit: 16, desc: '잠깐 빛나는 칸을 그대로 눌러라' },
  digits:   { emoji: '📟', label: '숫자 기억',     cat: '두뇌', limit: 16, desc: '잠깐 보인 숫자를 그대로, 때로는 거꾸로' },
  stroop:   { emoji: '🎨', label: '색깔 함정',     cat: '두뇌', limit: 25, desc: '글자 뜻과 색이 다르다. 묻는 것만 골라라' },
  beauty:   { emoji: '🎯', label: '2/3 게임',      cat: '심리', limit: 20, social: true, desc: '0~100. 모두의 평균×2/3에 가장 가까운 사람이 승리' },
  minority: { emoji: '⚖️', label: '소수결',        cat: '심리', limit: 12, social: true, desc: 'A 또는 B. 사람이 더 적은 쪽이 승리' },
  lowest:   { emoji: '🥷', label: '최저 유일수',   cat: '심리', limit: 15, social: true, desc: '1~10. 나만 고른 수 중 가장 작은 수가 승리' },
  split:    { emoji: '🗡️', label: '배신의 금고',   cat: '심리', limit: 15, social: true, desc: '모두 협력하면 다 같이 이득. 혼자 배신하면 대박, 다 배신하면 공멸' },
};

const SABOTAGE = {
  fog:    { emoji: '🌫️', label: '안개',     desc: '다음 문제를 5초간 흐리게' },
  mirror: { emoji: '🪞', label: '거울',     desc: '다음 문제를 좌우 반전' },
  shrink: { emoji: '⏳', label: '시간 단축', desc: '다음 제한시간 35% 삭감' },
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
function makeCalc24() {
  for (let t = 0; t < 400; t++) {
    const nums = [0, 0, 0, 0].map(() => 1 + rand(10));
    const target = pick([24, 24, 24, 24, 10, 12, 18, 20, 30, 36]);
    const { expr, count } = solveTarget(nums, target);
    if (!expr) continue;
    if (count > 60 && Math.random() < 0.7) continue;
    return { pub: { nums, target }, secret: { nums, target, expr } };
  }
  return { pub: { nums: [3, 3, 8, 8], target: 24 }, secret: { nums: [3, 3, 8, 8], target: 24, expr: '8/(3-8/3)' } };
}

/* ───────── 암산 질주 ───────── */
function makeMental() {
  const qs = [];
  for (const k of shuffle(['+', '-', '×', '÷', '+', '×', '-']).slice(0, 5)) {
    let a, b, ans;
    if (k === '+') { a = 12 + rand(78); b = 12 + rand(78); ans = a + b; }
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
function makeTimeline(used) {
  for (;;) {
    const ev = shuffle(EVENTS).slice(0, 4);
    const ys = ev.map((e) => e[0]).sort((a, b) => a - b);
    if (ys.some((y, i) => i && y - ys[i - 1] < 4)) continue;
    const order = [0, 1, 2, 3].sort((a, b) => ev[a][0] - ev[b][0]);
    return { pub: { items: ev.map((e) => e[1]) }, secret: { ans: order }, answerText: order.map((i) => `${ev[i][1]}(${ev[i][0]})`).join(' → ') };
  }
}
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const toCho = (s) => [...s].map((ch) => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch; }).join('');
function makeChosung(used) {
  const [cat, word] = fromPool(WORDS, used, 'w');
  return { pub: { cat, cho: toCho(word) }, secret: { ans: word }, answerText: word };
}

/* ───────── 수열 ───────── */
function makeSequence() {
  const k = pick(['arith', 'geo', 'quad', 'fib', 'square', 'inter', 'lin', 'tri', 'prime']);
  let seq = [], ans, rule;
  if (k === 'arith') { const a = 1 + rand(20), d = pick([-1, 1]) * (2 + rand(11)); for (let i = 0; i < 7; i++) seq.push(a + d * i); ans = a + d * 7; rule = `등차수열 (공차 ${d})`; }
  else if (k === 'geo') { const a = 1 + rand(4), r = 2 + rand(3); for (let i = 0; i < 6; i++) seq.push(a * r ** i); ans = a * r ** 6; rule = `등비수열 (공비 ${r})`; }
  else if (k === 'quad') { const a = 1 + rand(9), d0 = 1 + rand(4), dd = 1 + rand(3); let cur = a, d = d0; seq.push(cur); for (let i = 0; i < 6; i++) { cur += d; d += dd; seq.push(cur); } ans = cur + d; rule = `차이가 ${dd}씩 커짐`; }
  else if (k === 'fib') { seq = [1 + rand(5), 1 + rand(6)]; for (let i = 2; i < 7; i++) seq.push(seq[i - 1] + seq[i - 2]); ans = seq[6] + seq[5]; rule = '앞의 두 수의 합'; }
  else if (k === 'square') { const c = rand(8) - 3, p = pick([2, 2, 3]); for (let i = 1; i <= 6; i++) seq.push(i ** p + c); ans = 7 ** p + c; rule = `n${p === 2 ? '²' : '³'}${c > 0 ? '+' + c : c < 0 ? String(c) : ''}`; }
  else if (k === 'inter') { const a = 1 + rand(9), d = 2 + rand(5), b = 20 + rand(30), e = pick([-1, -2, -3, -4, 3, 5, 7]); for (let i = 0; i < 4; i++) { seq.push(a + d * i); seq.push(b + e * i); } seq = seq.slice(0, 7); ans = b + e * 3; rule = `두 수열이 번갈아 (+${d} / ${e >= 0 ? '+' : ''}${e})`; }
  else if (k === 'lin') { const m = pick([2, 3]), c = pick([-3, -2, -1, 1, 2, 3]); seq = [1 + rand(4)]; for (let i = 1; i < 6; i++) seq.push(seq[i - 1] * m + c); ans = seq[5] * m + c; rule = `앞의 수 × ${m} ${c >= 0 ? '+' : '−'} ${Math.abs(c)}`; }
  else if (k === 'tri') { const c = rand(6); for (let i = 1; i <= 7; i++) seq.push(i * (i + 1) / 2 + c); ans = 36 + c; rule = `삼각수${c ? ' + ' + c : ''}`; }
  else { const pr = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31], s = rand(3); seq = pr.slice(s, s + 6); ans = pr[s + 6]; rule = '소수 나열'; }
  return { pub: { seq }, secret: { ans }, answerText: String(ans), expl: rule };
}

/* ───────── 범인 추리 (해 1개 보장) ───────── */
const NAMES = ['철수', '영희', '민수', '지은'];
const hasB = (s) => { const c = s.charCodeAt(s.length - 1) - 0xac00; return c >= 0 && c % 28 !== 0; };
const josa = (s, a, b) => s + (hasB(s) ? a : b);
function stmtText(st) {
  const x = NAMES[st.x], y = NAMES[st.y];
  if (st.k === 'is') return `범인은 ${josa(x, '이다', '다')}`;
  if (st.k === 'not') return `${josa(x, '은', '는')} 범인이 아니다`;
  if (st.k === 'or') return `범인은 ${josa(x, '이나', '나')} ${josa(y, '이다', '다')}`;
  return `범인은 ${x}도 ${y}도 아니다`;
}
function stmtTruth(st, c) { return st.k === 'is' ? c === st.x : st.k === 'not' ? c !== st.x : st.k === 'or' ? c === st.x || c === st.y : c !== st.x && c !== st.y; }
function makeLiar() {
  for (;;) {
    const T = pick([1, 2, 2, 3]);
    const stmts = NAMES.map(() => { const k = pick(['is', 'not', 'not', 'or', 'nor']); const x = rand(4); let y = rand(4); while (y === x) y = rand(4); return { k, x, y }; });
    const sols = [0, 1, 2, 3].filter((c) => stmts.filter((s) => stmtTruth(s, c)).length === T);
    if (sols.length !== 1) continue;
    const c = sols[0];
    return { pub: { names: NAMES, lines: stmts.map((s, i) => `${NAMES[i]}: “${stmtText(s)}”`), T }, secret: { ans: c }, answerText: NAMES[c], expl: stmts.map((s, i) => `${NAMES[i]} ${stmtTruth(s, c) ? '참' : '거짓'}`).join(' · ') };
  }
}

/* ───────── 금고 털기 (숫자야구, 해 1개 보장) ───────── */
const ALL3 = []; for (let i = 0; i < 1000; i++) { const s = String(i).padStart(3, '0'); if (new Set(s).size === 3) ALL3.push(s); }
function sb(g, x) { let s = 0, b = 0; for (let i = 0; i < 3; i++) { if (g[i] === x[i]) s++; else if (x.includes(g[i])) b++; } return s * 10 + b; }
function makeCode() {
  for (let t = 0; t < 2000; t++) {
    const secret = pick(ALL3); const clues = []; let cand = ALL3;
    while (cand.length > 1 && clues.length < 5) {
      let best = null;
      for (let k = 0; k < 10; k++) {
        const g = pick(ALL3); if (g === secret || clues.some((c) => c.g === g)) continue;
        const r = sb(g, secret); const nc = cand.filter((x) => sb(g, x) === r);
        if (nc.length === cand.length) continue;
        if (!best || nc.length < best.nc.length) best = { g, r, nc };
      }
      if (!best) break;
      clues.push({ g: best.g, s: Math.floor(best.r / 10), b: best.r % 10 }); cand = best.nc;
    }
    if (cand.length === 1 && clues.length >= 3) return { pub: { clues }, secret: { ans: secret }, answerText: secret };
  }
  return { pub: { clues: [{ g: '012', s: 0, b: 0 }, { g: '345', s: 1, b: 0 }, { g: '367', s: 0, b: 1 }, { g: '849', s: 1, b: 1 }] }, secret: { ans: ALL3.find((x) => [['012', 0], ['345', 10], ['367', 1], ['849', 11]].every(([g, r]) => sb(g, x) === r)) }, answerText: '' };
}

/* ───────── 두뇌 ───────── */
function makeMemory() {
  const cells = shuffle([...Array(16).keys()]).slice(0, 5 + rand(4)).sort((a, b) => a - b);
  return { pub: { cells, showMs: 3200 }, secret: { cells }, answerText: `${cells.length}칸` };
}
function makeDigits() {
  const len = 7 + rand(3); let d = ''; for (let i = 0; i < len; i++) d += rand(10);
  const rev = Math.random() < 0.4; const ans = rev ? [...d].reverse().join('') : d;
  return { pub: { d, rev, showMs: 3500 }, secret: { ans }, answerText: ans, expl: rev ? `보인 숫자 ${d}를 거꾸로` : '' };
}
const COLORS = [['빨강', '#ff4d6d'], ['파랑', '#4cc9f0'], ['초록', '#3ddc97'], ['노랑', '#ffd23f']];
function makeStroop() {
  const items = [];
  for (let i = 0; i < 8; i++) { const w = rand(4); let c = rand(4); if (Math.random() < 0.85) while (c === w) c = rand(4); items.push({ w, c, a: Math.random() < 0.6 ? 'c' : 'w' }); }
  return { pub: { items }, secret: { ans: items.map((it) => (it.a === 'c' ? it.c : it.w)) }, answerText: '8문제' };
}

function makeQ(type, used) {
  switch (type) {
    case 'calc24': return makeCalc24();
    case 'mental': return makeMental();
    case 'sequence': return makeSequence();
    case 'fermi': return makeFermi(used);
    case 'trivia': return makeTrivia(used);
    case 'timeline': return makeTimeline(used);
    case 'chosung': return makeChosung(used);
    case 'liar': return makeLiar();
    case 'code': return makeCode();
    case 'memory': return makeMemory();
    case 'digits': return makeDigits();
    case 'stroop': return makeStroop();
    default: return { pub: {}, secret: {} };
  }
}
function buildPlan(n, playerCount) {
  const types = Object.keys(TYPES).filter((t) => playerCount >= 2 || !TYPES[t].social);
  const plan = [];
  while (plan.length < n) { const bag = shuffle(types); if (plan.length && bag[0] === plan[plan.length - 1]) bag.push(bag.shift()); plan.push(...bag); }
  return plan.slice(0, n);
}
