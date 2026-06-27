import urllib.request
import json
import sys

# Ensure UTF-8 output even if stdout is CP1252
sys.stdout.reconfigure(encoding='utf-8')

def get_documents(collection):
    url = f"https://firestore.googleapis.com/v1/projects/masjid-chouhadaa/databases/(default)/documents/{collection}?pageSize=100"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data.get('documents', [])
    except Exception as e:
        print(f"Error fetching {collection}: {e}")
        return []

with open("scratch/output.txt", "w", encoding="utf-8") as f:
    f.write("--- STUDENTS ---\n")
    students = get_documents("students")
    for doc in students:
        fields = doc.get('fields', {})
        doc_id = doc.get('name', '').split('/')[-1]
        student_name = fields.get('سليماني ياني :اسم الطالب كامل', {}).get('stringValue', 'N/A')
        phone = fields.get('رقم الهاتف', {}).get('stringValue', 'N/A')
        f.write(f"ID: {doc_id} | Name: {student_name} | Phone: {phone}\n")

    f.write("\n--- SESSIONS ---\n")
    sessions = get_documents("sessions")
    for doc in sessions:
        fields = doc.get('fields', {})
        doc_id = doc.get('name', '').split('/')[-1]
        date = fields.get('التاريخ', {}).get('stringValue', 'N/A')
        name = fields.get('اسم الحلقة', {}).get('stringValue', 'N/A')
        status = fields.get('الحالة', {}).get('stringValue', 'N/A')
        f.write(f"ID: {doc_id} | Date: {date} | Name: {name} | Status: {status}\n")

    f.write("\n--- PRESENCE ---\n")
    presence = get_documents("Presence")
    for doc in presence:
        fields = doc.get('fields', {})
        doc_id = doc.get('name', '').split('/')[-1]
        student_id = fields.get('StudentID', {}).get('stringValue', 'N/A')
        session_id = fields.get('SessionID', {}).get('stringValue', 'N/A')
        status = fields.get('حالة الحضور', {}).get('stringValue', 'N/A')
        f.write(f"ID: {doc_id} | StudentID: {student_id} | SessionID: {session_id} | Status: {status}\n")

print("Done writing to scratch/output.txt")
