import os

dest_path = r"C:\Users\infoPro\Desktop\old masjid"
flat_files_to_delete = [
    "admin.css", "auth.js", "daily.js", "dashboard.js", "db.js",
    "index (1).html", "lessons (1).html", "lessons.js", "login (1).html",
    "manifest (1).json", "manifest (2).json", "news (1).html", "news.js",
    "old style.css", "parent.js", "reports.js", "students (1).html",
    "students.js", "sw (1).js", "teacher (1).html", "teacher.js"
]

print("Cleaning up flat files in root of old masjid...")
deleted_count = 0
for file in flat_files_to_delete:
    p = os.path.join(dest_path, file)
    if os.path.exists(p):
        os.remove(p)
        print(f"Deleted: {file}")
        deleted_count += 1

print(f"Cleanup complete. Deleted {deleted_count} files.")
