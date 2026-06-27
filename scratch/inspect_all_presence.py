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
            print(f"Error fetching: {e}")
            break
    return docs

presence_docs = get_all_documents("Presence")
matching_presence = []
for doc in presence_docs:
    fields = doc.get('fields', {})
    student_id = fields.get('StudentID', {}).get('stringValue', '')
    if student_id == 'ST19359':
        doc_id = doc.get('name', '').split('/')[-1]
        session_id = fields.get('SessionID', {}).get('stringValue', 'N/A')
        status = fields.get('حالة الحضور', {}).get('stringValue', 'N/A')
        matching_presence.append((doc_id, session_id, status))

print(f"Total matching presence records for ST19359: {len(matching_presence)}")
for item in matching_presence:
    print(item)
