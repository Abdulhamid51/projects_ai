"""Telegram userbot: siz band bo'lganingizda shaxsiy chatlarda sizning o'rningizga javob yozadi.

Boshqaruv ("Saved Messages" ga yozing):
  .on      - avto-javobni yoqish
  .off     - o'chirish
  .status  - holat
  .clear   - chatlar xotirasini tozalash
"""
import asyncio
import os
import sys
import time
from collections import defaultdict, deque

from dotenv import load_dotenv
from google import genai
from google.genai import types
from telethon import TelegramClient, events

load_dotenv()

API_ID = int(os.environ["API_ID"])
API_HASH = os.environ["API_HASH"]
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
OWNER_INFO = os.getenv("OWNER_INFO", "")
PAUSE_SEC = int(os.getenv("PAUSE_MINUTES", "10")) * 60
REPLY_DELAY = float(os.getenv("REPLY_DELAY", "3"))
HISTORY_LEN = 20


def _ids(name):
    return {int(x) for x in os.getenv(name, "").replace(" ", "").split(",") if x}


WHITELIST, BLACKLIST = _ids("WHITELIST"), _ids("BLACKLIST")

SYSTEM_PROMPT = f"""Sen Telegramda egasining o'rniga javob yozayotgan yordamchisan.
Egasi haqida: {OWNER_INFO}
Qoidalar:
- Egasining nomidan, birinchi shaxsda, qisqa va tabiiy yoz (1-3 gap).
- Suhbatdosh qaysi tilda yozsa, shu tilda javob ber.
- Aniq bilmagan narsangni (uchrashuv, pul, va'da, shaxsiy ma'lumot) o'zingdan to'qima,
  "keyinroq aniqlab aytaman" de.
- Robot ekaningni aytma, lekin so'rashsa yolg'on gapirma: egasi hozir band, yordamchi javob beryapti."""

ai = genai.Client()
client = TelegramClient("userbot_session", API_ID, API_HASH)

state = {"enabled": True}
history = defaultdict(lambda: deque(maxlen=HISTORY_LEN))  # chat_id -> [(role, text)]
paused_until = {}  # chat_id -> timestamp
bot_sending = set()  # (chat_id, text) - bot yozayotgan xabarlar (egasinikidan ajratish uchun)


async def generate_reply(chat_id):
    contents = [
        types.Content(role=role, parts=[types.Part(text=text)])
        for role, text in history[chat_id]
    ]
    resp = await ai.aio.models.generate_content(
        model=MODEL,
        contents=contents,
        config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
    )
    return (resp.text or "").strip()


@client.on(events.NewMessage(outgoing=True))
async def on_outgoing(event):
    me_chat = event.chat_id == (await client.get_me()).id
    cmd = (event.raw_text or "").strip().lower()
    if me_chat and cmd in {".on", ".off", ".status", ".clear"}:
        if cmd == ".on":
            state["enabled"] = True
        elif cmd == ".off":
            state["enabled"] = False
        elif cmd == ".clear":
            history.clear()
        await event.edit(f"Avto-javob: {'yoqilgan' if state['enabled'] else 'ochirilgan'}")
        return
    if not event.is_private:
        return
    if (event.chat_id, event.raw_text) in bot_sending:
        return
    # Egasi o'zi yozdi: xotiraga qo'shamiz va chatda botni vaqtincha to'xtatamiz
    if event.raw_text:
        history[event.chat_id].append(("model", event.raw_text))
    paused_until[event.chat_id] = time.time() + PAUSE_SEC


@client.on(events.NewMessage(incoming=True))
async def on_incoming(event):
    if not event.is_private or not event.raw_text:
        return
    sender = await event.get_sender()
    if sender is None or getattr(sender, "bot", False):
        return
    uid = event.chat_id
    if (WHITELIST and uid not in WHITELIST) or uid in BLACKLIST:
        return

    history[uid].append(("user", event.raw_text))
    if not state["enabled"] or paused_until.get(uid, 0) > time.time():
        return

    await asyncio.sleep(REPLY_DELAY)
    try:
        async with client.action(uid, "typing"):
            reply = await generate_reply(uid)
    except Exception as e:
        print(f"[xato] {uid}: {e}")
        return
    if not reply:
        return
    key = (uid, reply)
    bot_sending.add(key)
    try:
        await event.respond(reply)
        await asyncio.sleep(2)  # outgoing update kelguncha kutamiz
    finally:
        bot_sending.discard(key)
    history[uid].append(("model", reply))


def main():
    client.start()  # birinchi marta telefon raqam va kod so'raydi
    if "--login" in sys.argv:  # faqat sessiya yaratish (install.sh uchun)
        print("Login muvaffaqiyatli, sessiya saqlandi.")
        client.disconnect()
        return
    print("Userbot ishga tushdi. Boshqaruv: Saved Messages ga .on/.off/.status/.clear")
    client.run_until_disconnected()


if __name__ == "__main__":
    main()
