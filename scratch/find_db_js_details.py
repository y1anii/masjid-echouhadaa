import os
import json

transcript_path = r"C:\Users\infoPro\.gemini\antigravity\brain\75432d14-487e-4d35-9cc1-5df61b4014ff\.system_generated\logs\transcript.jsonl"

print("Searching db.js write occurrences...")
with open(transcript_path, "r", encoding="utf-8", errors="ignore") as f:
    for line_num, line in enumerate(f, 1):
        try:
            data = json.loads(line)
            tool_calls = data.get("tool_calls", [])
            for tc in tool_calls:
                method = tc.get("method") or tc.get("name")
                args = tc.get("args") or tc.get("arguments") or {}
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except:
                        pass
                
                target = args.get("TargetFile")
                if target and "db.js" in target.lower():
                    print(f"Line: {line_num}, Step: {data.get('step_index')}, Method: {method}")
                    content = args.get("CodeContent", "")
                    print(f"  CodeContent length: {len(content)}")
                    if "ReplacementContent" in args:
                        print(f"  ReplacementContent length: {len(args['ReplacementContent'])}")
                    if "ReplacementChunks" in args:
                        print(f"  ReplacementChunks count: {len(args['ReplacementChunks'])}")
        except Exception as e:
            pass
print("Done.")
