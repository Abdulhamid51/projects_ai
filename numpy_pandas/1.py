import numpy as np

# a = np.array([1, 2, 3])              # 1D — vektor
# b = np.array([[1, 2, 3], [4, 5, 6]]) # 2D — matritsa

# print(a.shape)    # (3,)
# print(b.shape)    # (2, 3)  -> 2 qator, 3 ustun
# print(b.dtype)    # int64
# print(b.ndim)     # 2

# print(np.zeros((3, 4)))        # nollar matritsasi
# print(np.ones(5))
# print(np.arange(0,     10,     2))     # [0 2 4 6 8]
# #          start^  stop^   step^
# print(np.linspace(0, 1, 5))     # [0. 0.25 0.5 0.75 1.]
# print(np.random.rand(2, 3))     # 0-1 orasida tasodifiy

# sotuvlar = np.array([120, 85, 200, 45, 310])
# print(sotuvlar.sum())    # 760
# print(sotuvlar.mean())   # 152.0

# # Ikki o'lchovli — jadval ko'rinishidagi ma'lumot. Masalan 3 ta filial × 4 ta chorak:
# foyda = np.array([[10, 12, 15, 11],
#                   [8,  9,  7,  14],
#                   [20, 22, 19, 25]])

# print(foyda.sum())    # 188
# print(foyda.mean())   # 15.666666666666666

# oylik = np.zeros(30)
# oylik[0] = 450000    # 1-kun sotuvi tushdi
# oylik[1] = 380000    # 2-kun sotuvi tushdi

# qoldiq = np.zeros((10, 50))

# koef = np.ones(5)
# koef[2] = 0.85          # 3-mahsulotga 15% chegirma
# narxlar = np.array([10000, 25000, 40000, 15000, 8000])
# yakuniy = narxlar * koef
# print(yakuniy)

# print(np.ones(4) * 7)    # [7. 7. 7. 7.]

# min_qoldiq = np.full(20, 50)     # 20 ta mahsulot, har biriga 50
# narxlar = np.full(10, np.nan)    # hali narx kiritilmagan

# javonlar = np.arange(0, 50, 5)   # [0 5 10 15 20 25 30 35 40 45]
# yillar = np.arange(2020, 2027)   # [2020 2021 ... 2026]
# np.arange(len(mahsulotlar))      # [0 1 2 3 ...]

# segmentlar = np.linspace(5000, 100000, 5)
# # [5000. 28750. 52500. 76250. 100000.]

# np.arange(0, 10, 2)     # [0 2 4 6 8]      -> 10 yo'q
# np.linspace(0, 10, 5)   # [0 2.5 5 7.5 10] -> 10 bor


# soxta_embeddinglar = np.random.rand(1000, 384)   # 1000 hujjat × 384 o'lcham

# np.random.rand(3)            # 0-1 orasida
# np.random.randint(1, 100, 5) # 1-99 orasida 5 ta butun son
# np.random.randn(3)           # normal taqsimot (manfiy ham bo'ladi)

# np.random.seed(42)


# | Savol                                      | Funksiya    |
# |--------------------------------------------|-------------|
# | Ma'lumotim bor, arrayga o'tkazay            | `array`     |
# | Bo'sh idish kerak, keyin to'ldiraman        | `zeros`     |
# | Neytral koeffitsiyentlar kerak              | `ones`      |
# | Bir xil aniq qiymat bilan to'ldiray         | `full`      |
# | Qadam bilan ketma-ketlik kerak              | `arange`    |
# | Oraliqni N ta teng qismga bo'lay            | `linspace`  |
# | Test uchun soxta ma'lumot kerak             | `random.rand` |