import os
import re

workspace_dir = r"C:\Users\infoPro\Desktop\masjid-chouhada"

# Patterns to match and remove:
# 1. <li><a href="news.html">...</a></li> or variations (with classes, actives, etc.)
# 2. <li><a href="admin/news.html">...</a></li>
# 3. Any references to news.html or الأخبار in lists

patterns_to_remove = [
    r'<li><a href="news\.html"[^>]*>.*?</a></li>\s*',
    r'<li><a href="admin/news\.html"[^>]*>.*?</a></li>\s*',
    r'<li><a href="\.\./news\.html"[^>]*>.*?</a></li>\s*',
    r'<li><a href="news\.html">.*?</a></li>\s*',
    r'<li><a href="news\.html" class="active">.*?</a></li>\s*',
    r'<li><a href="news\.html" class="">.*?</a></li>\s*',
    r'<li><a href="news\.html">آخر الأخبار</a></li>\s*',
    r'<li><a href="news\.html">الأخبار</a></li>\s*',
    r'<li><a href="news\.html" class="active">آخر الأخبار</a></li>\s*',
    r'<li><a href="news\.html" class="active">الأخبار</a></li>\s*',
    r'<li><a href="news\.html" class="">آخر الأخبار</a></li>\s*',
    r'<li><a href="news\.html" class="">الأخبار</a></li>\s*',
    r'<li><a href="admin/news\.html">إدارة الأخبار</a></li>\s*',
    r'<li><a href="news\.html">إدارة الأخبار</a></li>\s*',
    r'<li><a href="news\.html" class="active">إدارة الأخبار</a></li>\s*',
    r'<li><a href="news\.html" class="">إدارة الأخبار</a></li>\s*',
]

def clean_html_file(file_path):
    print(f"Processing: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    modified = False
    
    # Let's remove list items for news.html or admin/news.html
    for pattern in patterns_to_remove:
        new_content, count = re.subn(pattern, "", content, flags=re.IGNORECASE | re.DOTALL)
        if count > 0:
            content = new_content
            modified = True
            print(f"  Removed match for pattern: {pattern}")
            
    # Also clean any other menu item or list item containing "news.html"
    li_pattern = r'<li><a\s+[^>]*href="[^"]*news\.html"[^>]*>.*?</a></li>\s*'
    new_content, count = re.subn(li_pattern, "", content, flags=re.IGNORECASE | re.DOTALL)
    if count > 0:
        content = new_content
        modified = True
        print(f"  Removed general li containing news.html")

    if modified:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  Saved changes to {file_path}")

for root, dirs, files in os.walk(workspace_dir):
    # Skip scratch folder
    if "scratch" in root:
        continue
    for file in files:
        if file.endswith(".html"):
            clean_html_file(os.path.join(root, file))
