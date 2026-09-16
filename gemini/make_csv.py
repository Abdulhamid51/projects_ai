import pandas as pd
from pathlib import Path

BASE = Path(__file__).resolve().parent

df = pd.DataFrame({
    'mahsulot': ['Shakar','Un','Yog','Guruch','Tuz','Choy','Makaron'],
    'kategoriya': ['Oziq-ovqat','Oziq-ovqat','Oziq-ovqat','Oziq-ovqat',
                   'Ziravor','Ichimlik','Oziq-ovqat'],
    'miqdor': [120, 340, 85, 200, 500, 60, 150],
    'narx': [12000, 8500, 40000, 15000, 3000, 25000, 9000],
    'sklad': ['A','A','B','B','A','B','A'],
})
df.to_csv(BASE / 'mahsulotlar.csv', index=False)