/* ═════════════ 유틸 ═════════════ */
const $app = document.getElementById('app');
const $toast = document.getElementById('toast');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = (kind) => ({
  get(k) { try { return window[kind].getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window[kind].setItem(k, v); } catch (e) { /* */ } },
});
const ls = store('localStorage'), ss = store('sessionStorage');
const fmt = (n) => Number(n).toLocaleString('ko-KR');
const sgn = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n));
let toastT;
function toast(m) { $toast.textContent = m; $toast.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => $toast.classList.remove('show'), 2400); }
const cleanName = (s) => String(s || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 8) || '익명';
const PALETTE = ['#ff4d6d', '#ffd23f', '#3ddc97', '#4cc9f0', '#b388ff', '#ff9f1c', '#f15bb5', '#9ef01a', '#00f5d4', '#ff7b00'];
const INTRO_MS = 4500, REVEAL_MS = 12000, MAX_PLAYERS = 10;

let myId = ss.get('pb:id');
if (!myId) { myId = Math.random().toString(36).slice(2, 10); ss.set('pb:id', myId); }
let myName = ls.get('pb:name') || '';

/* ═════════════ 네트워크 (room capability) ═════════════ */
const net = { lobby: null, rm: null, state: 'wait' }; // state: wait | ok | none
setTimeout(async () => {
  const room = await getRoomCapability();
  if (!room) { net.state = 'none'; refreshHome(); return; }
  net.lobby = room; net.state = 'ok';
  room.onPeers(() => refreshHome(), () => { net.state = 'none'; refreshHome(); });
  refreshHome();
}, 0);
setTimeout(() => { if (net.state === 'wait') { net.state = 'none'; refreshHome(); } }, 11000);

function openRooms() {
  if (!net.lobby) return [];
  const out = new Map();
  for (const p of net.lobby.peers()) {
    const o = p.presence && p.presence.open;
    if (o && typeof o.code === 'string' && /^[A-Z]{4}$/.test(o.code) && !p.isMe) out.set(o.code, { code: o.code, h: cleanName(o.h), n: Number(o.n) || 1, ph: o.ph });
  }
  return [...out.values()];
}

/* ═════════════ 방장 엔진 ═════════════ */
// 방장 브라우저가 문제를 만들고 채점한다. 상태는 방장의 presence(st)로 모두에게 퍼진다.
let role = null; // 'host' | 'player' | 'solo'
let H = null, hostTimer = null, lastBody = '';
let mine = {}; // 내 입력 (ans, rdy, sab)

const curK = () => (S ? S.k : -1);

function hostCreate(code, solo) {
  H = { code, solo, phase: 'lobby', rounds: 8, g: 1, idx: -1, plan: [], type: null, q: null, used: new Set(), pl: new Map(), phaseEnd: 0, res: null, card: null, fin: null, endGo: false };
  role = solo ? 'solo' : 'host';
  mine = {};
  hostTimer = setInterval(hostTick, 250);
  hostTick();
}
function newPl(id, n) {
  const used = new Set([...H.pl.values()].map((p) => p.c));
  return { id, n: cleanName(n), c: PALETTE.find((c) => !used.has(c)) || pick(PALETTE), s: 0, on: true, answer: null, el: 0, lim: 0, ready: false, fx: [], pending: [], stats: { correct: 0, speedSum: 0, speedN: 0, steals: 0, best: 0 } };
}
function collectInputs() {
  const m = new Map();
  if (role === 'host' && net.rm) {
    for (const p of net.rm.peers()) {
      const pr = p.presence || {};
      if (p.isMe || pr.role === 'host' || typeof pr.id !== 'string') continue;
      m.set(pr.id.slice(0, 16), pr);
    }
  }
  m.set(myId, { ...mine, id: myId, n: myName });
  return m;
}
const kOf = () => H.g * 1000 + H.idx;
const baseLim = () => TYPES[H.type].limit * 1000;

function hostTick() {
  if (!H) return;
  const inp = collectInputs(), now = Date.now(), k = kOf();
  for (const [id, pr] of inp) {
    let P = H.pl.get(id);
    if (!P) { if (H.phase === 'lobby' && H.pl.size < MAX_PLAYERS) { P = newPl(id, pr.n); H.pl.set(id, P); } else continue; }
    if (H.phase === 'lobby') P.n = cleanName(pr.n);
    P.on = true;
  }
  for (const P of [...H.pl.values()]) if (!inp.has(P.id)) { P.on = false; if (H.phase === 'lobby') H.pl.delete(P.id); }
  const act = [...H.pl.values()].filter((p) => p.on);

  if (H.phase === 'intro') {
    if (now >= H.phaseEnd) startPlay();
  } else if (H.phase === 'play') {
    for (const P of act) {
      const a = inp.get(P.id).ans;
      if (P.answer === null && a && a.k === k) {
        const v = normalize(H.type, a.v); const el = Number(a.el);
        if (v !== null && Number.isFinite(el) && el <= P.lim + 1500) { P.answer = v; P.el = Math.max(0, Math.min(el, P.lim)); }
      }
    }
    if (!H.endGo && act.every((p) => p.answer !== null)) { H.endGo = true; H.phaseEnd = Math.min(H.phaseEnd, now + 700); }
    if (now >= H.phaseEnd) resolve();
  } else if (H.phase === 'reveal') {
    for (const P of act) {
      const i = inp.get(P.id);
      if (i.rdy === k) P.ready = true;
      if (H.card && H.card.w === P.id && !H.card.used && i.sab && i.sab.k === k) applySab(P, i.sab);
    }
    const w = H.card && H.card.w && H.pl.get(H.card.w);
    const cardDone = !w || H.card.used || !w.on;
    if (now >= H.phaseEnd || (cardDone && act.every((p) => p.ready))) nextRound();
  }
  publish();
}

function startGame() {
  const n = [...H.pl.values()].filter((p) => p.on).length;
  H.plan = buildPlan(H.rounds, n); H.idx = -1; H.used = new Set(); H.fin = null;
  for (const P of H.pl.values()) { P.s = 0; P.stats = { correct: 0, speedSum: 0, speedN: 0, steals: 0, best: 0 }; P.pending = []; }
  nextRound();
}
function nextRound() {
  H.idx++;
  if (H.idx >= H.plan.length) return finish();
  H.type = H.plan[H.idx]; H.q = makeQ(H.type, H.used);
  H.res = null; H.card = null; H.endGo = false;
  for (const P of H.pl.values()) { P.answer = null; P.el = 0; P.ready = false; P.fx = []; }
  H.phase = 'intro'; H.phaseEnd = Date.now() + INTRO_MS;
}
function startPlay() {
  const base = baseLim();
  for (const P of H.pl.values()) { P.fx = P.pending; P.pending = []; P.lim = P.fx.includes('shrink') ? Math.round(base * 0.65) : base; }
  H.phase = 'play'; H.phaseEnd = Date.now() + base + 900;
}
function applySab(P, sab) {
  const T = H.pl.get(String(sab.t)); const kind = String(sab.kind);
  if (!SABOTAGE[kind] || !T || T === P) return;
  H.card.used = true;
  if (kind === 'steal') { T.s -= 40; P.s += 40; P.stats.steals++; } else T.pending.push(kind);
  H.card.log = `${SABOTAGE[kind].emoji} ${P.n} → ${T.n} : ${SABOTAGE[kind].label}`;
}

function normalize(t, raw) {
  const int = (v, lo, hi) => { v = Number(v); return Number.isInteger(v) && v >= lo && v <= hi ? v : null; };
  const arr = (v, max, lo, hi) => (Array.isArray(v) && v.length <= max ? v.map((x) => (Number.isFinite(Number(x)) ? Number(x) : null)).filter((x) => x !== null && x >= lo && x <= hi) : null);
  const str = (v, re) => { v = String(v == null ? '' : v).replace(/\s+/g, '').slice(0, 24); return re.test(v) ? v : null; };
  switch (t) {
    case 'calc24': return typeof raw === 'string' && raw.length <= 60 ? raw : null;
    case 'trivia': case 'liar': return int(raw, 0, 3);
    case 'fermi': { const v = Number(raw); return Number.isFinite(v) && v > 0 && v < 1e15 ? v : null; }
    case 'sequence': return int(raw, -1e12, 1e12);
    case 'memory': { const a = arr(raw, 16, 0, 15); return a ? [...new Set(a)].sort((x, y) => x - y) : null; }
    case 'timeline': { const a = arr(raw, 4, 0, 3); return a && a.length === 4 && new Set(a).size === 4 ? a : null; }
    case 'mental': return arr(raw, 5, -1e6, 1e6);
    case 'stroop': return arr(raw, 8, -1, 3);
    case 'code': return str(raw, /^\d{3}$/);
    case 'digits': return str(raw, /^\d{1,12}$/);
    case 'chosung': return str(raw, /^.{1,24}$/);
    case 'beauty': return int(raw, 0, 100);
    case 'minority': case 'split': return int(raw, 0, 1);
    case 'lowest': return int(raw, 1, 10);
  }
  return null;
}
function shownOf(t, v) {
  if (v === null) return '—';
  switch (t) {
    case 'trivia': case 'liar': return ['①', '②', '③', '④'][v];
    case 'memory': return `${v.length}칸`;
    case 'timeline': return '순서 제출';
    case 'mental': case 'stroop': return `${v.length}문항`;
    case 'minority': return v ? 'B' : 'A';
    case 'split': return v ? '🗡️ 배신' : '🤝 협력';
    case 'calc24': return v.replace(/\*/g, '×').replace(/\//g, '÷').slice(0, 18);
    case 'fermi': return fmt(v);
    default: return String(v).slice(0, 14);
  }
}

function resolve() {
  const t = H.type, sec = H.q.secret, P = [...H.pl.values()];
  const ans = P.filter((p) => p.answer !== null);
  const sp = (p) => (p.answer === null ? 0 : Math.max(0, 1 - p.el / p.lim));
  const rows = [];
  let answerText = H.q.answerText || '', expl = H.q.expl || '';
  const row = (p, ok, d, note) => rows.push({ id: p.id, n: p.n, c: p.c, sh: shownOf(t, p.answer), ok: !!ok, d, note: note || '', sp: ok ? sp(p) : 0 });
  const BIN = {
    calc24: (v) => Expr.check(v, sec.nums, sec.target).ok,
    trivia: (v) => v === sec.ans, liar: (v) => v === sec.ans, sequence: (v) => v === sec.ans,
    memory: (v) => v.length === sec.cells.length && v.every((x, i) => x === sec.cells[i]),
    timeline: (v) => v.every((x, i) => x === sec.ans[i]),
    code: (v) => v === sec.ans, digits: (v) => v === sec.ans, chosung: (v) => v === sec.ans,
  };
  const SER = { mental: 1, stroop: 1 };

  if (BIN[t] || SER[t]) {
    const J = new Map();
    for (const p of ans) {
      if (BIN[t]) J.set(p.id, { ok: BIN[t](p.answer) });
      else { const a = sec.ans; let c = 0; a.forEach((x, i) => { if (p.answer[i] === x) c++; }); J.set(p.id, { ok: c / a.length >= 0.75, acc: c / a.length, c, n: a.length }); }
    }
    const oks = ans.filter((p) => J.get(p.id).ok).sort((a, b) => a.el - b.el);
    for (const p of P) {
      const j = J.get(p.id); let d, note = '';
      if (j && j.ok) { d = Math.round((BIN[t] ? 50 + 70 * sp(p) : 30 + 60 * j.acc + 40 * sp(p))); if (p === oks[0] && P.length > 1) { d += 25; note = '⚡ 최속 +25'; } }
      else { d = 0; note = p.answer === null ? '시간 초과' : '오답'; }
      if (SER[t] && j) note = `${j.c}/${j.n} 정답` + (note ? ' · ' + note : '');
      row(p, j && j.ok, d, note);
    }
    if (t === 'calc24') answerText = sec.expr.replace(/\*/g, '×').replace(/\//g, '÷') + ' = ' + sec.target;
    if (t === 'mental') { answerText = '정답'; }
  } else if (t === 'fermi') {
    let best = Infinity; const E = new Map();
    for (const p of ans) { const e = Math.abs(Math.log(p.answer / sec.value)); E.set(p.id, e); best = Math.min(best, e); }
    for (const p of P) {
      const e = E.get(p.id), ok = e !== undefined && e <= 0.25; let d, note = '';
      if (ok) { d = Math.round(40 + 80 * (1 - e / 0.25)); if (e === best) { d += 25; note = '🎯 최근접 +25'; } }
      else { d = 0; note = e === undefined ? '시간 초과' : `${Math.round((Math.exp(e) - 1) * 100)}% 빗나감`; }
      row(p, ok, d, note);
    }
  } else if (t === 'beauty') {
    const avg = ans.length ? ans.reduce((a, p) => a + p.answer, 0) / ans.length : 0, target = avg * 2 / 3;
    const bd = Math.min(...ans.map((p) => Math.abs(p.answer - target)));
    const W = ans.filter((p) => Math.abs(p.answer - target) === bd);
    for (const p of P) { const win = W.includes(p); row(p, win, win ? Math.round(110 / (W.length > 1 ? 1.5 : 1)) : 0, p.answer === null ? '시간 초과' : win ? '🏆 승리' : `거리 ${Math.abs(p.answer - target).toFixed(1)}`); }
    answerText = ans.length ? `평균 ${avg.toFixed(1)} × 2/3 = ${target.toFixed(1)}` : '제출 없음';
    expl = '남의 생각을 읽으려 할수록 숫자는 0으로 미끄러진다.';
  } else if (t === 'minority') {
    const c = [0, 0]; ans.forEach((p) => c[p.answer]++);
    const ws = c[0] !== c[1] && c[0] && c[1] ? (c[0] < c[1] ? 0 : 1) : -1;
    for (const p of P) {
      if (p.answer === null) row(p, false, 0, '시간 초과');
      else if (ws < 0) row(p, false, 0, '무승부');
      else if (p.answer === ws) row(p, true, 100, '🏆 소수파');
      else row(p, false, 0, '다수파');
    }
    answerText = `A ${c[0]}명 : B ${c[1]}명${ws < 0 ? ' (무승부)' : ` → ${ws ? 'B' : 'A'} 승`}`;
  } else if (t === 'lowest') {
    const cnt = {}; ans.forEach((p) => { cnt[p.answer] = (cnt[p.answer] || 0) + 1; });
    const uniq = Object.keys(cnt).filter((k) => cnt[k] === 1).map(Number).sort((a, b) => a - b);
    const win = uniq.length ? uniq[0] : null;
    for (const p of P) {
      if (p.answer === null) row(p, false, 0, '시간 초과');
      else if (p.answer === win) row(p, true, 120, '🏆 유일한 최저수');
      else row(p, false, 0, cnt[p.answer] > 1 ? `${cnt[p.answer]}명 겹침` : '더 작은 유일수 있음');
    }
    answerText = win === null ? '유일한 수가 없음 — 전원 실패' : `유일한 최저수: ${win}`;
    expl = Object.keys(cnt).sort((a, b) => a - b).map((k) => `${k}(${cnt[k]}명)`).join(' ');
  } else if (t === 'split') {
    const co = ans.filter((p) => p.answer === 0).length, be = ans.length - co;
    for (const p of P) {
      if (p.answer === null) row(p, false, 0, '시간 초과');
      else if (be === 0) row(p, true, 60, '🤝 전원 협력');
      else if (co === 0) row(p, false, -30, '💥 공멸');
      else if (p.answer === 1) row(p, true, Math.round(130 / be), '🗡️ 배신 성공');
      else row(p, false, -30, '😱 배신당함');
    }
    answerText = `🤝 협력 ${co}명 · 🗡️ 배신 ${be}명`;
    expl = be === 0 ? '모두가 믿었다.' : co === 0 ? '아무도 믿지 않았다.' : '배신자들이 보상을 나눠 가졌다.';
  }

  for (const r of rows) {
    const p = H.pl.get(r.id); p.s += r.d;
    if (r.ok) { p.stats.correct++; if (r.sp > 0) { p.stats.speedSum += r.sp; p.stats.speedN++; } }
    p.stats.best = Math.max(p.stats.best, r.d);
  }
  rows.sort((a, b) => b.d - a.d);
  for (const r of rows) delete r.sp;
  H.res = { at: answerText.slice(0, 160), ex: expl.slice(0, 160), rows };
  const w = rows.length > 1 && rows[0].d > 0 ? rows[0].id : null;
  H.card = { w, used: false, log: '' };
  for (const p of P) p.ready = false;
  H.phase = 'reveal'; H.phaseEnd = Date.now() + (H.idx + 1 >= H.plan.length ? 9000 : REVEAL_MS);
}

function finish() {
  const P = [...H.pl.values()];
  const by = (f) => P.slice().sort((a, b) => f(b) - f(a))[0];
  const awards = [];
  const mc = by((p) => p.stats.correct); if (mc && mc.stats.correct) awards.push({ e: '🎓', t: '정답왕', id: mc.id, note: `${mc.stats.correct}회 정답` });
  const sp = P.filter((p) => p.stats.speedN); if (sp.length) { const f = sp.sort((a, b) => b.stats.speedSum / b.stats.speedN - a.stats.speedSum / a.stats.speedN)[0]; awards.push({ e: '⚡', t: '번개손', id: f.id, note: '정답 속도 1위' }); }
  const th = by((p) => p.stats.steals); if (th && th.stats.steals) awards.push({ e: '🫳', t: '소매치기', id: th.id, note: `${th.stats.steals}회 강탈` });
  const bw = by((p) => p.stats.best); if (bw && bw.stats.best > 0) awards.push({ e: '💥', t: '한 방', id: bw.id, note: `한 라운드 +${bw.stats.best}` });
  H.fin = { rk: P.slice().sort((a, b) => b.s - a.s).map((p) => ({ id: p.id, n: p.n, c: p.c, s: p.s, cr: p.stats.correct })), aw: awards };
  H.phase = 'final'; H.phaseEnd = 0;
}

function hostAction(type, x) {
  if (type === 'settings' && H.phase === 'lobby' && [8, 12, 16].includes(x.rounds)) H.rounds = x.rounds;
  if (type === 'start' && H.phase === 'lobby') startGame();
  if (type === 'rematch' && H.phase === 'final') { H.phase = 'lobby'; H.g++; H.idx = -1; H.type = null; H.fin = null; for (const P of H.pl.values()) P.s = 0; }
  hostTick();
}

function buildSt() {
  const play = H.phase === 'play', base = H.type ? baseLim() : 0;
  const pl = [...H.pl.values()].map((p) => {
    const o = { id: p.id, n: p.n, c: p.c, s: p.s, on: p.on };
    if (play) { o.dn = p.answer !== null; if (p.fx.length) o.fx = p.fx; if (p.lim !== base) o.lim = p.lim; }
    if (H.phase === 'reveal') o.dn = p.ready;
    return o;
  });
  const st = { v: 2, g: H.g, ph: H.phase, code: H.code, rounds: H.rounds, idx: H.idx, total: H.plan.length, type: H.type, pl, host: myId };
  if (play) st.q = H.q.pub;
  if (H.phase === 'reveal') { st.res = H.res; st.card = H.card; }
  if (H.phase === 'final') st.fin = H.fin;
  return st;
}
function publish() {
  const st = buildSt();
  const body = JSON.stringify(st);
  if (body === lastBody) return;
  lastBody = body;
  st.rem = H.phaseEnd ? Math.max(0, H.phaseEnd - Date.now()) : 0;
  if (role === 'host' && net.rm) {
    net.rm.presence({ role: 'host', id: myId, n: myName, st }).catch((e) => console.warn('presence', e && e.code, e && e.message));
    const n = [...H.pl.values()].filter((p) => p.on).length;
    net.lobby.presence({ open: H.phase === 'lobby' ? { code: H.code, h: myName, n } : null }).catch(() => { });
  }
  onState(st);
}

/* ═════════════ 참가자 ═════════════ */
let hostSeen = 0, watchT = null;
async function joinRoom(code, create) {
  if (net.state !== 'ok') return toast('멀티플레이 연결이 아직 안 됐어요');
  try {
    if (net.rm) { await net.rm.leave().catch(() => { }); net.rm = null; }
    net.rm = await net.lobby.join('pb-' + code.toLowerCase());
  } catch (e) { return toast('방에 들어가지 못했어요 (' + (e && e.code || '오류') + ')'); }
  if (create) { hostCreate(code, false); return; }
  role = 'player'; mine = {}; hostSeen = Date.now();
  net.rm.presence({ id: myId, n: myName }).catch(() => { });
  $app.innerHTML = `<div class="logo" style="font-size:34px">두뇌 배틀</div><div class="card center"><div class="code">${esc(code)}</div><div class="dim pulse">방장을 찾는 중…</div></div>`;
  let lastSt = null;
  net.rm.onPeers(() => {
    const host = net.rm && net.rm.peers().find((p) => p.presence && p.presence.role === 'host' && p.presence.st && p.presence.st.v === 2);
    if (!host) return;
    hostSeen = Date.now();
    if (host.presence.st !== lastSt) { lastSt = host.presence.st; onState(lastSt); }
  });
  clearInterval(watchT);
  watchT = setInterval(() => {
    if (role !== 'player') return clearInterval(watchT);
    const host = net.rm && net.rm.peers().find((p) => p.presence && p.presence.role === 'host');
    if (host) hostSeen = Date.now();
    else if (Date.now() - hostSeen > (S ? 8000 : 7000)) { clearInterval(watchT); toast(S ? '방장이 나갔어요' : '그런 방을 찾지 못했어요'); leaveRoom(); }
  }, 1000);
}
function leaveRoom() {
  clearInterval(hostTimer); clearInterval(watchT); hostTimer = null; H = null; role = null; S = null; viewKey = ''; lastBody = ''; mine = {};
  if (net.rm) { net.rm.leave().catch(() => { }); net.rm = null; }
  if (net.lobby) net.lobby.presence({ open: null }).catch(() => { });
  homeView();
}
function act(type, x = {}) {
  if (['settings', 'start', 'rematch'].includes(type)) { if (H) hostAction(type, x); return; }
  const k = curK(); let patch = null;
  if (type === 'answer') patch = { ans: { k, v: x.value, el: Math.round(performance.now() - playT0) } };
  if (type === 'ready') patch = { rdy: k };
  if (type === 'sabotage') patch = { sab: { k, kind: x.kind, t: x.target } };
  if (!patch) return;
  Object.assign(mine, patch);
  if (role === 'player' && net.rm) net.rm.presence(patch).catch(() => toast('전송 실패 — 연결을 확인하세요'));
  if (H) hostTick();
}

/* ═════════════ 화면 상태 ═════════════ */
let S = null, viewKey = '', cur = null, tEnd = 0, tTotal = 1, locked = false, playT0 = 0;
const P = (id) => (S ? S.players.find((p) => p.pid === id) : null);

function onState(st) {
  const k = st.g * 1000 + st.idx;
  const meP = st.pl.find((p) => p.id === myId);
  S = {
    k, code: st.code, phase: st.ph, me: myId, hostPid: st.host, rounds: st.rounds, inGame: !!meP,
    players: st.pl.map((p) => ({ pid: p.id, name: p.n, color: p.c, score: p.s, connected: p.on, done: p.dn })),
    round: st.type ? { idx: st.idx + 1, total: st.total, type: st.type, ...TYPES[st.type] } : null,
    q: st.q, fx: (meP && meP.fx) || [], myLim: meP && meP.lim, rem: st.rem || 0,
    submitted: !!(mine.ans && mine.ans.k === k),
    reveal: st.res, card: st.card ? { forMe: st.card.w === myId && !st.card.used, winner: st.card.w, used: st.card.used, log: st.card.log } : null,
    final: st.fin,
  };
  const key = st.g + ':' + st.ph + ':' + st.idx + ':' + S.inGame;
  if (S.phase !== 'play') tEnd = performance.now() + S.rem;
  if (key !== viewKey) {
    viewKey = key; locked = false; cur = null;
    if (S.phase === 'play') {
      const base = TYPES[st.type].limit * 1000;
      playT0 = performance.now() - Math.max(0, base + 900 - S.rem);
      tTotal = S.myLim || base; tEnd = playT0 + tTotal;
    } else tTotal = Math.max(1, S.rem);
    if (!S.inGame && S.phase !== 'lobby') spectateView();
    else ({ lobby: lobbyView, intro: introView, play: playView, reveal: revealView, final: finalView }[S.phase])();
    if (S.phase === 'reveal' && navigator.vibrate) { const r = S.reveal.rows.find((x) => x.id === myId); if (r) try { navigator.vibrate(r.d > 0 ? 40 : [70, 40, 70]); } catch (e) { /* */ } }
  } else if (cur && cur.update) cur.update();
}
setInterval(() => {
  const bar = document.getElementById('tbar'); if (!bar) return;
  const rem = Math.max(0, tEnd - performance.now());
  bar.style.transform = `scaleX(${Math.min(1, rem / tTotal)})`;
  const t = document.getElementById('tsec'); if (t) t.textContent = Math.ceil(rem / 1000) + '초';
}, 100);

/* ═════════════ 홈 ═════════════ */
function refreshHome() { if (!role) { const box = document.getElementById('mp'); if (box) renderMP(box); } }
function renderMP(box) {
  if (net.state === 'wait') { box.innerHTML = '<div class="dim center pulse">멀티플레이 연결 중…</div>'; return; }
  if (net.state === 'none') {
    box.innerHTML = `<div class="small dim" style="line-height:1.6">멀티플레이 서버에 연결하지 못했어요. 이 주소는 정적 호스팅이라 <b style="color:var(--txt)">서버가 켜진 주소</b>에서만 친구와 할 수 있어요. 아래 <b style="color:var(--yel)">혼자 연습</b>은 바로 할 수 있어요.</div>`;
    return;
  }
  if (!box.querySelector('#mk')) {
    box.innerHTML = `
      <button class="big" id="mk">방 만들기</button>
      <div class="dim small" style="margin-top:4px">열린 방</div>
      <div class="col" id="rooms"></div>
      <div class="row"><input id="cd" type="text" maxlength="4" placeholder="코드 4자리" style="text-transform:uppercase;letter-spacing:5px;text-align:center;font-weight:800" autocomplete="off"><button class="sec" id="jn" style="flex:none">입장</button></div>`;
    box.querySelector('#mk').onclick = () => {
      if (!takeName()) return;
      const taken = new Set(openRooms().map((r) => r.code)); let c;
      do { c = ''; for (let i = 0; i < 4; i++) c += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[rand(24)]; } while (taken.has(c));
      joinRoom(c, true);
    };
    box.querySelector('#jn').onclick = () => { const c = box.querySelector('#cd').value.trim().toUpperCase(); if (!/^[A-Z]{4}$/.test(c)) return toast('코드 4자리를 입력하세요'); if (takeName()) joinRoom(c, false); };
  }
  const rooms = openRooms();
  const html = rooms.length ? rooms.map((r) => `<button class="sec" data-code="${r.code}" style="display:flex;justify-content:space-between"><span>🚪 ${esc(r.h)}의 방 <span class="dim">${r.code}</span></span><span>${r.n}명</span></button>`).join('') : '<div class="dim small center">지금 열린 방이 없어요. 직접 만들어 보세요.</div>';
  const list = box.querySelector('#rooms');
  if (list.dataset.html !== html) {
    list.dataset.html = html; list.innerHTML = html;
    list.querySelectorAll('[data-code]').forEach((b) => { b.onclick = () => { if (takeName()) joinRoom(b.dataset.code, false); }; });
  }
}
function takeName() {
  const el = document.getElementById('nm'); const v = el ? el.value.trim() : myName;
  if (!v) { toast('닉네임을 입력하세요'); return false; }
  myName = cleanName(v); ls.set('pb:name', myName); return true;
}
function homeView() {
  role = null;
  $app.innerHTML = `
    <div class="logo">두뇌 배틀</div>
    <div class="tag">16가지 두뇌 대결, 최후의 1인은 누구? 🧠</div>
    <div class="card col" style="margin-top:14px">
      <input id="nm" type="text" maxlength="8" placeholder="닉네임 (최대 8자)" value="${esc(myName)}" autocomplete="off">
      <div class="col" id="mp"></div>
    </div>
    <button class="sec" id="solo">🎯 혼자 연습 (12라운드)</button>
    <div class="card small dim" style="line-height:1.7">
      <b style="color:var(--txt)">16가지 미니게임</b><br>
      ${['수학', '상식', '퍼즐', '두뇌', '심리'].map((c) => `<b style="color:var(--cyan)">${c}</b> ${Object.values(TYPES).filter((t) => t.cat === c).map((t) => t.emoji + ' ' + t.label).join(' · ')}`).join('<br>')}<br><br>
      빠르고 정확하게 맞힐수록 높은 점수! 라운드 1등은 상대에게 <b style="color:var(--vio)">방해 카드</b>를 날립니다.
    </div>`;
  renderMP(document.getElementById('mp'));
  document.getElementById('solo').onclick = () => { if (!takeName()) return; hostCreate('SOLO', true); H.rounds = 12; startGame(); hostTick(); };
}

/* ═════════════ 공통 조각 ═════════════ */
function boardHTML() {
  const sorted = S.players.slice().sort((a, b) => b.score - a.score);
  return `<div class="board">${sorted.map((p, i) => `
    <div class="brow ${p.pid === S.me ? 'me' : ''}" style="${p.connected ? '' : 'opacity:.45'}">
      <span class="rk">${i + 1}</span>
      <span class="nm"><i class="dot" style="background:${p.color}"></i>${esc(p.name)}${p.pid === S.hostPid ? ' <span class="crown">👑</span>' : ''}${p.connected ? '' : ' <span class="dim small">(끊김)</span>'}</span>
      ${p.done ? '<span class="pos">✔</span>' : ''}
      <span class="sc">${fmt(p.score)}</span>
    </div>`).join('')}</div>`;
}
function doneCount() { const a = S.players.filter((p) => p.connected); return `${a.filter((p) => p.done).length}/${a.length}`; }
function topbar() { const r = S.round; return `<div class="topbar"><span class="badge">R${r.idx}/${r.total} · ${r.emoji} ${esc(r.label)}</span><span class="badge" id="who"></span></div><div class="timer"><i id="tbar"></i></div>`; }

/* ═════════════ 로비 ═════════════ */
function lobbyView() {
  $app.innerHTML = `
    <div class="card col">
      <div class="center dim small">방 코드</div>
      <div class="code">${esc(S.code)}</div>
      <div class="small dim center" style="line-height:1.5">이 페이지를 공유받은 친구가 홈 화면의 <b style="color:var(--txt)">열린 방</b>에서 누르거나<br>코드 <b style="color:var(--yel)">${esc(S.code)}</b>를 입력하면 들어옵니다</div>
    </div>
    <div class="card col"><div class="row"><b class="grow">참가자</b><span class="dim small" id="cnt"></span></div><div class="chips" id="pl"></div></div>
    <div class="card col" id="host"></div>
    <button class="sec" id="lv">나가기</button>`;
  document.getElementById('lv').onclick = leaveRoom;
  const upd = () => {
    document.getElementById('pl').innerHTML = S.players.map((p) => `<span class="chip"><i class="dot" style="background:${p.color}"></i>${esc(p.name)}${p.pid === S.hostPid ? ' 👑' : ''}${p.pid === S.me ? ' <span class="dim small">(나)</span>' : ''}</span>`).join('');
    document.getElementById('cnt').textContent = S.players.length + '명';
    const host = document.getElementById('host');
    if (role === 'host') {
      host.innerHTML = `<b>라운드 수</b><div class="row">${[8, 12, 16].map((n) => `<button class="${S.rounds === n ? '' : 'sec'} grow" data-r="${n}">${n}</button>`).join('')}</div>
        <button class="big grn" id="go">게임 시작 (${S.players.length}명)</button>
        ${S.players.length < 2 ? '<div class="dim small center">1명이면 심리전 4종은 빠져요</div>' : ''}`;
      host.querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => act('settings', { rounds: Number(b.dataset.r) }); });
      document.getElementById('go').onclick = () => act('start');
    } else host.innerHTML = `<div class="center dim pulse">방장이 시작하길 기다리는 중…</div><div class="center small dim">${S.rounds}라운드</div>`;
  };
  upd(); cur = { update: upd };
}
function spectateView() {
  $app.innerHTML = `<div class="card center col"><b>이미 진행 중인 판이에요</b><div class="dim small">이번 판이 끝나고 방장이 “한 판 더”를 누르면 자동으로 참가돼요.</div></div><div id="bd"></div><button class="sec" id="lv">나가기</button>`;
  document.getElementById('lv').onclick = leaveRoom;
  const upd = () => { document.getElementById('bd').innerHTML = boardHTML(); };
  upd(); cur = { update: upd };
}

/* ═════════════ 라운드 소개 ═════════════ */
function introView() {
  const r = S.round;
  $app.innerHTML = `
    <div class="topbar"><span class="badge">라운드 ${r.idx}/${r.total} · ${esc(r.cat)}</span><span class="badge">곧 시작</span></div>
    <div class="timer"><i id="tbar"></i></div>
    <div class="hero pop"><div class="em">${r.emoji}</div><h2>${esc(r.label)}</h2><p>${esc(r.desc)}</p></div>
    <div class="center dim pulse">준비하세요…</div>
    <div id="bd"></div>`;
  const upd = () => { document.getElementById('bd').innerHTML = boardHTML(); };
  upd(); cur = { update: upd };
}

/* ═════════════ 플레이 ═════════════ */
function playView() {
  const r = S.round, q = S.q, fx = S.fx;
  const FXN = { fog: '🌫️ 안개 — 문제가 흐릿하게 시작됩니다', mirror: '🪞 거울 — 문제가 뒤집혔습니다', shrink: '⏳ 시간 단축 — 제한시간이 35% 줄었습니다' };
  const cls = (fx.includes('fog') ? ' fog' : '') + (fx.includes('mirror') ? ' mirror' : '');
  $app.innerHTML = `${topbar()}
    ${fx.length ? `<div class="fxbar">${fx.filter((f) => FXN[f]).map((f) => FXN[f]).join('<br>')}</div>` : ''}
    <div class="row"><span class="grow"></span><span class="badge" id="tsec"></span></div>
    <div id="stage" class="col"></div><div id="bd"></div>`;
  const stage = document.getElementById('stage');
  const showDone = () => { stage.innerHTML = '<div class="done pop">✔ 제출 완료<br><span class="dim small">다른 사람을 기다리는 중…</span></div>'; };
  const submit = (v) => { if (locked) return; if (performance.now() > tEnd + 300) return toast('시간이 지났어요'); locked = true; act('answer', { value: v }); showDone(); };
  const upd = () => { const w = document.getElementById('who'); if (w) w.textContent = '제출 ' + doneCount(); document.getElementById('bd').innerHTML = boardHTML(); };
  cur = { update: upd }; upd();
  if (S.submitted) { showDone(); return; }
  const unfog = () => { if (fx.includes('fog')) setTimeout(() => stage.querySelectorAll('.fog').forEach((e) => e.classList.add('clear')), 5000); };
  const qbox = (inner, small) => `<div class="q${cls}">${small ? `<small>${esc(small)}</small>` : ''}${inner}</div>`;
  const numInput = (ph, mode) => `<input id="in" type="text" inputmode="${mode || 'numeric'}" placeholder="${esc(ph)}" style="text-align:center;font-weight:800;font-size:22px" autocomplete="off"><button class="big" id="ok">제출</button>`;
  const bindInput = (check) => {
    const go = () => { const v = document.getElementById('in').value.trim(); const res = check(v); if (res === undefined) return; submit(res); };
    document.getElementById('ok').onclick = go;
    document.getElementById('in').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  };
  const choice = (sel) => stage.querySelectorAll(sel).forEach((b) => { b.onclick = () => { b.classList.add('sel'); submit(Number(b.dataset.i)); }; });
  const T = r.type;

  if (T === 'trivia') {
    stage.innerHTML = qbox(esc(q.text), q.cat) + `<div class="opts">${q.options.map((o, i) => `<button class="opt" data-i="${i}">${['①', '②', '③', '④'][i]}&nbsp; ${esc(o)}</button>`).join('')}</div>`;
    choice('.opt');
  } else if (T === 'liar') {
    stage.innerHTML = qbox('범인은 누구일까?', `4명 중 정확히 ${q.T}명만 진실을 말한다`) +
      `<div class="col${cls}">${q.lines.map((l) => `<div class="card" style="padding:12px;font-weight:700;font-size:17px">${esc(l)}</div>`).join('')}</div>
      <div class="opts" style="grid-template-columns:1fr 1fr">${q.names.map((n, i) => `<button class="opt" style="text-align:center" data-i="${i}">${esc(n)}</button>`).join('')}</div>`;
    choice('.opt');
  } else if (T === 'sequence') {
    stage.innerHTML = qbox('다음에 올 수는?') + `<div class="seq${cls}">${q.seq.map((n) => `<span>${n}</span>`).join('')}<span class="qm">?</span></div>` + numInput('정답 입력', 'text');
    bindInput((v) => (/^-?\d+$/.test(v) ? Number(v) : (toast('정수를 입력하세요'), undefined)));
  } else if (T === 'fermi') {
    stage.innerHTML = qbox(esc(q.text), `단위: ${q.unit}`) + numInput(`어림값 (${q.unit})`, 'decimal') + '<div class="dim small center">정답의 약 −22% ~ +28% 안이면 득점</div>';
    bindInput((v) => { const n = Number(v.replace(/,/g, '')); return n > 0 ? n : (toast('0보다 큰 수를 입력하세요'), undefined); });
  } else if (T === 'chosung') {
    stage.innerHTML = qbox(`<span style="font-size:44px;letter-spacing:6px;color:var(--yel)">${esc(q.cho)}</span>`, `분류: ${q.cat} · 띄어쓰기 없이`) + numInput('단어 입력', 'text');
    bindInput((v) => (v ? v.replace(/\s+/g, '') : (toast('단어를 입력하세요'), undefined)));
  } else if (T === 'code') {
    stage.innerHTML = qbox('세 자리 비밀번호는?', '0~9 서로 다른 숫자 · S=숫자·자리 일치, B=숫자만 일치') +
      `<div class="col${cls}">${q.clues.map((c) => `<div class="card row" style="padding:10px 14px"><b style="font-size:24px;letter-spacing:6px" class="grow">${c.g}</b><b>${c.s || c.b ? `${c.s ? `<span class="pos">${c.s}S</span> ` : ''}${c.b ? `<span style="color:var(--yel)">${c.b}B</span>` : ''}` : '<span class="neg">OUT</span>'}</b></div>`).join('')}</div>` + numInput('예: 482');
    bindInput((v) => (/^\d{3}$/.test(v) && new Set(v).size === 3 ? v : (toast('서로 다른 숫자 3자리를 입력하세요'), undefined)));
  } else if (T === 'timeline') timelineUI(stage, q, cls, submit);
  else if (T === 'calc24') calcUI(stage, q, cls, submit);
  else if (T === 'memory') memoryUI(stage, q, submit);
  else if (T === 'digits') digitsUI(stage, q, cls, submit);
  else if (T === 'mental') mentalUI(stage, q, cls, submit);
  else if (T === 'stroop') stroopUI(stage, q, cls, submit);
  else if (T === 'beauty') {
    stage.innerHTML = qbox('모두의 평균 × 2/3에<br>가장 가까운 숫자는?', '0 ~ 100') + `<div class="bignum" id="bn">50</div><input class="slider" id="sl" type="range" min="0" max="100" value="50"><button class="big" id="ok">이 숫자로 확정</button>`;
    const sl = document.getElementById('sl'); sl.oninput = () => { document.getElementById('bn').textContent = sl.value; };
    document.getElementById('ok').onclick = () => submit(Number(sl.value));
  } else if (T === 'minority' || T === 'split') {
    const L = T === 'split' ? ['🤝<br><span style="font-size:18px">협력</span>', '🗡️<br><span style="font-size:18px">배신</span>'] : ['A', 'B'];
    stage.innerHTML = qbox(T === 'split' ? '전원 협력: 모두 +60<br>배신자 있음: 배신자끼리 130 나눠 갖기, 협력자 −30<br>전원 배신: 모두 −30' : '사람이 더 적은 쪽이 이깁니다', T === 'split' ? '' : '소수결') +
      `<div class="two"><button data-i="0">${L[0]}</button><button data-i="1">${L[1]}</button></div><button class="big" id="ok" disabled>확정</button>`;
    let sel = null;
    stage.querySelectorAll('.two button').forEach((b) => { b.onclick = () => { sel = Number(b.dataset.i); stage.querySelectorAll('.two button').forEach((x) => x.classList.toggle('sel', x === b)); document.getElementById('ok').disabled = false; }; });
    document.getElementById('ok').onclick = () => { if (sel !== null) submit(sel); };
  } else if (T === 'lowest') {
    stage.innerHTML = qbox('나만 고른 수 중 가장 작으면 승리', '1 ~ 10') + `<div class="nums" style="grid-template-columns:repeat(5,1fr)">${[...Array(10)].map((_, i) => `<button data-i="${i + 1}">${i + 1}</button>`).join('')}</div><button class="big" id="ok" disabled>확정</button>`;
    let sel = null;
    stage.querySelectorAll('.nums button').forEach((b) => { b.onclick = () => { sel = Number(b.dataset.i); stage.querySelectorAll('.nums button').forEach((x) => x.classList.toggle('used', x !== b)); document.getElementById('ok').disabled = false; }; });
    document.getElementById('ok').onclick = () => { if (sel !== null) submit(sel); };
  }
  unfog();
}

function timelineUI(stage, q, cls, submit) {
  const order = [];
  const draw = () => {
    stage.innerHTML = `<div class="q${cls}"><small>오래된 것부터 차례로 누르세요</small>역사 줄 세우기</div>
      <div class="opts">${q.items.map((it, i) => { const n = order.indexOf(i); return `<button class="opt ${n >= 0 ? 'sel' : ''}" data-i="${i}"><b style="color:var(--yel);display:inline-block;width:28px">${n >= 0 ? n + 1 : '·'}</b>${esc(it)}</button>`; }).join('')}</div>
      <div class="row"><button class="sec grow" id="bk">⌫ 되돌리기</button><button class="big grow" id="ok" ${order.length === 4 ? '' : 'disabled'}>제출</button></div>`;
    stage.querySelectorAll('.opt').forEach((b) => { b.onclick = () => { const i = Number(b.dataset.i); if (!order.includes(i)) order.push(i); draw(); }; });
    document.getElementById('bk').onclick = () => { order.pop(); draw(); };
    document.getElementById('ok').onclick = () => submit(order.slice());
  };
  draw();
}

function calcUI(stage, q, cls, submit) {
  let toks = [];
  const render = () => {
    const used = new Set(toks.filter((t) => t.k === 'n').map((t) => t.i));
    const last = toks.length ? toks[toks.length - 1].v : null;
    const lastIsVal = last !== null && (/^\d+$/.test(last) || last === ')');
    const str = toks.map((t) => t.v).join('');
    let live = '<em>&nbsp;</em>', can = false;
    if (toks.length) {
      try { const v = Expr.evaluate(str.replace(/−/g, '-')).value; live = `<em>= ${v.d === 1 ? v.n : v.n + '/' + v.d}</em>`; can = used.size === 4 && v.d === 1 && v.n === q.target; } catch (e) { /* */ }
    }
    stage.innerHTML = `<div class="q${cls}"><small>네 숫자를 한 번씩만 써서</small></div><div class="target${cls}">${q.target}</div>
      <div class="expr">${esc(str) || '<span class="dim">식을 만드세요</span>'}${live}</div>
      <div class="nums">${q.nums.map((n, i) => `<button data-n="${i}" class="${used.has(i) || lastIsVal ? 'used' : ''}" ${used.has(i) || lastIsVal ? 'disabled' : ''}>${n}</button>`).join('')}</div>
      <div class="ops">${['+', '−', '×', '÷', '(', ')'].map((o) => `<button data-o="${o}" ${(o === '(' && lastIsVal) || (o !== '(' && !lastIsVal) ? 'disabled' : ''}>${o}</button>`).join('')}</div>
      <div class="row"><button class="sec grow" id="bk">⌫ 지우기</button><button class="sec grow" id="cl">전체 삭제</button></div>
      <button class="big" id="ok" ${can ? '' : 'disabled'}>${can ? '제출 (정답!)' : '목표 숫자를 만들면 제출할 수 있어요'}</button>`;
    stage.querySelectorAll('[data-n]').forEach((b) => { b.onclick = () => { const i = Number(b.dataset.n); toks.push({ k: 'n', i, v: String(q.nums[i]) }); render(); }; });
    stage.querySelectorAll('[data-o]').forEach((b) => { b.onclick = () => { toks.push({ k: 'o', v: b.dataset.o }); render(); }; });
    document.getElementById('bk').onclick = () => { toks.pop(); render(); };
    document.getElementById('cl').onclick = () => { toks = []; render(); };
    document.getElementById('ok').onclick = () => submit(str.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/'));
  };
  render();
}

function memoryUI(stage, q, submit) {
  const picks = new Set();
  let showing = performance.now() - playT0 < q.showMs;
  const draw = () => {
    stage.innerHTML = `<div class="q"><small>패턴 기억</small>${showing ? '빛나는 칸을 외우세요!' : `기억한 칸을 모두 누르세요 <span class="dim">(${q.cells.length}칸)</span>`}</div>
      <div class="grid4">${[...Array(16).keys()].map((i) => `<button class="cell ${showing && q.cells.includes(i) ? 'lit' : ''} ${!showing && picks.has(i) ? 'pick' : ''}" data-i="${i}" ${showing ? 'disabled' : ''}></button>`).join('')}</div>
      <button class="big" id="ok" ${showing || !picks.size ? 'disabled' : ''}>제출 (${picks.size}칸)</button>`;
    stage.querySelectorAll('.cell').forEach((c) => { c.onclick = () => { const i = Number(c.dataset.i); picks.has(i) ? picks.delete(i) : picks.add(i); draw(); }; });
    document.getElementById('ok').onclick = () => submit([...picks]);
  };
  draw();
  if (showing) setTimeout(() => { showing = false; if (!locked && document.getElementById('stage') === stage) draw(); }, Math.max(150, q.showMs - (performance.now() - playT0)));
}

function digitsUI(stage, q, cls, submit) {
  const left = q.showMs - (performance.now() - playT0);
  const ask = () => {
    stage.innerHTML = `<div class="q${cls}"><small>숫자 기억</small>${q.rev ? '<span style="color:var(--pink)">거꾸로</span> 입력하세요!' : '본 그대로 입력하세요'}</div>
      <input id="in" type="text" inputmode="numeric" placeholder="${q.d.length}자리" style="text-align:center;font-weight:800;font-size:26px;letter-spacing:4px" autocomplete="off"><button class="big" id="ok">제출</button>`;
    const go = () => { const v = document.getElementById('in').value.replace(/\D/g, ''); if (!v) return toast('숫자를 입력하세요'); submit(v); };
    document.getElementById('ok').onclick = go; document.getElementById('in').onkeydown = (e) => { if (e.key === 'Enter') go(); };
    document.getElementById('in').focus();
  };
  if (left <= 0) return ask();
  stage.innerHTML = `<div class="q"><small>숫자 기억 · ${q.d.length}자리</small>${q.rev ? '외운 뒤 <span style="color:var(--pink)">거꾸로</span> 입력합니다' : '그대로 외우세요'}</div>
    <div class="bignum${cls}" style="font-size:${q.d.length > 8 ? 46 : 54}px;letter-spacing:4px">${q.d}</div>`;
  setTimeout(() => { if (!locked && document.getElementById('stage') === stage) ask(); }, left);
}

function mentalUI(stage, q, cls, submit) {
  const answers = [];
  const draw = () => {
    const i = answers.length;
    stage.innerHTML = `<div class="q"><small>암산 질주 · ${i + 1}/${q.qs.length}</small></div>
      <div class="bignum${cls}" style="font-size:48px">${esc(q.qs[i])}</div>
      <input id="in" type="text" inputmode="numeric" placeholder="=" style="text-align:center;font-weight:800;font-size:28px" autocomplete="off">
      <button class="big" id="ok">${i + 1 < q.qs.length ? '다음 ▶' : '제출'}</button>`;
    const go = () => { const v = document.getElementById('in').value.trim(); if (!/^-?\d+$/.test(v)) return toast('숫자를 입력하세요'); answers.push(Number(v)); if (answers.length >= q.qs.length) submit(answers.slice()); else draw(); };
    document.getElementById('ok').onclick = go; document.getElementById('in').onkeydown = (e) => { if (e.key === 'Enter') go(); };
    document.getElementById('in').focus();
  };
  draw();
}

function stroopUI(stage, q, cls, submit) {
  const answers = [];
  const draw = () => {
    const i = answers.length, it = q.items[i];
    stage.innerHTML = `<div class="q"><small>색깔 함정 · ${i + 1}/${q.items.length}</small>${it.a === 'c' ? '이 글자의 <b style="color:var(--yel)">색</b>은?' : '이 글자의 <b style="color:var(--yel)">뜻</b>은?'}</div>
      <div class="bignum${cls}" style="font-size:72px;color:${COLORS[it.c][1]}">${COLORS[it.w][0]}</div>
      <div class="opts" style="grid-template-columns:1fr 1fr">${COLORS.map((c, j) => `<button class="opt" style="text-align:center" data-i="${j}">${c[0]}</button>`).join('')}</div>`;
    stage.querySelectorAll('.opt').forEach((b) => { b.onclick = () => { answers.push(Number(b.dataset.i)); if (answers.length >= q.items.length) submit(answers.slice()); else draw(); }; });
  };
  draw();
}

/* ═════════════ 결과 ═════════════ */
let selKind = null, selTarget = null;
function revealView() {
  const R = S.reveal, r = S.round;
  selKind = null; selTarget = null;
  $app.innerHTML = `
    <div class="topbar"><span class="badge">R${r.idx} 결과 · ${r.emoji} ${esc(r.label)}</span><span class="badge" id="who"></span></div>
    <div class="timer"><i id="tbar"></i></div>
    <div class="ans pop"><div class="dim small">정답</div><b>${esc(R.at)}</b>${R.ex ? `<div class="small dim" style="margin-top:6px;line-height:1.5">${esc(R.ex)}</div>` : ''}</div>
    <div class="res">${R.rows.map((x) => `<div class="rrow ${x.ok ? 'ok' : ''}"><span><i class="dot" style="background:${x.c};display:inline-block;margin-right:6px"></i><b>${esc(x.n)}</b> <span class="dim">${esc(x.sh)}</span></span><b class="${x.d > 0 ? 'pos' : x.d < 0 ? 'neg' : 'dim'}">${sgn(x.d)}</b><span class="sub">${esc(x.note)}</span></div>`).join('')}</div>
    <div id="card"></div><div id="bd"></div>
    <button class="sec" id="rd">다음 라운드 ▶</button>`;
  document.getElementById('rd').onclick = (e) => { e.target.disabled = true; e.target.textContent = '다른 사람 기다리는 중…'; act('ready'); };
  cur = { update: updReveal }; updReveal();
}
function updReveal() {
  const w = document.getElementById('who'); if (w) w.textContent = '준비 ' + doneCount();
  document.getElementById('bd').innerHTML = boardHTML();
  const box = document.getElementById('card'); const c = S.card; if (!box || !c) return;
  if (c.used) { box.innerHTML = `<div class="card2 center pop"><div class="small dim">방해 카드 발동</div><b style="font-size:18px">${esc(c.log)}</b></div>`; return; }
  if (!c.winner) { box.innerHTML = ''; return; }
  if (c.forMe) {
    if (mine.sab && mine.sab.k === S.k) { box.innerHTML = '<div class="card2 center pulse">카드 발동 중…</div>'; return; }
    const targets = S.players.filter((p) => p.pid !== S.me);
    box.innerHTML = `<div class="card2 col"><b style="color:var(--vio)">🏆 라운드 1등 — 방해 카드를 쓰세요</b>
      <div class="sab">${Object.entries(SABOTAGE).map(([k, v]) => `<button data-k="${k}" class="${selKind === k ? 'sel' : ''}">${v.emoji} ${v.label}<small>${v.desc}</small></button>`).join('')}</div>
      <div class="chips">${targets.map((p) => `<button class="chip" style="${selTarget === p.pid ? 'background:var(--vio);color:#10122a' : 'color:var(--txt)'};padding:8px 12px;font-size:15px" data-t="${p.pid}"><i class="dot" style="background:${p.color}"></i>${esc(p.name)}</button>`).join('')}</div>
      <button class="pink" id="fire" ${selKind && selTarget ? '' : 'disabled'}>발동!</button></div>`;
    box.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => { selKind = b.dataset.k; updReveal(); }; });
    box.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => { selTarget = b.dataset.t; updReveal(); }; });
    document.getElementById('fire').onclick = () => { act('sabotage', { kind: selKind, target: selTarget }); updReveal(); };
  } else {
    const wp = P(c.winner);
    box.innerHTML = `<div class="card2 center pulse">🏆 ${esc(wp ? wp.name : '')}님이 방해 카드를 고르는 중…</div>`;
  }
}

/* ═════════════ 최종 ═════════════ */
function finalView() {
  const F = S.final, rk = F.rk;
  const order = [rk[1], rk[0], rk[2]].filter(Boolean);
  const hts = [150, 110, 80], medal = ['🥇', '🥈', '🥉'];
  $app.innerHTML = `
    <div class="logo" style="font-size:34px;margin-top:2vh">게임 종료!</div>
    <div class="podium">${order.map((p) => { const i = rk.indexOf(p); return `<div class="pod pop"><div class="n" style="color:${p.c}">${esc(p.n)}</div><div class="s">${fmt(p.s)}점</div><div class="bar" style="height:${hts[i]}px;background:${p.c}">${medal[i]}</div></div>`; }).join('')}</div>
    <div class="board">${rk.map((p, i) => `<div class="brow ${p.id === S.me ? 'me' : ''}"><span class="rk">${i + 1}</span><span class="nm"><i class="dot" style="background:${p.c}"></i>${esc(p.n)}</span><span class="dim small">정답 ${p.cr}</span><span class="sc">${fmt(p.s)}</span></div>`).join('')}</div>
    ${F.aw.map((a) => { const p = rk.find((x) => x.id === a.id); return `<div class="award"><span class="e">${a.e}</span><div class="grow"><b>${a.t}</b> <span style="color:${p ? p.c : '#fff'}">${esc(p ? p.n : '')}</span><div class="dim small">${esc(a.note)}</div></div></div>`; }).join('')}
    ${H ? `<button class="big grn" id="rm">${role === 'solo' ? '다시 하기' : '한 판 더!'}</button>` : '<div class="center dim pulse">방장이 다음 판을 시작하길 기다리는 중…</div>'}
    <button class="sec" id="hm">나가기</button>`;
  const rm = document.getElementById('rm');
  if (rm) rm.onclick = () => { if (role === 'solo') { act('rematch'); startGame(); hostTick(); } else act('rematch'); };
  document.getElementById('hm').onclick = leaveRoom;
  cur = { update() { } };
}

homeView();
