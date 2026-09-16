from sentence_transformers import SentenceTransformer
import numpy as np
import pandas as pd

# model = SentenceTransformer('intfloat/multilingual-e5-small')

# vektor = model.encode("Omborda shakar qolmadi")
# print(vektor.shape)      # (384,)
# print(vektor[:5])        # birinchi 5 raqam

model = SentenceTransformer('intfloat/multilingual-e5-small')

jumlalar = [
    "Omborda shakar qolmadi",
    "Sklad shakardan bo'shab qoldi",
    "Mahsulot zaxirasi tugadi",
    "Traktorga ehtiyot qism kerak",
    "Bugun havo juda issiq",
    "Yangi telefon sotib oldim",
]

# normalize_embeddings=True -> hamma "qo'l"ni bir xil uzunlikka keltiradi,
# shunda solishtirish oddiy ko'paytmaga aylanadi
# v = model.encode(jumlalar, normalize_embeddings=True)

# oxshashlik = v @ v.T          # har bir jumlani har biri bilan solishtirish

# df = pd.DataFrame(oxshashlik, index=jumlalar, columns=jumlalar).round(2)
# print(df)


v = model.encode(["passage: " + j for j in jumlalar], normalize_embeddings=True)

savol = "Nima sotib olding?"
q = model.encode("query: " + savol, normalize_embeddings=True)

ballar = v @ q
for i in np.argsort(ballar)[::-1][:3]:
    print(f"{ballar[i]:.3f}  {jumlalar[i]}")


jumlalar_ru = [
    "На складе закончился сахар",
    "Склад опустел от сахара",
    "Запасы товара закончились",
    "Для трактора нужна запчасть",
    "Сегодня очень жарко",
    "Я купил новый телефон",
]

v_ru = model.encode(["passage: " + j for j in jumlalar_ru], normalize_embeddings=True)
q_ru = model.encode("query: Что ты приобрёл?", normalize_embeddings=True)

ballar = v_ru @ q_ru
for i in np.argsort(ballar)[::-1][:3]:
    print(f"{ballar[i]:.3f}  {jumlalar_ru[i]}")