import pandas as pd
from pathlib import Path
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
BASE = Path(__file__).resolve().parent
df = pd.read_csv(BASE / 'mahsulotlar.csv')
client = genai.Client()

MODEL = "gemini-3.6-flash"      # ro'yxatdan aniqlagan nomingizni qo'ying
TAQIQ = ['import', 'open(', 'exec', 'eval', '__', 'os.', 'sys.', 'subprocess']
CFG = types.GenerateContentConfig(
    temperature=0,
    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
)

def sxema():
    return (f"Ustunlar:\n{df.dtypes.to_string()}\n\n"
            f"Namuna:\n{df.head(3).to_string()}\n\n"
            f"sklad qiymatlari: {list(df['sklad'].unique())}\n"
            f"kategoriya qiymatlari: {list(df['kategoriya'].unique())}")


def kod_yoz(savol, xato=None, eski_kod=None):
    p = f"""`df` nomli pandas DataFrame bor.

{sxema()}

Savol: {savol}

Faqat pandas ifodasini yoz. Natija `natija` o'zgaruvchisiga tayinlansin.
Izoh, tushuntirish, markdown yozma."""

    if xato:
        p += f"\n\nOldingi kod:\n{eski_kod}\nXato: {xato}\nTuzat."

    r = client.models.generate_content(
        model=MODEL,
        contents=p,
        config=CFG
    )
    return r.text.strip().replace('```python', '').replace('```', '').strip()


def sorov(savol, urinish=2):
    kod, xato = None, None
    for _ in range(urinish):
        kod = kod_yoz(savol, xato, kod)
        if any(t in kod for t in TAQIQ):
            return f"Xavfli kod rad etildi: {kod}"
        try:
            muhit = {'df': df, 'pd': pd}
            exec(kod, muhit)
            print(f"[kod] {kod}")
            return muhit['natija']
        except Exception as e:
            xato = str(e)
    return f"Bajarilmadi: {xato}"


# bu funksiya savolga aniq raqamlar bilan javob berishga xizmat qiladi
def turini_aniqla(savol):
    r = client.models.generate_content(
        model=MODEL,
        contents=f"""Quyidagi jadval bor:
                    {sxema()}

                    Savol: {savol}

                    Bu savolga faqat shu jadvaldagi ma'lumot bilan javob berish mumkinmi?
                    Faqat bitta so'z yoz: HA yoki YOQ""",
        config=CFG
    )
    return r.text.strip().upper().startswith("HA")


def javob_ber(savol):
    if not turini_aniqla(savol):
        return "Bu savolga jadvaldagi ma'lumot yetarli emas."
    natija = sorov(savol)
    r = client.models.generate_content(
        model=MODEL,
        contents=f"Savol: {savol}\nNatija:\n{natija}\n\n"
                 f"Shu natijaga asoslanib o'zbek tilida qisqa javob yoz. "
                 f"Natijada yo'q ma'lumotni qo'shma.",
        config=CFG
    )
    return r.text


if __name__ == "__main__":
    while True:
        s = input("Maxsulotlar bo'yicha savol bering(chiqish: q): ")
        if s == 'q':
            break
        print(f"\nQ: {s}\nA: {javob_ber(s)}")