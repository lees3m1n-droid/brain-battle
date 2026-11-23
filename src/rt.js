/* ═════════════ 연결 계층 ═════════════
   claude.ai 안에서는 room capability를, 그 밖에서는 같은 주소의 중계 서버(/rt)를 쓴다.
   둘 다 없으면 null → 혼자 연습만 가능. */
async function getRoomCapability() {
  try { if (window.claude && window.claude.use) { const r = await window.claude.use('room'); if (r) return r; } } catch (e) { /* */ }
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 3000);
    const r = await fetch('rt/ping', { signal: ctl.signal, cache: 'no-store' }); clearTimeout(t);
    if (r.ok && (await r.json()).pb === 1) return makeRelayRoom('lobby');
  } catch (e) { /* */ }
  return null;
}

function makeRelayRoom(name) {
  const me = Math.random().toString(36).slice(2, 12);
  let pres = {}, peers = [], subs = new Set(), errSubs = new Set(), es = null, dead = false, queue = null, sending = false;
  const view = () => Object.freeze(peers);
  const emitPeers = () => { const p = view(); subs.forEach((f) => { try { f({ peers: p, joined: [], left: [], updated: [] }); } catch (e) { console.error(e); } }); };
  const build = (list) => list.map((x) => ({ peer: x.id, isMe: x.id === me, sameTab: x.id === me, kind: 'viewer', by: null, guest: false, presence: Object.freeze(x.p), updatedAt: Date.now() }));
  function connect() {
    es = new EventSource(`rt/events?room=${encodeURIComponent(name)}&peer=${me}`);
    es.onmessage = (e) => { try { peers = build(JSON.parse(e.data)); emitPeers(); } catch (x) { /* */ } };
    es.onopen = () => { if (Object.keys(pres).length) push(); };
  }
  async function push() {
    queue = JSON.stringify(pres);
    if (sending || !es || es.readyState !== 1) return; // 연결 전이면 onopen에서 다시 보낸다
    sending = true;
    try {
      while (queue !== null && !dead) {
        const body = queue; queue = null;
        await fetch('rt/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: name, peer: me, p: JSON.parse(body) }), keepalive: false }).catch(() => { });
      }
    } finally { sending = false; }
  }
  const api = {
    name,
    async presence(patch) {
      const next = { ...pres };
      for (const k in patch) { if (patch[k] === null) delete next[k]; else next[k] = patch[k]; }
      if (new TextEncoder().encode(JSON.stringify(next)).length > 4096) { const e = new Error('presence too large'); e.code = 'invalid_argument'; throw e; }
      pres = next;
      peers = build([{ id: me, p: pres }, ...peers.filter((x) => !x.isMe).map((x) => ({ id: x.peer, p: x.presence }))]);
      emitPeers(); push();
    },
    peers: () => view(),
    onPeers(f, onErr) { subs.add(f); if (onErr) errSubs.add(onErr); setTimeout(() => f({ peers: view(), joined: view(), left: [], updated: [] }), 0); return () => { subs.delete(f); if (onErr) errSubs.delete(onErr); }; },
    connected: () => !!es && es.readyState === 1,
    onConnection(f) { setTimeout(() => f(api.connected())); return () => { }; },
    async leave() { dead = true; if (es) es.close(); subs.clear(); try { navigator.sendBeacon('rt/leave', JSON.stringify({ room: name, peer: me })); } catch (e) { /* */ } },
    async join(n) { return makeRelayRoom(n); },
    emit: async () => { }, on: () => () => { },
  };
  connect();
  return api;
}
