import os

workspace = r"c:\Users\infoPro\Desktop\masjid-chouhada"
matches = []

for root, dirs, files in os.walk(workspace):
    for f in files:
        if "supervisor" in f.lower():
            matches.append(os.path.join(root, f))

print(f"Found {len(matches)} files:")
for m in matches:
    print(m)
