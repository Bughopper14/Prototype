import os
import re
import base64
from bs4 import BeautifulSoup

def main():
    base_dir = 'D:/CRM App2/CRM App2/uploaded_excel_html/Application Form APPROVED_files'
    
    with open(os.path.join(base_dir, 'sheet001.htm'), 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()

    with open(os.path.join(base_dir, 'stylesheet.css'), 'r', encoding='utf-8', errors='ignore') as f:
        css = f.read()

    # 1. Strip Excel redirect script
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)

    # 2. Inline images
    for i in range(1, 30):
        img_name = f'image{i:03d}.png'
        img_path = os.path.join(base_dir, img_name)
        if os.path.exists(img_path):
            with open(img_path, 'rb') as img_f:
                b64 = base64.b64encode(img_f.read()).decode('ascii')
            data_uri = f'data:image/png;base64,{b64}'
            html = re.sub(rf'src=["\']?{img_name}["\']?', f'src="{data_uri}"', html)

    # 3. Inline CSS
    html = re.sub(r'<link[^>]+stylesheet\.css[^>]*>', f'<style>\n{css}\n</style>', html, flags=re.IGNORECASE)

    # 4. Save bundled html
    out_path = 'D:/CRM App2/CRM App2/src/bundled_excel_template.html'
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print('Saved bundled HTML:', os.path.getsize(out_path), 'bytes')

if __name__ == '__main__':
    main()
