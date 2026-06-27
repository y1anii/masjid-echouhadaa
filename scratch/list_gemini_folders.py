import os

print("Listing folders under .gemini...")
base = r"C:\Users\infoPro\.gemini"
if os.path.exists(base):
    for root, dirs, files in os.walk(base):
        # limit depth
        depth = root.replace(base, "").count(os.sep)
        if depth > 4:
            continue
        print(root)
else:
    print(".gemini folder not found")
