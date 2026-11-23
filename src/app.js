/* ═════════════ 유틸 ═════════════ */
const $app = document.getElementById('app');
const $toast = document.getElementById('toast');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = {
  get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* */ } },
};
const fmt = (n) => Number(n).toLocaleString('ko-KR');
const sgn = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n));
let toastT;
function toast(m) { $toast.textContent = m; $toast.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => $toast.classList.remove('show'), 2400); }
const cleanName = (s) => String(s || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 8);
const PALETTE = ['#ff4d6d', '#ffd23f', '#3ddc97', '#4cc9f0', '#b388ff', '#ff9f1c', '#f15bb5', '#9ef01a'];
const CATS = ['수학', '상식', '퍼즐', '두뇌', '심리', '파티'];
const MAX_PLAYERS = 8;
const STYLE_TXT = {
  turn: ['📱', '차례대로 돌려 가며', '한 명씩 기기를 넘겨받아 각자 자기 문제를 풀어요. 다른 사람 화면은 보지 마세요!'],
  secret: ['🤫', '몰래 고르기', '한 명씩 기기를 넘겨받아 아무도 모르게 고른 뒤, 마지막에 한꺼번에 공개해요.'],
  party: ['🫶', '다같이 둘러앉아', '기기를 가운데 두고 모두 함께! 화면 위아래의 자기 버튼을 누르세요.'],
};

/* ═════════════ 설정 (기기에 저장) ═════════════ */
let setup = (() => { try { return JSON.parse(ls.get('bb:setup')) || null; } catch (e) { return null; } })();
if (!setup || !Array.isArray(setup.names)) setup = { names: [], mode: 'time', rounds: 10, cats: CATS.slice() };
if (![6, 10, 15, 20].includes(setup.rounds)) setup.rounds = 10;
setup.cats = (setup.cats || []).filter((c) => CATS.includes(c)); if (!setup.cats.length) setup.cats = CATS.slice();
if (!setup.cats.includes('파티') && !setup.sawParty) { setup.cats.push('파티'); setup.sawParty = 1; }
const saveSetup = () => ls.set('bb:setup', JSON.stringify(setup));

/* ═════════════ 게임 상태 ═════════════ */
let G = null;           // 진행 중인 게임
let S = null;           // 화면 공용: { me, players } (ui2 의 심리전 화면이 쓴다)
let curSubmit = null;
let locked = false, playT0 = 0, tEnd = Infinity, tTotal = 1, turnActive = null;
const timed = () => G && G.mode === 'time';
const hard = () => G && G.mode === 'free';
const shim = (meId) => { S = { me: meId, players: G.players.map((p) => ({ pid: p.id, name: p.n, color: p.c, connected: true })) }; };

function availTypes(n, mode, cats) { return Object.keys(TYPES).filter((t) => n >= TYPES[t].minP && !(mode === 'free' && TYPES[t].speed) && cats.includes(TYPES[t].cat)); }

function startGame() {
  const names = setup.names.length ? setup.names : ['나'];
  G = {
    players: names.map((n, i) => ({ id: 'p' + i, n, c: PALETTE[i % PALETTE.length], s: 0, fx: [], stats: { correct: 0, best: 0, steals: 0, speedSum: 0, speedN: 0 } })),
    mode: setup.mode, rounds: setup.rounds, cats: setup.cats.slice(), idx: -1, used: new Set(),
  };
  G.plan = buildPlan(G.rounds, G.players.length, G.mode, G.cats);
  const dbg = (location.hash.match(/t=([\w,]+)/) || [])[1]; // 개발용: #t=hap,lights 처럼 게임을 고정
  if (dbg) { const only = dbg.split(',').filter((t) => TYPES[t]); if (only.length) G.plan = G.plan.map((_, i) => only[i % only.length]); }
  nextRound();
}
function nextRound() {
  PT.clear(); turnActive = null;
  G.idx++;
  if (G.idx >= G.plan.length) return finalView();
  G.type = G.plan[G.idx];
  introView();
}
// 이번 라운드 순서: 라운드마다 시작하는 사람이 바뀐다
function order() { const n = G.players.length, k = G.idx % n; return [...G.players.slice(k), ...G.players.slice(0, k)]; }
function quit() { if (!confirm('게임을 그만두고 처음 화면으로 갈까요?')) return; PT.clear(); turnActive = null; G = null; homeView(); }

/* ═════════════ 공통 조각 ═════════════ */
function boardHTML(deltas) {
  const sorted = G.players.slice().sort((a, b) => b.s - a.s);
  return `<div class="board">${sorted.map((p, i) => `<div class="brow"><span class="rk">${i + 1}</span><span class="nm"><i class="dot" style="background:${p.c}"></i>${esc(p.n)}</span>${deltas && deltas[p.id] ? `<span class="d ${deltas[p.id] > 0 ? 'pos' : 'neg'}">${sgn(deltas[p.id])}</span>` : ''}<span class="sc">${fmt(p.s)}</span></div>`).join('')}</div>`;
}
const roundBadge = () => { const r = TYPES[G.type]; return `<span class="badge">R${G.idx + 1}/${G.plan.length} · ${r.emoji} ${esc(r.label)}</span>`; };
const pname = (p) => `<b style="color:${p.c}">${esc(p.n)}</b>`;

/* ═════════════ 라운드 소개 ═════════════ */
function introView() {
  const r = TYPES[G.type], st = STYLE_TXT[r.style];
  $app.innerHTML = `
    <div class="topbar"><span class="badge">라운드 ${G.idx + 1}/${G.plan.length} · ${esc(r.cat)}</span><button class="xbtn" id="qt">✕</button></div>
    <div class="hero pop"><div class="em">${r.emoji}</div><h2>${esc(r.label)}</h2><p>${esc(r.desc)}</p>
      <div class="modetag ${G.mode}">${G.mode === 'free' ? '♾️ 시간 무제한 · 어려움' : r.style === 'party' ? '⏱ 타임어택' : `⏱ 제한시간 ${r.limit}초`}</div></div>
    <div class="card style"><span class="e">${st[0]}</span><div><b>${st[1]}</b><div class="dim small">${st[2]}</div></div></div>
    <button class="big grn" id="go">시작!</button>
    ${boardHTML()}`;
  document.getElementById('qt').onclick = quit;
  document.getElementById('go').onclick = () => {
    if (r.style === 'turn') runTurns();
    else if (r.style === 'secret') runSecret();
    else runParty();
  };
}

/* ═════════════ 기기 넘기기 화면 ═════════════ */
function passView(p, sub, onReady) {
  turnActive = null;
  $app.innerHTML = `
    <div class="topbar">${roundBadge()}<button class="xbtn" id="qt">✕</button></div>
    <div class="pass pop" style="--c:${p.c}">
      <div class="dim">기기를</div>
      <div class="pn" style="color:${p.c}">${esc(p.n)}</div>
      <div class="dim">님에게 넘겨주세요</div>
      <div class="small dim" style="margin-top:14px">${esc(sub)}</div>
    </div>
    <button class="big" id="rdy" style="background:${p.c}">${esc(p.n)}, 준비됐어요</button>`;
  document.getElementById('qt').onclick = quit;
  document.getElementById('rdy').onclick = onReady;
}

/* ═════════════ 차례 게임: 각자 자기 문제 ═════════════ */
function runTurns() {
  const list = order(); const results = [];
  const step = (k) => {
    if (k >= list.length) return finishTurns(results);
    const p = list[k];
    passView(p, list.length > 1 ? '다른 사람은 화면을 보지 마세요 · 문제는 사람마다 달라요' : '준비되면 누르세요', () => playTurn(p, (r) => { results.push(r); step(k + 1); }));
  };
  step(0);
}
function playTurn(p, onDone) {
  const t = G.type, Q = makeQ(t, { used: G.used, hard: hard(), ids: G.players.map((x) => x.id) });
  const fx = p.fx.filter((f) => !(f === 'shrink' && !timed())); p.fx = [];
  const base = TYPES[t].limit * 1000, lim = timed() ? (fx.includes('shrink') ? Math.round(base * 0.65) : base) : 0;
  const FXN = { fog: '🌫️ 안개 — 문제가 흐릿하게 시작돼요', mirror: '🪞 거울 — 문제가 뒤집혔어요', shrink: '⏳ 시간 단축 — 제한시간 35% 감소' };
  shim(p.id);
  $app.innerHTML = `
    <div class="topbar">${roundBadge()}<span class="badge" style="border-color:${p.c};color:${p.c}">${esc(p.n)}</span></div>
    <div class="timer ${lim ? '' : 'free'}"><i id="tbar"></i></div>
    ${fx.length ? `<div class="fxbar">${fx.map((f) => FXN[f]).join('<br>')}</div>` : ''}
    <div class="row"><span class="grow"></span><span class="badge" id="tsec"></span></div>
    <div id="stage" class="col"></div>
    ${lim ? '' : '<button class="sec" id="giveup">🏳️ 포기</button>'}`;
  locked = false; playT0 = performance.now(); tTotal = lim || 1; tEnd = lim ? playT0 + lim : Infinity;
  const finish = (raw, gave) => {
    if (locked && turnActive === null) return;
    locked = true; turnActive = null;
    const el = performance.now() - playT0;
    const v = raw === null ? null : normalize(t, raw, Q.pub);
    const r = scoreTurn(t, Q, v, el, lim, gave);
    r.p = p; r.el = el;
    feedbackView(p, Q, r, () => onDone(r));
  };
  turnActive = { timeout: () => finish(null, false) };
  curSubmit = (v) => finish(v, false);
  const gu = document.getElementById('giveup'); if (gu) gu.onclick = () => { if (confirm('이 문제를 포기할까요? (0점)')) finish(null, true); };
  renderTurn(document.getElementById('stage'), t, Q.pub, fx);
}
function turnSubmit(v) { if (curSubmit) curSubmit(v); }

// 한 사람의 답을 채점. { ok, d, note, sh, at, ex }
function scoreTurn(t, Q, v, el, lim, gave) {
  const sec = Q.secret, pub = Q.pub, free = !lim;
  const sp = free || v === null ? 0 : Math.max(0, 1 - el / lim);
  let at = Q.answerText || '', ex = Q.expl || '', ok = false, d = 0, note = '';
  const BIN = {
    calc24: (x) => Expr.check(x, sec.nums, sec.target).ok,
    trivia: (x) => x === sec.ans, liar: (x) => x === sec.ans, sequence: (x) => x === sec.ans,
    memory: (x) => x.length === sec.cells.length && x.every((y, i) => y === sec.cells[i]),
    timeline: (x) => x.every((y, i) => y === sec.ans[i]),
    code: (x) => x === sec.ans, digits: (x) => x === sec.ans, chosung: (x) => x === sec.ans,
  };
  const judge = pub.ui ? (x) => judgeGeneric(x, sec, pub) : JUDGE2[t] ? (x) => JUDGE2[t](x, sec, pub) : BIN[t];
  if (t === 'calc24') at = sec.expr.replace(/\*/g, '×').replace(/\//g, '÷') + ' = ' + sec.target;
  if (v === null) return { ok: false, d: 0, note: gave ? '🏳️ 포기' : '⏰ 시간 초과', sh: gave ? '포기' : '—', at, ex, sp: 0 };
  if (t === 'mental' || t === 'stroop') {
    let c = 0; sec.ans.forEach((x, i) => { if (v[i] === x) c++; });
    const acc = c / sec.ans.length; ok = acc >= 0.75;
    d = ok ? Math.round(free ? 40 + 70 * acc : 30 + 60 * acc + 40 * sp) : 0;
    note = `${c}/${sec.ans.length} 정답`; if (t === 'mental') at = Q.expl, ex = '';
  } else if (t === 'fermi') {
    const e = Math.abs(Math.log(v / sec.value)), tol = free ? 0.18 : 0.25;
    ok = e <= tol; d = ok ? Math.round(40 + 80 * (1 - e / tol)) : 0;
    note = ok ? (e < 0.05 ? '🎯 거의 정확!' : '근접!') : `${Math.round((Math.exp(e) - 1) * 100)}% 빗나감`;
  } else {
    ok = !!judge(v);
    d = ok ? Math.round(free ? 100 : 50 + 70 * sp) : 0;
    note = ok ? '정답!' : '오답';
    if (t === 'schulte') note = `실수 ${v}번` + (ok ? '' : ' (4번부터 실격)');
  }
  return { ok, d, note, sh: shownOf(t, v, pub), at, ex, sp: ok ? sp : 0 };
}
function feedbackView(p, Q, r, next) {
  $app.innerHTML = `
    <div class="topbar">${roundBadge()}<span class="badge" style="border-color:${p.c};color:${p.c}">${esc(p.n)}</span></div>
    <div class="fb pop ${r.ok ? 'ok' : 'no'}"><div class="big1">${r.ok ? '⭕' : '❌'}</div><b>${esc(r.note)}</b><div class="pts ${r.d > 0 ? 'pos' : 'dim'}">${sgn(r.d)}</div>
      ${r.ok ? '' : `<div class="small dim">${r.sh && r.sh !== '—' ? `내 답: ${esc(r.sh)}` : ''}</div>`}</div>
    <div class="ans"><div class="dim small">정답</div><b>${esc(r.at)}</b>${r.ex ? `<div class="small dim" style="margin-top:6px;line-height:1.5">${esc(r.ex)}</div>` : ''}</div>
    <button class="big" id="nx">다음 ▶</button>`;
  document.getElementById('nx').onclick = next;
}
function finishTurns(results) {
  const oks = results.filter((r) => r.ok && r.sp > 0).sort((a, b) => a.el - b.el);
  const rows = results.map((r) => {
    let d = r.d, note = r.note;
    if (timed() && results.length > 1 && oks[0] === r) { d += 25; note += ' · ⚡ 최속 +25'; }
    if (r.ok && r.sp > 0) { r.p.stats.speedSum += r.sp; r.p.stats.speedN++; }
    return { id: r.p.id, ok: r.ok, d, note, sh: r.sh };
  });
  revealView({ rows, at: '', ex: '' });
}

/* ═════════════ 몰래 고르기 (심리전) ═════════════ */
function runSecret() {
  const t = G.type, Q = makeQ(t, { used: G.used, hard: hard(), ids: G.players.map((p) => p.id) });
  const list = order(), answers = {};
  const step = (k) => {
    if (k >= list.length) { const res = resolveSocial(t, Q, G.players, answers); return revealView(res); }
    const p = list[k];
    passView(p, '아무도 못 보게 고르세요', () => {
      shim(p.id);
      const lim = timed() ? TYPES[t].limit * 1000 : 0;
      $app.innerHTML = `
        <div class="topbar">${roundBadge()}<span class="badge" style="border-color:${p.c};color:${p.c}">${esc(p.n)}</span></div>
        <div class="timer ${lim ? '' : 'free'}"><i id="tbar"></i></div>
        <div class="row"><span class="grow"></span><span class="badge" id="tsec"></span></div>
        <div id="stage" class="col"></div>`;
      locked = false; playT0 = performance.now(); tTotal = lim || 1; tEnd = lim ? playT0 + lim : Infinity;
      const done = (v) => {
        if (locked) return; locked = true; turnActive = null;
        answers[p.id] = v === null ? null : normalize(t, v, Q.pub);
        $app.innerHTML = `<div class="pass pop"><div class="big1">🤐</div><b style="font-size:22px">${v === null ? '시간 초과!' : '제출 완료!'}</b><div class="dim">화면을 가리고 다음 사람에게 넘겨주세요</div></div><button class="big" id="nx">${k + 1 < list.length ? '다음 사람 ▶' : '결과 공개!'}</button>`;
        document.getElementById('nx').onclick = () => step(k + 1);
      };
      turnActive = { timeout: () => done(null) };
      curSubmit = done;
      UI2[t]({ stage: document.getElementById('stage'), q: Q.pub, cls: '', submit: (v) => done(v), qbox: (inner, small) => `<div class="q">${small ? `<small>${esc(small)}</small>` : ''}${inner}</div>`, numInput: (ph) => `<input id="in" type="text" inputmode="numeric" placeholder="${esc(ph)}" style="text-align:center;font-weight:800;font-size:22px" autocomplete="off"><button class="big" id="ok">제출</button>`, bindInput: (check) => { const go = () => { const r = check(document.getElementById('in').value.trim()); if (r !== undefined) done(r); }; document.getElementById('ok').onclick = go; document.getElementById('in').onkeydown = (e) => { if (e.key === 'Enter') go(); }; }, choice: () => {}, T: t });
    });
  };
  step(0);
}

/* ═════════════ 다같이 (파티) ═════════════ */
function runParty() {
  PARTY[G.type]({
    players: order(), hard: hard(), timed: timed(), limit: TYPES[G.type].limit * 1000,
    done: (deltas, at, ex, notes) => {
      // 한 라운드에서 잃는 점수는 최대 100점까지
      const rows = G.players.map((p) => { const d = Math.max(-100, deltas[p.id] || 0); return { id: p.id, ok: d > 0, d, note: ((notes && notes[p.id]) || '') + (d !== (deltas[p.id] || 0) ? ' (감점은 최대 −100)' : ''), sh: '' }; });
      revealView({ rows, at: at || '', ex: ex || '' });
    },
  });
}

/* ═════════════ 라운드 결과 + 방해 카드 ═════════════ */
function revealView(res) {
  PT.clear(); turnActive = null;
  const deltas = {};
  for (const r of res.rows) {
    const p = G.players.find((x) => x.id === r.id); if (!p) continue;
    p.s += r.d; deltas[p.id] = r.d;
    if (r.ok) p.stats.correct++;
    p.stats.best = Math.max(p.stats.best, r.d);
  }
  const rows = res.rows.slice().sort((a, b) => b.d - a.d);
  const multi = G.players.length > 1, top = rows[0];
  const winner = multi && top && top.d > 0 && (!rows[1] || rows[1].d < top.d) ? G.players.find((p) => p.id === top.id) : null;
  const last = G.idx + 1 >= G.plan.length;
  $app.innerHTML = `
    <div class="topbar"><span class="badge">R${G.idx + 1} 결과 · ${TYPES[G.type].emoji} ${esc(TYPES[G.type].label)}</span><button class="xbtn" id="qt">✕</button></div>
    ${res.at ? `<div class="ans pop"><div class="dim small">결과</div><b>${esc(res.at)}</b>${res.ex ? `<div class="small dim" style="margin-top:6px;line-height:1.5">${esc(res.ex)}</div>` : ''}</div>` : ''}
    <div class="res">${rows.map((x) => { const p = G.players.find((q) => q.id === x.id); return `<div class="rrow ${x.ok ? 'ok' : ''}"><span><i class="dot" style="background:${p.c};display:inline-block;margin-right:6px"></i><b>${esc(p.n)}</b> <span class="dim">${esc(x.sh || '')}</span></span><b class="${x.d > 0 ? 'pos' : x.d < 0 ? 'neg' : 'dim'}">${sgn(x.d)}</b>${x.note ? `<span class="sub">${esc(x.note)}</span>` : ''}</div>`; }).join('')}</div>
    <div id="card"></div>
    ${boardHTML(deltas)}
    <button class="big" id="nx">${last ? '최종 결과 🏆' : '다음 라운드 ▶'}</button>`;
  document.getElementById('qt').onclick = quit;
  document.getElementById('nx').onclick = nextRound;
  if (winner && !last) sabotagePanel(winner);
}
function sabotagePanel(w) {
  const box = document.getElementById('card'); let kind = null, target = null;
  const kinds = Object.entries(SABOTAGE).filter(([, v]) => !(G.mode === 'free' && v.timeOnly));
  const draw = () => {
    box.innerHTML = `<div class="card2 col"><b style="color:var(--vio)">🏆 라운드 1등 ${pname(w)} — 방해 카드를 쓸 수 있어요</b>
      <div class="sab">${kinds.map(([k, v]) => `<button data-k="${k}" class="${kind === k ? 'sel' : ''}">${v.emoji} ${v.label}<small>${v.desc}${k === 'steal' ? '' : ' (다음 차례 게임)'}</small></button>`).join('')}</div>
      <div class="chips">${G.players.filter((p) => p !== w).map((p) => `<button class="chip" style="${target === p.id ? 'background:var(--vio);color:#10122a' : 'color:var(--txt)'};padding:8px 12px;font-size:15px" data-t="${p.id}"><i class="dot" style="background:${p.c}"></i>${esc(p.n)}</button>`).join('')}</div>
      <div class="row"><button class="sec grow" id="skip">안 쓸래요</button><button class="pink grow" id="fire" ${kind && target ? '' : 'disabled'}>발동!</button></div></div>`;
    box.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => { kind = b.dataset.k; draw(); }; });
    box.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => { target = b.dataset.t; draw(); }; });
    document.getElementById('skip').onclick = () => { box.innerHTML = ''; };
    document.getElementById('fire').onclick = () => {
      const T = G.players.find((p) => p.id === target); const v = SABOTAGE[kind];
      if (kind === 'steal') { const amt = Math.min(40, Math.max(0, T.s)); T.s -= amt; w.s += amt; w.stats.steals++; } else T.fx.push(kind);
      box.innerHTML = `<div class="card2 center pop"><div class="small dim">방해 카드 발동</div><b style="font-size:18px">${v.emoji} ${esc(w.n)} → ${esc(T.n)} : ${v.label}</b></div>`;
      const bd = document.querySelector('.board'); if (bd) bd.outerHTML = boardHTML();
    };
  };
  draw();
}

/* ═════════════ 최종 ═════════════ */
function finalView() {
  PT.clear();
  const P = G.players, rk = P.slice().sort((a, b) => b.s - a.s);
  const by = (f) => P.slice().sort((a, b) => f(b) - f(a))[0];
  const aw = [];
  if (P.length > 1) {
    const mc = by((p) => p.stats.correct); if (mc.stats.correct) aw.push(['🎓', '정답왕', mc, `${mc.stats.correct}라운드 득점`]);
    const sp = P.filter((p) => p.stats.speedN); if (sp.length) { const f = sp.sort((a, b) => b.stats.speedSum / b.stats.speedN - a.stats.speedSum / a.stats.speedN)[0]; aw.push(['⚡', '번개손', f, '정답 속도 1위']); }
    const th = by((p) => p.stats.steals); if (th.stats.steals) aw.push(['🫳', '소매치기', th, `${th.stats.steals}회 강탈`]);
    const bw = by((p) => p.stats.best); if (bw.stats.best > 0) aw.push(['💥', '한 방', bw, `한 라운드 +${bw.stats.best}`]);
  }
  const order3 = [rk[1], rk[0], rk[2]].filter(Boolean), hts = [150, 110, 80], medal = ['🥇', '🥈', '🥉'];
  $app.innerHTML = `
    <div class="logo" style="font-size:34px;margin-top:2vh">게임 종료!</div>
    ${P.length > 1 ? `<div class="podium">${order3.map((p) => { const i = rk.indexOf(p); return `<div class="pod pop"><div class="n" style="color:${p.c}">${esc(p.n)}</div><div class="s">${fmt(p.s)}점</div><div class="bar" style="height:${hts[i]}px;background:${p.c}">${medal[i]}</div></div>`; }).join('')}</div>` : `<div class="hero pop"><div class="em">🏅</div><h2>${fmt(P[0].s)}점</h2><p>${G.plan.length}라운드 중 ${P[0].stats.correct}라운드 득점</p></div>`}
    <div class="board">${rk.map((p, i) => `<div class="brow"><span class="rk">${i + 1}</span><span class="nm"><i class="dot" style="background:${p.c}"></i>${esc(p.n)}</span><span class="dim small">득점 ${p.stats.correct}</span><span class="sc">${fmt(p.s)}</span></div>`).join('')}</div>
    ${aw.map(([e, t, p, note]) => `<div class="award"><span class="e">${e}</span><div class="grow"><b>${t}</b> ${pname(p)}<div class="dim small">${esc(note)}</div></div></div>`).join('')}
    <button class="big grn" id="again">같은 멤버로 한 판 더!</button>
    <button class="sec" id="hm">처음 화면</button>`;
  document.getElementById('again').onclick = startGame;
  document.getElementById('hm').onclick = () => { G = null; homeView(); };
}

/* ═════════════ 타이머 ═════════════ */
setInterval(() => {
  if (!turnActive) return;
  const bar = document.getElementById('tbar'), t = document.getElementById('tsec');
  if (tEnd === Infinity) {
    const e = Math.max(0, Math.floor((performance.now() - playT0) / 1000));
    if (t) t.textContent = `⏱ ${Math.floor(e / 60)}:${String(e % 60).padStart(2, '0')}`;
    return;
  }
  const rem = Math.max(0, tEnd - performance.now());
  if (bar) bar.style.transform = `scaleX(${Math.min(1, rem / tTotal)})`;
  if (t) t.textContent = Math.ceil(rem / 1000) + '초';
  if (rem <= 0 && !locked) turnActive.timeout();
}, 100);

/* ═════════════ 처음 화면 (설정) ═════════════ */
function homeView() {
  PT.clear(); turnActive = null;
  const n = setup.names.length, avail = availTypes(Math.max(1, n), setup.mode, setup.cats);
  $app.innerHTML = `
    <div class="logo">두뇌 배틀</div>
    <div class="tag">한 기기로 다같이! ${Object.keys(TYPES).length}가지 두뇌 대결 🧠</div>
    <div class="card col">
      <div class="row"><b class="grow">참가자</b><span class="dim small">${n ? `${n}명` : '없으면 혼자 연습'} · 최대 ${MAX_PLAYERS}명</span></div>
      <div class="chips">${setup.names.map((nm, i) => `<span class="chip"><i class="dot" style="background:${PALETTE[i]}"></i>${esc(nm)} <button class="rm" data-i="${i}" aria-label="빼기">✕</button></span>`).join('')}</div>
      ${n < MAX_PLAYERS ? `<div class="row"><input id="nm" type="text" maxlength="8" placeholder="이름 (최대 8자)" autocomplete="off"><button class="sec" id="add" style="flex:none">추가</button></div>` : ''}
    </div>
    <div class="card col">
      <b>모드</b>
      <div class="two mode"><button data-m="time" class="${setup.mode === 'time' ? 'sel' : ''}">⏱<br><span>타임어택</span><small>제한시간 · 빠를수록 고득점</small></button><button data-m="free" class="${setup.mode === 'free' ? 'sel' : ''}">♾️<br><span>무제한</span><small>어려운 문제 · 시간 무제한</small></button></div>
      <b>라운드 수</b><div class="row">${[6, 10, 15, 20].map((r) => `<button class="${setup.rounds === r ? '' : 'sec'} grow" data-r="${r}">${r}</button>`).join('')}</div>
      <b>게임 종류</b><div class="chips">${CATS.map((c) => `<button class="chip ${setup.cats.includes(c) ? 'on' : 'off'}" data-c="${c}">${c}</button>`).join('')}</div>
      <div class="dim small">나올 수 있는 게임 ${avail.length}종${n < 2 ? ' · 혼자면 심리전·일부 파티 게임은 빠져요' : n < 3 ? ' · 3명부터 라이어 게임·눈치 게임·이심전심이 나와요' : ''}${setup.mode === 'free' ? ' · 속도만 겨루는 게임은 빠져요' : ''}</div>
      <button class="big grn" id="go" ${avail.length ? '' : 'disabled'}>게임 시작 ${n > 1 ? `(${n}명)` : '(혼자)'}</button>
    </div>
    <div class="card small dim" style="line-height:1.7">
      <b style="color:var(--txt)">이렇게 놀아요</b><br>
      📱 <b style="color:var(--txt)">차례 게임</b> 기기를 돌려 가며 각자 자기 문제를 푼다 (문제는 사람마다 새로 만들어진다)<br>
      🤫 <b style="color:var(--txt)">심리전</b> 한 명씩 몰래 고르고 한꺼번에 공개<br>
      🫶 <b style="color:var(--txt)">파티</b> 기기를 가운데 두고 둘러앉아 자기 버튼으로 버저!<br><br>
      ${CATS.map((c) => `<b style="color:var(--cyan)">${c}</b> ${Object.values(TYPES).filter((t) => t.cat === c).map((t) => t.emoji + ' ' + t.label).join(' · ')}`).join('<br>')}<br><br>
      라운드 1등은 다른 사람에게 <b style="color:var(--vio)">방해 카드</b>를 날릴 수 있어요. 심리전·파티 게임 일부는 더 지니어스·데블스 플랜 같은 서바이벌 예능의 게임을 바탕으로 했어요.
    </div>`;
  const add = () => {
    const el = document.getElementById('nm'); const v = cleanName(el.value);
    if (!v) return toast('이름을 입력하세요');
    if (setup.names.includes(v)) return toast('같은 이름이 있어요');
    setup.names.push(v); saveSetup(); homeView();
    const e2 = document.getElementById('nm'); if (e2) e2.focus();
  };
  const addB = document.getElementById('add'); if (addB) { addB.onclick = add; document.getElementById('nm').onkeydown = (e) => { if (e.key === 'Enter') add(); }; }
  $app.querySelectorAll('.rm').forEach((b) => { b.onclick = () => { setup.names.splice(Number(b.dataset.i), 1); saveSetup(); homeView(); }; });
  $app.querySelectorAll('[data-m]').forEach((b) => { b.onclick = () => { setup.mode = b.dataset.m; saveSetup(); homeView(); }; });
  $app.querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => { setup.rounds = Number(b.dataset.r); saveSetup(); homeView(); }; });
  $app.querySelectorAll('[data-c]').forEach((b) => { b.onclick = () => { const c = b.dataset.c; const nx = setup.cats.includes(c) ? setup.cats.filter((x) => x !== c) : [...setup.cats, c]; if (!nx.length) return toast('하나는 골라야 해요'); setup.cats = nx; saveSetup(); homeView(); }; });
  document.getElementById('go').onclick = () => {
    const el = document.getElementById('nm'); if (el && cleanName(el.value)) { add(); return toast('이름을 추가했어요. 한 번 더 누르면 시작!'); }
    startGame();
  };
}
