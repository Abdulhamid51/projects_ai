// Telegram: initData tekshiruvi, xona xabarlari, bot buyruqlari (tarmoqsiz — fetch soxtalashtirilgan)
const crypto = require('crypto'), assert = require('assert');
process.env.DATA_FILE = require('os').tmpdir() + '/uno-tg-' + Date.now() + '.json';
process.env.BOT_TOKEN = '123:TESTTOKEN'; process.env.BOT_USERNAME = 'unobot'; process.env.PUBLIC_URL = 'https://uno.test';
const calls = [], realFetch = global.fetch;
global.fetch = (u, o) => u.startsWith('https://api.telegram.org/') ? (calls.push({ m: u.split('/').pop(), p: JSON.parse(o.body) }), Promise.resolve({ json: async () => ({ ok: true, result: { message_id: 42 } }) })) : realFetch(u, o);
const { server, tgBot } = require('./server'), WebSocket = require('ws');

const initData = (user, token = process.env.BOT_TOKEN, age = 0) => {
  const p = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000) - age), query_id: 'q', user: JSON.stringify(user) });
  const dcs = [...p.entries()].map(([k, v]) => k + '=' + v).sort().join('\n');
  const key = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  p.set('hash', crypto.createHmac('sha256', key).update(dcs).digest('hex')); return p.toString();
};
server.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  const post = (path, b) => fetch(base + path, { method: 'POST', body: JSON.stringify(b) }).then(async r => [r.status, await r.json()]);
  const u = { id: 777, first_name: 'Ali<b>', last_name: 'Valiyev', username: 'ali' };

  assert.strictEqual((await post('/api/tg', { initData: initData(u, 'bad:token') }))[0], 401, 'noto\'g\'ri imzo');
  assert.strictEqual((await post('/api/tg', { initData: initData(u, undefined, 90000) }))[0], 401, 'eskirgan');
  const [s, d] = await post('/api/tg', { initData: initData(u) });
  assert.strictEqual(s, 200); assert.ok(!/[<>]/.test(d.name), 'ism tozalanadi'); console.log('login ok:', d.name);

  const ws = await new Promise(r => { const w = new WebSocket(`ws://localhost:${server.address().port}/ws`); w.on('open', () => r(w)); });
  const msgs = []; ws.on('message', x => msgs.push(JSON.parse(x)));
  ws.send(JSON.stringify({ t: 'auth', token: d.token }));
  const grp = '-1001234', sig = tgBot.groupSig(grp);
  ws.send(JSON.stringify({ t: 'create', group: grp, sig }));
  await new Promise(r => setTimeout(r, 300));
  const code = msgs.find(m => m.t === 'joined').code;
  assert.strictEqual(msgs.find(m => m.t === 'authed').bot, 'unobot');
  const sends = calls.filter(c => c.m === 'sendMessage');
  assert.strictEqual(sends.length, 2, 'ega + guruh');
  assert.strictEqual(sends[0].p.chat_id, '777'); assert.ok(sends[0].p.text.includes(code) && sends[0].p.text.includes(`t.me/unobot?start=r_${code}`));
  assert.strictEqual(sends[0].p.reply_markup.inline_keyboard[0][0].web_app.url, `https://uno.test/?room=${code}`);
  assert.strictEqual(sends[1].p.chat_id, grp); assert.strictEqual(sends[1].p.reply_markup.inline_keyboard[0][0].url, `https://t.me/unobot?start=r_${code}`);
  console.log('xona xabarlari ok');

  // soxta guruh imzosi — guruhga xabar ketmasligi kerak
  calls.length = 0; ws.send(JSON.stringify({ t: 'create', group: '-999', sig: 'x' })); await new Promise(r => setTimeout(r, 200));
  assert.strictEqual(calls.filter(c => c.m === 'sendMessage').length, 1, 'faqat egasiga');

  const code2 = msgs.filter(m => m.t === 'joined').pop().code;
  calls.length = 0;
  await tgBot.onUpdate({ message: { text: `/start r_${code2}`, chat: { id: 5, type: 'private' } } });
  assert.strictEqual(calls[0].p.reply_markup.inline_keyboard[0][0].web_app.url, `https://uno.test/?room=${code2}`);
  await tgBot.onUpdate({ message: { text: '/start r_ZZZZ', chat: { id: 5, type: 'private' } } });
  assert.ok(calls[1].p.text.includes('topilmadi'));
  await tgBot.onUpdate({ message: { text: '/uno@unobot', chat: { id: -1001234, type: 'supergroup' } } });
  assert.strictEqual(calls[2].p.reply_markup.inline_keyboard[0][0].url, 'https://t.me/unobot?start=gn1001234');
  await tgBot.onUpdate({ message: { text: '/start gn1001234', chat: { id: 5, type: 'private' } } });
  assert.strictEqual(calls[3].p.reply_markup.inline_keyboard[0][0].web_app.url, `https://uno.test/?group=-1001234&sig=${sig}`);
  await tgBot.onUpdate({ message: { text: '/uno@otherbot', chat: { id: -1, type: 'group' } } });
  assert.strictEqual(calls.length, 4, 'boshqa botga buyruq e\'tiborsiz');
  console.log('bot buyruqlari ok');

  // ---------- rejalashtirilgan xona ----------
  const open = async (user) => {
    const [, dd] = await post('/api/tg', { initData: initData(user) });
    const w = await new Promise(r => { const x = new WebSocket(`ws://localhost:${server.address().port}/ws`); x.on('open', () => r(x)); });
    const log = []; w.on('message', x => log.push(JSON.parse(x))); w.send(JSON.stringify({ t: 'auth', token: dd.token }));
    await new Promise(r => setTimeout(r, 150)); return { w, log, send: o => w.send(JSON.stringify(o)) };
  };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const host = await open(u), guest = await open({ id: 888, first_name: 'Guest' });
  calls.length = 0;
  host.send({ t: 'create', at: Date.now() + 1000, tz: 300, group: grp, sig }); await wait(150);
  assert.ok(host.log.some(m => m.t === 'err' && /Vaqt/.test(m.msg)), 'o\'tgan/yaqin vaqt rad etiladi');
  const at = Date.now() + 7000;
  host.send({ t: 'create', at, tz: 300, group: grp, sig }); await wait(250);
  const scode = host.log.filter(m => m.t === 'joined').pop().code;
  const gm = calls.find(c => c.m === 'sendMessage' && c.p.chat_id === grp);
  assert.ok(gm.p.text.includes('UTC+5') && gm.p.text.includes(scode) && gm.p.reply_markup.inline_keyboard[0][0].text.includes("Qo'shilib"), 'guruhga jadval xabari');
  console.log('jadval xabari guruhga:', gm.p.text.split('\n')[2]);

  guest.send({ t: 'join', code: scode }); await wait(150);
  guest.send({ t: 'detach' }); guest.send({ t: 'mine' }); await wait(150);
  const list = guest.log.filter(m => m.t === 'sched').pop().list;
  assert.strictEqual(list.length, 1); assert.strictEqual(list[0].n, 2); assert.strictEqual(list[0].code, scode);
  assert.ok(require('fs').readFileSync(process.env.DATA_FILE, 'utf8').includes(scode), 'diskka saqlandi');
  console.log('oldindan qo\'shilish + detach ok');

  // restart simulyatsiyasi
  const { rooms, restore } = require('./server'); const old = rooms.get(scode); clearTimeout(old.st); rooms.delete(scode); restore();
  const back = rooms.get(scode); assert.ok(back && back.players.length === 2 && back.players.every(p => !p.ws), 'tiklandi'); console.log('restore ok');
  host.send({ t: 'join', code: scode }); await wait(150);   // rejoin tiklangan xonaga

  calls.length = 0; await wait(Math.max(0, at - Date.now()) + 500);
  const start = calls.filter(c => c.m === 'sendMessage');
  assert.ok(start.some(c => c.p.chat_id === grp && c.p.text.includes("O'yin vaqti keldi")), 'guruhga vaqt xabari');
  assert.ok(start.some(c => c.p.chat_id === '777') && start.some(c => c.p.chat_id === '888'), "o'yinchilarga DM");
  assert.strictEqual(start.length, 3); console.log('vaqt kelganda xabar ok');

  guest.send({ t: 'delete', code: scode }); await wait(100);
  assert.ok(guest.log.some(m => m.t === 'err' && /o'chirib/.test(m.msg)) && rooms.has(scode), 'ega bo\'lmagan o\'chira olmaydi');
  calls.length = 0; host.send({ t: 'delete', code: scode }); await wait(150);
  assert.ok(!rooms.has(scode)); assert.ok(host.log.some(m => m.t === 'deleted'));
  const ed = calls.find(c => c.m === 'editMessageText'); assert.strictEqual(ed.p.chat_id, grp); assert.strictEqual(ed.p.message_id, 42);
  assert.ok(!require('fs').readFileSync(process.env.DATA_FILE, 'utf8').includes(scode), 'diskdan o\'chdi');
  console.log("o'chirish ok"); process.exit(0);
});
