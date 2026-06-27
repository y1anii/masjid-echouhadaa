import os
import glob
import re

directory = r"C:\Users\infoPro\Desktop\old masjid"
html_files = glob.glob(os.path.join(directory, "*.html")) + glob.glob(os.path.join(directory, "admin", "*.html"))

report_path = r"C:\Users\infoPro\Desktop\masjid-chouhada\scratch\html_scripts_report.txt"

with open(report_path, 'w', encoding='utf-8') as report:
    for file_path in html_files:
        report.write("=" * 60 + "\n")
        report.write(f"File: {os.path.relpath(file_path, directory)}\n")
        report.write("=" * 60 + "\n")
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # find script tags
        scripts = re.findall(r'<script.*?>.*?</script>', content, re.DOTALL | re.IGNORECASE)
        for i, script in enumerate(scripts):
            lines = script.strip().split('\n')
            src_match = re.search(r'src=["\'](.*?)["\']', lines[0])
            src = src_match.group(1) if src_match else "inline"
            report.write(f"  Script {i+1}: src={src} (total lines: {len(lines)})\n")
            if src == "inline":
                report.write("\n".join(lines[:20]) + "\n")
                if len(lines) > 20:
                    report.write("    ...\n")
                report.write("\n")

print("Report generated successfully!")
