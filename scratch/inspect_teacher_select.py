import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("admin/teacher.html", "r", encoding="utf-8") as f:
    content = f.read()

import re
matches = re.findall(r'<select.*id="circle-group-type".*?>.*?</select>', content, re.DOTALL)
print("circle-group-type select:")
for m in matches:
    print(m)
