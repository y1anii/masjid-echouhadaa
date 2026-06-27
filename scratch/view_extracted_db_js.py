import os

file_path = r"C:\Users\infoPro\Desktop\masjid-chouhada\scratch\db_js_write_622_0.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# If the content starts/ends with double quotes, it might be a raw JSON string from transcript
if content.startswith('"') and content.endswith('"'):
    try:
        import json
        content = json.loads(content)
    except Exception as e:
        print("Failed to parse JSON string:", e)

# Let's write the formatted code to a new file so it's clean and easy to view
out_path = r"C:\Users\infoPro\Desktop\masjid-chouhada\scratch\db_js_write_622_formatted.js"
with open(out_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Formatted file written to {out_path}")
print(f"Total lines: {len(content.splitlines())}")
