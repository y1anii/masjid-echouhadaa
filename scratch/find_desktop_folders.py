import os

desktop = r"C:\Users\infoPro\Desktop"
print("Desktop path exists:", os.path.exists(desktop))
if os.path.exists(desktop):
    items = os.listdir(desktop)
    print("Desktop contents:")
    for item in items:
        print(f"  Name: {repr(item)}, Bytes: {item.encode('utf-8')}")
