import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("admin/index.html", "r", encoding="utf-8") as f:
    content = f.read()

pos = content.find('id="dash-attendance-rate"')
if pos != -1:
    start = max(0, pos - 200)
    end = min(len(content), pos + 200)
    print("Context:")
    print(content[start:end])
