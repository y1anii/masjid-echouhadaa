import os
import json

transcript_path = r"C:\Users\infoPro\.gemini\antigravity\brain\75432d14-487e-4d35-9cc1-5df61b4014ff\.system_generated\logs\transcript.jsonl"
out_dir = r"C:\Users\infoPro\Desktop\masjid-chouhada\scratch"

with open(transcript_path, "r", encoding="utf-8", errors="ignore") as f:
    for line_num, line in enumerate(f, 1):
        if line_num not in [622, 791, 954, 1496]:
            continue
        try:
            data = json.loads(line)
            tool_calls = data.get("tool_calls", [])
            for tc_idx, tc in enumerate(tool_calls):
                args = tc.get("args") or tc.get("arguments") or {}
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except:
                        pass
                
                content = args.get("CodeContent") or args.get("ReplacementContent")
                if content:
                    out_path = os.path.join(out_dir, f"db_js_write_{line_num}_{tc_idx}.js")
                    with open(out_path, "w", encoding="utf-8") as out_f:
                        out_f.write(content)
                    print(f"Extracted line {line_num} call to {out_path}")
                elif "ReplacementChunks" in args:
                    out_path = os.path.join(out_dir, f"db_js_write_{line_num}_{tc_idx}_chunks.json")
                    with open(out_path, "w", encoding="utf-8") as out_f:
                        json.dump(args["ReplacementChunks"], out_f, indent=2, ensure_ascii=False)
                    print(f"Extracted chunks from line {line_num} to {out_path}")
        except Exception as e:
            print(f"Error on line {line_num}: {e}")
