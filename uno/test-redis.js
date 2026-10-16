// Tashqi baza: yozish, "qayta ishga tushgandan keyin" tiklash (Upstash REST soxtalashtirilgan)
const assert = require('assert'), store = new Map();
process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test'; process.env.UPSTASH_REDIS_REST_TOKEN = 'tok';
const real = global.fetch;
global.fetch = (u, o) => {
  if (u !== 'https://redis.test') return real(u, o);
  assert.strictEqual(o.headers.authorization, 'Bearer tok');
  const [c, k, v] = JSON.parse(o.body);
  if (c === 'SET') store.set(k, v);
  return Promise.resolve({ json: async () => ({ result: c === 'GET' ? store.get(k) ?? null : 'OK' }) });
};
const { server, _test } = require('./server');
server.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`, wait = ms => new Promise(r => setTimeout(r, ms));
  const post = (p, b) => fetch(base + p, { method: 'POST', body: JSON.stringify(b) }).then(r => r.status);
  await _test.loadRemote(); assert.ok(store.get('uno:db'), 'bo\'sh baza yaratildi');
  assert.strictEqual(await post('/api/register', { username: 'zed', password: 'secret1' }), 200);
  await wait(500);
  assert.ok(JSON.parse(store.get('uno:db')).users.zed, 'foydalanuvchi bazaga yozildi');
  _test.reset();                                                                    // server "o'chib yondi"
  assert.strictEqual(await post('/api/login', { username: 'zed', password: 'secret1' }), 401);
  await _test.loadRemote();                                                         // bazadan tiklash
  assert.strictEqual(await post('/api/login', { username: 'zed', password: 'secret1' }), 200);
  console.log('redis ok'); process.exit(0);
});
