const crypto = require('crypto');

// Telegram bot + Mini App yordamchilari. Kerakli env: BOT_TOKEN, (ixtiyoriy) PUBLIC_URL, BOT_USERNAME
module.exports = function ({ rooms, mac, same }) {
  const TOKEN = process.env.BOT_TOKEN;
  const PUBLIC = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
  const bot = { token: TOKEN, name: process.env.BOT_USERNAME || '' };

  const api = (m, p) => fetch(`https://api.telegram.org/bot${TOKEN}/${m}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p),
  }).then(r => r.json()).catch(e => ({ ok: false, description: String(e) }));
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const link = code => `https://t.me/${bot.name}?start=r_${code}`;
  const webBtn = (text, p) => ({ text, web_app: { url: PUBLIC + p } });
  const secret = () => mac('wh').slice(0, 32);
  const groupSig = id => mac('grp' + id).slice(0, 20);
  const fmt = r => { const d = new Date(r.at + (r.tz || 0) * 60000), p = n => String(n).padStart(2, '0'), z = (r.tz || 0) / 60;
    return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} (UTC${z >= 0 ? '+' : '-'}${Math.abs(z)})`; };
  const yn = v => (v ? 'ha' : "yo'q");
  const rules = c => [
    `🃏 Boshlang'ich kartalar: ${c.hand}`,
    `➕ +2/+4 to'plash: ${yn(c.stack)}`,
    `📥 Mos karta chiqquncha olish: ${yn(c.until)}`,
    `🎯 +4 faqat mos rang bo'lmaganda: ${yn(c.strict)}`,
    `⏱ Yurish vaqti: ${c.timer ? c.timer + ' s' : 'cheksiz'}`,
  ].join('\n');

  // Mini App initData imzosini tekshiradi, user obyektini qaytaradi
  function verifyInit(initData) {
    if (!TOKEN || !initData) return null;
    const p = new URLSearchParams(String(initData)), h = p.get('hash');
    if (!h) return null;
    p.delete('hash');
    const dcs = [...p.entries()].map(([k, v]) => k + '=' + v).sort().join('\n');
    const key = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
    if (!same(h, crypto.createHmac('sha256', key).update(dcs).digest('hex'))) return null;
    if (Date.now() / 1000 - (+p.get('auth_date') || 0) > 86400) return null;
    try { const u = JSON.parse(p.get('user')); return u && u.id ? u : null; } catch (e) { return null; }
  }

  // Xona yaratilganda: egasiga (shaxsiy) va guruhga xabar
  function notifyRoom(r, hostTgId, group) {
    if (!TOKEN || !bot.name) return;
    const host = r.players[0].name, l = link(r.code);
    api('sendMessage', {
      chat_id: hostTgId, parse_mode: 'HTML', disable_web_page_preview: true,
      text: `${r.at ? '🗓 <b>Rejalashtirilgan UNO xonasi yaratildi!</b>' : '🎴 <b>UNO xonasi yaratildi!</b>'}\n\n🔑 Kod: <code>${r.code}</code>\n👑 Ega: ${esc(host)}\n${r.at ? `🕒 Boshlanish: <b>${fmt(r)}</b>\n` : ''}\n${rules(r.cfg)}\n\n🔗 ${l}\n\nHavolani do'stlaringizga yuboring. Qoidalarni o'yin boshlanishidan oldin xona ichida o'zgartirishingiz mumkin.`,
      reply_markup: { inline_keyboard: [
        [webBtn('▶ Xonaga kirish', '/?room=' + r.code)],
        [{ text: "📨 Do'stlarga yuborish", url: `https://t.me/share/url?url=${encodeURIComponent(l)}&text=${encodeURIComponent('UNO o‘ynaymiz! 🎴')}` }],
      ] },
    });
    if (group) api('sendMessage', {
      chat_id: group, parse_mode: 'HTML',
      text: r.at
        ? `🗓 <b>${esc(host)}</b> UNO o'yinini rejalashtirdi!\n🔑 Kod: <code>${r.code}</code>\n🕒 Vaqt: <b>${fmt(r)}</b>\n\nOldindan qo'shilib qo'yish: tugmani bosing → botda <b>Start</b> bosing → «Qo'shilib qo'yish» tugmasi keladi. Vaqti kelganda shu yerga xabar beraman.`
        : `🎴 <b>${esc(host)}</b> UNO xonasi ochdi!\n🔑 Kod: <code>${r.code}</code>\n\nQo'shilish: tugmani bosing → botda <b>Start</b> bosing → «Tayyor» tugmasi keladi.`,
      reply_markup: { inline_keyboard: [[{ text: r.at ? "📅 Qo'shilib qo'yish" : '🤖 Botga start bosish', url: l }]] },
    }).then(res => { if (res && res.ok && res.result) r.gmsg = res.result.message_id; });
  }

  // jadval vaqti kelganda: guruhga + qo'shilgan Telegram o'yinchilariga
  function notifyStart(r) {
    if (!TOKEN || !bot.name) return;
    const body = `⏰ <b>O'yin vaqti keldi!</b>\n\n🎴 UNO xonasi <code>${r.code}</code>\n👥 ${r.players.map(p => esc(p.name)).join(', ')}`;
    if (r.group) api('sendMessage', { chat_id: r.group, parse_mode: 'HTML', text: body + "\n\nQo'shilish uchun tugmani bosing 👇",
      reply_markup: { inline_keyboard: [[{ text: '▶ Xonaga kirish', url: link(r.code) }]] } });
    r.players.filter(p => p.id.startsWith('tg:')).forEach(p => api('sendMessage', { chat_id: p.id.slice(3), parse_mode: 'HTML', text: body,
      reply_markup: { inline_keyboard: [[webBtn('▶ Xonaga kirish', '/?room=' + r.code)]] } }));
  }

  // xona o'chirilganda guruhdagi xabarni yangilaydi
  function closeRoom(r) {
    if (TOKEN && r.group && r.gmsg) api('editMessageText', { chat_id: r.group, message_id: r.gmsg, text: `🗑 UNO xonasi ${r.code} o'chirildi.` });
  }

  async function onUpdate(u) {
    const m = u.message;
    if (!m || !m.text) return;
    const [c0, arg = ''] = m.text.trim().split(/\s+/), [cmd, at] = c0.toLowerCase().split('@');
    if (at && at !== bot.name.toLowerCase()) return;
    const chat = m.chat.id, priv = m.chat.type === 'private';
    const reply = (text, kb) => api('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true, ...(kb && { reply_markup: { inline_keyboard: kb } }) });

    if (cmd === '/start' && arg.startsWith('r_')) {
      const code = arg.slice(2).toUpperCase(), r = rooms.get(code);
      if (!r) return reply('😕 Xona topilmadi yoki yopilgan.');
      if (r.state === 'play') return reply(`🎴 <b>${code}</b> xonasida o'yin allaqachon boshlangan.`);
      return reply(`🎴 <b>UNO xonasi ${code}</b>\n${r.at ? `🕒 Boshlanish: <b>${fmt(r)}</b>\n` : ''}👥 ${r.players.map(p => esc(p.name)).join(', ')}\n\n${rules(r.cfg)}\n\n${r.at ? "Oldindan qo'shilib qo'yishingiz mumkin 👇" : "Tayyor bo'lsangiz tugmani bosing 👇"}`, [[webBtn(r.at ? "📅 Qo'shilib qo'yish" : '✅ Tayyor — xonaga kirish', '/?room=' + code)]]);
    }
    if (cmd === '/start' && /^g\d+$|^gn\d+$/.test(arg)) {
      const id = arg.slice(1).replace('n', '-');
      return reply('🎮 Guruh uchun UNO xonasi yaratish 👇', [[webBtn('🎮 Xona yaratish', `/?group=${id}&sig=${groupSig(id)}`)]]);
    }
    if (cmd === '/uno' && !priv) {
      return reply('🎴 <b>UNO</b> o‘ynaymizmi? Xona yaratish uchun tugmani bosing, botda <b>Start</b> bosing 👇',
        [[{ text: '🎮 Xona yaratish', url: `https://t.me/${bot.name}?start=g${String(chat).replace('-', 'n')}` }]]);
    }
    if (priv && ['/start', '/help', '/uno'].includes(cmd)) {
      return reply("🎴 <b>UNO Online</b>\n\nDo'stlar bilan onlayn UNO. Tugmani bosing yoki guruhga qo'shib <code>/uno</code> yozing.", [[webBtn('🎮 O‘ynash', '/')]]);
    }
  }

  async function poll() {
    let offset = 0;
    for (;;) {
      const r = await api('getUpdates', { offset, timeout: 30, allowed_updates: ['message'] });
      if (!r.ok) { await new Promise(s => setTimeout(s, 3000)); continue; }
      for (const u of r.result) { offset = u.update_id + 1; onUpdate(u).catch(console.error); }
    }
  }

  async function start() {
    if (!TOKEN) return console.log('BOT_TOKEN yo\'q — Telegram o\'chirilgan');
    const me = await api('getMe', {});
    if (!me.ok) return console.error('Telegram getMe xato:', me.description);
    bot.name = me.result.username;
    await api('setMyCommands', { commands: [{ command: 'uno', description: 'UNO xonasi yaratish' }, { command: 'start', description: 'Boshlash' }] });
    if (PUBLIC.startsWith('https://')) {
      await api('setChatMenuButton', { menu_button: { type: 'web_app', text: '🎮 UNO', web_app: { url: PUBLIC } } });
      const w = await api('setWebhook', { url: PUBLIC + '/tg', secret_token: secret(), allowed_updates: ['message'] });
      console.log('Telegram bot @' + bot.name + ', webhook:', w.ok ? 'ok' : w.description);
    } else { await api('deleteWebhook', {}); console.log('Telegram bot @' + bot.name + ' (polling)'); poll(); }
  }

  return Object.assign(bot, { verifyInit, notifyRoom, notifyStart, closeRoom, onUpdate, start, groupSig, secret });
};
