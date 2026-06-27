import glob
import os
import re

print("Running search_html.py...")
print("Current directory:", os.getcwd())
files = glob.glob('*.html') + glob.glob('admin/*.html')
print("Found files:", files)
for f in files:
    with open(f, 'r', encoding='utf-8', errors='ignore') as file:
        content = file.read()
        matches = re.findall(r'<script.*db.js.*?>', content)
        if matches:
            print(f"{f}: {matches}")
        else:
            print(f"{f}: NO db.js tag found")
