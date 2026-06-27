import os
import glob
import re

directory = r"C:\Users\infoPro\Desktop\old masjid"
js_files = glob.glob(os.path.join(directory, "js", "*.js")) + glob.glob(os.path.join(directory, "admin", "js", "*.js"))

report_path = r"C:\Users\infoPro\Desktop\masjid-chouhada\scratch\js_db_calls_report.txt"

with open(report_path, 'w', encoding='utf-8') as report:
    for fpath in js_files:
        report.write("=" * 60 + "\n")
        report.write(f"File: {os.path.relpath(fpath, directory)}\n")
        report.write("=" * 60 + "\n")
        
        with open(fpath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        for i, line in enumerate(lines):
            if "db." in line.lower() or "window.db" in line.lower():
                report.write(f"  Line {i+1}: {line.strip()}\n")

print("Report generated successfully!")
