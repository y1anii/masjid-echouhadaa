import os

print("Searching for db.js across the system...")
found = []
# Search in Desktop and AppData
dirs_to_search = [
    r"C:\Users\infoPro\Desktop",
    r"C:\Users\infoPro\.gemini",
]

for base_dir in dirs_to_search:
    if not os.path.exists(base_dir):
        continue
    for root, dirs, files in os.walk(base_dir):
        if "db.js" in files:
            p = os.path.join(root, "db.js")
            found.append((p, os.path.getsize(p)))

print("Found db.js locations:")
for p, sz in found:
    print(f"{p} (size: {sz} bytes)")
