# UNO Online

Do'stlar bilan onlayn UNO (2–8 o'yinchi). Node.js + WebSocket, frontend — bitta HTML.

    npm install && npm start   # http://localhost:3000
    npm test                   # bot'lar bilan simulyatsiya

Deploy (Render): repo'ni ulang → New → Blueprint → `uno/render.yaml`. Yoki Dockerfile bilan (Fly.io, Railway).
Xona egasi "Havolani nusxalash" tugmasi bilan do'stiga link yuboradi.

## Akkauntlar
Ro'yxatdan o'tish / login (nom + parol). Parollar scrypt bilan hash qilinadi, sessiya 30 kunlik imzolangan token.
Foydalanuvchilar `data/users.json` da (yo'li: `DATA_FILE` env). Render Free'da fayl tizimi doimiy emas —
server qayta ishga tushganda akkauntlar o'chadi; doimiy qilish uchun pullik Disk yoki tashqi DB kerak.

## Telegram bot / Mini App
1. @BotFather → `/newbot` → token oling. (Guruhlarda ishlashi uchun: `/mybots` → Bot Settings → Group Privacy — ixtiyoriy, `/uno` buyrug'i baribir ishlaydi.)
2. Render → Environment → `BOT_TOKEN` = token. Server ishga tushganda o'zi webhook (`PUBLIC_URL` yoki `RENDER_EXTERNAL_URL`), buyruqlar va menyu tugmasini («🎮 UNO» Mini App) sozlaydi.
3. Lokal sinov: `BOT_TOKEN=... npm start` (https bo'lmasa polling rejimi; Mini App tugmalari faqat https'da ishlaydi).

Oqim:
- Botni oching → «🎮 O'ynash» → Telegram ismi va ID bilan avtomatik akkaunt.
- Xona yaratilganda egasiga kod + havola xabari boradi (`t.me/<bot>?start=r_KOD`).
- Guruh: botni guruhga qo'shing, `/uno` yozing → tugma → botda Start → «Xona yaratish». Xona ochilganda guruhga xabar boradi
  → a'zolar «Botga start bosish» → bot «✅ Tayyor — xonaga kirish» tugmasini yuboradi.
- Xona egasi boshlanishidan oldin qoidalarni belgilaydi: boshlang'ich kartalar (5/7/10), yurish vaqti, +2/+4 to'plash, mos karta chiqquncha olish, +4 qat'iy qoidasi.

Testlar: `npm test` (o'yin), `node test-tg.js` (Telegram, tarmoqsiz).
