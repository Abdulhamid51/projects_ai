import random
from pathlib import Path

import pandas as pd

random.seed(42)

food_items = [
    "Apple", "Banana", "Orange", "Grape", "Strawberry", "Mango", "Pineapple",
    "Carrot", "Tomato", "Cucumber", "Potato", "Onion", "Lettuce", "Pepper",
    "Milk", "Yogurt", "Cheese", "Butter", "Cream", "Cottage Cheese",
    "Bread", "Baguette", "Croissant", "Bagel", "Muffin", "Rolls",
    "Chicken Breast", "Beef Mince", "Turkey Sausage", "Pork Fillet", "Lamb Chops",
    "Salmon Fillet", "Tuna Can", "Shrimp", "Cod Fish", "Sardines",
    "Water", "Orange Juice", "Apple Juice", "Milkshake", "Sparkling Water",
    "Potato Chips", "Peanuts", "Cookies", "Crackers", "Chocolate", "Trail Mix",
    "Rice", "Oats", "Pasta", "Flour", "Couscous", "Corn Flakes",
    "Canned Beans", "Tomato Paste", "Canned Peaches", "Coconut Milk", "Olives",
    "Frozen Peas", "Frozen Spinach", "Frozen Berries", "Frozen Pizza", "Frozen Fries"
]

categories = [
    "Fruits", "Vegetables", "Dairy", "Bakery", "Meat", "Seafood",
    "Beverages", "Snacks", "Grains", "Canned Goods", "Frozen"
]

brands = [
    "FreshNest", "GreenFarm", "SunHarvest", "DailyDeli", "PureJoy",
    "RiverGold", "NorthPeak", "GoldenCrust", "FarmVale", "NatureBox",
    "EverFresh", "HomeTable", "PrimeSelect", "BrightField", "GoldenVale"
]

rows = []
for i in range(1, 101):
    name = random.choice(food_items)
    category = random.choice(categories)
    price = round(random.uniform(2.5, 33.5), 2)
    stock = random.randint(10, 150)
    brand = random.choice(brands)
    rating = round(random.uniform(3.8, 5.0), 1)
    sku = f"FG-{i:04d}"
    rows.append({
        "id": i,
        "name": name,
        "category": category,
        "price": price,
        "stock": stock,
        "brand": brand,
        "rating": rating,
        "sku": sku,
    })

df = pd.DataFrame(rows)
output_path = Path(__file__).with_name("products.csv")
df.to_csv(output_path, index=False)
print(f"Saved {len(df)} food products to {output_path}")
print(df.head(5).to_string(index=False))
