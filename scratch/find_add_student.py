import os
import glob

directory = r"C:\Users\infoPro\Desktop\old masjid"
files = glob.glob(os.path.join(directory, "admin", "*.html")) + glob.glob(os.path.join(directory, "admin", "js", "*.js"))

report_path = r"C:\Users\infoPro\Desktop\masjid-chouhada\scratch\add_student_search_report.txt"

with open(report_path, 'w', encoding='utf-8') as report:
    for fpath in files:
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            for line_idx, line in enumerate(content.splitlines()):
                if "register" in line.lower() or "addstudent" in line.lower() or "student" in line.lower() and "add" in line.lower():
                    report.write(f"{os.path.relpath(fpath, directory)} (Line {line_idx+1}): {line.strip()}\n")
        except Exception as e:
            report.write(f"Error reading {fpath}: {e}\n")

print("Report generated successfully!")
