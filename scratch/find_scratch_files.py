import os

print("Searching for daily.js...")
search_root = r"C:\Users\infoPro\.gemini\antigravity"
found_paths = []
for root, dirs, files in os.walk(search_root):
    if "daily.js" in files:
        found_paths.append(os.path.join(root, "daily.js"))

print("Found paths:")
for p in found_paths:
    print(p)
