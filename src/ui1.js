/* ═════════════ 차례 게임 화면 (각자 자기 문제) ═════════════ */
// stage 에 문제를 그리고, 답이 정해지면 submit(값)을 부른다
function renderTurn(stage, T, q, fx) {
  const cls = (fx.includes('fog') ? ' fog' : '') + (fx.includes('mirror') ? ' mirror' : '');
  const submit = (v) => { if (locked) return; turnSubmit(v); };
  const qbox = (inner, small) => `<div class="q${cls}">${small ? `<small>${esc(small)}</small>` : ''}${inner}</div>`;
  const numInput = (ph, mode) => `<input id="in" type="text" inputmode="${mode || 'numeric'}" placeholder="${esc(ph)}" style="text-align:center;font-weight:800;font-size:22px" autocomplete="off"><button class="big" id="ok">제출</button>`;
  const bindInput = (check) => {
    const go = () => { const v = document.getElementById('in').value.trim(); const res = check(v); if (res === undefined) return; submit(res); };
    document.getElementById('ok').onclick = go;
    document.getElementById('in').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  };
  const choice = (sel) => stage.querySelectorAll(sel).forEach((b) => { b.onclick = () => { b.classList.add('sel'); submit(Number(b.dataset.i)); }; });
  if (T === 'trivia') {
    stage.innerHTML = qbox(esc(q.text), q.cat) + `<div class="opts">${q.options.map((o, i) => `<button class="opt" data-i="${i}">${['①', '②', '③', '④'][i]}&nbsp; ${esc(o)}</button>`).join('')}</div>`;
    choice('.opt');
  } else if (T === 'liar') {
    stage.innerHTML = qbox(`${esc(q.crime || '범인')}${q.crime && /[가-힣]/.test(q.crime) && hasB(q.crime) ? '은' : '는'} 누구일까?`, `${q.names.length}명 중 정확히 ${q.T}명만 진실을 말한다 · ${q.crime || '범인'}은 1명`) +
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
    const L = q.L || 3;
    stage.innerHTML = qbox(`${L === 4 ? '네' : '세'} 자리 비밀번호는?`, '0~9 서로 다른 숫자 · S=숫자·자리 일치, B=숫자만 일치') +
      `<div class="col${cls}">${q.clues.map((c) => `<div class="card row" style="padding:10px 14px"><b style="font-size:24px;letter-spacing:6px" class="grow">${c.g}</b><b>${c.s || c.b ? `${c.s ? `<span class="pos">${c.s}S</span> ` : ''}${c.b ? `<span style="color:var(--yel)">${c.b}B</span>` : ''}` : '<span class="neg">OUT</span>'}</b></div>`).join('')}</div>` + numInput(L === 4 ? '예: 4829' : '예: 482');
    bindInput((v) => (new RegExp(`^\\d{${L}}$`).test(v) && new Set(v).size === L ? v : (toast(`서로 다른 숫자 ${L}자리를 입력하세요`), undefined)));
  } else if (T === 'timeline') timelineUI(stage, q, cls, submit);
  else if (T === 'calc24') calcUI(stage, q, cls, submit);
  else if (T === 'memory') memoryUI(stage, q, submit);
  else if (T === 'digits') digitsUI(stage, q, cls, submit);
  else if (T === 'mental') mentalUI(stage, q, cls, submit);
  else if (T === 'stroop') stroopUI(stage, q, cls, submit);
  else if (UI2[T] || q.ui) (q.ui ? UI2.generic : UI2[T])({ stage, q, cls, submit, qbox, numInput, bindInput, choice, T });
  if (fx.includes('fog')) setTimeout(() => stage.querySelectorAll('.fog').forEach((e) => e.classList.add('clear')), 5000);
}

function timelineUI(stage, q, cls, submit) {
  const order = [];
  const draw = () => {
    stage.innerHTML = `<div class="q${cls}"><small>오래된 것부터 차례로 누르세요</small>역사 줄 세우기</div>
      <div class="opts">${q.items.map((it, i) => { const n = order.indexOf(i); return `<button class="opt ${n >= 0 ? 'sel' : ''}" data-i="${i}"><b style="color:var(--yel);display:inline-block;width:28px">${n >= 0 ? n + 1 : '·'}</b>${esc(it)}</button>`; }).join('')}</div>
      <div class="row"><button class="sec grow" id="bk">⌫ 되돌리기</button><button class="big grow" id="ok" ${order.length === q.items.length ? '' : 'disabled'}>제출</button></div>`;
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
      <div class="grid4" style="grid-template-columns:repeat(${q.n || 4},1fr)">${[...Array((q.n || 4) ** 2).keys()].map((i) => `<button class="cell ${showing && q.cells.includes(i) ? 'lit' : ''} ${!showing && picks.has(i) ? 'pick' : ''}" data-i="${i}" ${showing ? 'disabled' : ''}></button>`).join('')}</div>
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

