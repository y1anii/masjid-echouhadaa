import os

file_path = r"C:\Users\infoPro\Desktop\old masjid\admin\index.html"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "cert" in line.lower() or "print" in line.lower() or "apprec" in line.lower():
        print(f"Line {idx+1}: {line.strip()}")
