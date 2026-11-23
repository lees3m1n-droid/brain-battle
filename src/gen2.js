/* ═════════════ 새 게임 생성기 ═════════════
   GEN2[type](hard, ids) → { pub, secret, answerText, expl }
   NORM2[type](raw, pub) → 정규화한 답 또는 null
   JUDGE2[type](v, secret, pub) → 정답 여부
   pub.ui 가 'num' / 'mc' 이면 공용 화면으로 그린다. */

const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯';
const circ = (i) => CIRC[i] || String(i + 1);
const numOK = (raw) => { const v = Number(String(raw).replace(/,/g, '')); return Number.isFinite(v) && Math.abs(v) < 1e9 ? v : null; };
const intIn = (raw, lo, hi) => { const v = Number(raw); return Number.isInteger(v) && v >= lo && v <= hi ? v : null; };
const intArr = (raw, max, lo, hi) => (Array.isArray(raw) && raw.length <= max && raw.every((x) => Number.isInteger(x) && x >= lo && x <= hi) ? raw.slice() : null);
const strRe = (raw, re) => { const v = String(raw == null ? '' : raw).replace(/\s+/g, ''); return v.length <= 64 && re.test(v) ? v : null; };

// 행렬 계수(rank) — 선형 방정식으로 값이 하나로 정해지는지 판정할 때 쓴다
function rankOf(rows) {
  const m = rows.map((r) => r.slice()); let rank = 0; const cols = m.length ? m[0].length : 0;
  for (let c = 0; c < cols && rank < m.length; c++) {
    let p = -1, best = 1e-9;
    for (let r = rank; r < m.length; r++) if (Math.abs(m[r][c]) > best) { best = Math.abs(m[r][c]); p = r; }
    if (p < 0) continue;
    [m[rank], m[p]] = [m[p], m[rank]];
    for (let r = 0; r < m.length; r++) if (r !== rank) { const f = m[r][c] / m[rank][c]; if (f) for (let k = c; k < cols; k++) m[r][k] -= f * m[rank][k]; }
    rank++;
  }
  return rank;
}
const determined = (rows, target) => rankOf(rows) === rankOf([...rows, target]);

/* ───────── 과일 방정식 ───────── */
const FRUITS = ['🍎', '🍌', '🍇', '🍓', '🍒', '🍑', '🥝', '🍍', '🍋', '🍉', '🥥', '🍐'];
function genFruit(hard) {
  for (;;) {
    const n = hard ? 4 : 3, f = shuffle(FRUITS).slice(0, n), v = f.map(() => between(hard ? 2 : 1, hard ? 13 : 10));
    const lines = [`${f[0]} + ${f[0]} + ${f[0]} = ${3 * v[0]}`];
    for (let i = 1; i < n; i++) {
      const forms = [
        [`${f[i - 1]} + ${f[i]} + ${f[i]}`, v[i - 1] + 2 * v[i]],
        [`${f[i]} + ${f[i]} − ${f[i - 1]}`, 2 * v[i] - v[i - 1]],
        [`${f[i - 1]} + ${f[i - 1]} + ${f[i]}`, 2 * v[i - 1] + v[i]],
      ];
      if (hard) forms.push([`${f[i - 1]} × ${f[i]}`, v[i - 1] * v[i]], [`${f[i]} × ${f[i]} − ${f[i - 1]}`, v[i] * v[i] - v[i - 1]]);
      const [txt, val] = pick(forms); lines.push(`${txt} = ${val}`);
    }
    let q, ans;
    if (!hard) { q = `${f[0]} + ${f[1]} × ${f[2]}`; ans = v[0] + v[1] * v[2]; }
    else if (Math.random() < 0.5) { q = `${f[3]} + ${f[0]} × ${f[1]} − ${f[2]}`; ans = v[3] + v[0] * v[1] - v[2]; }
    else { q = `${f[2]} × ${f[3]} − ${f[1]} + ${f[0]} × ${f[0]}`; ans = v[2] * v[3] - v[1] + v[0] * v[0]; }
    if (lines.some((l) => /= -/.test(l))) continue;
    return { pub: { ui: 'num', text: `${q} = ?`, sub: '과일 하나의 값은 늘 같다 · 곱셈 먼저', lines }, secret: { ans }, answerText: String(ans), expl: f.map((x, i) => `${x}=${v[i]}`).join(' ') };
  }
}

/* ───────── 시계 각도 ───────── */
function genClock(hard) {
  const h = between(1, 12), m = hard ? between(1, 59) : 10 * between(0, 5);
  let a = Math.abs(30 * (h % 12) - 5.5 * m) % 360; if (a > 180) a = 360 - a;
  const txt = `${h}시 ${m}분`;
  return {
    pub: { ui: 'num', decimal: true, big: txt, text: '시침과 분침 사이의 작은 각도는?', sub: '단위: 도(°)' + (hard ? ' · 0.5 단위가 나올 수 있다' : '') },
    secret: { ans: a }, answerText: `${a}°`, expl: `시침 ${30 * (h % 12) + 0.5 * m}° · 분침 ${6 * m}°`,
  };
}

/* ───────── 마방진 ───────── */
const LOSHU = [2, 7, 6, 9, 5, 1, 4, 3, 8];
const MLINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
function genMagic(hard) {
  for (;;) {
    let g = LOSHU.slice();
    const rot = (x) => [x[6], x[3], x[0], x[7], x[4], x[1], x[8], x[5], x[2]];
    for (let i = rand(4); i > 0; i--) g = rot(g);
    if (rand(2)) g = [g[2], g[1], g[0], g[5], g[4], g[3], g[8], g[7], g[6]];
    const a = hard ? between(2, 7) : between(1, 3), b = hard ? between(0, 25) : between(0, 9);
    g = g.map((x) => a * x + b);
    const hidden = shuffle([...Array(9).keys()]).slice(0, hard ? 6 : 4);
    const target = pick(hidden);
    const rows = [];
    for (let i = 0; i < 9; i++) if (!hidden.includes(i)) { const r = Array(10).fill(0); r[i] = 1; rows.push(r); }
    for (const L of MLINES) { const r = Array(10).fill(0); L.forEach((i) => { r[i] = 1; }); r[9] = -1; rows.push(r); }
    const t = Array(10).fill(0); t[target] = 1;
    if (!determined(rows, t)) continue;
    const grid = [0, 1, 2].map((r) => [0, 1, 2].map((c) => { const i = r * 3 + c; return i === target ? '?' : hidden.includes(i) ? '' : String(g[i]); }));
    return { pub: { ui: 'num', text: '?에 들어갈 수는?', sub: '가로·세로·대각선 8줄의 합이 모두 같다', grid }, secret: { ans: g[target] }, answerText: String(g[target]), expl: `한 줄의 합 = ${g[0] + g[1] + g[2]}` };
  }
}

/* ───────── 숫자 피라미드 ───────── */
function genPyramid(hard) {
  const n = hard ? 5 : 4;
  for (;;) {
    const bottom = Array.from({ length: n }, () => between(1, hard ? 12 : 9));
    // cells[r][c] : r=0 이 맨 아래. coef = 아래 줄 숫자들에 곱해지는 계수
    const val = [bottom.slice()], coef = [bottom.map((_, i) => bottom.map((__, j) => (i === j ? 1 : 0)))];
    for (let r = 1; r < n; r++) { val.push([]); coef.push([]); for (let c = 0; c < n - r; c++) { val[r].push(val[r - 1][c] + val[r - 1][c + 1]); coef[r].push(coef[r - 1][c].map((x, k) => x + coef[r - 1][c + 1][k])); } }
    const all = []; for (let r = 0; r < n; r++) for (let c = 0; c < n - r; c++) all.push([r, c]);
    const giv = shuffle(all).slice(0, n);
    const rest = all.filter((x) => !giv.includes(x));
    const pref = hard ? rest.filter(([r]) => r === 0) : rest;
    const tgt = pick(pref.length ? pref : rest);
    const rows = giv.map(([r, c]) => coef[r][c]);
    if (!determined(rows, coef[tgt[0]][tgt[1]])) continue;
    // 바로 위·아래 두 칸만으로 풀리는 너무 쉬운 문제는 거른다
    const isG = (r, c) => giv.some(([a, b]) => a === r && b === c);
    const [tr, tc] = tgt;
    if (tr > 0 && isG(tr - 1, tc) && isG(tr - 1, tc + 1)) continue;
    const pyr = [];
    for (let r = n - 1; r >= 0; r--) pyr.push(val[r].map((x, c) => (r === tr && c === tc ? '?' : isG(r, c) ? String(x) : '')));
    return { pub: { ui: 'num', text: '?에 들어갈 수는?', sub: '각 칸 = 바로 아래 두 칸의 합', pyr }, secret: { ans: val[tr][tc] }, answerText: String(val[tr][tc]), expl: `맨 아랫줄: ${bottom.join(', ')}` };
  }
}

/* ───────── 연산자 넣기 ───────── */
function opsExpr(nums, ops) { let s = String(nums[0]); for (let i = 0; i < ops.length; i++) s += ops[i] + nums[i + 1]; return s; }
function genOps(hard) {
  const k = hard ? 5 : 4, OPS = hard ? ['+', '-', '*', '/'] : ['+', '-', '*'];
  for (let t = 0; t < 500; t++) {
    const nums = Array.from({ length: k }, () => between(1, 9));
    const ops = Array.from({ length: k - 1 }, () => pick(OPS));
    let v; try { v = Expr.evaluate(opsExpr(nums, ops)).value; } catch (e) { continue; }
    if (v.d !== 1 || v.n < 0 || v.n > 150) continue;
    // 해의 개수
    let sols = 0; const all = [[]];
    for (let i = 0; i < k - 1; i++) { const nx = []; for (const a of all) for (const o of OPS) nx.push([...a, o]); all.splice(0, all.length, ...nx); }
    for (const o of all) { try { const w = Expr.evaluate(opsExpr(nums, o)).value; if (w.d === 1 && w.n === v.n) sols++; } catch (e) { /* */ } }
    if (sols > (hard ? 2 : 3)) continue;
    const show = opsExpr(nums, ops).replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−');
    return { pub: { nums, target: v.n, ops: OPS }, secret: { nums, target: v.n }, answerText: `${show} = ${v.n}`, expl: sols > 1 ? `다른 답도 ${sols - 1}개 더 있다` : '' };
  }
  return genOps(false);
}

/* ───────── 문장제 ───────── */
const WORD_T = {
  chick() { const c = between(3, 20), r = between(2, 15), askR = rand(2); return { text: `닭과 토끼가 모두 ${c + r}마리, 다리는 모두 ${2 * c + 4 * r}개다. ${askR ? '토끼' : '닭'}는 몇 마리?`, ans: askR ? r : c, expl: `닭 ${c}, 토끼 ${r}` }; },
  hand() { const n = between(5, 16); return { text: `${n}명이 모두 서로 한 번씩 악수를 한다. 악수는 모두 몇 번?`, ans: n * (n - 1) / 2, expl: `${n}×${n - 1}÷2` }; },
  age() { for (;;) { const s = between(4, 14), k = pick([2, 3]), y = between(2, 12), f = k * (s + y) - y; if (f - s < 20 || f > 70) continue; return { text: `아버지는 아들보다 ${f - s}살 많다. ${y}년 뒤 아버지 나이는 아들 나이의 ${k}배가 된다. 아들은 지금 몇 살?`, ans: s, expl: `아들 ${s}살, 아버지 ${f}살` }; } },
  work() { const [a, b, c] = pick([[3, 6, 2], [4, 12, 3], [6, 12, 4], [10, 15, 6], [12, 24, 8], [20, 30, 12], [6, 3, 2], [30, 60, 20], [12, 4, 3]]), m = pick([1, 1, 2, 3]); return { text: `A 혼자 하면 ${a * m}일, B 혼자 하면 ${b * m}일 걸리는 일이 있다. 둘이 함께 하면 며칠?`, ans: c * m, expl: `하루에 1/${a * m} + 1/${b * m} = 1/${c * m}` }; },
  speed() { const [v1, v2, v] = pick([[30, 60, 40], [40, 60, 48], [20, 30, 24], [60, 90, 72], [12, 6, 8], [45, 90, 60], [10, 40, 16], [15, 10, 12], [60, 40, 48]]), d = between(2, 12) * 30; return { text: `${d}km 거리를 갈 때는 시속 ${v1}km, 올 때는 시속 ${v2}km로 왕복했다. 왕복 평균 시속은 몇 km?`, ans: v, expl: `산술평균(${(v1 + v2) / 2})이 아니라 2×${v1}×${v2}÷${v1 + v2} = ${v}` }; },
  salt() { for (;;) { const a = between(1, 5) * 100, b = between(1, 5) * 100, p = between(2, 20), q = between(2, 20); if (p === q) continue; const r = (a * p + b * q) / (a + b); if (!Number.isInteger(r)) continue; return { text: `${p}% 소금물 ${a}g과 ${q}% 소금물 ${b}g을 섞으면 몇 % 소금물이 될까?`, ans: r, expl: `소금 ${a * p / 100 + b * q / 100}g ÷ ${a + b}g` }; } },
  sale() { for (;;) { const P = between(2, 40) * 1000, x = pick([10, 20, 25, 30, 40, 50]), y = pick([10, 20, 25, 30, 50]); const f = P * (100 - x) * (100 + y) / 10000; if (!Number.isInteger(f)) continue; return { text: `정가 ${P.toLocaleString('ko-KR')}원짜리 물건을 ${x}% 할인했다가, 다시 그 가격에서 ${y}% 올렸다. 지금 가격은 몇 원?`, ans: f, expl: `${P}×${(100 - x) / 100}×${(100 + y) / 100}` }; } },
  page() { const N = between(100, 999); return { text: `1쪽부터 ${N}쪽까지 쪽 번호를 모두 쓰면, 숫자는 모두 몇 개 쓰일까?`, ans: 9 + 180 + 3 * (N - 99), expl: `1~9: 9개, 10~99: 180개, 100~${N}: ${3 * (N - 99)}개` }; },
  stairs() { const n = between(6, 13); const f = [1, 1]; for (let i = 2; i <= n; i++) f.push(f[i - 1] + f[i - 2]); return { text: `계단 ${n}칸을 한 번에 1칸 또는 2칸씩 오른다. 오르는 방법은 모두 몇 가지?`, ans: f[n], expl: '피보나치: 직전 두 칸의 방법 수를 더한다' }; },
  table() { const n = between(4, 7); let f = 1; for (let i = 2; i < n; i++) f *= i; return { text: `${n}명이 원탁에 둘러앉는다. 회전해서 같은 배치는 같은 것으로 볼 때, 앉는 방법은 몇 가지?`, ans: f, expl: `(${n}−1)! = ${f}` }; },
  multi() { const N = between(20, 60), a = pick([3, 4]), b = pick([5, 7]); let s = 0; for (let i = 1; i <= N; i++) if (i % a === 0 || i % b === 0) s += i; return { text: `1부터 ${N}까지의 자연수 중 ${a}의 배수 또는 ${b}의 배수를 모두 더하면?`, ans: s, expl: `${a}의 배수 합 + ${b}의 배수 합 − ${a * b}의 배수 합` }; },
  train() { const t = between(10, 40), v = between(10, 30), L = between(5, 30) * 10, T = t * v - L; if (T < 100) return WORD_T.train(); return { text: `길이 ${L}m인 기차가 초속 ${v}m로 달려 길이 ${T}m인 터널을 완전히 통과하는 데 몇 초 걸릴까?`, ans: t, expl: `(${L}+${T})÷${v}` }; },
  coins() { for (;;) { const a = between(2, 12), b = between(2, 12), tot = a + b, sum = a * 100 + b * 500; return { text: `100원짜리와 500원짜리 동전이 모두 ${tot}개, 합계 ${sum.toLocaleString('ko-KR')}원이다. 500원짜리는 몇 개?`, ans: b, expl: `100원 ${a}개, 500원 ${b}개` }; } },
};
function genWord(hard) {
  const pool = hard ? ['age', 'work', 'speed', 'salt', 'page', 'stairs', 'table', 'multi', 'train', 'sale'] : ['chick', 'hand', 'age', 'work', 'speed', 'salt', 'coins', 'sale'];
  const w = WORD_T[pick(pool)]();
  return { pub: { ui: 'num', text: w.text, sub: '숫자만 입력' }, secret: { ans: w.ans }, answerText: String(w.ans), expl: w.expl };
}

/* ───────── 결! 합! ───────── */
const isHap = (t, i, j, k) => [0, 1, 2].every((a) => (t[i][a] + t[j][a] + t[k][a]) % 3 === 0);
function allHaps(t) { const out = []; for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) for (let k = j + 1; k < 9; k++) if (isHap(t, i, j, k)) out.push([i, j, k]); return out; }
function genHap(hard) {
  for (;;) {
    const all = []; for (let s = 0; s < 3; s++) for (let c = 0; c < 3; c++) for (let b = 0; b < 3; b++) all.push([s, c, b]);
    const tiles = shuffle(all).slice(0, 9), haps = allHaps(tiles);
    if (hard ? haps.length < 2 || haps.length > 9 : haps.length < 1 || haps.length > 4) continue;
    const list = haps.map((h) => h.map((x) => x + 1).join('-')).join(', ');
    return { pub: { tiles, mode: hard ? 'count' : 'find' }, secret: { n: haps.length }, answerText: hard ? `합 ${haps.length}개` : `합: ${list}`, expl: hard ? `합: ${list}` : `이 판의 합은 모두 ${haps.length}개` };
  }
}

/* ───────── 불 끄기 ───────── */
function lightsPress(b, n, i) { const r = Math.floor(i / n), c = i % n; for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const R = r + dr, C = c + dc; if (R >= 0 && R < n && C >= 0 && C < n) b[R * n + C] ^= 1; } }
function genLights(hard) {
  const n = hard ? 5 : 4;
  for (;;) {
    const b = Array(n * n).fill(0), presses = shuffle([...Array(n * n).keys()]).slice(0, hard ? between(6, 9) : between(3, 5));
    presses.forEach((i) => lightsPress(b, n, i));
    if (b.every((x) => !x)) continue;
    return { pub: { n, b: b.join('') }, secret: {}, answerText: `한 가지 해법: ${presses.sort((x, y) => x - y).map((i) => `${Math.floor(i / n) + 1}행${i % n + 1}열`).join(', ')}` };
  }
}

/* ───────── 미니 스도쿠 ───────── */
function sudokuValid(s, n, bh, bw) {
  for (let i = 0; i < n; i++) {
    const R = new Set(), C = new Set(), B = new Set();
    for (let j = 0; j < n; j++) {
      R.add(s[i * n + j]); C.add(s[j * n + i]);
      const br = Math.floor(i / (n / bw)) * bh, bc = (i % (n / bw)) * bw;
      B.add(s[(br + Math.floor(j / bw)) * n + bc + (j % bw)]);
    }
    if (R.size !== n || C.size !== n || B.size !== n) return false;
  }
  return true;
}
function sudokuCount(g, n, bh, bw, limit) {
  const a = g.slice(); let cnt = 0;
  const ok = (p, v) => { const r = Math.floor(p / n), c = p % n, br = r - (r % bh), bc = c - (c % bw); for (let k = 0; k < n; k++) { if (a[r * n + k] === v || a[k * n + c] === v) return false; } for (let i = 0; i < bh; i++) for (let j = 0; j < bw; j++) if (a[(br + i) * n + bc + j] === v) return false; return true; };
  (function rec() {
    if (cnt >= limit) return;
    const p = a.indexOf(0); if (p < 0) { cnt++; return; }
    for (let v = 1; v <= n; v++) if (ok(p, v)) { a[p] = v; rec(); a[p] = 0; if (cnt >= limit) return; }
  })();
  return cnt;
}
function genSudoku(hard) {
  const n = hard ? 6 : 4, bh = 2, bw = hard ? 3 : 2;
  const digits = shuffle([...Array(n).keys()].map((x) => x + 1));
  const bands = shuffle([...Array(n / bh).keys()]), stacks = shuffle([...Array(n / bw).keys()]);
  const rows = [].concat(...bands.map((b) => shuffle([...Array(bh).keys()]).map((r) => b * bh + r)));
  const cols = [].concat(...stacks.map((s) => shuffle([...Array(bw).keys()]).map((c) => s * bw + c)));
  const pat = (r, c) => (bw * (r % bh) + Math.floor(r / bh) + c) % n;
  const sol = []; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) sol.push(digits[pat(rows[r], cols[c])]);
  const g = sol.slice(), floor = hard ? 10 : 5;
  for (const p of shuffle([...Array(n * n).keys()])) {
    if (g.filter((x) => x).length <= floor) break;
    const keep = g[p]; g[p] = 0;
    if (sudokuCount(g, n, bh, bw, 2) !== 1) g[p] = keep;
  }
  return { pub: { n, bh, bw, g: g.join('') }, secret: { sol: sol.join('') }, answerText: '완성된 판은 아래와 같다', expl: [...Array(n).keys()].map((r) => sol.slice(r * n, r * n + n).join('')).join(' / ') };
}

/* ───────── 노노그램 ───────── */
const runs = (arr) => { const out = []; let c = 0; for (const x of arr) { if (x) c++; else if (c) { out.push(c); c = 0; } } if (c) out.push(c); return out.length ? out : [0]; };
function nonoClues(bits, n) {
  const rows = [], cols = [];
  for (let i = 0; i < n; i++) { rows.push(runs(bits.slice(i * n, i * n + n))); cols.push(runs([...Array(n).keys()].map((r) => bits[r * n + i]))); }
  return { rows, cols };
}
function genNono(hard) {
  const n = hard ? 7 : 5;
  for (;;) {
    const bits = Array.from({ length: n * n }, () => (Math.random() < (hard ? 0.55 : 0.6) ? 1 : 0));
    const { rows, cols } = nonoClues(bits, n);
    if ([...rows, ...cols].some((r) => r[0] === 0)) continue;
    return { pub: { n, rows, cols }, secret: {}, answerText: '단서를 모두 만족하면 정답', expl: [...Array(n).keys()].map((r) => bits.slice(r * n, r * n + n).map((x) => (x ? '■' : '□')).join('')).join(' ') };
  }
}

/* ───────── 성냥개비 ───────── */
// 7세그먼트 비트: a=1(위) b=2(오른쪽 위) c=4(오른쪽 아래) d=8(아래) e=16(왼쪽 아래) f=32(왼쪽 위) g=64(가운데)
const SEG = [63, 6, 91, 79, 102, 109, 125, 7, 127, 111];
const OPSEG = { '+': 3, '-': 1 }; // 가로=1, 세로=2
function matchMasks(s) { return [...s].map((ch) => (ch >= '0' && ch <= '9' ? { k: 'd', m: SEG[+ch] } : ch === '=' ? { k: 'e', m: 0 } : { k: 'o', m: OPSEG[ch] })); }
function maskChar(k, m) { if (k === 'd') { const i = SEG.indexOf(m); return i < 0 ? null : String(i); } if (k === 'o') return m === 3 ? '+' : m === 1 ? '-' : null; return '='; }
function matchTrue(s) {
  const mm = /^(\d+)([+-])(\d+)=(\d+)$/.exec(s); if (!mm) return false;
  if ([mm[1], mm[3], mm[4]].some((x) => x.length > 1 && x[0] === '0')) return false;
  return (mm[2] === '+' ? +mm[1] + +mm[3] : +mm[1] - +mm[3]) === +mm[4];
}
function matchMoves(s) {
  const P = matchMasks(s), out = new Set();
  for (let i = 0; i < P.length; i++) {
    if (P[i].k === 'e') continue;
    const W = P[i].k === 'd' ? 7 : 2;
    for (let bi = 0; bi < W; bi++) {
      if (!(P[i].m & (1 << bi))) continue;
      const mi = P[i].m & ~(1 << bi);
      for (let j = 0; j < P.length; j++) {
        if (P[j].k === 'e') continue;
        const base = j === i ? mi : P[j].m, Wj = P[j].k === 'd' ? 7 : 2;
        for (let bj = 0; bj < Wj; bj++) {
          if (base & (1 << bj)) continue;
          if (j === i && bj === bi) continue;
          const arr = P.map((x) => x.m); arr[i] = mi; arr[j] = base | (1 << bj);
          const chars = P.map((x, k) => maskChar(x.k, arr[k]));
          if (chars.includes(null)) continue;
          out.add(chars.join(''));
        }
      }
    }
  }
  return [...out];
}
function genMatch(hard) {
  for (let t = 0; t < 400; t++) {
    let a, b, op = pick(['+', '-']);
    if (hard) { a = between(10, 99); b = between(1, 99); } else { a = between(0, 9); b = between(0, 9); }
    if (op === '-' && a < b) [a, b] = [b, a];
    const c = op === '+' ? a + b : a - b;
    if (!hard && c > 19) continue;
    const truth = `${a}${op}${b}=${c}`;
    const wrong = matchMoves(truth).filter((s) => /^(\d+)([+-])(\d+)=(\d+)$/.test(s) && !matchTrue(s) && !/(^|[+\-=])0\d/.test(s));
    if (!wrong.length) continue;
    const puzzle = pick(wrong);
    const sols = matchMoves(puzzle).filter(matchTrue);
    if (!sols.includes(truth) || sols.length > 3) continue;
    return { pub: { eq: puzzle }, secret: { sols }, answerText: sols.map((s) => s.replace(/-/g, '−')).join('  또는  '), expl: '‘=’는 그대로, 숫자는 숫자로, 부호는 +/− 로만 바뀐다' };
  }
  return { pub: { eq: '6+4=4' }, secret: { sols: ['0+4=4', '8-4=4'] }, answerText: '0+4=4 또는 8−4=4' };
}

/* ───────── 기사와 건달 ───────── */
function knStmt(st, i, names) {
  const nm = (x) => (x === i ? '나' : names[x]);
  const subj = (x) => (x === i ? '나는' : josa(names[x], '은', '는'));
  const wa = (x) => (x === i ? '나와' : josa(names[x], '과', '와'));
  switch (st.k) {
    case 'K': return `${subj(st.x)} 기사다`;
    case 'N': return `${subj(st.x)} 건달이다`;
    case 'S': return `${wa(st.x)} ${subj(st.y)} 같은 부류다`;
    case 'D': return `${wa(st.x)} ${subj(st.y)} 서로 다른 부류다`;
    case 'C': return `우리 중 기사는 정확히 ${st.m}명이다`;
    default: return `${wa(st.x)} ${nm(st.y)} 중 적어도 한 명은 건달이다`;
  }
}
function knTruth(st, mask) {
  const K = (x) => !!(mask >> x & 1);
  switch (st.k) {
    case 'K': return K(st.x);
    case 'N': return !K(st.x);
    case 'S': return K(st.x) === K(st.y);
    case 'D': return K(st.x) !== K(st.y);
    case 'C': { let c = 0; for (let x = 0; x < 6; x++) if (K(x)) c++; return c === st.m; }
    default: return !K(st.x) || !K(st.y);
  }
}
function genKnights(hard) {
  const n = hard ? 4 : 3;
  for (;;) {
    const names = shuffle(PEOPLE).slice(0, n);
    const stmts = names.map((_, i) => {
      const k = pick(['K', 'N', 'N', 'S', 'D', 'C', 'A']);
      let x = rand(n), y = rand(n); while (y === x) y = rand(n);
      if ((k === 'K' || k === 'N') && x === i) x = (i + 1 + rand(n - 1)) % n;
      return { k, x, y, m: rand(n + 1) };
    });
    if (stmts.filter((s) => s.k === 'C').length > 1) continue;
    const sols = [];
    for (let mask = 0; mask < 1 << n; mask++) if (stmts.every((s, i) => knTruth(s, mask) === !!(mask >> i & 1))) sols.push(mask);
    if (sols.length !== 1) continue;
    const m = sols[0];
    if (!hard && (m === 0 || m === (1 << n) - 1) && Math.random() < 0.6) continue;
    return {
      pub: { names, lines: stmts.map((s, i) => `${names[i]}: “${knStmt(s, i, names)}”`) },
      secret: { ans: m },
      answerText: names.map((nm, i) => `${nm} ${m >> i & 1 ? '😇' : '😈'}`).join(' · '),
      expl: '기사 😇 / 건달 😈',
    };
  }
}

/* ───────── 논리 그리드 ───────── */
const ZCATS = [
  { vals: ['커피', '녹차', '주스', '우유', '콜라'], who: (v) => `${josa(v, '을', '를')} 마시는 사람`, yes: (v) => `${josa(v, '을', '를')} 마신다`, no: (v) => `${josa(v, '을', '를')} 마시지 않는다` },
  { vals: ['강아지', '고양이', '앵무새', '금붕어', '햄스터'], who: (v) => `${josa(v, '을', '를')} 키우는 사람`, yes: (v) => `${josa(v, '을', '를')} 키운다`, no: (v) => `${josa(v, '을', '를')} 키우지 않는다` },
  { vals: ['빨간', '파란', '초록', '노란', '검은'], who: (v) => `${v} 옷을 입은 사람`, yes: (v) => `${v} 옷을 입었다`, no: (v) => `${v} 옷을 입지 않았다` },
  { vals: ['축구', '수영', '테니스', '야구', '농구'], who: (v) => `${josa(v, '을', '를')} 하는 사람`, yes: (v) => `${josa(v, '을', '를')} 한다`, no: (v) => `${josa(v, '을', '를')} 하지 않는다` },
  { vals: ['서울', '부산', '대구', '광주', '제주'], who: (v) => `${v}에 사는 사람`, yes: (v) => `${v}에 산다`, no: (v) => `${v}에 살지 않는다` },
];
function perms(n) { if (n === 1) return [[0]]; const out = []; for (const p of perms(n - 1)) for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]); return out; }
const ZCACHE = {};
// 후보 = 범주별 순열 조합. 각 후보마다 who[c*n+v] = 값 v를 가진 사람, has[c*n+x] = 사람 x의 값
function zebraSpace(n, k) {
  const key = n + ':' + k; if (ZCACHE[key]) return ZCACHE[key];
  const P = perms(n), total = P.length ** k, who = new Int8Array(total * k * n), has = new Int8Array(total * k * n);
  for (let id = 0; id < total; id++) {
    let r = id;
    for (let c = 0; c < k; c++) { const p = P[r % P.length]; r = Math.floor(r / P.length); for (let x = 0; x < n; x++) { has[id * k * n + c * n + x] = p[x]; who[id * k * n + c * n + p[x]] = x; } }
  }
  return (ZCACHE[key] = { P, total, who, has });
}
function genZebra(hard) {
  const n = hard ? 4 : 3, k = hard ? 3 : 2, Z = zebraSpace(n, k), W = k * n;
  const holds = (cl, id) => {
    const o = id * W;
    if (cl.t === 'pos') return Z.has[o + cl.c * n + cl.x] === cl.v;
    if (cl.t === 'neg') return Z.has[o + cl.c * n + cl.x] !== cl.v;
    const same = Z.who[o + cl.c1 * n + cl.v1] === Z.who[o + cl.c2 * n + cl.v2];
    return cl.t === 'link' ? same : !same;
  };
  const ALL = Array.from({ length: Z.total }, (_, i) => i);
  for (let attempt = 0; attempt < 60; attempt++) {
    const names = shuffle(PEOPLE).slice(0, n);
    const cats = shuffle(ZCATS).slice(0, k).map((c) => ({ ...c, v: shuffle(c.vals).slice(0, n) }));
    const sid = rand(Z.total), so = sid * W;
    const pool = [];
    for (let c = 0; c < k; c++) for (let x = 0; x < n; x++) for (let v = 0; v < n; v++) {
      const t = Z.has[so + c * n + x] === v;
      pool.push({ t: t ? 'pos' : 'neg', c, x, v, w: t ? 0.7 : 0.25 });
    }
    for (let c1 = 0; c1 < k; c1++) for (let c2 = c1 + 1; c2 < k; c2++) for (let v1 = 0; v1 < n; v1++) for (let v2 = 0; v2 < n; v2++) {
      const same = Z.who[so + c1 * n + v1] === Z.who[so + c2 * n + v2];
      pool.push({ t: same ? 'link' : 'nlink', c1, c2, v1, v2, w: same ? 0.35 : 0.2 });
    }
    const order = pool.map((cl) => ({ cl, r: Math.random() + cl.w })).sort((a, b) => a.r - b.r).map((x) => x.cl);
    let chosen = [], cand = ALL;
    for (const cl of order) { const nc = cand.filter((id) => holds(cl, id)); if (nc.length < cand.length) { chosen.push(cl); cand = nc; } if (cand.length === 1) break; }
    if (cand.length !== 1) continue;
    // 군더더기 단서 제거
    for (const cl of shuffle(chosen)) {
      const rest = chosen.filter((x) => x !== cl); let cnt = 0;
      for (let id = 0; id < Z.total && cnt < 2; id++) if (rest.every((r) => holds(r, id))) cnt++;
      if (cnt === 1) chosen = rest;
    }
    if (chosen.length > (hard ? 14 : 6)) continue;
    const txt = (cl) => {
      if (cl.t === 'pos') return `${josa(names[cl.x], '은', '는')} ${cats[cl.c].yes(cats[cl.c].v[cl.v])}`;
      if (cl.t === 'neg') return `${josa(names[cl.x], '은', '는')} ${cats[cl.c].no(cats[cl.c].v[cl.v])}`;
      const who = cats[cl.c1].who(cats[cl.c1].v[cl.v1]);
      return `${josa(who, '은', '는')} ${cl.t === 'link' ? cats[cl.c2].yes(cats[cl.c2].v[cl.v2]) : cats[cl.c2].no(cats[cl.c2].v[cl.v2])}`;
    };
    // 질문: 단서에 직접 나오지 않은 칸
    const direct = new Set(chosen.filter((c) => c.t === 'pos').map((c) => c.c + ':' + c.v));
    const qs = []; for (let c = 0; c < k; c++) for (let v = 0; v < n; v++) if (!direct.has(c + ':' + v)) qs.push([c, v]);
    if (!qs.length) continue;
    const [qc, qv] = pick(qs), ans = Z.who[so + qc * n + qv];
    const table = names.map((nm, x) => `${nm}: ${cats.map((c, ci) => c.v[Z.has[so + ci * n + x]]).join('·')}`).join(' / ');
    return { pub: { ui: 'mc', text: `${josa(cats[qc].who(cats[qc].v[qv]), '은', '는')} 누구?`, sub: `${n}명 · 각자 서로 다른 것을 하나씩`, lines: shuffle(chosen).map(txt), options: names }, secret: { ans }, answerText: names[ans], expl: table };
  }
  return genZebra(false);
}

/* ───────── 가짜 동전 ───────── */
function genCoin(hard) {
  const N = hard ? 12 : between(8, 9), maxW = hard ? 4 : 3;
  for (let t = 0; t < 500; t++) {
    const fake = rand(N), heavy = hard ? Math.random() < 0.5 : true;
    let cand = []; for (let c = 0; c < N; c++) { cand.push([c, true]); if (hard) cand.push([c, false]); }
    const ws = [];
    while (cand.length > 1 && ws.length < maxW) {
      const sz = between(1, Math.floor(N / 2)), order = shuffle([...Array(N).keys()]);
      const L = order.slice(0, sz).sort((a, b) => a - b), R = order.slice(sz, 2 * sz).sort((a, b) => a - b);
      const res = (c, h) => (L.includes(c) ? (h ? 1 : -1) : R.includes(c) ? (h ? -1 : 1) : 0);
      const r = res(fake, heavy), nc = cand.filter(([c, h]) => res(c, h) === r);
      if (nc.length === cand.length) continue;
      ws.push({ L, R, r }); cand = nc;
    }
    if (cand.length !== 1 || ws.length < 2) continue;
    const lines = ws.map((w) => `${w.L.map(circ).join('')}  vs  ${w.R.map(circ).join('')}  →  ${w.r > 0 ? '⬅️ 왼쪽이 무겁다' : w.r < 0 ? '➡️ 오른쪽이 무겁다' : '⚖️ 균형'}`);
    return { pub: { N, lines, hl: hard }, secret: { ans: fake * 2 + (heavy ? 0 : 1) }, answerText: `${circ(fake)} (${heavy ? '무겁다' : '가볍다'})`, expl: '' };
  }
  return genCoin(false);
}

/* ───────── 최단 경로 ───────── */
function genPaths(hard) {
  const R = hard ? 6 : 4, C = hard ? 6 : 5;
  for (;;) {
    const blocked = new Set(shuffle([...Array(R * C).keys()].filter((i) => i && i !== R * C - 1)).slice(0, hard ? between(4, 7) : between(2, 3)));
    const dp = Array(R * C).fill(0); dp[0] = 1;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const i = r * C + c; if (!i || blocked.has(i)) continue; dp[i] = (r ? dp[i - C] : 0) + (c ? dp[i - 1] : 0); }
    const ans = dp[R * C - 1];
    if (ans < (hard ? 15 : 4)) continue;
    const grid = [...Array(R).keys()].map((r) => [...Array(C).keys()].map((c) => { const i = r * C + c; return i === 0 ? '🚩' : i === R * C - 1 ? '🏁' : blocked.has(i) ? '■' : '·'; }));
    return { pub: { ui: 'num', text: '🚩 → 🏁 가장 짧은 길은 몇 가지?', sub: '오른쪽·아래로만 이동 · ■는 막힌 칸', grid }, secret: { ans }, answerText: `${ans}가지`, expl: '각 칸까지의 경우의 수 = 위 칸 + 왼쪽 칸' };
  }
}

/* ───────── 두뇌: 순서 기억 / 순간 포착 / 틀린 하나 / 순서대로 ───────── */
function genSimon(hard) {
  const n = hard ? 4 : 3, len = hard ? 8 : 5, seq = [];
  while (seq.length < len) { const x = rand(n * n); if (x !== seq[seq.length - 1]) seq.push(x); }
  return { pub: { n, seq, stepMs: hard ? 600 : 700 }, secret: { seq }, answerText: `${len}단계` };
}
const COUNT_SETS = [['🍎', '🍊', '🍋'], ['🐶', '🐱', '🐭'], ['⭐', '🌙', '☀️'], ['🚗', '🚕', '🚙'], ['🔴', '🟠', '🟡'], ['❤️', '💙', '💚']];
const COUNT_HARD = [['🔴', '🟠', '🟤', '🟣'], ['😀', '😃', '😄', '😁'], ['🕐', '🕑', '🕒', '🕓'], ['🌑', '🌒', '🌓', '🌔'], ['🟥', '🟧', '🟫', '🟪'], ['♠️', '♣️', '♥️', '♦️']];
function genCount(hard) {
  const set = pick(hard ? COUNT_HARD : COUNT_SETS), cols = 6, rows = hard ? 6 : 5, total = hard ? between(20, 28) : between(12, 18);
  const cells = Array(cols * rows).fill(''); const pos = shuffle([...Array(cols * rows).keys()]).slice(0, total);
  pos.forEach((p) => { cells[p] = pick(set); });
  const target = pick(set), ans = cells.filter((x) => x === target).length;
  return { pub: { cells, cols, target, pre: !hard, showMs: hard ? 3000 : 2600 }, secret: { ans }, answerText: `${target} ${ans}개`, expl: `전체 ${total}개` };
}
const ODD_PAIRS = [['人', '入'], ['未', '末'], ['土', '士'], ['己', '已'], ['鳥', '烏'], ['大', '犬'], ['王', '玉'], ['日', '曰'], ['빚', '빛'], ['쾅', '콸'], ['읽', '잃'], ['O', 'Q'], ['8', 'B'], ['M', 'N'], ['b', 'd'], ['p', 'q'], ['6', '9'], ['E', 'F'], ['밝', '밟'], ['몫', '몪'], ['😀', '😃'], ['🙂', '😊']];
function genOdd(hard) {
  const [a, b] = shuffle(pick(ODD_PAIRS)), cols = hard ? 8 : 7, n = cols * (hard ? 8 : 7), idx = rand(n);
  return { pub: { cols, cells: Array.from({ length: n }, (_, i) => (i === idx ? b : a)) }, secret: { ans: idx }, answerText: `${Math.floor(idx / cols) + 1}행 ${idx % cols + 1}열의 '${b}'` };
}
function genSchulte(hard) {
  const n = hard ? 6 : 5;
  return { pub: { n, cells: shuffle([...Array(n * n).keys()].map((x) => x + 1)) }, secret: {}, answerText: `1 → ${n * n} 완주` };
}

/* ───────── 심리전 (상황이 매번 바뀐다) ───────── */
const MINOR_THEMES = [['짜장면', '짬뽕'], ['부먹', '찍먹'], ['산', '바다'], ['고양이', '강아지'], ['여름', '겨울'], ['아침형', '저녁형'], ['민초 찬성', '민초 반대'], ['물냉', '비냉'], ['팥붕', '슈붕'], ['A', 'B'], ['왼쪽', '오른쪽'], ['홀', '짝']];
function genSocial(t, ids, hard) {
  const N = Math.max(2, ids.length);
  if (t === 'beauty') { const mul = pick([[1, 2], [2, 3], [2, 3], [3, 4], [4, 5]]), max = pick([100, 100, 100, 50]); return { pub: { mul, max }, secret: {} }; }
  if (t === 'minority') { const th = pick(MINOR_THEMES); return { pub: { A: th[0], B: th[1] }, secret: {} }; }
  if (t === 'lowest') return { pub: { max: Math.min(15, between(Math.max(4, N), N + 6)) }, secret: {} };
  if (t === 'split') return { pub: { coop: between(4, 8) * 10, pot: between(10, 18) * 10, lose: between(2, 5) * 10 }, secret: {} };
  if (t === 'indian') { const cards = {}; ids.forEach((id) => { cards[id] = between(1, 10); }); return { pub: { cards }, secret: {} }; }
  if (t === 'goods') return { pub: { C: pick([5, 8, 10, 10, 12]), m: pick([1.5, 2, 2, 2.5, 3]) }, secret: {} };
  if (t === 'auction') {
    const K = Math.max(3, N), vals = Array.from({ length: K }, () => between(1, 30)), hints = {};
    ids.forEach((id, i) => { hints[id] = vals[i]; });
    return { pub: { K, hints, max: K * 30 }, secret: { vals } };
  }
  if (t === 'rps') return { pub: {}, secret: {} };
  if (t === 'telepathy') { const [text, ...options] = pick(TELE); return { pub: { text, options: shuffle(options) }, secret: {} }; }
  return { pub: {}, secret: {} };
}

const GEN2 = {
  fruit: genFruit, clock: genClock, magic: genMagic, pyramid: genPyramid, ops: genOps, word: genWord,
  hap: genHap, lights: genLights, sudoku: genSudoku, nono: genNono, match: genMatch, knights: genKnights, zebra: genZebra, coin: genCoin, paths: genPaths,
  simon: genSimon, count: genCount, odd: genOdd, schulte: genSchulte,
};
for (const t of ['beauty', 'minority', 'lowest', 'split', 'indian', 'goods', 'auction', 'rps', 'telepathy']) GEN2[t] = (hard, ids) => genSocial(t, ids, hard);

const NORM2 = {
  hap: (raw, pub) => {
    if (pub.mode === 'count') return intIn(raw, 0, 84);
    const a = intArr(raw, 3, 0, 8); return a && a.length === 3 && new Set(a).size === 3 ? a.sort((x, y) => x - y) : null;
  },
  lights: (raw, pub) => intArr(raw, 200, 0, pub.n * pub.n - 1),
  sudoku: (raw, pub) => strRe(raw, new RegExp(`^[1-${pub.n}]{${pub.n * pub.n}}$`)),
  nono: (raw, pub) => strRe(raw, new RegExp(`^[01]{${pub.n * pub.n}}$`)),
  match: (raw) => strRe(raw, /^[0-9+\-=]{3,12}$/),
  ops: (raw, pub) => strRe(raw, new RegExp(`^[+\\-*/]{${pub.nums.length - 1}}$`)),
  knights: (raw, pub) => intIn(raw, 0, (1 << pub.names.length) - 1),
  coin: (raw, pub) => intIn(raw, 0, pub.N * 2 - 1),
  simon: (raw, pub) => intArr(raw, 20, 0, pub.n * pub.n - 1),
  count: (raw) => intIn(raw, 0, 999),
  odd: (raw, pub) => intIn(raw, 0, pub.cells.length - 1),
  schulte: (raw) => intIn(raw, 0, 999),
  indian: (raw) => intIn(raw, 0, 1),
  goods: (raw, pub) => intIn(raw, 0, pub.C),
  auction: (raw, pub) => intIn(raw, 0, pub.max),
  rps: (raw) => intIn(raw, 0, 2),
  telepathy: (raw, pub) => intIn(raw, 0, pub.options.length - 1),
};
const JUDGE2 = {
  hap: (v, s, pub) => (pub.mode === 'count' ? v === s.n : isHap(pub.tiles, v[0], v[1], v[2])),
  lights: (v, s, pub) => { const b = [...pub.b].map(Number); v.forEach((i) => lightsPress(b, pub.n, i)); return b.every((x) => !x); },
  sudoku: (v, s, pub) => [...pub.g].every((ch, i) => ch === '0' || ch === v[i]) && sudokuValid(v, pub.n, pub.bh, pub.bw),
  nono: (v, s, pub) => { const c = nonoClues([...v].map(Number), pub.n); return JSON.stringify(c.rows) === JSON.stringify(pub.rows) && JSON.stringify(c.cols) === JSON.stringify(pub.cols); },
  match: (v, s) => s.sols.includes(v),
  ops: (v, s) => { try { const w = Expr.evaluate(opsExpr(s.nums, [...v])).value; return w.d === 1 && w.n === s.target; } catch (e) { return false; } },
  knights: (v, s) => v === s.ans,
  coin: (v, s, pub) => (pub.hl ? v === s.ans : v >> 1 === s.ans >> 1),
  simon: (v, s) => v.length === s.seq.length && v.every((x, i) => x === s.seq[i]),
  count: (v, s) => v === s.ans,
  odd: (v, s) => v === s.ans,
  schulte: (v) => v <= 3,
};
// pub.ui = 'num' | 'mc' 공용
function normGeneric(raw, pub) { if (pub.ui === 'mc') return intIn(raw, 0, pub.options.length - 1); if (pub.ui === 'num') return numOK(raw); return undefined; }
function judgeGeneric(v, s, pub) { if (pub.ui === 'mc') return v === s.ans; return Math.abs(v - s.ans) < 1e-6; }
