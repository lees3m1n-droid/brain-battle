// 문제 생성기 검증: 모든 유형이 만들어지는지, 금고(숫자야구)는 답이 하나뿐인지, 초성 중복 없는지
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = { console, Math, JSON, Set, Map, Number, String, Array, Object };
vm.createContext(ctx);
for (const f of ['expr.js', 'data.js', 'gen.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', f), 'utf8').replace(/^const /gm, 'var '), ctx);
vm.runInContext(`
const used = new Set();
for (const t of Object.keys(TYPES)) for (let i = 0; i < 300; i++) { if (!makeQ(t, used).pub) throw t; }
for (let i = 0; i < 300; i++) { const q = makeCode(); const c = ALL3.filter((x) => q.pub.clues.every((cl) => sb(cl.g, x) === cl.s * 10 + cl.b)); if (c.length !== 1 || c[0] !== q.secret.ans) throw 'code ' + JSON.stringify(q); }
const seen = {}; for (const [c, w] of WORDS) { const k = c + toCho(w); if (seen[k]) throw 'dup ' + k; seen[k] = 1; }
for (const q of TRIVIA) if (new Set(q.slice(2, 6)).size !== 4) throw q;
for (let i = 0; i < 300; i++) { const q = makeCalc24(); if (!Expr.check(q.secret.expr, q.secret.nums, q.secret.target).ok) throw 'calc'; }
console.log('✅ 생성기 통과:', Object.keys(TYPES).length, '종,', TRIVIA.length, '상식,', FERMI.length, '어림');
`, ctx);
