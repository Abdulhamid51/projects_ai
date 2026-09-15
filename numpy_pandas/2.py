import pandas as pd

df = pd.read_csv('numpy_pandas/products.csv')

# print(df.head(3))
# print(df.tail(4))
# print(df.shape)
# print(df.info())
# print(df.describe())
# print(df.columns)

# print(df[['name', 'id']])

# print(df[df['price'] > 20])                          # qimmat mahsulotlar
# print(df[df['brand'] == 'FarmVale'])                       # A skladdagilar
# print(df[(df['price'] > 10) & (df['stock'] < 40)]) # ikki shart
# print(df[df['name'].isin(['Butter', 'Grape'])])   # __in
# print(df[df['name'].str.contains('Juice', case=False)]) # __icontains

# df['summa'] = df['price'] * df['stock']
# import numpy as np
# df['status'] = np.where(df['stock'] < 100, 'Few', 'Normal')
# print(df[['name', 'status', 'stock', 'summa']])

# def category(price):
#     if price < 10: return 'Cheap'
#     elif price < 20: return 'Moderate'
#     return 'Expensive'

# df['category'] = df['price'].apply(category)
# print(df[['name', 'category']].head(20))

# summa = df.groupby('category')['summa'].sum()
# print(summa)

# gr = df.groupby('category').agg(
#     jami_summa=('summa', 'sum'),
#     ortacha_narx=('price', 'mean'),
#     mahsulot_soni=('name', 'count')
# ).reset_index()

# gr = df.groupby(['brand', 'category'])['summa'].sum().reset_index()

# df.sort_values('summa', ascending=False).head(10)
# lg = df.nlargest(10, 'price').reset_index()      # qisqaroq varianti
# sm = df.nsmallest(10, 'price').reset_index()      # qisqaroq varianti

# print(gr)
# print(lg)
# print('              ------               '*5)
# print(sm)

# natija = sotuvlar.merge(mahsulotlar, on='mahsulot_id', how='left')
# sotuvlar.merge(mahsulotlar, left_on='tovar_id', right_on='id', how='left')


# df.isna().sum()              # har bir ustunda nechta bo'sh
# df['narx'].fillna(0)         # nol bilan to'ldirish
# df['narx'].fillna(df['narx'].mean())   # o'rtacha bilan
# df.dropna(subset=['narx'])   # narxi yo'q qatorlarni o'chirish

# df['sana'] = pd.to_datetime(df['sana'])
# df['oy'] = df['sana'].dt.month
# df['hafta_kuni'] = df['sana'].dt.day_name()

# # oylik yig'indi
# df.groupby(df['sana'].dt.to_period('M'))['summa'].sum()

# df.to_excel('hisobot.xlsx', index=False)
# df.to_csv('natija.csv', index=False)
# df.to_dict('records')    # JSON API yoki Django template uchun

# Django ORM                         Pandas
# ----------------------------------  ----------------------------------------
# .filter(narx__gt=1000)              df[df['narx'] > 1000]
# .exclude(sklad='A')                 df[df['sklad'] != 'A']
# .values('nom', 'narx')              df[['nom', 'narx']]
# .order_by('-summa')                 df.sort_values('summa', ascending=False)
# .annotate(Sum('summa'))             df.groupby(...)['summa'].sum()
# .aggregate(Avg('narx'))             df['narx'].mean()
# .count()                            len(df)
# .distinct()                         df.drop_duplicates()
# select_related / JOIN               df.merge(...)
# [:10]                               df.head(10)

# Vazifa

# sotuvlar = pd.DataFrame({
#     'mahsulot': ['Shakar','Un','Yog','Shakar','Un','Yog','Guruch','Shakar'],
#     'sklad':    ['A','A','B','B','B','A','A','A'],
#     'miqdor':   [10, 25, 5, 8, 30, 12, 15, 20],
#     'narx':     [12000, 8500, 40000, 12000, 8500, 40000, 15000, 12000],
#     'sana':     ['2026-01-05','2026-01-07','2026-02-03','2026-02-10',
#                  '2026-02-15','2026-03-01','2026-03-08','2026-03-20']
# })

# # Har bir sotuv uchun summa ustunini qo'shing.

# sotuvlar['summa'] = sotuvlar['miqdor']*sotuvlar['narx']
# print(sotuvlar)

# # Faqat A skladdagi va summasi 150000 dan katta sotuvlarni chiqaring.

# print(sotuvlar[(sotuvlar['summa'] > 150000) & (sotuvlar['sklad'] == 'A')]) 

# # Har bir mahsulot bo'yicha jami summa va o'rtacha miqdorni hisoblang.

# print(sotuvlar.groupby('mahsulot')['summa'].sum())
# print(sotuvlar.groupby('mahsulot')['miqdor'].mean())

# print(sotuvlar.groupby('mahsulot').agg(
#     jami_summa=('summa', 'sum'),
#     ortacha_miqdor=('miqdor', 'mean')
# ))  # << tog'ri yechim

# # Eng ko'p daromad keltirgan 2 ta mahsulotni toping.

# print(sotuvlar.nlargest(2, 'summa'))
# print(sotuvlar.groupby('mahsulot')['summa'].sum().nlargest(2)) # tog'ri javob

# # Oylar kesimida umumiy sotuvni chiqaring.

# sotuvlar['sana'] = pd.to_datetime(sotuvlar['sana']) # << tuzatish
# print(sotuvlar.groupby(sotuvlar['sana'].dt.to_period('M'))['summa'].sum())


# df.pivot_table(index='mahsulot', columns='sklad',
#                values='summa', aggfunc='sum', fill_value=0)

# df.melt(id_vars='mahsulot', var_name='sklad', value_name='summa')

df.set_index('sana').resample('ME')['summa'].sum()   # ME = oy oxiri
# 'W' - haftalik, 'QE' - chorak, 'D' - kunlik

df['7_kunlik_ortacha'] = df['summa'].rolling(7).mean()

df['otgan_oy'] = df['summa'].shift(1)
df['osish_%'] = (df['summa'] / df['summa'].shift(1) - 1) * 100

df['yillik_jami'] = df['summa'].cumsum()

#                       | Nima qiladi                         | Savol
# ----------------------|-------------------------------------|------------------------------------------
# Transformatsiya       | Qiymatlarni o'zgartiradi            | "Ma'lumot toza va hisoblashga tayyormi?"
# Pivot                 | Jadval shaklini buradi              | "Bu jadvalni qanday ko'rsatsam tushunarli bo'ladi?"
# Time-series           | Vaqt bo'yicha tahlil qiladi         | "Vaqt o'tishi bilan nima o'zgardi?"