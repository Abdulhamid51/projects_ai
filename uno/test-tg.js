// Telegram: initData tekshiruvi, xona xabarlari, bot buyruqlari (tarmoqsiz — fetch soxtalashtirilgan)
const crypto = require('crypto'), assert = require('assert');
process.env.DATA_FILE = require('os').tmpdir() + '/uno-tg-' + Date.now() + '.json';
process.env.BOT_TOKEN = '123:TESTTOKEN'; process.env.BOT_USERNAME = 'unobot'; process.env.PUBLIC_URL = 'https://uno.test';
const calls = [], realFetch = global.fetch;
global.fetch = (u, o) => u.startsWith('https://api.telegram.org/') ? (calls.push({ m: u.split('/').pop(), p: JSON.parse(o.body) }), Promise.resolve({ json: async () => ({ ok: true, result: [] }) })) : realFetch(u, o);
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

  calls.length = 0;
  await tgBot.onUpdate({ message: { text: `/start r_${code}`, chat: { id: 5, type: 'private' } } });
  assert.strictEqual(calls[0].p.reply_markup.inline_keyboard[0][0].web_app.url, `https://uno.test/?room=${code}`);
  await tgBot.onUpdate({ message: { text: '/start r_ZZZZ', chat: { id: 5, type: 'private' } } });
  assert.ok(calls[1].p.text.includes('topilmadi'));
  await tgBot.onUpdate({ message: { text: '/uno@unobot', chat: { id: -1001234, type: 'supergroup' } } });
  assert.strictEqual(calls[2].p.reply_markup.inline_keyboard[0][0].url, 'https://t.me/unobot?start=gn1001234');
  await tgBot.onUpdate({ message: { text: '/start gn1001234', chat: { id: 5, type: 'private' } } });
  assert.strictEqual(calls[3].p.reply_markup.inline_keyboard[0][0].web_app.url, `https://uno.test/?group=-1001234&sig=${sig}`);
  await tgBot.onUpdate({ message: { text: '/uno@otherbot', chat: { id: -1, type: 'group' } } });
  assert.strictEqual(calls.length, 4, 'boshqa botga buyruq e\'tiborsiz');
  console.log('bot buyruqlari ok'); process.exit(0);
});
