import os

path = r"C:\Users\infoPro\Desktop\old masjid"
print("Exists:", os.path.exists(path))
if os.path.exists(path):
    print("Contents:", os.listdir(path))
    for item in os.listdir(path):
        full = os.path.join(path, item)
        print(f"  {item}: isdir={os.path.isdir(full)}, size={os.path.getsize(full) if not os.path.isdir(full) else 0}")
