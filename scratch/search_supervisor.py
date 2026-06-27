import os
import glob

directory = r"C:\Users\infoPro\Desktop\old masjid"
files = glob.glob(os.path.join(directory, "*.html")) + glob.glob(os.path.join(directory, "js", "*.js")) + \
        glob.glob(os.path.join(directory, "admin", "*.html")) + glob.glob(os.path.join(directory, "admin", "js", "*.js"))

report_path = r"C:\Users\infoPro\Desktop\masjid-chouhada\scratch\supervisor_search_report.txt"

with open(report_path, 'w', encoding='utf-8') as report:
    for fpath in files:
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            matches_eng = content.lower().count("supervisor")
            matches_arb = content.count("مشرف")
            if matches_eng > 0 or matches_arb > 0:
                report.write(f"{os.path.relpath(fpath, directory)}: supervisor={matches_eng}, مشرف={matches_arb}\n")
        except Exception as e:
            report.write(f"Error reading {fpath}: {e}\n")

print("Report generated successfully!")
