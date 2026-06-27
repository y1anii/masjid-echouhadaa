with open("admin/teacher.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

with open("scratch/teacher_options_results.txt", "w", encoding="utf-8") as out:
    for i, line in enumerate(lines):
        if "<select" in line or "<option" in line:
            out.write(f"Line {i+1}: {line.strip()}\n")
