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
presence_docs = get_all_documents("Presence")

print("Students:")
for s in students:
    fields = s.get('fields', {})
    s_id = fields.get('id', {}).get('stringValue', s.get('name', '').split('/')[-1])
    s_name = fields.get('سليماني ياني :اسم الطالب كامل', {}).get('stringValue', 'N/A')
    
    # Calculate presence for this student
    p_records = []
    for p in presence_docs:
        p_fields = p.get('fields', {})
        p_stud = p_fields.get('StudentID', {}).get('stringValue', '')
        if p_stud == s_id:
            p_status = p_fields.get('حالة الحضور', {}).get('stringValue', '')
            p_records.append(p_status)
            
    total = len(p_records)
    present = sum(1 for status in p_records if status == 'حاضر' or status.startswith('متأخر'))
    rate = (present / total * 100) if total > 0 else 0
    print(f"Student: {s_id} | Name: {s_name} | Total Presence Docs: {total} | Present: {present} | Rate: {rate}% | Records: {p_records}")
