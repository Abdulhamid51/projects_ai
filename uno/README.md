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
