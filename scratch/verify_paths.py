import os
import re

workspace_dir = r"C:\Users\infoPro\Desktop\masjid-chouhada"

found_news = False
for root, dirs, files in os.walk(workspace_dir):
    if "scratch" in root or ".git" in root or "node_modules" in root:
        continue
    for file in files:
        if file.endswith((".html", ".js", ".json")):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            
            # Search for references to news.html or الأخبار in nav list tags
            matches = re.findall(r'href=["\'][^"\']*news\.html[^"\']*["\']', content, re.IGNORECASE)
            if matches:
                print(f"Found reference in {file_path}: {matches}")
                found_news = True

if not found_news:
    print("Verification complete: No references to news.html found in HTML/JS/JSON files.")
else:
    print("Verification complete: Some references to news.html are still remaining.")
