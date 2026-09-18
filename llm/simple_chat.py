import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
client = genai.Client()

chat = client.chats.create(model=os.getenv("GEMINI_MODEL"))
while (q := input("Siz: ")) != "/exit":
    for chunk in chat.send_message_stream(q):
        print(chunk.text or "", end="", flush=True)
    print()