import os
import json

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
                    if target:
                        target_norm = target.replace("\\", "/").lower()
                        files_written[target_norm] = {
                            "original_path": target,
                            "step_index": data.get("step_index"),
                            "length": len(args.get("CodeContent", ""))
                        }
        except Exception as e:
            pass

with open("scratch/files_list.txt", "w", encoding="utf-8") as out:
    out.write(f"Total files written: {len(files_written)}\n")
    for norm_path, info in sorted(files_written.items()):
        out.write(f"{norm_path} (length: {info['length']}, step: {info['step_index']})\n")

print("Wrote files list to scratch/files_list.txt")
