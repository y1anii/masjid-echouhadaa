import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def get_all_documents(collection):
    docs = []
    url = f"https://firestore.googleapis.com/v1/projects/masjid-chouhadaa/databases/(default)/documents/{collection}?pageSize=100"
    next_page_token = None
    while True:
        curr_url = url
        if next_page_token:
            curr_url += f"&pageToken={next_page_token}"
        try:
            req = urllib.request.Request(curr_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                docs.extend(data.get('documents', []))
                next_page_token = data.get('nextPageToken')
                if not next_page_token:
                    break
        except Exception as e:
            print(f"Error: {e}")
            break
    return docs

students = get_all_documents("students")
for s in students:
    doc_id = s.get('name', '').split('/')[-1]
    fields = s.get('fields', {})
    print(f"ID: {doc_id}")
    for k, v in fields.items():
        print(f"  {k} -> {v}")
