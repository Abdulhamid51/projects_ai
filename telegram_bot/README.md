# Telegram avto-javob userbot

Telegram **profilingizga** ulanib, shaxsiy chatlarda siz band bo'lganingizda Gemini AI yordamida
sizning o'rningizga javob yozadi.

## O'rnatish
```bash
cd telegram_bot
pip install -r requirements.txt
cp .env.example .env   # qiymatlarni to'ldiring
python main.py
```
1. `API_ID`/`API_HASH` — https://my.telegram.org → *API development tools*.
2. `GEMINI_API_KEY` — https://aistudio.google.com/apikey
3. Birinchi ishga tushirishda telefon raqam, SMS kod (va 2FA parol) so'raladi.
   Keyin `userbot_session.session` fayli yaratiladi — **uni hech kimga bermang**.

## Qanday ishlaydi
- Faqat shaxsiy chatlarga javob beradi (guruh, kanal, botlarga emas).
- Har bir chat uchun oxirgi 20 xabarni eslab qoladi (kontekst).
- Siz chatga o'zingiz yozsangiz, bot o'sha chatda `PAUSE_MINUTES` daqiqa jim turadi.
- `WHITELIST` / `BLACKLIST` orqali kimlarga javob berishni cheklash mumkin.

## Boshqaruv (Saved Messages ga yozing)
| Buyruq | Vazifa |
|---|---|
| `.on` | yoqish |
| `.off` | o'chirish |
| `.status` | holat |
| `.clear` | xotirani tozalash |

> ⚠️ Userbotlar Telegram qoidalarida "kulrang zona"da. Juda ko'p/spam xabar yubormang,
> aks holda akkaunt cheklanishi mumkin.

## Serverga o'rnatish (VPS, 24/7)
Ubuntu/Debian serverda:
```bash
git clone https://github.com/Abdulhamid51/projects_ai.git
cd projects_ai/telegram_bot
bash install.sh
```
Skript kutubxonalarni o'rnatadi, `.env` qiymatlarini va Telegram kodini so'raydi,
so'ng botni `tg-userbot` nomli systemd servis qilib ishga tushiradi (server qayta yoqilsa ham ishlaydi).

| Buyruq | Vazifa |
|---|---|
| `sudo systemctl status tg-userbot` | holat |
| `sudo journalctl -u tg-userbot -f` | loglar |
| `sudo systemctl restart tg-userbot` | qayta ishga tushirish (`.env` o'zgarganda) |
| `git pull && sudo systemctl restart tg-userbot` | yangilash |
