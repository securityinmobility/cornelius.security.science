/* Phinder online rooms. Plain Node.js, no dependencies.
 *
 * Privacy: everything lives in memory only. No database, no files, no logs,
 * no IP addresses, no names. Players are just random IDs that disappear
 * when a room is closed or idle.
 *
 * API (all JSON, behind nginx at /api/):
 *   POST /api/rooms             {all?}   -> { code, key }          create a room (key = host secret); all = play every card
 *   GET  /api/rooms/CODE                 -> { ok }                 does the room exist?
 *   POST /api/rooms/CODE/join            -> { pid }                join as player
 *   POST /api/rooms/CODE/answer {pid, phish}                       vote
 *   POST /api/rooms/CODE/host   {key, action}                      start | reveal | next | restart | close
 *   GET  /api/rooms/CODE/events?key=... or ?pid=...                    live state (Server-Sent Events)
 */
'use strict';
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const { CARDS } = require(process.env.CARDS_PATH || path.join(__dirname, '../html/phinder/cards.js'));
const PORT = +process.env.PORT || 3000;

const ROUND = { phish: 6, legit: 4 };     // cards in a short game (or all cards)
const MAX_ROOMS = 60;
const MAX_PLAYERS = 150;
const IDLE_MS = 2 * 60 * 60 * 1000;       // room deleted after 2 h without activity
const EMPTY_LOBBY_MS = 15 * 60 * 1000;    // ... or 15 min if the host left the lobby
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I / O

const rooms = new Map();

/* helpers */
const rnd = (n) => crypto.randomBytes(n).toString('hex');
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function newDeck(all) {
  const idx = CARDS.map((c, i) => i);
  if (all) return shuffle(idx);
  const ph = shuffle(idx.filter((i) => CARDS[i].phish)).slice(0, ROUND.phish);
  const lg = shuffle(idx.filter((i) => !CARDS[i].phish)).slice(0, ROUND.legit);
  return shuffle(ph.concat(lg));
}
function newCode() {
  for (let t = 0; t < 50; t++) {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
  return null;
}
function safeEq(a, b) {
  a = Buffer.from(String(a)); b = Buffer.from(String(b));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* game state */
function rankOf(room, score) {
  let better = 0;
  for (const p of room.players.values()) if (p.score > score) better++;
  return better + 1;
}
function stats(room) {
  const scores = [...room.players.values()].map((p) => p.score);
  const n = scores.length;
  return { players: n, best: n ? Math.max(...scores) : 0, avg: n ? Math.round(scores.reduce((a, b) => a + b, 0) / n * 10) / 10 : 0,
    perfect: scores.filter((x) => x === room.deck.length).length };
}

function hostView(room) {
  const v = { role: 'host', code: room.code, phase: room.phase, i: room.i, total: room.deck.length,
    card: room.phase === 'question' || room.phase === 'reveal' ? room.deck[room.i] : null,
    players: room.players.size, answered: 0, votes: null, stats: room.phase === 'end' ? stats(room) : null };
  for (const p of room.players.values()) if (p.answer !== null) v.answered++;
  if (room.phase === 'reveal') {
    v.votes = { phish: 0, legit: 0 };
    for (const p of room.players.values()) if (p.answer !== null) v.votes[p.answer ? 'phish' : 'legit']++;
  }
  return v;
}

function playerView(room, pid) {
  const p = room.players.get(pid);
  if (!p) return { role: 'player', phase: 'gone' };
  const v = { role: 'player', code: room.code, phase: room.phase, i: room.i, total: room.deck.length,
    card: room.phase === 'question' || room.phase === 'reveal' ? room.deck[room.i] : null,
    answer: p.answer, score: p.score, rank: rankOf(room, p.score), count: room.players.size };
  if (room.phase === 'reveal') v.right = p.answer !== null && p.answer === CARDS[room.deck[room.i]].phish;
  return v;
}

function send(client, data) {
  try { client.res.write('data: ' + JSON.stringify(data) + '\n\n'); } catch (e) { /* closed */ }
}
function broadcast(room) {
  room.touched = Date.now();
  for (const c of room.clients) send(c, c.role === 'host' ? hostView(room) : playerView(room, c.pid));
}
function closeRoom(room) {
  for (const c of room.clients) { send(c, { phase: 'closed' }); try { c.res.end(); } catch (e) {} }
  rooms.delete(room.code);
}

/* http */
function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve) => {
    let size = 0, chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 2048) { req.destroy(); resolve(null); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const parts = url.pathname.split('/').filter(Boolean); // ['api','rooms',CODE,action]
  if (parts[0] !== 'api' || parts[1] !== 'rooms') return serveStatic(req, res, url);

  if (parts.length === 2 && req.method === 'POST') {
    const body = await readBody(req);
    const all = !!(body && body.all === true);
    if (rooms.size >= MAX_ROOMS) return json(res, 503, { error: 'Too many rooms right now. Try again later.' });
    const code = newCode();
    if (!code) return json(res, 503, { error: 'Try again.' });
    const room = { code, key: rnd(16), all, phase: 'lobby', deck: newDeck(all), i: 0, players: new Map(), clients: new Set(), touched: Date.now() };
    rooms.set(code, room);
    return json(res, 200, { code, key: room.key });
  }

  const room = rooms.get(String(parts[2] || '').toUpperCase());
  if (!room) return json(res, 404, { error: 'Room not found.' });
  const action = parts[3];

  if (!action && req.method === 'GET') return json(res, 200, { ok: true });

  if (action === 'events' && req.method === 'GET') {
    const key = url.searchParams.get('key'), pid = url.searchParams.get('pid');
    let client;
    if (key && safeEq(key, room.key)) client = { role: 'host' };
    else if (pid && room.players.has(pid)) client = { role: 'player', pid };
    else return json(res, 403, { error: 'Not in this room.' });
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no', 'Connection': 'keep-alive' });
    res.write('retry: 2000\n\n');
    client.res = res;
    room.clients.add(client);
    send(client, client.role === 'host' ? hostView(room) : playerView(room, pid));
    req.on('close', () => room.clients.delete(client));
    return;
  }

  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  const body = await readBody(req);
  if (!body || typeof body !== 'object') return json(res, 400, { error: 'Bad request.' });

  if (action === 'join') {
    if (room.players.size >= MAX_PLAYERS) return json(res, 403, { error: 'This room is full.' });
    if (room.phase === 'end') return json(res, 403, { error: 'This game is over.' });
    const pid = rnd(12);
    room.players.set(pid, { score: 0, answer: null });
    broadcast(room);
    return json(res, 200, { pid });
  }

  if (action === 'answer') {
    const p = room.players.get(String(body.pid));
    if (!p) return json(res, 403, { error: 'Not in this room.' });
    if (room.phase !== 'question') return json(res, 409, { error: 'Too late.' });
    if (p.answer !== null) return json(res, 409, { error: 'Already answered.' });
    p.answer = body.phish === true;
    broadcast(room);
    return json(res, 200, { ok: true });
  }

  if (action === 'host') {
    if (!safeEq(body.key, room.key)) return json(res, 403, { error: 'Only the host can do this.' });
    switch (body.action) {
      case 'start':
        if (room.phase !== 'lobby') break;
        room.phase = 'question'; room.i = 0;
        break;
      case 'reveal':
        if (room.phase !== 'question') break;
        room.phase = 'reveal';
        const card = CARDS[room.deck[room.i]];
        for (const p of room.players.values()) if (p.answer === card.phish) p.score++;
        break;
      case 'next':
        if (room.phase !== 'reveal') break;
        for (const p of room.players.values()) p.answer = null;
        if (room.i + 1 < room.deck.length) { room.i++; room.phase = 'question'; } else room.phase = 'end';
        break;
      case 'restart':
        room.phase = 'lobby'; room.i = 0; room.deck = newDeck(room.all);
        for (const p of room.players.values()) { p.score = 0; p.answer = null; }
        break;
      case 'close':
        closeRoom(room);
        return json(res, 200, { ok: true });
      default:
        return json(res, 400, { error: 'Unknown action.' });
    }
    broadcast(room);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'Not found.' });
}

/* Local testing only: STATIC_DIR=../html node server.js serves the site too.
   In production nginx serves the files and only forwards /api/. */
const STATIC_DIR = process.env.STATIC_DIR ? path.resolve(process.env.STATIC_DIR) : null;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
function serveStatic(req, res, url) {
  if (!STATIC_DIR) return json(res, 404, { error: 'Not found.' });
  let file = path.join(STATIC_DIR, decodeURIComponent(url.pathname));
  if (!file.startsWith(STATIC_DIR)) return json(res, 403, { error: 'No.' });
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) return json(res, 404, { error: 'Not found.' });
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

/* keep connections alive through proxies; drop idle rooms */
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    const hostHere = [...room.clients].some((c) => c.role === 'host');
    if (now - room.touched > IDLE_MS || (!hostHere && room.phase === 'lobby' && now - room.touched > EMPTY_LOBBY_MS)) closeRoom(room);
    else for (const c of room.clients) { try { c.res.write(': ping\n\n'); } catch (e) {} }
  }
}, 20000).unref();

http.createServer((req, res) => {
  handle(req, res).catch(() => { try { json(res, 500, { error: 'Server error.' }); } catch (e) {} });
}).listen(PORT, () => {});
