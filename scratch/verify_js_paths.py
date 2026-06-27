import os
import re

workspace_dir = r"C:\Users\infoPro\Desktop\masjid-chouhada"

found_news_js = False
for root, dirs, files in os.walk(workspace_dir):
    if "scratch" in root or ".git" in root or "node_modules" in root:
        continue
    for file in files:
        if file.endswith((".html", ".js", ".json")):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            
            # Search for references to news.js
            matches = re.findall(r'[^a-zA-Z0-9]news\.js[^a-zA-Z0-9]', content, re.IGNORECASE)
            if matches:
                print(f"Found news.js reference in {file_path}")
                found_news_js = True

if not found_news_js:
    print("Verification complete: No references to news.js found in HTML/JS/JSON files.")
else:
    print("Verification complete: Some references to news.js are still remaining.")
