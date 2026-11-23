/* ═════════════ 판정 · 점수 공용 ═════════════ */
function normalize(t, raw, q) {
  const int = (v, lo, hi) => { v = Number(v); return Number.isInteger(v) && v >= lo && v <= hi ? v : null; };
  const arr = (v, max, lo, hi) => (Array.isArray(v) && v.length <= max ? v.map((x) => (Number.isFinite(Number(x)) ? Number(x) : null)).filter((x) => x !== null && x >= lo && x <= hi) : null);
  const str = (v, re) => { v = String(v == null ? '' : v).replace(/\s+/g, '').slice(0, 24); return re.test(v) ? v : null; };
  q = q || {};
  if (q.ui) return normGeneric(raw, q);
  if (NORM2[t]) return NORM2[t](raw, q);
  switch (t) {
    case 'calc24': return typeof raw === 'string' && raw.length <= 60 ? raw : null;
    case 'trivia': case 'liar': return int(raw, 0, (q.names || q.options || [0, 0, 0, 0]).length - 1);
    case 'fermi': { const v = Number(raw); return Number.isFinite(v) && v > 0 && v < 1e15 ? v : null; }
    case 'sequence': return int(raw, -1e12, 1e12);
    case 'memory': { const m = (q.n || 4) ** 2 - 1; const a = arr(raw, m + 1, 0, m); return a ? [...new Set(a)].sort((x, y) => x - y) : null; }
    case 'timeline': { const n = (q.items || []).length; const a = arr(raw, n, 0, n - 1); return a && a.length === n && new Set(a).size === n ? a : null; }
    case 'mental': return arr(raw, 5, -1e6, 1e6);
    case 'stroop': return arr(raw, 8, -1, 3);
    case 'code': return str(raw, new RegExp(`^\\d{${q.L || 3}}$`));
    case 'digits': return str(raw, /^\d{1,14}$/);
    case 'chosung': return str(raw, /^.{1,24}$/);
    case 'beauty': return int(raw, 0, q.max || 100);
    case 'minority': case 'split': return int(raw, 0, 1);
    case 'lowest': return int(raw, 1, q.max || 10);
  }
  return null;
}
function shownOf(t, v, pub) {
  pub = pub || {};
  if (v === null) return '—';
  switch (t) {
    case 'trivia': return ['①', '②', '③', '④'][v];
    case 'liar': case 'zebra': return (pub.names || pub.options)[v];
    case 'knights': return pub.names.map((n, i) => (v >> i & 1 ? '😇' : '😈')).join('');
    case 'coin': return circ(v >> 1) + (pub.hl ? (v & 1 ? '↓' : '↑') : '');
    case 'hap': return Array.isArray(v) ? v.map((x) => x + 1).join('-') : `${v}개`;
    case 'lights': case 'sudoku': case 'nono': return '완성 제출';
    case 'ops': return [...v].map((o) => ({ '*': '×', '/': '÷', '-': '−' }[o] || o)).join(' ');
    case 'match': return v.replace(/-/g, '−');
    case 'simon': return `${v.length}단계`;
    case 'odd': return `${Math.floor(v / pub.cols) + 1}행 ${v % pub.cols + 1}열`;
    case 'schulte': return `실수 ${v}번`;
    case 'indian': return v ? '🏳️ 포기' : '⚔️ 승부';
    case 'rps': return ['✊', '✌️', '🖐️'][v];
    case 'goods': return `${v}코인`;
    case 'auction': return `${fmt(v)}원`;
    case 'minority': return v ? pub.B : pub.A;
    case 'memory': return `${v.length}칸`;
    case 'timeline': return '순서 제출';
    case 'mental': case 'stroop': return `${v.length}문항`;
    case 'split': return v ? '🗡️ 배신' : '🤝 협력';
    case 'calc24': return v.replace(/\*/g, '×').replace(/\//g, '÷').slice(0, 18);
    case 'fermi': return fmt(v);
    case 'clock': return v + '°';
    default: return String(v).slice(0, 14);
  }
}

// 각자 몰래 고른 뒤 한꺼번에 공개하는 심리전 결과. players: [{id,n,c}], answers: {id: 정규화된 답 | null}
function resolveSocial(t, Q, players, answers) {
  const pub = Q.pub, sec = Q.secret;
  const P = players.map((p) => ({ id: p.id, n: p.n, c: p.c, answer: answers[p.id] === undefined ? null : answers[p.id], gave: false }));
  const ans = P.filter((p) => p.answer !== null);
  const rows = [];
  let answerText = Q.answerText || '', expl = Q.expl || '';
  const miss = () => '시간 초과';
  const row = (p, ok, d, note) => rows.push({ id: p.id, n: p.n, c: p.c, sh: shownOf(t, p.answer, pub), ok: !!ok, d, note: note || '' });
  if (t === 'beauty') {
    const [mn, md] = pub.mul || [2, 3];
    const avg = ans.length ? ans.reduce((a, p) => a + p.answer, 0) / ans.length : 0, target = avg * mn / md;
    const bd = Math.min(...ans.map((p) => Math.abs(p.answer - target)));
    const W = ans.filter((p) => Math.abs(p.answer - target) === bd);
    for (const p of P) { const win = W.includes(p); row(p, win, win ? Math.round(110 / (W.length > 1 ? 1.5 : 1)) : 0, p.answer === null ? miss(p) : win ? '🏆 승리' : `거리 ${Math.abs(p.answer - target).toFixed(1)}`); }
    answerText = ans.length ? `평균 ${avg.toFixed(1)} × ${mn}/${md} = ${target.toFixed(1)}` : '제출 없음';
    expl = '남의 생각을 읽으려 할수록 숫자는 0으로 미끄러진다.';
  } else if (t === 'minority') {
    const c = [0, 0]; ans.forEach((p) => c[p.answer]++);
    const ws = c[0] !== c[1] && c[0] && c[1] ? (c[0] < c[1] ? 0 : 1) : -1;
    const nm = [pub.A || 'A', pub.B || 'B'];
    for (const p of P) {
      if (p.answer === null) row(p, false, 0, miss(p));
      else if (ws < 0) row(p, false, 0, '무승부');
      else if (p.answer === ws) row(p, true, 100, '🏆 소수파');
      else row(p, false, 0, '다수파');
    }
    answerText = `${nm[0]} ${c[0]}명 : ${nm[1]} ${c[1]}명${ws < 0 ? ' (무승부)' : ` → ${nm[ws]} 승`}`;
  } else if (t === 'lowest') {
    const cnt = {}; ans.forEach((p) => { cnt[p.answer] = (cnt[p.answer] || 0) + 1; });
    const uniq = Object.keys(cnt).filter((k) => cnt[k] === 1).map(Number).sort((a, b) => a - b);
    const win = uniq.length ? uniq[0] : null;
    for (const p of P) {
      if (p.answer === null) row(p, false, 0, miss(p));
      else if (p.answer === win) row(p, true, 120, '🏆 유일한 최저수');
      else row(p, false, 0, cnt[p.answer] > 1 ? `${cnt[p.answer]}명 겹침` : '더 작은 유일수 있음');
    }
    answerText = win === null ? '유일한 수가 없음 — 전원 실패' : `유일한 최저수: ${win}`;
    expl = Object.keys(cnt).sort((a, b) => a - b).map((k) => `${k}(${cnt[k]}명)`).join(' ');
  } else if (t === 'split') {
    const co = ans.filter((p) => p.answer === 0).length, be = ans.length - co;
    const C = pub.coop || 60, POT = pub.pot || 130, L = pub.lose || 30;
    for (const p of P) {
      if (p.answer === null) row(p, false, 0, miss(p));
      else if (be === 0) row(p, true, C, '🤝 전원 협력');
      else if (co === 0) row(p, false, -L, '💥 공멸');
      else if (p.answer === 1) row(p, true, Math.round(POT / be), '🗡️ 배신 성공');
      else row(p, false, -L, '😱 배신당함');
    }
    answerText = `🤝 협력 ${co}명 · 🗡️ 배신 ${be}명`;
    expl = be === 0 ? '모두가 믿었다.' : co === 0 ? '아무도 믿지 않았다.' : '배신자들이 보상을 나눠 가졌다.';
  } else if (t === 'indian') {
    const card = (p) => pub.cards[p.id] || 0;
    const go = ans.filter((p) => p.answer === 0), fold = ans.filter((p) => p.answer === 1);
    const top = go.length ? Math.max(...go.map(card)) : 0, maxAll = Math.max(0, ...P.map(card));
    const W = go.filter((p) => card(p) === top), L = go.filter((p) => card(p) !== top);
    const pot = 30 * L.length + 10 * fold.length;
    for (const p of P) {
      const c = card(p);
      if (p.answer === null) row(p, false, 0, miss(p));
      else if (p.answer === 1) { const pen = c === maxAll ? 30 : 10; row(p, false, -pen, `내 카드 ${c} · 포기${pen > 10 ? ' (최고 카드를 버림!)' : ''}`); }
      else if (W.includes(p)) row(p, true, 30 + Math.round(pot / W.length), `내 카드 ${c} · 🏆 승부 승리`);
      else row(p, false, -30, `내 카드 ${c} · 승부 패배`);
    }
    answerText = P.map((p) => `${p.n} ${card(p)}`).join(' · ');
    expl = '승부 승자: +30 + (패자 1명당 30, 포기자 1명당 10). 패자 −30, 포기 −10 (최고 카드를 버리면 −30)';
  } else if (t === 'goods') {
    const C = pub.C, m = pub.m, N = Math.max(1, ans.length), tot = ans.reduce((a, p) => a + p.answer, 0), share = (tot * m) / N;
    for (const p of P) {
      if (p.answer === null) { row(p, false, 0, miss(p)); continue; }
      const pay = C - p.answer + share, d = Math.round(((pay - C) * 100) / C);
      row(p, d > 0, d, `냄 ${p.answer} · 받음 ${share.toFixed(1)}`);
    }
    answerText = `금고 ${tot}코인 × ${m} = ${(tot * m).toFixed(1)} → 1인당 ${share.toFixed(1)}`;
    expl = '모두 다 내면 모두가 이득, 혼자만 안 내면 더 이득. 그래서 다들 안 내면 아무도 이득이 없다.';
  } else if (t === 'auction') {
    const val = sec.vals.reduce((a, b) => a + b, 0);
    const bids = ans.map((p) => p.answer), top = bids.length ? Math.max(...bids) : -1, tops = ans.filter((p) => p.answer === top);
    const win = tops.length === 1 && top > 0 ? tops[0] : null;
    for (const p of P) {
      if (p.answer === null) row(p, false, 0, miss(p));
      else if (p === win) row(p, val - top > 0, val - top, `🔨 낙찰! 가치 ${val} − 입찰 ${top}`);
      else row(p, false, 0, tops.length > 1 && p.answer === top ? '최고가 동점 → 유찰' : `입찰 ${p.answer}`);
    }
    answerText = `상품 가치 ${val} (${sec.vals.join('+')})`;
    expl = win ? (val - top >= 0 ? '싸게 샀다!' : '승자의 저주 — 너무 비싸게 샀다.') : '낙찰자 없음';
  } else if (t === 'rps') {
    const c = [0, 0, 0]; ans.forEach((p) => c[p.answer]++);
    const kinds = c.filter((x) => x).length;
    let winK = -1; if (kinds === 2) { if (!c[0]) winK = 1; else if (!c[1]) winK = 2; else winK = 0; } // 바위0 가위1 보2: 바위>가위, 가위>보, 보>바위
    const winners = winK < 0 ? 0 : c[winK], losers = ans.length - winners;
    for (const p of P) {
      if (p.answer === null) row(p, false, 0, miss(p));
      else if (winK < 0) row(p, false, 0, '무승부');
      else if (p.answer === winK) row(p, true, 30 + Math.round(90 * losers / Math.max(1, ans.length - 1)), '🏆 승리');
      else row(p, false, -20, '패배');
    }
    answerText = `✊ ${c[0]} · ✌️ ${c[1]} · 🖐️ ${c[2]}` + (winK < 0 ? ' → 무승부' : ` → ${['✊', '✌️', '🖐️'][winK]} 승`);
    expl = '이긴 사람이 적을수록, 진 사람이 많을수록 점수가 크다.';
  } else if (t === 'telepathy') {
    const cnt = pub.options.map(() => 0); ans.forEach((p) => cnt[p.answer]++);
    for (const p of P) {
      if (p.answer === null) { row(p, false, 0, miss(p)); continue; }
      const same = cnt[p.answer] - 1;
      row(p, same > 0, same * 25, same ? `나와 같은 사람 ${same}명` : '아무도 안 골랐다');
    }
    answerText = pub.options.map((o, i) => `${o} ${cnt[i]}`).join(' · ');
    expl = pub.text;
  }
  return { rows, at: answerText, ex: expl };
}
