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

## Rejalashtirilgan xonalar
- Bosh sahifada vaqt tanlab «🗓 Rejalashtirish» — xona oldindan yaratiladi. Do'stlar havola/bot orqali **oldindan qo'shilib qo'yadi**,
  «Orqaga» bilan chiqib ketsa ham xonada qoladi; «Rejalashtirilgan xonalarim» ro'yxatidan qayta kiradi.
- Guruh orqali ochilsa guruhga vaqt, kod va tugma yuboriladi; vaqt kelganda guruhga va qo'shilgan Telegram o'yinchilariga «⏰ O'yin vaqti keldi» xabari boradi.
- Xona egasi (lobbida yoki o'yin tugagach) xonani butunlay o'chiradi; guruhdagi xabar «o'chirildi» deb yangilanadi.
- Jadvalli xonalar `DATA_FILE` ga saqlanadi va server qayta ishga tushganda tiklanadi.
  **Render Free'da** server 15 daqiqa harakatsiz qolsa uxlaydi va fayl tizimi tozalanadi — jadval xabari kechikishi/yo'qolishi mumkin.
  Ishonchli ishlashi uchun: uptime ping (masalan UptimeRobot → `/health`, 5 daqiqada) + pullik Disk (`DATA_FILE=/var/data/users.json`).

## Tashqi baza (Upstash Redis, bepul)
Render Free'da fayl tizimi doimiy emas, shuning uchun akkauntlar va jadvalli xonalar tashqi bazada saqlanadi.
1. upstash.com → Create Database (Redis, region — sizga yaqin) → **REST API** bo'limidan `UPSTASH_REDIS_REST_URL` va `UPSTASH_REDIS_REST_TOKEN` ni oling.
2. Render → Environment ga ikkalasini kiriting → xizmat qayta ishga tushadi, logda `Redis ulandi. Foydalanuvchilar: N` chiqadi.
- Sozlanmasa fayl (`DATA_FILE`) ishlatiladi. Baza ulanmasa server ataylab ishga tushmaydi (bo'sh baza bilan ma'lumotni ustidan yozib yubormaslik uchun).
- Barcha ma'lumot bitta kalitda (`uno:db`) JSON ko'rinishida: do'stlar/guruh miqyosi (minglab akkaunt) uchun yetarli.
- Eslatma: o'yin davomidagi xonalar xotirada turadi — server qayta ishga tushsa o'yin tugaydi, lekin akkaunt va rejalashtirilgan xonalar saqlanadi.
