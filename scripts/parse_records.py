import zipfile
import xml.etree.ElementTree as ET
import glob
import os
import re
import json

def get_text_lines(docx_path):
    with zipfile.ZipFile(docx_path) as z:
        xml_content = z.read('word/document.xml')
        root = ET.fromstring(xml_content)
        lines = []
        for elem in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
            texts = [t.text for t in elem.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if t.text]
            if texts:
                line = ''.join(texts).strip()
                if line:
                    lines.append(line)
        return lines

files = glob.glob('public/classes_few_months_record/*.docx')
for f in files:
    print(f"=== {os.path.basename(f)} ===")
    lines = get_text_lines(f)
    for idx, l in enumerate(lines):
        print(f"{idx}: {l}")
