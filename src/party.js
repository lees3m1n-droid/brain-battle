/* ═════════════ 파티 게임: 기기 하나를 다같이 둘러싸고 ═════════════
   PARTY[type](ctx)  ctx = { players, hard, timed, limit, done(deltas, 결과문구, 설명, 개인메모) } */
const PT = { ids: [], clear() { this.ids.forEach((t) => { clearTimeout(t); clearInterval(t); }); this.ids = []; } };
const later = (f, ms) => { const t = setTimeout(f, ms); PT.ids.push(t); return t; };
const every = (f, ms) => { const t = setInterval(f, ms); PT.ids.push(t); return t; };
const zeroD = (ctx) => { const D = {}; ctx.players.forEach((p) => { D[p.id] = 0; }); return D; };
const byId = (ctx, id) => ctx.players.find((p) => p.id === id);

// 버저 화면: 4명 이상이면 절반은 화면 위쪽(뒤집힌 버튼)에 앉은 사람 몫
function buzzScreen(ctx, onBuzz) {
  const ps = ctx.players, half = ps.length >= 4 ? Math.floor(ps.length / 2) : 0;
  const top = ps.slice(0, half), bot = ps.slice(half);
  const btn = (p) => `<button class="buzz" data-p="${p.id}" style="--c:${p.c}"><b>${esc(p.n)}</b><small id="bs_${p.id}">0</small></button>`;
  $app.innerHTML = `<div class="pty">
    ${top.length ? `<div class="bz top">${top.map(btn).join('')}</div>` : ''}
    <div class="topbar">${roundBadge()}<span class="badge" id="pinfo"></span><button class="xbtn" id="qt">✕</button></div>
    <div class="timer"><i id="ptbar"></i></div>
    <div class="pmid col" id="pmid"></div>
    <div class="bz bot">${bot.map(btn).join('')}</div></div>`;
  document.getElementById('qt').onclick = quit;
  const on = new Set(ps.map((p) => p.id));
  $app.querySelectorAll('.buzz').forEach((b) => b.addEventListener('pointerdown', (e) => {
    e.preventDefault(); const id = b.dataset.p; if (!on.has(id)) return;
    b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); onBuzz(id, b);
  }));
  return {
    mid: document.getElementById('pmid'),
    enable(ids) { on.clear(); ids.forEach((i) => on.add(i)); $app.querySelectorAll('.buzz').forEach((b) => b.classList.toggle('off', !on.has(b.dataset.p))); },
    score(D) { for (const id in D) { const el = document.getElementById('bs_' + id); if (el) el.textContent = sgn(D[id]); } },
    info(t) { const el = document.getElementById('pinfo'); if (el) el.textContent = t; },
    flash(id, cls) { const b = $app.querySelector(`.buzz[data-p="${id}"]`); if (b) { b.classList.add(cls); later(() => b.classList.remove(cls), 600); } },
  };
}
// 버저 없이 한 화면 (차례대로 하는 게임)
function plainScreen() {
  $app.innerHTML = `<div class="topbar">${roundBadge()}<span class="badge" id="pinfo"></span><button class="xbtn" id="qt">✕</button></div>
    <div class="timer"><i id="ptbar"></i></div><div class="pmid col" id="pmid"></div><div class="chips" id="pscores" style="justify-content:center"></div>`;
  document.getElementById('qt').onclick = quit;
  return {
    mid: document.getElementById('pmid'),
    score(ctx, D) { document.getElementById('pscores').innerHTML = ctx.players.map((p) => `<span class="chip"><i class="dot" style="background:${p.c}"></i>${esc(p.n)} <b class="${D[p.id] > 0 ? 'pos' : D[p.id] < 0 ? 'neg' : 'dim'}">${sgn(D[p.id])}</b></span>`).join(''); },
    info(t) { const el = document.getElementById('pinfo'); if (el) el.textContent = t; },
  };
}
// 타이머 막대. end=Infinity 이면 숨김
function barTo(end, total) {
  const bar = document.getElementById('ptbar'); if (!bar) return;
  if (end === Infinity) { bar.parentNode.classList.add('free'); bar.style.transform = 'scaleX(1)'; return; }
  bar.parentNode.classList.remove('free');
  bar.style.transform = `scaleX(${Math.max(0, Math.min(1, (end - Date.now()) / total))})`;
}

/* ───────── 🃏 결! 합! (끝까지) ───────── */
const ALL27 = []; for (let s = 0; s < 3; s++) for (let c = 0; c < 3; c++) for (let b = 0; b < 3; b++) ALL27.push([s, c, b]);
const hapOk = (t, i, j, k) => [0, 1, 2].every((a) => (t[i][a] + t[j][a] + t[k][a]) % 3 === 0);
function hapsOf(t) { const out = []; for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) for (let k = j + 1; k < t.length; k++) if (hapOk(t, i, j, k)) out.push(`${i + 1}-${j + 1}-${k + 1}`); return out; }
function hapSVG(t) {
  const CO = ['#ff4d6d', '#4cc9f0', '#ffd23f'], BG = ['#f4f4f8', '#7d8199', '#14151f'], c = CO[t[1]];
  const sh = t[0] === 0 ? `<circle cx="30" cy="30" r="17" fill="${c}"/>` : t[0] === 1 ? `<polygon points="30,10 49,46 11,46" fill="${c}"/>` : `<rect x="13" y="13" width="34" height="34" rx="3" fill="${c}"/>`;
  return `<svg viewBox="0 0 60 60"><rect width="60" height="60" rx="9" fill="${BG[t[2]]}"/>${sh}</svg>`;
}
const PARTY = {};
PARTY.hap = (ctx) => {
  const N = ctx.hard ? 12 : 9, cols = ctx.hard ? 4 : 3;
  let tiles, haps;
  do { tiles = shuffle(ALL27).slice(0, N); haps = hapsOf(tiles); } while (haps.length < (ctx.hard ? 5 : 3) || haps.length > (ctx.hard ? 12 : 7));
  const D = zeroD(ctx), found = [], log = [];
  let picker = null, picks = [], pickEnd = 0, ended = false;
  const endAt = ctx.timed ? Date.now() + ctx.limit : Infinity;
  const B = buzzScreen(ctx, (id) => {
    if (picker || ended) return;
    picker = byId(ctx, id); picks = []; pickEnd = Date.now() + (ctx.timed ? 10000 : 30000); B.enable([]); draw();
  });
  const finish = (why) => {
    if (ended) return; ended = true;
    const rest = haps.filter((h) => !found.includes(h));
    ctx.done(D, `${why} · 합 ${haps.length}개 중 ${found.length}개 발견`, rest.length ? `못 찾은 합: ${rest.join(', ')}` : '모든 합을 찾았다!');
  };
  const release = () => { picker = null; picks = []; B.enable(ctx.players.map((p) => p.id)); B.score(D); draw(); };
  const draw = (msg) => {
    B.mid.innerHTML = `<div class="q"><small>모양·색·배경이 각각 3장 모두 같거나 모두 다르면 「합」 · 합 +30 · 틀리면 −10 · 결 성공 +60 / 실패 −20</small>${msg || (picker ? `${pname(picker)} — 3장을 고르거나 「결!」` : '합을 찾으면 자기 버튼!')}</div>
      <div class="hapg" style="grid-template-columns:repeat(${cols},1fr);max-width:${cols * 104}px">${tiles.map((t, i) => `<button class="hapt ${picks.includes(i) ? 'sel' : ''}" data-i="${i}" ${picker ? '' : 'disabled'}>${hapSVG(t)}<b>${i + 1}</b></button>`).join('')}</div>
      <div class="found">${found.length ? found.map((f) => `<span class="chip">합 ${f}</span>`).join('') : '<span class="dim small">아직 찾은 합이 없어요</span>'}</div>
      ${log.length ? `<div class="dim small center">${esc(log[log.length - 1])}</div>` : ''}
      ${picker ? '<div class="row"><button class="pink grow" id="gyeol">결! (더 없다)</button><button class="sec grow" id="cancel">취소 (−10)</button></div>' : ''}
      ${!ctx.timed && !picker ? '<button class="sec" id="endb">그만하고 결과 보기</button>' : ''}`;
    B.mid.querySelectorAll('.hapt').forEach((b) => { b.onclick = () => {
      if (!picker) return; const i = Number(b.dataset.i), k = picks.indexOf(i);
      if (k >= 0) picks.splice(k, 1); else picks.push(i);
      if (picks.length < 3) return draw();
      const key = picks.slice().sort((a, b2) => a - b2).map((x) => x + 1).join('-');
      if (hapOk(tiles, picks[0], picks[1], picks[2]) && !found.includes(key)) { D[picker.id] += 30; found.push(key); log.push(`⭕ ${picker.n}: 합 ${key}!`); toast(`⭕ 합! ${key}`); B.flash(picker.id, 'good'); }
      else { D[picker.id] -= 10; log.push(`❌ ${picker.n}: ${found.includes(key) ? '이미 나온 합' : '합이 아니다'} (${key})`); toast('❌ ' + (found.includes(key) ? '이미 나온 합!' : '합이 아니에요')); B.flash(picker.id, 'bad'); }
      release();
    }; });
    const g = document.getElementById('gyeol');
    if (g) g.onclick = () => {
      if (found.length === haps.length) { D[picker.id] += 60; log.push(`🎉 ${picker.n}: 결!`); B.score(D); finish(`🎉 ${picker.n}의 결!`); }
      else { D[picker.id] -= 20; log.push(`❌ ${picker.n}: 결 실패 — 아직 합이 남았다`); toast('❌ 아직 합이 남았어요!'); B.flash(picker.id, 'bad'); release(); }
    };
    const c = document.getElementById('cancel'); if (c) c.onclick = () => { D[picker.id] -= 10; log.push(`↩️ ${picker.n}: 취소`); release(); };
    const e = document.getElementById('endb'); if (e) e.onclick = () => { if (confirm('여기서 끝낼까요?')) finish('중단'); };
  };
  draw(); B.score(D);
  every(() => {
    if (ended) return;
    barTo(picker ? pickEnd : endAt, picker ? (ctx.timed ? 10000 : 30000) : ctx.limit);
    B.info(picker ? `${Math.max(0, Math.ceil((pickEnd - Date.now()) / 1000))}초` : endAt === Infinity ? '시간 무제한' : `${Math.ceil((endAt - Date.now()) / 1000)}초`);
    if (picker && Date.now() > pickEnd) { D[picker.id] -= 10; log.push(`⏰ ${picker.n}: 시간 초과`); release(); }
    if (!picker && Date.now() > endAt) finish('⏰ 시간 종료');
  }, 200);
};

/* ───────── 👯 짝꿍 그림 ───────── */
PARTY.pair = (ctx) => {
  const cards = ctx.hard ? 7 : 5, k = ctx.hard ? 8 : 6, D = zeroD(ctx);
  let ci = -1, cur = null, picker = null, out = new Set(), pickEnd = 0, cardEnd = 0, busy = false, wins = {};
  const B = buzzScreen(ctx, (id) => { if (picker || busy) return; picker = byId(ctx, id); pickEnd = Date.now() + (ctx.timed ? 6000 : 15000); B.enable([]); draw(); });
  const sym = (e, side) => { const sz = ctx.hard ? 24 + rand(22) : 32 + rand(10), rot = ctx.hard ? rand(360) : rand(40) - 20; return `<button class="sym" data-e="${e}" ${picker ? '' : 'disabled'} style="font-size:${sz}px;transform:rotate(${rot}deg)">${e}</button>`; };
  const draw = (msg) => {
    B.mid.innerHTML = `<div class="q"><small>카드 ${ci + 1}/${cards} · 두 카드에 똑같이 있는 그림은 딱 하나 · 정답 +25 · 오답 −10</small>${msg || (picker ? `${pname(picker)} — 겹치는 그림을 누르세요!` : '찾았으면 자기 버튼!')}</div>
      <div class="pcards"><div class="pcard">${cur.a.map((e) => sym(e)).join('')}</div><div class="pcard">${cur.b.map((e) => sym(e)).join('')}</div></div>`;
    B.mid.querySelectorAll('.sym').forEach((b) => { b.onclick = () => {
      if (!picker) return;
      if (b.dataset.e === cur.shared) { D[picker.id] += 25; wins[picker.id] = (wins[picker.id] || 0) + 1; B.flash(picker.id, 'good'); reveal(`⭕ ${picker.n} 정답! ${cur.shared}`); }
      else { D[picker.id] -= 10; out.add(picker.id); B.flash(picker.id, 'bad'); toast(`❌ ${picker.n} 땡!`); picker = null; afterMiss(); }
    }; });
  };
  const afterMiss = () => { B.score(D); const left = ctx.players.filter((p) => !out.has(p.id)); if (!left.length) return reveal(`모두 실패 — 정답은 ${cur.shared}`); B.enable(left.map((p) => p.id)); draw(); };
  const reveal = (msg) => {
    busy = true; picker = null; B.enable([]); B.score(D); draw(msg);
    B.mid.querySelectorAll('.sym').forEach((b) => { if (b.dataset.e === cur.shared) b.classList.add('hit2'); });
    later(next, 1600);
  };
  const next = () => {
    ci++; if (ci >= cards) return ctx.done(D, `카드 ${cards}장 완료`, ctx.players.filter((p) => wins[p.id]).map((p) => `${p.n} ${wins[p.id]}장`).join(' · ') || '아무도 못 맞혔다');
    const pool = shuffle(PAIR_EMOJI); cur = { shared: pool[0], a: shuffle([pool[0], ...pool.slice(1, k)]), b: shuffle([pool[0], ...pool.slice(k, 2 * k - 1)]) };
    out = new Set(); picker = null; busy = false; cardEnd = ctx.timed ? Date.now() + 20000 : Infinity;
    B.enable(ctx.players.map((p) => p.id)); draw();
  };
  next();
  every(() => {
    if (busy) return;
    barTo(picker ? pickEnd : cardEnd, picker ? (ctx.timed ? 6000 : 15000) : 20000);
    if (picker && Date.now() > pickEnd) { D[picker.id] -= 10; out.add(picker.id); toast(`⏰ ${picker.n} 시간 초과`); picker = null; afterMiss(); }
    else if (!picker && Date.now() > cardEnd) reveal(`⏰ 시간 초과 — 정답은 ${cur.shared}`);
  }, 150);
};

/* ───────── 🚦 반응속도 ───────── */
PARTY.reaction = (ctx) => {
  const subs = ctx.hard ? 7 : 5, D = zeroD(ctx);
  let si = 0, state = 'idle', goAt = 0, out = new Set(), times = [];
  const B = buzzScreen(ctx, (id) => {
    if (state === 'wait' || state === 'fake') {
      if (out.has(id)) return; out.add(id); D[id] -= 10; B.flash(id, 'bad'); B.score(D);
      toast(`🚫 ${byId(ctx, id).n} 부정출발!`); B.enable(ctx.players.filter((p) => !out.has(p.id)).map((p) => p.id));
      if (out.size >= ctx.players.length) { state = 'idle'; show('😅 전원 부정출발', '#3a1220'); later(nextSub, 1500); }
    } else if (state === 'go') {
      state = 'idle'; const ms = Math.round(performance.now() - goAt); D[id] += 20; times.push(`${byId(ctx, id).n} ${ms}ms`);
      B.flash(id, 'good'); B.score(D); B.enable([]); show(`⚡ ${esc(byId(ctx, id).n)}<br><span style="font-size:22px">${ms}ms</span>`, '#10301f'); later(nextSub, 1500);
    }
  });
  const show = (html, bg) => { B.mid.innerHTML = `<div class="rpad" style="background:${bg}">${html}</div><div class="dim small center">${si}/${subs}번째 · 초록색일 때만 누르세요! 먼저 누르면 −10</div>`; };
  const nextSub = () => {
    if (si >= subs) return ctx.done(D, `${subs}번 대결 끝`, times.join(' · '));
    si++; out = new Set(); state = 'wait'; B.enable(ctx.players.map((p) => p.id));
    show('기다리세요…', '#20264f');
    let t = 1500 + rand(3500);
    if (ctx.hard) {
      const fakes = rand(3);
      for (let f = 0; f < fakes; f++) { const at = 600 + rand(Math.max(700, t - 900)); const col = pick([['🟡', '#5a4a08'], ['🔵', '#0d3050'], ['🔴', '#4a0d18']]);
        later(() => { if (state !== 'wait') return; state = 'fake'; show(`${col[0]} 아직!`, col[1]); later(() => { if (state === 'fake') { state = 'wait'; show('기다리세요…', '#20264f'); } }, 450); }, at); }
    }
    later(() => { if (state === 'wait' || state === 'fake') { state = 'go'; goAt = performance.now(); show('지금!', '#1f9d55'); } }, t);
  };
  barTo(Infinity); B.score(D); nextSub();
};

/* ───────── 🔔 버저 퀴즈 ───────── */
function quizQ(hard, used) {
  const k = pick(['trivia', 'trivia', 'trivia', 'chosung', 'chosung', 'sequence', 'fruit', 'calc', 'clock']);
  if (k === 'trivia') { const q = makeTrivia(used); return { kind: 'mc', text: q.pub.text, sub: q.pub.cat, options: q.pub.options, ans: q.secret.ans, at: q.answerText, ex: q.expl }; }
  if (k === 'chosung') { const q = makeChosung(used, hard); return { kind: 'text', big: q.pub.cho, text: '초성 퀴즈', sub: hard ? '분류는 비밀' : `분류: ${q.pub.cat}`, ans: q.secret.ans, at: q.answerText }; }
  if (k === 'sequence') { const q = makeSequence(hard); return { kind: 'num', text: '다음에 올 수는?', big: q.pub.seq.join(', ') + ', ?', ans: q.secret.ans, at: String(q.secret.ans), ex: q.expl }; }
  if (k === 'fruit') { const q = genFruit(hard); return { kind: 'num', text: q.pub.text, lines: q.pub.lines, sub: '곱셈 먼저', ans: q.secret.ans, at: q.answerText, ex: q.expl }; }
  if (k === 'clock') { const q = genClock(hard); return { kind: 'num', text: q.pub.text, big: q.pub.big, sub: '단위: 도', ans: q.secret.ans, at: q.answerText }; }
  const a = between(hard ? 12 : 3, hard ? 49 : 12), b = between(hard ? 12 : 3, hard ? 39 : 12), c = between(5, hard ? 99 : 30), op = pick(['+', '−']);
  const ans = op === '+' ? a * b + c : a * b - c;
  return { kind: 'num', text: '계산!', big: `${a} × ${b} ${op} ${c}`, ans, at: String(ans) };
}
PARTY.quiz = (ctx) => {
  const total = ctx.hard ? 8 : 6, D = zeroD(ctx), used = G ? G.used : new Set();
  let qi = -1, Q = null, picker = null, out = new Set(), pickEnd = 0, qEnd = 0, busy = false;
  const B = buzzScreen(ctx, (id) => { if (picker || busy) return; picker = byId(ctx, id); pickEnd = Date.now() + (ctx.timed ? 10000 : 30000); B.enable([]); draw(); });
  const body = () => `${Q.big ? `<div class="bignum" style="font-size:${Q.big.length > 12 ? 30 : 44}px">${esc(Q.big)}</div>` : ''}${Q.lines ? `<div class="col clues">${Q.lines.map((l) => `<div class="clue">${esc(l)}</div>`).join('')}</div>` : ''}`;
  const draw = (msg) => {
    let ans = '';
    if (picker && !busy) {
      if (Q.kind === 'mc') ans = `<div class="opts">${Q.options.map((o, i) => `<button class="opt" data-i="${i}">${['①', '②', '③', '④'][i]} ${esc(o)}</button>`).join('')}</div>`;
      else ans = `<div class="row"><input id="pin" type="text" inputmode="${Q.kind === 'num' ? 'numeric' : 'text'}" placeholder="${esc(picker.n)}의 답" autocomplete="off" style="text-align:center;font-weight:800;font-size:20px"><button id="pok" style="flex:none">제출</button></div>`;
    } else if (Q.kind === 'mc') ans = `<div class="opts">${Q.options.map((o, i) => `<div class="opt dimopt">${['①', '②', '③', '④'][i]} ${esc(o)}</div>`).join('')}</div>`;
    B.mid.innerHTML = `<div class="q"><small>문제 ${qi + 1}/${total}${Q.sub ? ' · ' + esc(Q.sub) : ''} · 정답 +30 · 오답 −10</small>${esc(Q.text)}</div>${body()}
      <div class="center" style="font-weight:800">${msg || (picker ? `${pname(picker)}의 답은?` : '아는 사람 버저!')}</div>${ans}
      ${!ctx.timed && !picker && !busy ? '<button class="sec" id="skipq">넘기기</button>' : ''}`;
    const check = (v) => {
      const ok = Q.kind === 'mc' ? v === Q.ans : Q.kind === 'num' ? Number(String(v).replace(/,/g, '')) === Q.ans : String(v).replace(/\s+/g, '') === Q.ans;
      if (ok) { D[picker.id] += 30; B.flash(picker.id, 'good'); reveal(`⭕ ${picker.n} 정답!`); }
      else { D[picker.id] -= 10; out.add(picker.id); B.flash(picker.id, 'bad'); toast(`❌ ${picker.n} 땡!`); picker = null; afterMiss(); }
    };
    B.mid.querySelectorAll('button.opt').forEach((b) => { b.onclick = () => check(Number(b.dataset.i)); });
    const pin = document.getElementById('pin');
    if (pin) { pin.focus(); const go = () => { if (!pin.value.trim()) return; check(pin.value.trim()); }; document.getElementById('pok').onclick = go; pin.onkeydown = (e) => { if (e.key === 'Enter') go(); }; }
    const sk = document.getElementById('skipq'); if (sk) sk.onclick = () => reveal('넘어갑니다');
  };
  const afterMiss = () => { B.score(D); const left = ctx.players.filter((p) => !out.has(p.id)); if (!left.length) return reveal('모두 틀렸다!'); B.enable(left.map((p) => p.id)); draw(); };
  const reveal = (msg) => {
    busy = true; picker = null; B.enable([]); B.score(D); draw(msg);
    B.mid.insertAdjacentHTML('beforeend', `<div class="ans pop"><div class="dim small">정답</div><b>${esc(Q.at)}</b>${Q.ex ? `<div class="small dim">${esc(Q.ex)}</div>` : ''}</div>`);
    later(next, 2600);
  };
  const next = () => {
    qi++; if (qi >= total) return ctx.done(D, `${total}문제 끝`, '');
    Q = quizQ(ctx.hard, used); out = new Set(); picker = null; busy = false; qEnd = ctx.timed ? Date.now() + 25000 : Infinity;
    B.enable(ctx.players.map((p) => p.id)); draw();
  };
  next();
  every(() => {
    if (busy) return;
    barTo(picker ? pickEnd : qEnd, picker ? (ctx.timed ? 10000 : 30000) : 25000);
    if (picker && Date.now() > pickEnd) { D[picker.id] -= 10; out.add(picker.id); toast(`⏰ ${picker.n} 시간 초과`); picker = null; afterMiss(); }
    else if (!picker && Date.now() > qEnd) reveal('⏰ 시간 초과');
  }, 150);
};

/* ───────── 🙈 눈치 게임 ───────── */
PARTY.nunchi = (ctx) => {
  const D = zeroD(ctx), w = ctx.hard ? pick([300, 400, 500]) : pick([400, 500, 600, 700]), lim = ctx.hard ? 12000 : 15000;
  const st = {}; // id → { num, t, res: 'safe'|'crash'|'early'|'last' }
  let phase = 'ready', lastId = null, lastT = 0, num = 0, endAt = 0;
  const B = buzzScreen(ctx, (id) => {
    if (st[id] || phase === 'end') return;
    if (phase === 'ready') { st[id] = { num: 0, res: 'early' }; B.flash(id, 'bad'); toast(`🚫 ${byId(ctx, id).n} 부정출발!`); refresh(); return; }
    const now = performance.now(); num++;
    st[id] = { num, t: now, res: 'safe' };
    if (lastId && now - lastT < w) { st[id].res = 'crash'; if (st[lastId].res === 'safe') st[lastId].res = 'crash'; B.flash(id, 'bad'); B.flash(lastId, 'bad'); }
    else B.flash(id, 'good');
    lastId = id; lastT = now; refresh();
  });
  const left = () => ctx.players.filter((p) => !st[p.id]);
  const refresh = () => {
    B.enable(phase === 'end' ? [] : left().map((p) => p.id));
    const list = ctx.players.filter((p) => st[p.id] && st[p.id].num).sort((a, b) => st[a.id].num - st[b.id].num);
    B.mid.innerHTML = `<div class="q"><small>동시에(${(w / 1000).toFixed(1)}초 안에) 누르면 둘 다 탈락 · 마지막까지 못 누르면 탈락</small>${phase === 'ready' ? '준비…' : phase === 'end' ? '끝!' : '1부터 한 명씩, 자기 버튼!'}</div>
      <div class="nlist">${list.map((p) => `<div class="nrow ${st[p.id].res}" style="--c:${p.c}"><b>${st[p.id].num}</b><span>${esc(p.n)}</span><em>${st[p.id].res === 'crash' ? '💥 동시!' : '✅'}</em></div>`).join('') || '<div class="dim center">아직 아무도 안 눌렀어요</div>'}</div>`;
    if (phase === 'go' && left().length <= 1) end();
  };
  const end = () => {
    if (phase === 'end') return; phase = 'end';
    for (const p of left()) st[p.id] = { num: 0, res: 'last' };
    const notes = {};
    for (const p of ctx.players) { const r = st[p.id].res; D[p.id] = r === 'safe' ? 30 : r === 'crash' ? -20 : -30; notes[p.id] = { safe: `${st[p.id].num}번째 성공`, crash: `${st[p.id].num}번째 · 💥 동시에 누름`, early: '부정출발', last: '끝까지 못 누름' }[r]; }
    refresh(); B.score(D);
    later(() => ctx.done(D, `동시 기준 ${(w / 1000).toFixed(1)}초`, '', notes), 1500);
  };
  B.score(D); refresh();
  let n = 3;
  const cd = () => { if (n > 0) { B.info(`${n}…`); n--; later(cd, 800); } else { phase = 'go'; endAt = Date.now() + lim; B.info('시작!'); refresh(); } };
  later(cd, 400);
  every(() => { if (phase !== 'go') return; barTo(endAt, lim); if (Date.now() > endAt) end(); }, 100);
};

/* ───────── 💣 업다운 폭탄 ───────── */
PARTY.updown = (ctx) => {
  const R = ctx.hard ? pick([150, 200, 255, 300]) : pick([30, 50, 64, 99, 100]), bomb = between(1, R), D = zeroD(ctx);
  let lo = 0, hi = R + 1, ti = 0, turnEnd = 0, hist = [], over = false;
  const V = plainScreen(); V.score(ctx, D);
  const per = ctx.timed ? ctx.limit : Infinity;
  const boom = (p) => {
    over = true; ctx.players.forEach((q) => { D[q.id] = q === p ? -60 : 30; });
    V.mid.innerHTML = `<div class="boom pop">💥</div><div class="q">${pname(p)} 펑!<br><small>폭탄은 ${bomb}</small></div>`;
    V.score(ctx, D); later(() => ctx.done(D, `💥 ${p.n} — 폭탄 ${bomb}`, `범위 1~${R} · ${hist.join(' → ')}`), 2200);
  };
  const turn = () => {
    if (over) return;
    const p = ctx.players[ti % ctx.players.length];
    if (hi - lo === 2) { V.mid.innerHTML = `<div class="q">남은 숫자는 폭탄뿐!<br>${pname(p)} 차례…</div>`; later(() => boom(p), 1500); return; }
    turnEnd = Date.now() + per;
    V.mid.innerHTML = `<div class="q"><small>폭탄 숫자를 부르면 펑! · 범위 밖은 안 돼요</small>${pname(p)} 차례</div>
      <div class="bignum" style="font-size:48px">${lo + 1} ~ ${hi - 1}</div>
      <div class="dim small center">${hist.length ? '지금까지: ' + hist.join(' → ') : `1부터 ${R} 사이 어딘가에 폭탄이 있다`}</div>
      <div class="row"><input id="ug" type="text" inputmode="numeric" placeholder="숫자" autocomplete="off" style="text-align:center;font-weight:800;font-size:24px"><button id="uok" style="flex:none;background:${p.c}">부르기</button></div>`;
    const go = (forced) => {
      let g = forced !== undefined ? forced : Number(document.getElementById('ug').value);
      if (!Number.isInteger(g) || g <= lo || g >= hi) return toast(`${lo + 1}~${hi - 1} 사이 숫자를 부르세요`);
      hist.push(g);
      if (g === bomb) return boom(p);
      if (g < bomb) lo = g; else hi = g;
      toast(g < bomb ? `⬆️ ${g}보다 크다` : `⬇️ ${g}보다 작다`);
      ti++; turn();
    };
    document.getElementById('uok').onclick = () => go();
    document.getElementById('ug').onkeydown = (e) => { if (e.key === 'Enter') go(); };
    document.getElementById('ug').focus();
    PARTY._ud = () => go(between(lo + 1, hi - 1));
  };
  turn();
  every(() => { if (over) return; barTo(turnEnd, per); if (Date.now() > turnEnd) { toast('⏰ 시간 초과 — 아무 숫자나 부릅니다'); PARTY._ud(); } }, 150);
};

/* ───────── 👏 369 게임 ───────── */
const RULES369 = [
  { t: '3·6·9가 들어가면 짝', f: (n) => (/[369]/.test(String(n)) ? 1 : 0) },
  { t: '4의 배수면 짝', f: (n) => (n % 4 === 0 ? 1 : 0) },
  { t: '7이 들어가거나 7의 배수면 짝', f: (n) => (n % 7 === 0 || /7/.test(String(n)) ? 1 : 0) },
  { t: '각 자리 숫자의 합이 홀수면 짝 (예: 12 → 1+2=3 → 짝)', f: (n) => ([...String(n)].reduce((a, d) => a + Number(d), 0) % 2 ? 1 : 0), hard: 1 },
  { t: '3·6·9 개수만큼 짝 (33 → 짝짝)', f: (n) => (String(n).match(/[369]/g) || []).length, hard: 1, multi: 1 },
  { t: '5의 배수면 짝, 10의 배수면 짝짝', f: (n) => (n % 10 === 0 ? 2 : n % 5 === 0 ? 1 : 0), hard: 1, multi: 1 },
];
PARTY.g369 = (ctx) => {
  const rule = pick(RULES369.filter((r) => (ctx.hard ? true : !r.hard)));
  const start = between(1, ctx.hard ? 40 : 15), turns = ctx.players.length * (ctx.hard ? 8 : 6), D = zeroD(ctx);
  const per = ctx.timed ? (ctx.hard ? 2500 : 3200) : 7000;
  let n = start, k = 0, turnEnd = 0, last = '', over = false;
  const V = plainScreen(); V.score(ctx, D);
  const fail = (p, why) => {
    over = true; const need = rule.f(n);
    ctx.players.forEach((q) => { D[q.id] = q === p ? -40 : 20; });
    V.mid.innerHTML = `<div class="boom pop">🙅</div><div class="q">${pname(p)} 탈락!<br><small>${esc(why)} · ${n}은 ${need ? '👏'.repeat(need) : '숫자'}였어요</small></div>`;
    V.score(ctx, D); later(() => ctx.done(D, `${p.n} 탈락 (${n})`, `규칙: ${rule.t} · 시작 ${start}`), 2200);
  };
  const intro = () => {
    V.mid.innerHTML = `<div class="q"><small>이번 규칙</small>${esc(rule.t)}</div><div class="bignum" style="font-size:40px">시작: ${start}</div>
      <div class="dim small center" style="line-height:1.6">${ctx.players.map((p) => esc(p.n)).join(' → ')} 순서로 돌아가요<br>숫자는 소리 내서 말하고, 화면에서는 버튼만 누르세요<br>${ctx.players.length}명이 ${turns / ctx.players.length}바퀴 버티면 모두 +30</div>
      <button class="big grn" id="st">시작!</button>`;
    document.getElementById('st').onclick = turn;
  };
  const turn = () => {
    if (over) return;
    if (k >= turns) { ctx.players.forEach((q) => { D[q.id] = 30; }); V.score(ctx, D); V.mid.innerHTML = '<div class="boom pop">🎉</div><div class="q">모두 살아남았다!</div>'; over = true; later(() => ctx.done(D, `${turns}번 모두 성공!`, `규칙: ${rule.t}`), 1800); return; }
    const p = ctx.players[k % ctx.players.length];
    turnEnd = Date.now() + per;
    const opts = rule.multi ? [0, 1, 2] : [0, 1];
    V.mid.innerHTML = `<div class="q"><small>${esc(rule.t)}</small>${pname(p)} 차례</div>
      <div class="center dim">앞사람: <b style="color:var(--txt)">${last || '(첫 순서 · ' + start + '부터)'}</b></div>
      <div class="three" style="grid-template-columns:repeat(${opts.length},1fr)">${opts.map((c) => `<button data-c="${c}" style="font-size:${c ? 30 : 22}px;border-color:${p.c}">${c ? '👏'.repeat(c) : '🗣️<br>숫자'}</button>`).join('')}</div>`;
    V.mid.querySelectorAll('[data-c]').forEach((b) => { b.onclick = () => {
      const c = Number(b.dataset.c), need = rule.f(n);
      if (c !== need) return fail(p, '틀렸다!');
      last = c ? '👏'.repeat(c) : `🗣️ ${n}`; n++; k++; turn();
    }; });
  };
  intro();
  every(() => { if (over || !turnEnd) return; barTo(turnEnd, per); if (Date.now() > turnEnd) fail(ctx.players[k % ctx.players.length], '시간 초과'); }, 100);
};

/* ───────── 📈 하이 로우 ───────── */
PARTY.hilo = (ctx) => {
  const deck = shuffle([].concat(...['♠', '♥', '♦', '♣'].map((s) => [...Array(13).keys()].map((v) => ({ v: v + 1, s }))))), D = zeroD(ctx), notes = {};
  const cap = ctx.hard ? 8 : 6, per = ctx.timed ? ctx.limit : Infinity, nm = (c) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[c.v] || c.v);
  const card = (c) => `<div class="pc ${c.s === '♥' || c.s === '♦' ? 'red' : ''}"><b>${nm(c)}</b><span>${c.s}</span></div>`;
  let pi = 0, cur = deck.pop(), streak = 0, turnEnd = 0, busy = false;
  const V = plainScreen(); V.score(ctx, D);
  const endTurn = (msg) => {
    const p = ctx.players[pi]; notes[p.id] = `${streak}연속`;
    busy = true; V.mid.insertAdjacentHTML('beforeend', `<div class="center" style="font-weight:800">${msg}</div>`);
    later(() => { pi++; streak = 0; busy = false; if (deck.length < 10) deck.push(...shuffle(deck.splice(0))); if (pi >= ctx.players.length) return ctx.done(D, '모두 도전 끝', `연속 ${cap}번이면 보너스 +30`, notes); cur = deck.pop(); draw(); }, 1800);
  };
  const draw = (prev, msg) => {
    const p = ctx.players[pi]; turnEnd = Date.now() + per;
    V.mid.innerHTML = `<div class="q"><small>맞힐 때마다 +15 · ${ctx.hard ? '같은 숫자는 실패' : '같은 숫자는 통과'} · ${cap}연속 보너스 +30</small>${pname(p)} 차례 · ${streak}연속</div>
      <div class="pcs">${prev ? card(prev) + '<span class="arr">→</span>' : ''}${card(cur)}</div>
      ${msg ? `<div class="center" style="font-weight:800">${msg}</div>` : ''}
      <div class="two"><button data-h="1">⬆️<br><span style="font-size:18px">더 높다</span></button><button data-h="0">⬇️<br><span style="font-size:18px">더 낮다</span></button></div>`;
    V.mid.querySelectorAll('[data-h]').forEach((b) => { b.onclick = () => guess(Number(b.dataset.h)); });
  };
  const guess = (up) => {
    if (busy) return; const p = ctx.players[pi], nx = deck.pop(), prev = cur; cur = nx;
    const ok = nx.v === prev.v ? !ctx.hard : up ? nx.v > prev.v : nx.v < prev.v;
    if (!ok) { draw(prev); V.mid.querySelector('.two').remove(); return endTurn(`❌ ${nm(nx)}${nx.v === prev.v ? ' — 같은 숫자!' : ''} · 차례 끝`); }
    streak++; D[p.id] += 15; V.score(ctx, D);
    if (streak >= cap) { D[p.id] += 30; V.score(ctx, D); draw(prev); V.mid.querySelector('.two').remove(); return endTurn(`🎉 ${cap}연속! 보너스 +30`); }
    draw(prev, `⭕ ${nm(nx)}! +15`);
  };
  draw();
  every(() => { if (busy) return; barTo(turnEnd, per); if (Date.now() > turnEnd) { busy = true; endTurn('⏰ 시간 초과'); } }, 150);
};

/* ───────── ⏱️ 타이밍 스톱 ───────── */
PARTY.stopwatch = (ctx) => {
  const target = ctx.hard ? between(1200, 2500) / 100 : pick([333, 500, 555, 777, 1000, 888, 618, 1234, 700, 999]) / 100;
  const show = ctx.hard ? 700 : 2000, res = {}, D = zeroD(ctx);
  let pi = 0, t0 = 0, running = false;
  const V = plainScreen(); V.score(ctx, D);
  const turn = () => {
    if (pi >= ctx.players.length) return finish();
    const p = ctx.players[pi]; running = false;
    V.mid.innerHTML = `<div class="q"><small>목표 시간에 최대한 가깝게 멈추기 · 처음 ${show / 1000}초만 보여요</small>${pname(p)} 차례</div>
      <div class="bignum" style="font-size:30px">목표 ${target.toFixed(2)}초</div><div class="sw" id="sw">0.00</div>
      <button class="big" id="swb" style="background:${p.c}">시작</button>`;
    const sw = document.getElementById('sw'), btn = document.getElementById('swb');
    btn.onclick = () => {
      if (!running) {
        running = true; t0 = performance.now(); btn.textContent = '멈춰!'; btn.classList.add('pink');
        const tick = every(() => { if (!running) return clearInterval(tick); const e = (performance.now() - t0) / 1000; sw.textContent = e * 1000 < show ? e.toFixed(2) : '??.??'; if (e > target + 15) btn.onclick(); }, 30);
      } else {
        running = false; const e = (performance.now() - t0) / 1000; res[p.id] = e;
        sw.textContent = e.toFixed(2); btn.disabled = true;
        V.mid.insertAdjacentHTML('beforeend', `<div class="center" style="font-weight:800">${Math.abs(e - target) < 0.05 ? '🎯 ' : ''}오차 ${(e - target >= 0 ? '+' : '−') + Math.abs(e - target).toFixed(2)}초</div>`);
        later(() => { pi++; turn(); }, 1600);
      }
    };
  };
  const finish = () => {
    const rk = ctx.players.slice().sort((a, b) => Math.abs(res[a.id] - target) - Math.abs(res[b.id] - target)), pts = [80, 50, 30], notes = {};
    rk.forEach((p, i) => { const err = Math.abs(res[p.id] - target); D[p.id] = ctx.players.length > 1 ? (pts[i] || 10) : Math.max(0, Math.round(100 - err * 60)); if (err < 0.05) D[p.id] += 20; notes[p.id] = `${res[p.id].toFixed(2)}초 (오차 ${err.toFixed(2)})${err < 0.05 ? ' 🎯 +20' : ''}`; });
    ctx.done(D, `목표 ${target.toFixed(2)}초`, '', notes);
  };
  barTo(Infinity); turn();
};

/* ───────── 🤥 라이어 게임 ───────── */
PARTY.liarw = (ctx) => {
  const cat = pick(Object.keys(LIAR_WORDS)), words = shuffle(LIAR_WORDS[cat]), word = words[0];
  const liar = pick(ctx.players), fool = ctx.hard, foolWord = words[1], D = zeroD(ctx);
  const seeOrder = ctx.players;
  const see = (k) => {
    if (k >= seeOrder.length) return talk();
    const p = seeOrder[k];
    passView(p, '혼자서만 제시어를 확인하세요', () => {
      const isL = p === liar;
      $app.innerHTML = `<div class="topbar">${roundBadge()}</div>
        <div class="pass pop">${isL && !fool ? `<div class="big1">🤥</div><div class="pn" style="color:var(--pink)">당신은 라이어!</div><div class="dim">주제: <b style="color:var(--txt)">${cat}</b></div><div class="small dim" style="margin-top:10px">제시어를 아는 척하세요. 들키면 제시어를 맞혀서 역전할 수 있어요.</div>`
          : `<div class="dim">주제: <b style="color:var(--txt)">${cat}</b></div><div class="dim" style="margin-top:8px">제시어</div><div class="pn">${esc(isL ? foolWord : word)}</div>`}</div>
        <button class="big" id="ok">확인했어요 (화면 가리고 넘기기)</button>`;
      document.getElementById('ok').onclick = () => see(k + 1);
    });
  };
  const talk = () => {
    const first = pick(ctx.players), endAt = ctx.timed ? Date.now() + ctx.limit : Infinity;
    const V = plainScreen();
    V.mid.innerHTML = `<div class="q"><small>주제: ${cat}${fool ? ' · 바보 라이어 모드: 라이어도 자기가 라이어인 줄 몰라요!' : ''}</small>💬 돌아가며 제시어를 한 마디씩 설명하세요</div>
      <div class="dim center" style="line-height:1.6">${pname(first)}부터 시계 방향으로, 2바퀴 정도<br>너무 자세히 말하면 라이어가 눈치채요!</div>
      <button class="big grn" id="vote">투표하기 🗳️</button>`;
    document.getElementById('vote').onclick = vote;
    every(() => { barTo(endAt, ctx.limit); V.info(endAt === Infinity ? '' : `${Math.max(0, Math.ceil((endAt - Date.now()) / 1000))}초`); if (Date.now() > endAt && document.getElementById('vote')) { PT.clear(); vote(); } }, 200);
  };
  const vote = () => {
    PT.clear();
    const V = plainScreen(); barTo(Infinity);
    V.mid.innerHTML = `<div class="q"><small>다 같이 의논해서 한 명을 고르세요</small>라이어는 누구?</div>
      <div class="opts" style="grid-template-columns:1fr 1fr">${ctx.players.map((p) => `<button class="opt" data-p="${p.id}" style="text-align:center;border-color:${p.c}">${esc(p.n)}</button>`).join('')}</div>`;
    V.mid.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => judge(byId(ctx, b.dataset.p)); });
  };
  const judge = (ch) => {
    const V = plainScreen(); barTo(Infinity);
    if (ch !== liar) {
      D[liar.id] = 120;
      V.mid.innerHTML = `<div class="boom pop">🤥</div><div class="q">${pname(ch)}은(는) 라이어가 아니었다!<br><small>진짜 라이어는 ${esc(liar.n)}</small></div><button class="big" id="ok">결과 보기</button>`;
      document.getElementById('ok').onclick = () => ctx.done(D, `라이어 ${liar.n} 승리! · 제시어: ${word}`, fool ? `라이어가 받은 제시어: ${foolWord}` : '');
      return;
    }
    const opts = shuffle(words.slice(0, 8));
    V.mid.innerHTML = `<div class="boom pop">🎯</div><div class="q">라이어 ${pname(liar)} 검거!<br><small>마지막 기회 — 제시어를 맞히면 라이어가 이겨요</small></div>
      <div class="opts" style="grid-template-columns:1fr 1fr">${opts.map((w) => `<button class="opt" data-w="${esc(w)}" style="text-align:center">${esc(w)}</button>`).join('')}</div>`;
    V.mid.querySelectorAll('[data-w]').forEach((b) => { b.onclick = () => {
      const ok = b.dataset.w === word;
      if (ok) D[liar.id] = 80; else ctx.players.forEach((p) => { if (p !== liar) D[p.id] = 50; });
      ctx.done(D, ok ? `라이어 ${liar.n} 역전승! 제시어 「${word}」를 맞혔다` : `시민 승리! 라이어 ${liar.n}의 답 「${b.dataset.w}」 · 제시어 「${word}」`, fool ? `라이어가 받은 제시어: ${foolWord}` : '');
    }; });
  };
  see(0);
};
