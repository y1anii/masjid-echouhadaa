import os

with open("scratch/all_files.txt", "w", encoding="utf-8") as f:
    for root, dirs, files in os.walk("."):
        # skip git and system_generated directories if any
        if ".git" in root or ".system_generated" in root or "node_modules" in root:
            continue
        for file in files:
            full_path = os.path.join(root, file)
            f.write(full_path + "\n")
print("Done listing all files")
