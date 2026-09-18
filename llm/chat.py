import os
from dotenv import load_dotenv
from google import genai
from google.genai import types, errors

load_dotenv()
client = genai.Client()
chat = client.chats.create(
    model=os.getenv("GEMINI_MODEL"),
    config=types.GenerateContentConfig(
        system_instruction="Sen o'zbek tilida qisqa va aniq javob beradigan yordamchisan.",
        max_output_tokens=1000,
    ),
)
total = {"req": 0, "in": 0, "out": 0, "think": 0}

def show_usage(u):
    inp, out, think = u.prompt_token_count or 0, u.candidates_token_count or 0, u.thoughts_token_count or 0
    total["req"] += 1; total["in"] += inp; total["out"] += out; total["think"] += think
    print(f"\n[tokens] input: {inp} | output: {out} | thinking: {think} | jami: {u.total_token_count}")

while True:
    q = input("\nSiz: ").strip()
    if not q:
        continue
    if q == "/exit":
        break
    if q == "/usage":
        print(total); continue
    try:
        usage = None
        print("Gemini: ", end="")
        for chunk in chat.send_message_stream(q):
            print(chunk.text or "", end="", flush=True)
            usage = chunk.usage_metadata or usage   # usage oxirgi chunk'larda keladi
        if usage:
            show_usage(usage)
    except errors.APIError as e:
        msg = "Limit tugadi, biroz kutib qayta urining." if e.code == 429 else e.message
        print(f"\n[!] Xato {e.code}: {msg}")

print(f"\nSessiya: {total['req']} so'rov | input {total['in']} | output {total['out']} | thinking {total['think']}")