import shutil
import os

src = r"C:\Users\infoPro\Desktop\masjid-chouhada\old masjid"
dst = r"C:\Users\infoPro\Desktop\old masjid"

print(f"Copying {src} to {dst}...")
try:
    if os.path.exists(dst):
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
    print("Copy complete!")
except Exception as e:
    print("Error copying directory:", e)
