import zipfile
import os

zip_path = r"C:\Users\infoPro\Desktop\masjid-chouhada\old masjid.zip"
dest_path = r"C:\Users\infoPro\Desktop\old masjid"

print(f"Extracting {zip_path} into {dest_path}...")
os.makedirs(dest_path, exist_ok=True)
with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall(dest_path)
print("Extraction complete!")
