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
