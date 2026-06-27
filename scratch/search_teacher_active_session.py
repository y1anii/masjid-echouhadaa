with open("admin/js/teacher.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

with open("scratch/active_session_results.txt", "w", encoding="utf-8") as out:
    for i, line in enumerate(lines):
        if "activeSession" in line:
            out.write(f"Line {i+1}: {line.strip()}\n")
