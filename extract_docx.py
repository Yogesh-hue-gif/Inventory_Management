import docx
import zipfile
import os
import xml.etree.ElementTree as ET

os.makedirs('extracted_doc_images', exist_ok=True)
with zipfile.ZipFile('project-IMS SS file(DPRAMP).docx', 'r') as z:
    for filename in z.namelist():
        if filename.startswith('word/media/'):
            data = z.read(filename)
            out_path = os.path.join('extracted_doc_images', os.path.basename(filename))
            with open(out_path, 'wb') as f:
                f.write(data)

doc = docx.Document('project-IMS SS file(DPRAMP).docx')
for i, p in enumerate(doc.paragraphs):
    images = []
    for r in p.runs:
        if 'drawing' in r._element.xml:
            tree = ET.fromstring(r._element.xml)
            for elem in tree.iter():
                if elem.tag.endswith('blip'):
                    rId = elem.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                    if rId and rId in doc.part.rels:
                        target = doc.part.rels[rId].target_ref
                        images.append(os.path.basename(target))
    if p.text.strip() or images:
        print(f"P{i}: text='{p.text.strip()}' images={images}")
