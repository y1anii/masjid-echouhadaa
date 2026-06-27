import os
import glob
import re

directory = r"C:\Users\infoPro\Desktop\old masjid"
html_files = glob.glob(os.path.join(directory, "*.html")) + glob.glob(os.path.join(directory, "admin", "*.html"))

replacements = [
    # Root level pages script tags
    (r'<script src="admin/js/db.js(\?v=\d+)?"></script>', r'<script type="module" src="admin/js/db.js\1"></script>'),
    (r'<script src="js/parent.js(\?v=\d+)?"></script>', r'<script type="module" src="js/parent.js\1"></script>'),
    (r'<script src="js/daily.js(\?v=\d+)?"></script>', r'<script type="module" src="js/daily.js\1"></script>'),
    (r'<script src="js/reports.js(\?v=\d+)?"></script>', r'<script type="module" src="js/reports.js\1"></script>'),
    
    # Admin level pages script tags
    (r'<script src="js/db.js(\?v=\d+)?"></script>', r'<script type="module" src="js/db.js\1"></script>'),
    (r'<script src="js/auth.js(\?v=\d+)?"></script>', r'<script type="module" src="js/auth.js\1"></script>'),
    (r'<script src="js/dashboard.js(\?v=\d+)?"></script>', r'<script type="module" src="js/dashboard.js\1"></script>'),
    (r'<script src="js/lessons.js(\?v=\d+)?"></script>', r'<script type="module" src="js/lessons.js\1"></script>'),
    (r'<script src="js/news.js(\?v=\d+)?"></script>', r'<script type="module" src="js/news.js\1"></script>'),
    (r'<script src="js/students.js(\?v=\d+)?"></script>', r'<script type="module" src="js/students.js\1"></script>'),
    (r'<script src="js/teacher.js(\?v=\d+)?"></script>', r'<script type="module" src="js/teacher.js\1"></script>')
]

for file_path in html_files:
    print(f"Processing: {os.path.relpath(file_path, directory)}")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for pattern, repl in replacements:
        content = re.sub(pattern, repl, content)
        
    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("  Updated script tags successfully.")
    else:
        print("  No script tag updates needed.")

print("All HTML files updated.")
