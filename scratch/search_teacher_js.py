import sys

with open("admin/js/teacher.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

with open("scratch/search_results.txt", "w", encoding="utf-8") as out:
    for i, line in enumerate(lines):
        if any(keyword in line for keyword in ["القرآن", "حفظ", "مراجعة", "quran", "Surah", "surah"]):
            out.write(f"{i+1}: {line.strip()}\n")
