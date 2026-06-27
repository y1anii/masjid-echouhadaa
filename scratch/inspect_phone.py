import urllib.request
import json

url = "https://firestore.googleapis.com/v1/projects/masjid-chouhadaa/databases/(default)/documents/students?pageSize=100"

try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        
        documents = data.get('documents', [])
        with open("scratch/students_list.txt", "w", encoding="utf-8") as f:
            f.write(f"Total student documents found: {len(documents)}\n")
            for doc in documents:
                fields = doc.get('fields', {})
                name = fields.get('سليماني ياني :اسم الطالب كامل', {}).get('stringValue', '')
                phone = fields.get('رقم الهاتف', {}).get('stringValue', '')
                doc_id = doc.get('name', '').split('/')[-1]
                status = fields.get('حالة الطلب', {}).get('stringValue', '')
                f.write(f"ID: {doc_id} | Name: {name} | Phone: {phone} | Status: {status}\n")
        print("Success! Saved to scratch/students_list.txt")
except Exception as e:
    print("Error:", e)
