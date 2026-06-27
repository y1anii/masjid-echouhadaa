with open("admin/js/teacher.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

with open("scratch/edit_session_results.txt", "w", encoding="utf-8") as out:
    for i, line in enumerate(lines):
        if "edit" in line.lower() or "تعديل" in line:
            out.write(f"Line {i+1}: {line.strip()}\n")
