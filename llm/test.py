import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
client = genai.Client()
r = client.models.generate_content(model=os.getenv("GEMINI_MODEL"), contents="Salom, o'zingni tanishtir")
print(r.text)
print(r.usage_metadata)