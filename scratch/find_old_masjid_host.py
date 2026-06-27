import os

print("Searching for directory 'old masjid' in C:\\Users\\infoPro...")
found = []
for root, dirs, files in os.walk(r"C:\Users\infoPro"):
    if "old masjid" in dirs:
        found.append(os.path.join(root, "old masjid"))
        print("Found:", os.path.join(root, "old masjid"))
    # limit depth or skip AppData to make it fast
    if "AppData" in dirs:
        dirs.remove("AppData") # skip AppData to save time

print("Search finished. Found locations:")
for f in found:
    print(f)
