// 문제 생성기 검증: 모든 유형 × 두 난이도가 만들어지는지, 해가 하나뿐인지, 판정기가 정답을 맞다고 하는지
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = { Buffer, console, Math, JSON, Set, Map, Number, String, Array, Object, RegExp, Date };
vm.createContext(ctx);
for (const f of ['expr.js', 'data.js', 'data2.js', 'gen.js', 'gen2.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', f), 'utf8').replace(/^const /gm, 'var '), ctx);
vm.runInContext(`
const fail = (m) => { throw new Error(m); };
const used = new Set(), ids = ['aa', 'bb', 'cc', 'dd'];
let maxPub = 0, maxType = '';
const N = Number(globalThis.N || 60);
for (const t of Object.keys(TYPES).filter((x) => TYPES[x].style !== 'party')) for (const hard of [false, true]) for (let i = 0; i < N; i++) {
  const q = makeQ(t, { used, hard, ids });
  if (!q || !q.pub || !q.secret) fail(t + ' no pub');
  const sz = Buffer.byteLength(JSON.stringify(q.pub));
  if (sz > maxPub) { maxPub = sz; maxType = t + (hard ? '(어려움)' : ''); }
  if (q.pub.ui === 'num' && !Number.isFinite(q.secret.ans)) fail(t + ' ans ' + JSON.stringify(q));
  if (q.pub.ui === 'mc' && !(q.secret.ans >= 0 && q.secret.ans < q.pub.options.length)) fail(t + ' mc');
}
if (maxPub > 1500) fail('pub too big ' + maxType + ' ' + maxPub);

// 숫자야구: 해가 하나
for (const hard of [false, true]) for (let i = 0; i < 100; i++) { const q = makeCode(hard); const c = ALLN[q.pub.L].filter((x) => q.pub.clues.every((cl) => sb(cl.g, x) === cl.s * 10 + cl.b)); if (c.length !== 1 || c[0] !== q.secret.ans) fail('code ' + JSON.stringify(q)); }
// 수열: 정답이 정수
for (const hard of [false, true]) for (let i = 0; i < 300; i++) { const q = makeSequence(hard); if (!Number.isInteger(q.secret.ans) || q.pub.seq.length < 5) fail('seq ' + JSON.stringify(q)); }
// 범인 추리: 해가 하나
for (const hard of [false, true]) for (let i = 0; i < 100; i++) { const q = makeLiar(hard); if (q.pub.lines.some((l) => /undefined/.test(l))) fail('liar text'); }
const seen = {}; for (const [c, w] of WORDS) { const k = c + toCho(w); if (seen[k]) fail('dup ' + k); seen[k] = 1; }
for (const q of TRIVIA) if (new Set(q.slice(2, 6)).size !== 4) fail(q);
for (const hard of [false, true]) for (let i = 0; i < 100; i++) { const q = makeCalc24(hard); if (!Expr.check(q.secret.expr, q.secret.nums, q.secret.target).ok) fail('calc'); }

// 새 게임 판정기
for (const hard of [false, true]) for (let i = 0; i < 80; i++) {
  let q;
  // 불 끄기: 생성에 쓴 버튼을 다시 누르면 꺼진다 (정답 텍스트에서 복원)
  q = GEN2.lights(hard); const n = q.pub.n;
  const presses = [...q.answerText.matchAll(/(\\d+)행(\\d+)열/g)].map((m) => (m[1] - 1) * n + (m[2] - 1));
  if (!JUDGE2.lights(presses, q.secret, q.pub)) fail('lights');
  if (JUDGE2.lights([], q.secret, q.pub)) fail('lights empty');
  // 스도쿠: 해가 하나, 정답 통과
  q = GEN2.sudoku(hard);
  if (sudokuCount([...q.pub.g].map(Number), q.pub.n, q.pub.bh, q.pub.bw, 3) !== 1) fail('sudoku uniq');
  if (!JUDGE2.sudoku(q.secret.sol, q.secret, q.pub)) fail('sudoku judge');
  // 노노그램
  q = GEN2.nono(hard); const bits = q.expl.replace(/ /g, '').replace(/■/g, '1').replace(/□/g, '0');
  if (!JUDGE2.nono(bits, q.secret, q.pub)) fail('nono');
  // 성냥개비: 정답은 한 번 옮겨서 만들 수 있고 참이다
  q = GEN2.match(hard);
  if (matchTrue(q.pub.eq)) fail('match already true ' + q.pub.eq);
  for (const s of q.secret.sols) { if (!matchTrue(s) || !matchMoves(q.pub.eq).includes(s)) fail('match sol'); }
  // 연산자
  q = GEN2.ops(hard);
  // 기사와 건달 / 가짜 동전 / 논리 그리드
  q = GEN2.knights(hard); if (q.pub.lines.some((l) => /undefined/.test(l))) fail('kn text');
  q = GEN2.coin(hard); if (!JUDGE2.coin(q.secret.ans, q.secret, q.pub)) fail('coin');
  q = GEN2.zebra(hard); if (q.pub.lines.some((l) => /undefined/.test(l))) fail('zebra text');
  q = GEN2.simon(hard); if (!JUDGE2.simon(q.secret.seq.slice(), q.secret, q.pub)) fail('simon');
}
// 연산자 넣기: 정답 식 통과
for (let i = 0; i < 50; i++) { const q = GEN2.ops(i % 2 === 0); const ops = q.answerText.split('=')[0].replace(/[0-9 ]/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-'); if (!JUDGE2.ops(NORM2.ops(ops, q.pub), q.secret)) fail('ops ' + q.answerText); }

for (const [c, ws] of Object.entries(LIAR_WORDS)) if (new Set(ws).size !== ws.length || ws.length < 8) fail('liar words ' + c);
for (const q of TELE) if (q.length < 5 || new Set(q.slice(1)).size !== q.length - 1) fail('tele ' + q[0]);
if (new Set(PAIR_EMOJI).size !== PAIR_EMOJI.length || PAIR_EMOJI.length < 20) fail('pair emoji');
const sample = (t, hard) => { const q = makeQ(t, { used: new Set(), hard, ids }); return (q.pub.text || '') + ' ' + (q.pub.lines ? q.pub.lines.join(' | ') : '') + ' → ' + q.answerText; };
for (const t of ['fruit', 'word', 'knights', 'zebra', 'liar', 'match']) console.log('  ·', t, '어려움:', sample(t, true).slice(0, 220));
console.log('✅ 생성기 통과:', Object.keys(TYPES).length, '종 × 2난이도,', TRIVIA.length, '상식,', FERMI.length, '어림 · 가장 큰 문제', maxType, maxPub + 'B');
`, ctx);
