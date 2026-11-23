'use strict';
// 두뇌 배틀 중계 서버 — 의존성 0. 정적 파일 + 방(room)별 presence 중계(SSE + POST).
// 게임 로직은 방장의 브라우저에서 돌고, 이 서버는 "누가 어떤 상태를 들고 있는지"만 나른다.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const rooms = new Map(); // name -> { peers: Map(id -> { p, res, t }), timer }
const NAME_RE = /^[a-z0-9][a-z0-9_.-]{0,47}$/;
const PEER_RE = /^[a-z0-9]{4,16}$/;
const MAX_ROOMS = 500, MAX_PEERS = 40, MAX_BODY = 8192;

function room(name) {
  let r = rooms.get(name);
  if (!r) { if (rooms.size >= MAX_ROOMS) return null; r = { peers: new Map(), timer: null }; rooms.set(name, r); }
  return r;
}
function flush(name) {
  const r = rooms.get(name); if (!r) return;
  r.timer = null;
  const data = JSON.stringify([...r.peers].map(([id, x]) => ({ id, p: x.p })));
  for (const x of r.peers.values()) if (x.res) { try { x.res.write(`data: ${data}\n\n`); } catch (e) { /* */ } }
}
function schedule(name) {
  const r = rooms.get(name); if (!r || r.timer) return;
  r.timer = setTimeout(() => flush(name), 40); // 짧게 모아서 전송
}
function drop(name, id) {
  const r = rooms.get(name); if (!r) return;
  r.peers.delete(id);
  if (!r.peers.size) { clearTimeout(r.timer); rooms.delete(name); } else schedule(name);
}
function body(req) {
  return new Promise((ok, no) => {
    let d = ''; req.on('data', (c) => { d += c; if (d.length > MAX_BODY) { no(new Error('big')); req.destroy(); } });
    req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch (e) { no(e); } });
    req.on('error', no);
  });
}
const send = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/rt/ping') return send(res, 200, { pb: 1, rooms: rooms.size });

    if (req.method === 'GET' && url.pathname === '/rt/events') {
      const name = url.searchParams.get('room') || '', id = url.searchParams.get('peer') || '';
      if (!NAME_RE.test(name) || !PEER_RE.test(id)) return send(res, 400, { error: 'bad' });
      const r = room(name);
      if (!r || (r.peers.size >= MAX_PEERS && !r.peers.has(id))) return send(res, 503, { error: 'full' });
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write('retry: 1500\n\n');
      const old = r.peers.get(id);
      if (old && old.res && old.res !== res) { try { old.res.end(); } catch (e) { /* */ } }
      r.peers.set(id, { p: old ? old.p : {}, res, t: Date.now() });
      const ka = setInterval(() => { try { res.write(': ka\n\n'); } catch (e) { /* */ } }, 15000);
      res.on('close', () => {
        clearInterval(ka);
        const cur = rooms.get(name)?.peers.get(id);
        if (cur && cur.res === res) setTimeout(() => { const c = rooms.get(name)?.peers.get(id); if (c && c.res === res) drop(name, id); }, 1500); // 짧은 끊김은 봐준다
      });
      flush(name);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/rt/presence') {
      const b = await body(req);
      if (!NAME_RE.test(b.room) || !PEER_RE.test(b.peer) || !b.p || typeof b.p !== 'object' || Array.isArray(b.p)) return send(res, 400, { error: 'bad' });
      if (Buffer.byteLength(JSON.stringify(b.p)) > 4096) return send(res, 413, { error: 'big' });
      const x = rooms.get(b.room)?.peers.get(b.peer);
      if (!x) return send(res, 404, { error: 'no peer' });
      x.p = b.p; schedule(b.room);
      return send(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/rt/leave') {
      const b = await body(req).catch(() => ({}));
      if (NAME_RE.test(b.room) && PEER_RE.test(b.peer)) { const x = rooms.get(b.room)?.peers.get(b.peer); if (x) { try { x.res && x.res.end(); } catch (e) { /* */ } drop(b.room, b.peer); } }
      return send(res, 200, { ok: true });
    }

    if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
    let rel = decodeURIComponent(url.pathname); if (rel === '/') rel = '/index.html';
    const file = path.normalize(path.join(PUBLIC, rel));
    if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  } catch (e) { send(res, 400, { error: 'bad request' }); }
});

if (require.main === module) server.listen(PORT, () => console.log(`두뇌 배틀 서버 :${PORT}`));
module.exports = { server, rooms };
