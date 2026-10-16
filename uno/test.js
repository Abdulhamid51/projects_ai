// Bot'lar bilan to'liq o'yin simulyatsiyasi
process.env.DATA_FILE = require('os').tmpdir() + '/uno-test-' + Date.now() + '.json';
const WebSocket = require('ws'), { server } = require('./server');
server.listen(0, async () => {
  const port = server.address().port;
  const mk = async i => {
    const q = (p, b) => fetch(`http://localhost:${port}/api/${p}`, { method: 'POST', body: JSON.stringify(b) }).then(async r => [r.status, await r.json()]);
    const cred = { username: 'bot' + i, password: 'secret' + i };
    let [s, d] = await q('register', cred); if (s !== 200) throw s;
    if ((await q('register', cred))[0] !== 409) throw 'dup'; if ((await q('login', { ...cred, password: 'wrongpw' }))[0] !== 401) throw 'badpw';
    [s, d] = await q('login', cred); if (s !== 200) throw s;
    return new Promise(r => { const w = new WebSocket(`ws://localhost:${port}/ws`); w.on('open', () => { w.send(JSON.stringify({ t: 'auth', token: d.token })); r(w); }); });
  };
  const N = 4, ws = await Promise.all(Array.from({ length: N }, (_, i) => mk(i))), st = new Array(N);
  let code, moves = 0, done = false;
  const ok = (s, c) => !c.c || c.c === s.color || c.v === s.top.v;
  ws.forEach((w, i) => w.on('message', d => {
    const m = JSON.parse(d); if (m.t === 'err') { console.error('ERR', m.msg); process.exit(1); }
    if (m.t === 'joined') { code = m.code; if (i === 0) for (let k = 1; k < N; k++) ws[k].send(JSON.stringify({ t: 'join', code, })); }
    if (m.t !== 'state') return; st[i] = m;
    if (m.state === 'lobby' && i === 0 && m.players.length === N) w.send(JSON.stringify({ t: 'start' }));
    if (m.state === 'over' && !done) { done = true; console.log('OK: g\'olib', m.winner, 'yurishlar:', moves); process.exit(0); }
    if (m.state === 'play' && m.turn === m.you) {
      if (++moves > 5000) { console.error('too many moves'); process.exit(1); }
      const c = m.hand.find(c => c.ok);
      w.send(JSON.stringify(c ? { t: 'play', card: c.id, color: 'red' } : m.drawn ? { t: 'pass' } : { t: 'draw' }));
    }
  }));
  ws[0].send(JSON.stringify({ t: 'create' }));
  setTimeout(() => { console.error('timeout'); process.exit(1); }, 20000);
});
