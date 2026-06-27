import os
import json

transcript_path = r"C:\Users\infoPro\Gemini\antigravity\brain\75432d14-487e-4d35-9cc1-5df61b4014ff\.system_generated\logs\transcript.jsonl"
if not os.path.exists(transcript_path):
    # try matching other path
    transcript_path = r"C:\Users\infoPro\.gemini\antigravity\brain\75432d14-487e-4d35-9cc1-5df61b4014ff\.system_generated\logs\transcript.jsonl"

files_written = {}
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
                
                if method in ["write_to_file", "write_file", "default_api:write_to_file"]:
                    target = args.get("TargetFile")
                    content = args.get("CodeContent")
                    if target and content:
                        basename = os.path.basename(target)
                        files_written[target] = {
                            "content": content,
                            "line_num": line_num,
                            "step_index": data.get("step_index")
                        }
        except Exception as e:
            pass

print(f"Found {len(files_written)} unique files written in the transcript:")
for target, info in files_written.items():
    print(f"File: {target}")
    print(f"  Step Index: {info['step_index']}, Length: {len(info['content'])} chars")
