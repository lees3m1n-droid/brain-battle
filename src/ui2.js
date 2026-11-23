/* ═════════════ 새 게임 화면 ═════════════
   UI2[type]({ stage, q, cls, submit, qbox, numInput, bindInput, choice, T }) */
const alive = (stage) => !locked && document.getElementById('stage') === stage;
const linesHTML = (lines, cls) => (lines && lines.length ? `<div class="col clues${cls}">${lines.map((l) => `<div class="clue">${esc(l)}</div>`).join('')}</div>` : '');
// 선택 후 확정 버튼으로 제출
function pickConfirm(u, sel, render) {
  let cur = null;
  u.stage.querySelectorAll(sel).forEach((b) => { b.onclick = () => { cur = Number(b.dataset.i); u.stage.querySelectorAll(sel).forEach((x) => x.classList.toggle('sel', x === b)); if (render) render(cur); document.getElementById('ok').disabled = false; }; });
  document.getElementById('ok').onclick = () => { if (cur !== null) u.submit(cur); };
}

const UI2 = {
  /* 공용: 숫자 입력 / 객관식 */
  generic(u) {
    const q = u.q;
    let body = '';
    if (q.big) body += `<div class="bignum${u.cls}" style="font-size:52px">${esc(q.big)}</div>`;
    body += linesHTML(q.lines, u.cls);
    if (q.grid) body += `<div class="dgrid${u.cls}" style="grid-template-columns:repeat(${q.grid[0].length},1fr)">${[].concat(...q.grid).map((x) => `<span class="${x === '?' ? 'qm' : x === '■' ? 'blk' : x === '' ? 'emp' : ''}">${esc(x)}</span>`).join('')}</div>`;
    if (q.pyr) body += `<div class="pyr${u.cls}">${q.pyr.map((r) => `<div>${r.map((x) => `<span class="${x === '?' ? 'qm' : x === '' ? 'emp' : ''}">${esc(x)}</span>`).join('')}</div>`).join('')}</div>`;
    if (q.ui === 'mc') {
      u.stage.innerHTML = u.qbox(esc(q.text), q.sub) + body + `<div class="opts" style="grid-template-columns:1fr 1fr">${q.options.map((o, i) => `<button class="opt" style="text-align:center" data-i="${i}">${esc(o)}</button>`).join('')}</div>`;
      u.choice('.opt');
    } else {
      u.stage.innerHTML = u.qbox(esc(q.text), q.sub) + body + u.numInput('정답 입력', q.decimal ? 'decimal' : 'text');
      u.bindInput((v) => { const n = Number(v.replace(/,/g, '')); return v !== '' && Number.isFinite(n) ? n : (toast('숫자를 입력하세요'), undefined); });
    }
  },

  /* 결! 합! */
  hap(u) {
    const q = u.q, picks = [];
    const SH = ['circle', 'tri', 'sq'], CO = ['#ff4d6d', '#4cc9f0', '#ffd23f'], BG = ['#f4f4f8', '#7d8199', '#14151f'];
    const tile = (t) => { const c = CO[t[1]]; const shape = t[0] === 0 ? `<circle cx="30" cy="30" r="17" fill="${c}"/>` : t[0] === 1 ? `<polygon points="30,10 49,46 11,46" fill="${c}"/>` : `<rect x="13" y="13" width="34" height="34" rx="3" fill="${c}"/>`; return `<svg viewBox="0 0 60 60"><rect width="60" height="60" rx="9" fill="${BG[t[2]]}"/>${shape}</svg>`; };
    const count = q.mode === 'count';
    const draw = () => {
      u.stage.innerHTML = u.qbox(count ? '이 판에 「합」은 모두 몇 개?' : '「합」 하나를 찾아 3장을 눌러라', '모양·색·배경 각각이 3장 모두 같거나 모두 달라야 합') +
        `<div class="hapg${u.cls}">${q.tiles.map((t, i) => `<button class="hapt ${picks.includes(i) ? 'sel' : ''}" data-i="${i}">${tile(t)}<b>${i + 1}</b></button>`).join('')}</div>` +
        (count ? u.numInput('합의 개수') : `<button class="big" id="ok" ${picks.length === 3 ? '' : 'disabled'}>합! (${picks.length}/3)</button>`);
      if (count) { u.bindInput((v) => (/^\d+$/.test(v) ? Number(v) : (toast('숫자를 입력하세요'), undefined))); return; }
      u.stage.querySelectorAll('.hapt').forEach((b) => { b.onclick = () => { const i = Number(b.dataset.i); const k = picks.indexOf(i); if (k >= 0) picks.splice(k, 1); else if (picks.length < 3) picks.push(i); draw(); }; });
      document.getElementById('ok').onclick = () => u.submit(picks.slice());
    };
    draw();
  },

  /* 불 끄기 */
  lights(u) {
    const q = u.q, n = q.n, b = [...q.b].map(Number), presses = [];
    const draw = () => {
      const left = b.filter((x) => x).length;
      u.stage.innerHTML = u.qbox(left ? `켜진 불 ${left}개` : '모두 꺼졌다! 🎉', '누른 칸 + 상하좌우가 뒤집힌다') +
        `<div class="grid4 lights${u.cls}" style="grid-template-columns:repeat(${n},1fr)">${b.map((x, i) => `<button class="cell ${x ? 'on' : ''}" data-i="${i}"></button>`).join('')}</div>
        <div class="row"><button class="sec grow" id="rs">↺ 처음부터 (${presses.length}번 누름)</button></div>
        <button class="big" id="ok" ${left ? 'disabled' : ''}>${left ? '불을 모두 끄면 제출할 수 있어요' : '제출'}</button>`;
      u.stage.querySelectorAll('.cell').forEach((c) => { c.onclick = () => { const i = Number(c.dataset.i); lightsPress(b, n, i); presses.push(i); draw(); }; });
      document.getElementById('rs').onclick = () => { b.splice(0, b.length, ...[...q.b].map(Number)); presses.length = 0; draw(); };
      document.getElementById('ok').onclick = () => u.submit(presses.slice(-200));
    };
    draw();
  },

  /* 미니 스도쿠 */
  sudoku(u) {
    const q = u.q, n = q.n, g = [...q.g].map(Number), cur = g.slice(); let sel = cur.indexOf(0);
    const bad = () => { const out = new Set(); for (let i = 0; i < n * n; i++) { if (!cur[i]) continue; const r = Math.floor(i / n), c = i % n; for (let j = 0; j < n * n; j++) { if (j === i || cur[j] !== cur[i]) continue; const r2 = Math.floor(j / n), c2 = j % n; if (r === r2 || c === c2 || (Math.floor(r / q.bh) === Math.floor(r2 / q.bh) && Math.floor(c / q.bw) === Math.floor(c2 / q.bw))) out.add(i); } } return out; };
    const draw = () => {
      const B = bad(), full = cur.every((x) => x);
      u.stage.innerHTML = u.qbox(`${n}×${n} 스도쿠`, `가로·세로·굵은 칸(${q.bh}×${q.bw})마다 1~${n}이 한 번씩`) +
        `<div class="sdk${u.cls}" style="grid-template-columns:repeat(${n},1fr)">${cur.map((x, i) => { const r = Math.floor(i / n), c = i % n; const cl = [g[i] ? 'giv' : '', i === sel ? 'sel' : '', B.has(i) ? 'bad' : '', c % q.bw === 0 && c ? 'bl' : '', r % q.bh === 0 && r ? 'bt' : ''].join(' '); return `<button class="${cl}" data-i="${i}">${x || ''}</button>`; }).join('')}</div>
        <div class="nums" style="grid-template-columns:repeat(${n + 1},1fr)">${[...Array(n).keys()].map((k) => `<button data-v="${k + 1}">${k + 1}</button>`).join('')}<button data-v="0" class="sec">⌫</button></div>
        <button class="big" id="ok" ${full && !B.size ? '' : 'disabled'}>${full ? (B.size ? '겹치는 숫자가 있어요' : '제출') : '빈칸을 모두 채우세요'}</button>`;
      u.stage.querySelectorAll('.sdk button').forEach((c) => { c.onclick = () => { const i = Number(c.dataset.i); if (!g[i]) { sel = i; draw(); } }; });
      u.stage.querySelectorAll('[data-v]').forEach((c) => { c.onclick = () => { if (sel < 0 || g[sel]) return; cur[sel] = Number(c.dataset.v); if (cur[sel]) { const nx = cur.findIndex((x, j) => j > sel && !x); if (nx >= 0) sel = nx; } draw(); }; });
      document.getElementById('ok').onclick = () => u.submit(cur.join(''));
    };
    draw();
  },

  /* 노노그램 */
  nono(u) {
    const q = u.q, n = q.n, st = Array(n * n).fill(0); // 0 빈칸 1 칠함 2 X표
    const mx = Math.max(...q.cols.map((c) => c.length));
    const draw = () => {
      const bits = st.map((x) => (x === 1 ? 1 : 0)), c = nonoClues(bits, n);
      const rOk = q.rows.map((r, i) => JSON.stringify(r) === JSON.stringify(c.rows[i])), cOk = q.cols.map((r, i) => JSON.stringify(r) === JSON.stringify(c.cols[i]));
      const done = rOk.every(Boolean) && cOk.every(Boolean);
      const sz = n >= 7 ? 34 : 44;
      let h = `<div class="nono${u.cls}" style="grid-template-columns:auto repeat(${n},${sz}px)"><span></span>`;
      for (let j = 0; j < n; j++) h += `<span class="cc ${cOk[j] ? 'ok' : ''}">${Array(mx - q.cols[j].length).fill('').concat(q.cols[j]).map((x) => `<i>${x === '' ? '&nbsp;' : x}</i>`).join('')}</span>`;
      for (let i = 0; i < n; i++) {
        h += `<span class="rc ${rOk[i] ? 'ok' : ''}">${q.rows[i].join(' ')}</span>`;
        for (let j = 0; j < n; j++) { const k = i * n + j; h += `<button class="nc s${st[k]}" data-i="${k}" style="height:${sz}px">${st[k] === 2 ? '✕' : ''}</button>`; }
      }
      h += '</div>';
      u.stage.innerHTML = u.qbox(`${n}×${n} 노노그램`, '숫자 = 연속으로 칠한 칸의 길이 (순서대로) · 탭: 칠함 → ✕ → 빈칸') + h +
        `<div class="row"><button class="sec grow" id="rs">↺ 지우기</button></div><button class="big" id="ok">${done ? '제출 (단서 모두 일치!)' : '제출'}</button>`;
      u.stage.querySelectorAll('.nc').forEach((b) => { b.onclick = () => { const k = Number(b.dataset.i); st[k] = (st[k] + 1) % 3; draw(); }; });
      document.getElementById('rs').onclick = () => { st.fill(0); draw(); };
      document.getElementById('ok').onclick = () => u.submit(bits.join(''));
    };
    draw();
  },

  /* 성냥개비 */
  match(u) {
    const q = u.q; let typed = '';
    u.stage.innerHTML = u.qbox('성냥개비 하나만 옮겨 참인 식을 만들어라', '‘=’는 그대로 · 숫자는 숫자로, 부호는 + 또는 − 로') +
      `<div class="mtc${u.cls}">${matchSVG(q.eq)}</div>
      <div class="expr" id="ty"></div>
      <div class="ops" style="grid-template-columns:repeat(7,1fr)">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '−', '=', '⌫'].map((k) => `<button data-k="${k}">${k}</button>`).join('')}</div>
      <div class="row"><button class="sec grow" id="cp">원래 식 불러오기</button></div>
      <button class="big" id="ok">제출</button>`;
    const show = () => { document.getElementById('ty').innerHTML = typed ? esc(typed) : '<span class="dim">고친 식을 입력</span>'; };
    u.stage.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => { const k = b.dataset.k; if (k === '⌫') typed = typed.slice(0, -1); else if (typed.length < 12) typed += k; show(); }; });
    document.getElementById('cp').onclick = () => { typed = q.eq.replace(/-/g, '−'); show(); };
    document.getElementById('ok').onclick = () => { const v = typed.replace(/−/g, '-'); if (!/^\d+[+-]\d+=\d+$/.test(v)) return toast('“숫자 부호 숫자 = 숫자” 꼴로 입력하세요'); u.submit(v); };
    show();
  },

  /* 기사와 건달 */
  knights(u) {
    const q = u.q, st = q.names.map(() => null);
    const draw = () => {
      u.stage.innerHTML = u.qbox('누가 기사이고 누가 건달일까?', '😇 기사: 항상 참 · 😈 건달: 항상 거짓') + linesHTML(q.lines, u.cls) +
        `<div class="opts" style="grid-template-columns:1fr 1fr">${q.names.map((n, i) => `<button class="opt kn" data-i="${i}" style="text-align:center">${esc(n)}<br><span style="font-size:26px">${st[i] === null ? '❔' : st[i] ? '😇' : '😈'}</span></button>`).join('')}</div>
        <button class="big" id="ok" ${st.includes(null) ? 'disabled' : ''}>${st.includes(null) ? '모두 정하면 제출 (눌러서 바꾸기)' : '제출'}</button>`;
      u.stage.querySelectorAll('.kn').forEach((b) => { b.onclick = () => { const i = Number(b.dataset.i); st[i] = st[i] === null ? true : !st[i]; draw(); }; });
      document.getElementById('ok').onclick = () => u.submit(st.reduce((m, x, i) => m | (x ? 1 << i : 0), 0));
    };
    draw();
  },

  /* 가짜 동전 */
  coin(u) {
    const q = u.q; let c = null, h = q.hl ? null : 0;
    const draw = () => {
      u.stage.innerHTML = u.qbox(`동전 ${q.N}개 중 가짜 하나는?`, q.hl ? '가짜는 진짜보다 무겁거나 가볍다 (어느 쪽인지 모름)' : '가짜는 진짜보다 무겁다') + linesHTML(q.lines, u.cls) +
        `<div class="nums" style="grid-template-columns:repeat(${q.N > 9 ? 6 : q.N > 8 ? 5 : 4},1fr)">${[...Array(q.N).keys()].map((i) => `<button data-c="${i}" class="${c === i ? 'csel' : ''}" style="font-size:24px">${circ(i)}</button>`).join('')}</div>
        ${q.hl ? `<div class="two" style="gap:8px"><button data-h="0" class="${h === 0 ? 'sel' : ''}" style="padding:16px 0;font-size:18px">⬆️ 무겁다</button><button data-h="1" class="${h === 1 ? 'sel' : ''}" style="padding:16px 0;font-size:18px">⬇️ 가볍다</button></div>` : ''}
        <button class="big" id="ok" ${c !== null && h !== null ? '' : 'disabled'}>제출</button>`;
      u.stage.querySelectorAll('[data-c]').forEach((b) => { b.onclick = () => { c = Number(b.dataset.c); draw(); }; });
      u.stage.querySelectorAll('[data-h]').forEach((b) => { b.onclick = () => { h = Number(b.dataset.h); draw(); }; });
      document.getElementById('ok').onclick = () => u.submit(c * 2 + h);
    };
    draw();
  },

  /* 연산자 넣기 */
  ops(u) {
    const q = u.q, sl = q.nums.slice(1).map(() => null), SHOW = { '+': '+', '-': '−', '*': '×', '/': '÷' };
    const draw = () => {
      let live = '';
      if (!sl.includes(null)) { try { const v = Expr.evaluate(opsExpr(q.nums, sl)).value; live = `= ${v.d === 1 ? v.n : v.n + '/' + v.d}`; } catch (e) { live = '계산 불가'; } }
      const ok = !sl.includes(null) && live === `= ${q.target}`;
      u.stage.innerHTML = u.qbox('빈칸을 눌러 연산자를 바꿔라', `${q.ops.map((o) => SHOW[o]).join(' ')} 사용 · 곱셈·나눗셈 먼저`) +
        `<div class="opsrow${u.cls}">${q.nums.map((n, i) => `<b>${n}</b>${i < sl.length ? `<button data-s="${i}" class="${sl[i] ? 'f' : ''}">${sl[i] ? SHOW[sl[i]] : '?'}</button>` : ''}`).join('')}<b>=</b><b class="tg">${q.target}</b></div>
        <div class="center ${ok ? 'pos' : 'dim'}" style="font-weight:800;min-height:22px">${esc(live)}</div>
        <button class="big" id="ok" ${ok ? '' : 'disabled'}>${ok ? '제출 (정답!)' : '등식이 맞으면 제출할 수 있어요'}</button>`;
      u.stage.querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => { const i = Number(b.dataset.s); sl[i] = q.ops[(q.ops.indexOf(sl[i]) + 1) % q.ops.length]; draw(); }; });
      document.getElementById('ok').onclick = () => u.submit(sl.join(''));
    };
    draw();
  },

  /* 순서 기억 */
  simon(u) {
    const q = u.q, n = q.n, seq = q.seq, t0 = 600, picks = [];
    const showEnd = t0 + seq.length * q.stepMs;
    const grid = (lit, dis) => `<div class="grid4 simon" style="grid-template-columns:repeat(${n},1fr)">${[...Array(n * n).keys()].map((i) => `<button class="cell ${i === lit ? 'lit' : ''}" data-i="${i}" ${dis ? 'disabled' : ''}></button>`).join('')}</div>`;
    const ask = () => {
      u.stage.innerHTML = `<div class="q"><small>순서 기억 · ${seq.length}단계</small>본 순서대로 누르세요 <span class="dim">(${picks.length}/${seq.length})</span></div>${grid(-1, false)}<button class="sec" id="rs">↺ 다시 입력</button>`;
      u.stage.querySelectorAll('.cell').forEach((c) => { c.onclick = () => { picks.push(Number(c.dataset.i)); c.classList.add('pick'); if (picks.length >= seq.length) u.submit(picks.slice()); else setTimeout(() => { if (alive(u.stage)) ask(); }, 120); }; });
      document.getElementById('rs').onclick = () => { picks.length = 0; ask(); };
    };
    const tick = () => {
      if (!alive(u.stage)) return;
      const e = performance.now() - playT0;
      if (e >= showEnd) return ask();
      const k = Math.floor((e - t0) / q.stepMs), within = (e - t0) % q.stepMs < q.stepMs * 0.72;
      u.stage.innerHTML = `<div class="q"><small>순서 기억 · ${seq.length}단계</small>${e < t0 ? '잘 보세요…' : `${k + 1}번째`}</div>${grid(e >= t0 && within ? seq[k] : -1, true)}`;
      setTimeout(tick, 60);
    };
    tick();
  },

  /* 순간 포착 */
  count(u) {
    const q = u.q, left = q.showMs - (performance.now() - playT0);
    const ask = () => {
      u.stage.innerHTML = u.qbox(`<span style="font-size:46px">${q.target}</span><br>몇 개였을까?`, '순간 포착') + u.numInput('개수');
      u.bindInput((v) => (/^\d+$/.test(v) ? Number(v) : (toast('숫자를 입력하세요'), undefined)));
      document.getElementById('in').focus();
    };
    if (left <= 0) return ask();
    u.stage.innerHTML = `<div class="q"><small>순간 포착</small>${q.pre ? `<span style="font-size:30px">${q.target}</span> 의 개수를 세세요!` : '잘 보세요! 무엇을 물을지는 비밀'}</div>
      <div class="cgrid${u.cls}" style="grid-template-columns:repeat(${q.cols},1fr)">${q.cells.map((x) => `<span>${x}</span>`).join('')}</div>`;
    setTimeout(() => { if (alive(u.stage)) ask(); }, left);
  },

  /* 틀린 하나 */
  odd(u) {
    const q = u.q;
    u.stage.innerHTML = u.qbox('하나만 다르다. 찾아서 누르세요!', '한 번만 누를 수 있어요') +
      `<div class="oddg${u.cls}" style="grid-template-columns:repeat(${q.cols},1fr)">${q.cells.map((x, i) => `<button data-i="${i}">${esc(x)}</button>`).join('')}</div>`;
    u.stage.querySelectorAll('.oddg button').forEach((b) => { b.onclick = () => u.submit(Number(b.dataset.i)); });
  },

  /* 순서대로 터치 */
  schulte(u) {
    const q = u.q, N = q.n * q.n; let next = 1, miss = 0;
    u.stage.innerHTML = `<div class="q"><small>순서대로 터치</small>다음: <b id="nx" style="color:var(--yel)">1</b> <span class="dim small" id="ms"></span></div>
      <div class="oddg schulte${u.cls}" style="grid-template-columns:repeat(${q.n},1fr)">${q.cells.map((x) => `<button data-v="${x}">${x}</button>`).join('')}</div>`;
    u.stage.querySelectorAll('.schulte button').forEach((b) => {
      b.onclick = () => {
        if (Number(b.dataset.v) === next) { b.classList.add('done2'); b.disabled = true; next++; if (next > N) return u.submit(miss); document.getElementById('nx').textContent = next; }
        else { miss++; b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 250); document.getElementById('ms').textContent = `실수 ${miss}${miss > 3 ? ' (4번부터 실격)' : ''}`; }
      };
    });
  },

  /* ── 심리전 ── */
  beauty(u) {
    const q = u.q, [mn, md] = q.mul || [2, 3], max = q.max || 100, mid = Math.round(max / 2);
    u.stage.innerHTML = u.qbox(`모두의 평균 × <b style="color:var(--yel)">${mn}/${md}</b>에<br>가장 가까운 숫자는?`, `0 ~ ${max} · 이번 배율 ${mn}/${md}`) + `<div class="bignum" id="bn">${mid}</div><input class="slider" id="sl" type="range" min="0" max="${max}" value="${mid}"><button class="big" id="ok">이 숫자로 확정</button>`;
    const sl = document.getElementById('sl'); sl.oninput = () => { document.getElementById('bn').textContent = sl.value; };
    document.getElementById('ok').onclick = () => u.submit(Number(sl.value));
  },
  minority(u) {
    const q = u.q;
    u.stage.innerHTML = u.qbox('사람이 더 적은 쪽이 이깁니다', '소수결 · 동점이면 무승부') +
      `<div class="two"><button data-i="0" style="font-size:24px">${esc(q.A || 'A')}</button><button data-i="1" style="font-size:24px">${esc(q.B || 'B')}</button></div><button class="big" id="ok" disabled>확정</button>`;
    pickConfirm(u, '.two button');
  },
  split(u) {
    const q = u.q, C = q.coop || 60, POT = q.pot || 130, L = q.lose || 30;
    u.stage.innerHTML = u.qbox(`전원 협력: 모두 <span class="pos">+${C}</span><br>배신자 있음: 배신자끼리 <span class="pos">${POT}</span> 나눠 갖기, 협력자 <span class="neg">−${L}</span><br>전원 배신: 모두 <span class="neg">−${L}</span>`, '이번 판 보상') +
      '<div class="two"><button data-i="0">🤝<br><span style="font-size:18px">협력</span></button><button data-i="1">🗡️<br><span style="font-size:18px">배신</span></button></div><button class="big" id="ok" disabled>확정</button>';
    pickConfirm(u, '.two button');
  },
  lowest(u) {
    const max = u.q.max || 10;
    u.stage.innerHTML = u.qbox('나만 고른 수 중 가장 작으면 승리', `1 ~ ${max}`) + `<div class="nums" style="grid-template-columns:repeat(5,1fr)">${[...Array(max)].map((_, i) => `<button data-i="${i + 1}">${i + 1}</button>`).join('')}</div><button class="big" id="ok" disabled>확정</button>`;
    let sel = null;
    u.stage.querySelectorAll('.nums button').forEach((b) => { b.onclick = () => { sel = Number(b.dataset.i); u.stage.querySelectorAll('.nums button').forEach((x) => x.classList.toggle('used', x !== b)); document.getElementById('ok').disabled = false; }; });
    document.getElementById('ok').onclick = () => { if (sel !== null) u.submit(sel); };
  },
  indian(u) {
    const q = u.q, others = S.players.filter((p) => p.pid !== S.me && q.cards[p.pid]);
    u.stage.innerHTML = u.qbox('내 카드만 안 보인다!', '카드 1~10 · 승부한 사람 중 가장 높은 카드가 승리') +
      `<div class="icards${u.cls}"><div class="ic me"><b>❓</b><span>나</span></div>${others.map((p) => `<div class="ic"><b>${q.cards[p.pid]}</b><span style="color:${p.color}">${esc(p.name)}</span></div>`).join('')}</div>
      <div class="small dim center" style="line-height:1.5">승부 승자 +30 + 패자 1명당 30 + 포기자 1명당 10<br>승부 패배 −30 · 포기 −10 (단, 최고 카드를 들고 포기하면 −30)</div>
      <div class="two"><button data-i="0">⚔️<br><span style="font-size:18px">승부</span></button><button data-i="1">🏳️<br><span style="font-size:18px">포기</span></button></div><button class="big" id="ok" disabled>확정</button>`;
    pickConfirm(u, '.two button');
  },
  goods(u) {
    const q = u.q;
    u.stage.innerHTML = u.qbox(`내 돈 <b style="color:var(--yel)">${q.C}코인</b>. 공동 금고에 얼마를 낼까?`, `금고의 돈은 ×${q.m} 불어나 참가자 모두에게 똑같이 나뉜다`) +
      `<div class="bignum" id="bn">0</div><input class="slider" id="sl" type="range" min="0" max="${q.C}" value="0">
      <div class="small dim center" id="hint"></div><button class="big" id="ok">이만큼 낸다</button>`;
    const n = Math.max(2, S.players.filter((p) => p.connected).length);
    const sl = document.getElementById('sl'), upd = () => { const x = Number(sl.value); document.getElementById('bn').textContent = x; document.getElementById('hint').textContent = `모두가 ${x}씩 내면 각자 ${(q.C - x + x * q.m).toFixed(1)}코인 · 나만 ${x} 내고 남은 안 내면 ${(q.C - x + (x * q.m) / n).toFixed(1)}코인`; };
    sl.oninput = upd; upd();
    document.getElementById('ok').onclick = () => u.submit(Number(sl.value));
  },
  auction(u) {
    const q = u.q, mine = q.hints[S.me];
    u.stage.innerHTML = u.qbox(`상품 가치 = 숨은 숫자 ${q.K}개의 합`, '숫자 하나는 1~30 · 최고가 1명이 낙찰 (동점이면 유찰)') +
      `<div class="card center"><div class="dim small">내가 아는 숫자</div><div class="bignum" style="font-size:56px">${mine == null ? '?' : mine}</div><div class="dim small">나머지 ${q.K - 1}개는 모른다 (평균 15.5)</div></div>
      <div class="small dim center">낙찰자 점수 = 가치 − 입찰가 (마이너스가 될 수도!) · 나머지 0점</div>` + u.numInput(`입찰가 (0~${q.max})`);
    u.bindInput((v) => { const n = Number(v); return Number.isInteger(n) && n >= 0 && n <= q.max ? n : (toast(`0~${q.max} 정수`), undefined); });
  },
  rps(u) {
    u.stage.innerHTML = u.qbox('단체 가위바위보!', '두 가지만 나오면 승부 · 한 가지나 세 가지 다 나오면 무승부') +
      `<div class="three">${['✊', '✌️', '🖐️'].map((x, i) => `<button data-i="${i}">${x}</button>`).join('')}</div><button class="big" id="ok" disabled>확정</button>`;
    pickConfirm(u, '.three button');
  },
};

/* 성냥개비 SVG */
function matchSVG(eq) {
  const W = 46, H = 78, stick = (x1, y1, x2, y2, on) => (on ? `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f2c27b" stroke-width="6" stroke-linecap="round"/><circle cx="${x1}" cy="${y1}" r="4.6" fill="#e5383b"/>` : `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2b3166" stroke-width="3" stroke-dasharray="3 4" stroke-linecap="round"/>`);
  const SEGXY = [[9, 6, 35, 6], [38, 10, 38, 35], [38, 43, 38, 68], [9, 72, 35, 72], [6, 43, 6, 68], [6, 10, 6, 35], [9, 39, 35, 39]];
  let x = 0, out = '';
  for (const ch of eq) {
    out += `<g transform="translate(${x},0)">`;
    if (ch >= '0' && ch <= '9') { const m = SEG[+ch]; SEGXY.forEach((s, i) => { out += stick(...s, !!(m & (1 << i))); }); }
    else if (ch === '+' || ch === '-') { out += stick(8, 39, 36, 39, true); out += ch === '+' ? stick(22, 25, 22, 53, true) : ''; }
    else if (ch === '=') { out += stick(8, 31, 36, 31, true) + stick(8, 47, 36, 47, true); }
    out += '</g>'; x += W + 6;
  }
  return `<svg viewBox="-4 0 ${x} ${H}" style="width:100%;max-height:110px">${out}</svg>`;
}
