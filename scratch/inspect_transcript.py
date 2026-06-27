import os
import json

transcript_path = r"C:\Users\infoPro\.gemini\antigravity\brain\75432d14-487e-4d35-9cc1-5df61b4014ff\.system_generated\logs\transcript.jsonl"
print("Checking transcript file existence:", os.path.exists(transcript_path))
if os.path.exists(transcript_path):
    print("Size:", os.path.getsize(transcript_path), "bytes")
    # Read first 5 lines
    with open(transcript_path, "r", encoding="utf-8", errors="ignore") as f:
        for i in range(5):
            line = f.readline()
            if not line:
                break
            try:
                data = json.loads(line)
                print(f"\nLine {i+1}:")
                print("Type:", data.get("type"))
                print("Status:", data.get("status"))
                print("Source:", data.get("source"))
                # Print keys
                print("Keys:", list(data.keys()))
            except Exception as e:
                print(f"Error parsing line {i+1}: {e}")
