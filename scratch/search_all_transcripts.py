import os
import json
import re

transcript_path = r"C:\Users\infoPro\.gemini\antigravity\brain\75432d14-487e-4d35-9cc1-5df61b4014ff\.system_generated\logs\transcript.jsonl"
if not os.path.exists(transcript_path):
    print("Transcript not found")
    exit()

print("Searching transcript for Vanilla JS implementations...")
keywords = ["firebaseConfig", "initializeParentPortal", "registerStudent", "updateStudent", "parentConfirm", "readParentPortal"]

with open(transcript_path, "r", encoding="utf-8", errors="ignore") as f:
    for line_num, line in enumerate(f, 1):
        try:
            data = json.loads(line)
            content = data.get("content", "")
            if not content:
                continue
            
            # Find any code blocks matching keywords
            for kw in keywords:
                if kw in content:
                    print(f"Match found for '{kw}' at line {line_num}, step {data.get('step_index')}")
                    # Print context around match
                    lines = content.split("\n")
                    for idx, l in enumerate(lines):
                        if kw in l:
                            start = max(0, idx - 10)
                            end = min(len(lines), idx + 20)
                            print(f"--- Context (lines {start}-{end}) ---")
                            for j in range(start, end):
                                print(f"{j}: {lines[j]}")
                            break
        except Exception as e:
            pass
print("Search done.")
