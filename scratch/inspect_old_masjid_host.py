import os

path = r"C:\Users\infoPro\Desktop\masjid-chouhada\old masjid"
print("Exists:", os.path.exists(path))
if os.path.exists(path):
    print("Contents:")
    for item in os.listdir(path):
        full = os.path.join(path, item)
        print(f"  {item}: isdir={os.path.isdir(full)}")
