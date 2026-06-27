with open("admin/js/teacher.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "loadStudentsList" in line or "function loadStudents" in line:
        print(f"Line {i+1}: {line.strip()}")
