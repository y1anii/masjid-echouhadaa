import os
import glob

directory = r"C:\Users\infoPro\Desktop\old masjid"
files = glob.glob(os.path.join(directory, "admin", "*.html"))

report_path = r"C:\Users\infoPro\Desktop\masjid-chouhada\scratch\admin_nav_report.txt"

with open(report_path, 'w', encoding='utf-8') as report:
    for fpath in files:
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            for line_idx, line in enumerate(content.splitlines()):
                if "supervisor" in line.lower() or "مشرف" in line or "html" in line:
                    report.write(f"{os.path.relpath(fpath, directory)} (Line {line_idx+1}): {line.strip()}\n")
        except Exception as e:
            report.write(f"Error reading {fpath}: {e}\n")

print("Report generated successfully!")
